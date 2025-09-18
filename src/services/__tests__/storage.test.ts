import type {Conversation, GPTConfiguration} from '../../types/gpt'
import {v4 as uuidv4} from 'uuid'
import {afterEach, beforeEach, describe, expect} from 'vitest'
import {LocalStorageService} from '../storage'

describe('localStorageService', () => {
  let storageService: LocalStorageService

  beforeEach(() => {
    localStorage.clear()
    storageService = new LocalStorageService()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('Initialization', () => {
    it('should initialize with empty storage', () => {
      expect(storageService.getAllGPTs()).toHaveLength(0)
      expect(storageService.getConversationsForGPT('any-id')).toHaveLength(0)
    })

    it('should load existing data from storage', () => {
      const gpt: GPTConfiguration = {
        id: uuidv4(),
        name: 'Test GPT',
        description: 'Test Description',
        systemPrompt: 'You are a test assistant',
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
      }

      localStorage.setItem('gpts', JSON.stringify({[gpt.id]: gpt}))
      const newService = new LocalStorageService()
      const loadedGPTs = newService.getAllGPTs()
      expect(loadedGPTs).toHaveLength(1)
      expect(loadedGPTs[0]).toEqual(gpt)
    })

    it('should handle corrupted storage data', () => {
      localStorage.setItem('gpts', 'invalid json')
      const newService = new LocalStorageService()
      expect(newService.getAllGPTs()).toHaveLength(0)
    })
  })

  describe('gPT Operations', () => {
    const createTestGPT = (): GPTConfiguration => ({
      id: uuidv4(),
      name: 'Test GPT',
      description: 'Test Description',
      systemPrompt: 'You are a test assistant',
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
    })

    it('should save and retrieve GPT', () => {
      const gpt = createTestGPT()
      storageService.saveGPT(gpt)
      const retrieved = storageService.getGPT(gpt.id)
      expect(retrieved).toEqual(gpt)
    })

    it('should update existing GPT', () => {
      const gpt = createTestGPT()
      storageService.saveGPT(gpt)

      const updatedGPT = {
        ...gpt,
        name: 'Updated GPT',
        updatedAt: new Date(),
      }
      storageService.saveGPT(updatedGPT)

      const retrieved = storageService.getGPT(gpt.id)
      expect(retrieved).toEqual(updatedGPT)
    })

    it('should delete GPT', () => {
      const gpt = createTestGPT()
      storageService.saveGPT(gpt)
      storageService.deleteGPT(gpt.id)
      expect(storageService.getGPT(gpt.id)).toBeUndefined()
    })

    it('should list all GPTs', () => {
      const gpt1 = createTestGPT()
      const gpt2 = createTestGPT()
      storageService.saveGPT(gpt1)
      storageService.saveGPT(gpt2)

      const allGPTs = storageService.getAllGPTs()
      expect(allGPTs).toHaveLength(2)
      expect(allGPTs).toContainEqual(gpt1)
      expect(allGPTs).toContainEqual(gpt2)
    })
  })

  describe('conversation Operations', () => {
    const createTestConversation = (gptId: string): Conversation => ({
      id: uuidv4(),
      gptId,
      messages: [
        {
          id: uuidv4(),
          role: 'user' as const,
          content: 'Hello',
          timestamp: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    it('should save and retrieve conversation', () => {
      const gpt = {
        id: uuidv4(),
        name: 'Test GPT',
        description: 'Test Description',
        systemPrompt: 'You are a test assistant',
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
      }
      storageService.saveGPT(gpt)

      const conversation = createTestConversation(gpt.id)
      storageService.saveConversation(conversation)
      const retrieved = storageService.getConversation(conversation.id)
      expect(retrieved).toEqual(conversation)
    })

    it('should update existing conversation', () => {
      const gpt = {
        id: uuidv4(),
        name: 'Test GPT',
        description: 'Test Description',
        systemPrompt: 'You are a test assistant',
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
      }
      storageService.saveGPT(gpt)

      const conversation = createTestConversation(gpt.id)
      storageService.saveConversation(conversation)

      const updatedConversation = {
        ...conversation,
        messages: [
          ...conversation.messages,
          {
            id: uuidv4(),
            role: 'assistant' as const,
            content: 'Hi there!',
            timestamp: new Date(),
          },
        ],
        updatedAt: new Date(),
      }
      storageService.saveConversation(updatedConversation)

      const retrieved = storageService.getConversation(conversation.id)
      expect(retrieved).toEqual(updatedConversation)
    })

    it('should delete conversation', () => {
      const gpt = {
        id: uuidv4(),
        name: 'Test GPT',
        description: 'Test Description',
        systemPrompt: 'You are a test assistant',
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
      }
      storageService.saveGPT(gpt)

      const conversation = createTestConversation(gpt.id)
      storageService.saveConversation(conversation)
      storageService.deleteConversation(conversation.id)
      expect(storageService.getConversation(conversation.id)).toBeUndefined()
    })

    it('should list all conversations for a GPT', () => {
      const gpt = {
        id: uuidv4(),
        name: 'Test GPT',
        description: 'Test Description',
        systemPrompt: 'You are a test assistant',
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
      }
      storageService.saveGPT(gpt)

      const conversation1 = createTestConversation(gpt.id)
      const conversation2 = createTestConversation(gpt.id)
      storageService.saveConversation(conversation1)
      storageService.saveConversation(conversation2)

      const conversations = storageService.getConversationsForGPT(gpt.id)
      expect(conversations).toHaveLength(2)
      expect(conversations).toContainEqual(conversation1)
      expect(conversations).toContainEqual(conversation2)
    })
  })

  describe('Data Persistence', () => {
    it('should persist data to localStorage', () => {
      const gpt = {
        id: uuidv4(),
        name: 'Test GPT',
        description: 'Test Description',
        systemPrompt: 'You are a test assistant',
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
      }
      storageService.saveGPT(gpt)

      const conversation = {
        id: uuidv4(),
        gptId: gpt.id,
        messages: [
          {
            id: uuidv4(),
            role: 'user' as const,
            content: 'Hello',
            timestamp: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      storageService.saveConversation(conversation)

      // Create new service instance to test persistence
      const newService = new LocalStorageService()
      expect(newService.getGPT(gpt.id)).toEqual(gpt)
      expect(newService.getConversation(conversation.id)).toEqual(conversation)
    })

    it('should handle storage quota exceeded', () => {
      // Mock localStorage.setItem to throw quota exceeded error
      const originalSetItem = localStorage.setItem
      localStorage.setItem = vi.fn().mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })

      const gpt = {
        id: uuidv4(),
        name: 'Test GPT',
        description: 'Test Description',
        systemPrompt: 'You are a test assistant',
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
      }

      expect(() => storageService.saveGPT(gpt)).toThrow('QuotaExceededError')

      // Restore original setItem
      localStorage.setItem = originalSetItem
    })
  })
})
