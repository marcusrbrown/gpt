import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {
  closeDatabase,
  db,
  deleteDatabase,
  fromISOString,
  isIndexedDBAvailable,
  nowISO,
  toISOString,
  type ConversationDB,
  type GPTConfigurationDB,
  type MessageDB,
  type UserSettingDB,
} from '../database'
import 'fake-indexeddb/auto'

describe('GPTDatabase', () => {
  beforeEach(async () => {
    await deleteDatabase()
  })

  afterEach(() => {
    closeDatabase()
  })

  describe('database initialization', () => {
    it('should create database with correct name', () => {
      expect(db.name).toBe('gpt-platform')
    })

    it('should have all required tables', () => {
      expect(db.tables.map(t => t.name).sort()).toEqual([
        'conversations',
        'gpts',
        'knowledgeFiles',
        'messages',
        'secrets',
        'settings',
      ])
    })

    it('should be at version 1', () => {
      expect(db.verno).toBe(1)
    })
  })

  describe('gpts table', () => {
    const testGPT: GPTConfigurationDB = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test GPT',
      description: 'A test GPT configuration',
      systemPrompt: 'You are a helpful assistant.',
      instructions: 'Be concise.',
      conversationStarters: ['Hello', 'Help me'],
      modelProvider: 'openai',
      modelName: 'gpt-4',
      modelSettings: {
        temperature: 0.7,
        maxTokens: 1000,
      },
      tools: [],
      knowledge: {
        files: [],
        urls: [],
      },
      capabilities: {
        codeInterpreter: false,
        webBrowsing: true,
        imageGeneration: false,
        fileSearch: {enabled: false},
      },
      createdAtISO: '2024-01-01T00:00:00.000Z',
      updatedAtISO: '2024-01-01T00:00:00.000Z',
      version: 1,
      tags: ['test', 'example'],
      isArchived: false,
    }

    it('should add and retrieve a GPT', async () => {
      await db.gpts.add(testGPT)
      const retrieved = await db.gpts.get(testGPT.id)
      expect(retrieved).toEqual(testGPT)
    })

    it('should update a GPT', async () => {
      await db.gpts.add(testGPT)
      await db.gpts.update(testGPT.id, {name: 'Updated GPT'})
      const retrieved = await db.gpts.get(testGPT.id)
      expect(retrieved?.name).toBe('Updated GPT')
    })

    it('should delete a GPT', async () => {
      await db.gpts.add(testGPT)
      await db.gpts.delete(testGPT.id)
      const retrieved = await db.gpts.get(testGPT.id)
      expect(retrieved).toBeUndefined()
    })

    it('should query GPTs by tag', async () => {
      await db.gpts.add(testGPT)
      const results = await db.gpts.where('tags').equals('test').toArray()
      expect(results).toHaveLength(1)
      expect(results[0]?.id).toBe(testGPT.id)
    })

    it('should query archived GPTs', async () => {
      await db.gpts.add(testGPT)
      await db.gpts.add({...testGPT, id: 'archived-id', isArchived: true})
      const archived = await db.gpts.filter(gpt => gpt.isArchived).toArray()
      expect(archived).toHaveLength(1)
      expect(archived[0]?.id).toBe('archived-id')
    })
  })

  describe('conversations table', () => {
    const testConversation: ConversationDB = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      gptId: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Test Conversation',
      createdAtISO: '2024-01-01T00:00:00.000Z',
      updatedAtISO: '2024-01-01T00:00:00.000Z',
      messageCount: 0,
      lastMessagePreview: '',
      tags: [],
    }

    it('should add and retrieve a conversation', async () => {
      await db.conversations.add(testConversation)
      const retrieved = await db.conversations.get(testConversation.id)
      expect(retrieved).toEqual(testConversation)
    })

    it('should query conversations by gptId', async () => {
      await db.conversations.add(testConversation)
      const results = await db.conversations.where('gptId').equals(testConversation.gptId).toArray()
      expect(results).toHaveLength(1)
    })
  })

  describe('messages table', () => {
    const testMessage: MessageDB = {
      id: '550e8400-e29b-41d4-a716-446655440002',
      conversationId: '550e8400-e29b-41d4-a716-446655440001',
      role: 'user',
      content: 'Hello, world!',
      timestampISO: '2024-01-01T00:00:00.000Z',
    }

    it('should add and retrieve a message', async () => {
      await db.messages.add(testMessage)
      const retrieved = await db.messages.get(testMessage.id)
      expect(retrieved).toEqual(testMessage)
    })

    it('should query messages by conversationId', async () => {
      await db.messages.add(testMessage)
      await db.messages.add({
        ...testMessage,
        id: 'msg-2',
        role: 'assistant',
        content: 'Hi there!',
      })
      const results = await db.messages.where('conversationId').equals(testMessage.conversationId).toArray()
      expect(results).toHaveLength(2)
    })
  })

  describe('settings table', () => {
    it('should store and retrieve settings', async () => {
      const setting: UserSettingDB = {
        key: 'theme',
        value: 'dark',
      }
      await db.settings.add(setting)
      const retrieved = await db.settings.get('theme')
      expect(retrieved?.value).toBe('dark')
    })

    it('should update settings', async () => {
      await db.settings.add({key: 'theme', value: 'light'})
      await db.settings.update('theme', {value: 'dark'})
      const retrieved = await db.settings.get('theme')
      expect(retrieved?.value).toBe('dark')
    })

    it('should store complex settings values', async () => {
      const complexValue = {
        notifications: true,
        language: 'en',
        features: ['a', 'b', 'c'],
      }
      await db.settings.add({key: 'preferences', value: complexValue})
      const retrieved = await db.settings.get('preferences')
      expect(retrieved?.value).toEqual(complexValue)
    })
  })
})

describe('utility functions', () => {
  describe('toISOString', () => {
    it('should convert Date to ISO string', () => {
      const date = new Date('2024-01-15T10:30:00.000Z')
      expect(toISOString(date)).toBe('2024-01-15T10:30:00.000Z')
    })
  })

  describe('fromISOString', () => {
    it('should convert ISO string to Date', () => {
      const iso = '2024-01-15T10:30:00.000Z'
      const date = fromISOString(iso)
      expect(date.toISOString()).toBe(iso)
    })
  })

  describe('nowISO', () => {
    it('should return current time as ISO string', () => {
      const before = new Date().toISOString()
      const now = nowISO()
      const after = new Date().toISOString()
      expect(now >= before).toBe(true)
      expect(now <= after).toBe(true)
    })
  })

  describe('isIndexedDBAvailable', () => {
    it('should return true in test environment with fake-indexeddb', () => {
      expect(isIndexedDBAvailable()).toBe(true)
    })
  })
})
