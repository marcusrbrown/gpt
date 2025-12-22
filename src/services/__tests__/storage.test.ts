import type {Conversation, GPTConfiguration} from '@/types/gpt'
import {deleteDatabase} from '@/lib/database'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {IndexedDBStorageService} from '../storage'
import 'fake-indexeddb/auto'

function createTestGPT(overrides: Partial<GPTConfiguration> = {}): GPTConfiguration {
  return {
    id: crypto.randomUUID(),
    name: 'Test GPT',
    description: 'A test GPT configuration',
    systemPrompt: 'You are a helpful assistant.',
    tools: [],
    knowledge: {
      files: [],
      urls: [],
    },
    capabilities: {
      codeInterpreter: false,
      webBrowsing: false,
      imageGeneration: false,
      fileSearch: {
        enabled: false,
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    tags: [],
    isArchived: false,
    ...overrides,
  }
}

function createTestConversation(gptId: string, overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: crypto.randomUUID(),
    gptId,
    messages: [
      {
        id: crypto.randomUUID(),
        role: 'user',
        content: 'Hello',
        timestamp: new Date(),
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    messageCount: 1,
    tags: [],
    ...overrides,
  }
}

describe('IndexedDBStorageService', () => {
  let storage: IndexedDBStorageService

  beforeEach(async () => {
    await deleteDatabase()
    storage = new IndexedDBStorageService()
  })

  afterEach(async () => {
    storage.destroy()
    await deleteDatabase()
  })

  describe('GPT operations', () => {
    it('should save and retrieve a GPT configuration', async () => {
      const gpt = createTestGPT()
      await storage.saveGPT(gpt)
      const retrieved = await storage.getGPT(gpt.id)
      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe(gpt.id)
      expect(retrieved?.name).toBe(gpt.name)
    })

    it('should return undefined for non-existent GPT', async () => {
      const retrieved = await storage.getGPT('non-existent-id')
      expect(retrieved).toBeUndefined()
    })

    it('should get all GPTs', async () => {
      const gpt1 = createTestGPT({name: 'GPT 1'})
      const gpt2 = createTestGPT({name: 'GPT 2'})
      await storage.saveGPT(gpt1)
      await storage.saveGPT(gpt2)
      const allGpts = await storage.getAllGPTs()
      expect(allGpts).toHaveLength(2)
    })

    it('should update an existing GPT', async () => {
      const gpt = createTestGPT()
      await storage.saveGPT(gpt)
      const updatedGpt = {...gpt, name: 'Updated Name', updatedAt: new Date()}
      await storage.saveGPT(updatedGpt)
      const retrieved = await storage.getGPT(gpt.id)
      expect(retrieved?.name).toBe('Updated Name')
    })

    it('should delete a GPT', async () => {
      const gpt = createTestGPT()
      await storage.saveGPT(gpt)
      await storage.deleteGPT(gpt.id)
      const retrieved = await storage.getGPT(gpt.id)
      expect(retrieved).toBeUndefined()
    })
  })

  describe('Conversation operations', () => {
    it('should save and retrieve a conversation', async () => {
      const gpt = createTestGPT()
      await storage.saveGPT(gpt)
      const conversation = createTestConversation(gpt.id)
      await storage.saveConversation(conversation)
      const retrieved = await storage.getConversation(conversation.id)
      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe(conversation.id)
      expect(retrieved?.gptId).toBe(gpt.id)
    })

    it('should get conversations for a GPT', async () => {
      const gpt = createTestGPT()
      await storage.saveGPT(gpt)
      const conv1 = createTestConversation(gpt.id)
      const conv2 = createTestConversation(gpt.id)
      await storage.saveConversation(conv1)
      await storage.saveConversation(conv2)
      const conversations = await storage.getConversationsForGPT(gpt.id)
      expect(conversations).toHaveLength(2)
    })

    it('should delete a conversation', async () => {
      const gpt = createTestGPT()
      await storage.saveGPT(gpt)
      const conversation = createTestConversation(gpt.id)
      await storage.saveConversation(conversation)
      await storage.deleteConversation(conversation.id)
      const retrieved = await storage.getConversation(conversation.id)
      expect(retrieved).toBeUndefined()
    })
  })

  describe('clearAll', () => {
    it('should clear all data', async () => {
      const gpt = createTestGPT()
      await storage.saveGPT(gpt)
      const conversation = createTestConversation(gpt.id)
      await storage.saveConversation(conversation)
      await storage.clearAll()
      const allGpts = await storage.getAllGPTs()
      expect(allGpts).toHaveLength(0)
    })
  })

  describe('Storage quota', () => {
    it('should return storage estimate', async () => {
      const estimate = await storage.getStorageEstimate()
      expect(estimate).toHaveProperty('used')
      expect(estimate).toHaveProperty('quota')
      expect(estimate).toHaveProperty('percentUsed')
    })
  })

  describe('LRU cache', () => {
    it('should cache GPT reads', async () => {
      const gpt = createTestGPT()
      await storage.saveGPT(gpt)
      const first = await storage.getGPT(gpt.id)
      const second = await storage.getGPT(gpt.id)
      expect(first).toEqual(second)
    })
  })

  describe('Cross-tab sync', () => {
    it('should register change listeners', () => {
      const callback = vi.fn()
      const unsubscribe = storage.onDataChange(callback)
      expect(typeof unsubscribe).toBe('function')
      unsubscribe()
    })
  })
})
