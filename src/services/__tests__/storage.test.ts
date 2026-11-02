import type {Conversation, ConversationMessage, GPTConfiguration} from '@/types/gpt'
import {db, deleteDatabase} from '@/lib/database'
import {ConversationMessageSchema} from '@/types/gpt'
import {exportConversation} from '../export-service'
import {importConversation} from '../import-service'
import {ConversationExportSchema} from '@/types/export-import'
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
      extractionMode: 'manual' as const,
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
    folderId: null,
    archivedAt: null,
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
    isPinned: false,
    isArchived: false,
    pinnedAt: null,
    archivedAt: null,
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

    describe('message metadata', () => {
      const fullMetadata: NonNullable<ConversationMessage['metadata']> = {
        provider: 'openai',
        model: 'gpt-5',
        stopped: true,
        replay: {
          openai: [
            {type: 'reasoning', id: 'rs_1', encrypted_content: 'abc', summary: []},
            {nested: {deep: [1, 'two', null, {three: true}]}},
          ],
        },
      }

      function createMetadataConversation(gptId: string): Conversation {
        const base = createTestConversation(gptId)
        const assistant: ConversationMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Partial reply',
          timestamp: new Date(Date.now() + 1000),
          metadata: fullMetadata,
        }
        return {...base, messages: [...base.messages, assistant], messageCount: 2}
      }

      it('round-trips full assistant metadata through save and load', async () => {
        const gpt = createTestGPT()
        await storage.saveGPT(gpt)
        const conversation = createMetadataConversation(gpt.id)
        await storage.saveConversation(conversation)

        // Fresh service instance bypasses the LRU cache and reads from IndexedDB.
        const fresh = new IndexedDBStorageService()
        try {
          const retrieved = await fresh.getConversation(conversation.id)
          const assistant = retrieved?.messages.find(m => m.role === 'assistant')
          expect(assistant?.metadata).toEqual(fullMetadata)
          expect(ConversationMessageSchema.shape.metadata.parse(assistant?.metadata)).toEqual(fullMetadata)
        } finally {
          fresh.destroy()
        }
      })

      it('leaves metadata absent on messages saved without it', async () => {
        const gpt = createTestGPT()
        await storage.saveGPT(gpt)
        const conversation = createMetadataConversation(gpt.id)
        await storage.saveConversation(conversation)

        const fresh = new IndexedDBStorageService()
        try {
          const retrieved = await fresh.getConversation(conversation.id)
          const user = retrieved?.messages.find(m => m.role === 'user')
          expect(user).toBeDefined()
          expect(user).not.toHaveProperty('metadata')
        } finally {
          fresh.destroy()
        }
      })

      it('loads a pre-change record that has no metadata field', async () => {
        const gpt = createTestGPT()
        await storage.saveGPT(gpt)
        const conversationId = crypto.randomUUID()
        const now = new Date().toISOString()
        await db.conversations.put({
          id: conversationId,
          gptId: gpt.id,
          createdAtISO: now,
          updatedAtISO: now,
          messageCount: 1,
          tags: [],
          isPinned: false,
          isArchived: false,
          pinnedAtISO: null,
          archivedAtISO: null,
        })
        await db.messages.put({
          id: crypto.randomUUID(),
          conversationId,
          role: 'assistant',
          content: 'Old reply',
          timestampISO: now,
        })

        const retrieved = await storage.getConversation(conversationId)
        expect(retrieved?.messages).toHaveLength(1)
        expect(retrieved?.messages[0]?.content).toBe('Old reply')
        expect(retrieved?.messages[0]?.metadata).toBeUndefined()
      })

      it('keeps metadata valid through export and import', async () => {
        const gpt = createTestGPT()
        await storage.saveGPT(gpt)
        const conversation = createMetadataConversation(gpt.id)
        await storage.saveConversation(conversation)

        const saved = await storage.getConversation(conversation.id)
        expect(saved).toBeDefined()
        const exported = await exportConversation(saved as Conversation, gpt.name)

        // Replay only works with the key that created it, so exports leave it out and keep the rest.
        const {replay: discarded, ...exportedMetadata} = fullMetadata
        expect(discarded).toBeDefined()

        // JSON round-trip, as a downloaded file would be.
        const parsed = ConversationExportSchema.parse(JSON.parse(JSON.stringify(exported)))
        expect(parsed.conversation.messages[0]?.metadata).toBeUndefined()
        expect(parsed.conversation.messages[1]?.metadata).toEqual(exportedMetadata)

        await storage.deleteConversation(conversation.id)
        const result = await importConversation(parsed, 'overwrite')
        expect(result.errors).toHaveLength(0)

        const fresh = new IndexedDBStorageService()
        try {
          const reloaded = await fresh.getConversation(conversation.id)
          const assistant = reloaded?.messages.find(m => m.role === 'assistant')
          expect(assistant?.metadata).toEqual(exportedMetadata)
          expect(ConversationMessageSchema.shape.metadata.parse(assistant?.metadata)).toEqual(exportedMetadata)
          expect(reloaded?.messages.find(m => m.role === 'user')).not.toHaveProperty('metadata')
        } finally {
          fresh.destroy()
        }
      })
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

    it('should clear stored API keys and the passphrase salt', async () => {
      await db.secrets.put({
        id: 'openai',
        provider: 'openai',
        encryptedKey: new ArrayBuffer(8),
        iv: new Uint8Array(12),
        createdAtISO: new Date().toISOString(),
      })
      await db.settings.put({key: 'encryption_salt', value: 'c2FsdA=='})

      await storage.clearAll()

      expect(await db.secrets.count()).toBe(0)
      expect(await db.settings.get('encryption_salt')).toBeUndefined()
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
