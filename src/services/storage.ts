import {LRUCache} from 'lru-cache'
import {ConversationSchema, GPTConfigurationSchema, type Conversation, type GPTConfiguration} from '../types/gpt'

/**
 * Storage keys for different data types
 */
const STORAGE_KEYS = {
  GPTS: 'gpts',
  CONVERSATIONS: 'conversations',
  SETTINGS: 'settings',
} as const

/**
 * Cache configuration for in-memory storage
 */
const CACHE_CONFIG = {
  max: 500, // Maximum number of items to store in memory
  ttl: 1000 * 60 * 60, // 1 hour TTL
} as const

/**
 * Custom error class for storage operations
 */
export class StorageError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'StorageError'
  }
}

/**
 * Type for raw GPT data from storage
 */
interface RawGPTData {
  id: string
  name: string
  description: string
  systemPrompt: string
  tools: unknown[]
  knowledge: {
    files: unknown[]
    urls: string[]
  }
  capabilities: {
    codeInterpreter: boolean
    webBrowsing: boolean
    imageGeneration: boolean
  }
  createdAt: string | number
  updatedAt: string | number
  version: number
}

/**
 * Type for raw conversation data from storage
 */
interface RawConversationData {
  id: string
  gptId: string
  messages: {
    id: string
    role: string
    content: string
    timestamp: string | number
  }[]
  createdAt: string | number
  updatedAt: string | number
}

/**
 * Local storage service for managing GPT configurations and conversations
 */
export class LocalStorageService {
  private readonly gptsCache: LRUCache<string, GPTConfiguration>
  private readonly conversationsCache: LRUCache<string, Conversation>

  constructor() {
    this.gptsCache = new LRUCache<string, GPTConfiguration>(CACHE_CONFIG)
    this.conversationsCache = new LRUCache<string, Conversation>(CACHE_CONFIG)
    this.initializeFromStorage()
  }

  /**
   * Initialize cache from localStorage
   */
  private initializeFromStorage(): void {
    try {
      this.loadGPTs()
      this.loadConversations()
    } catch (error) {
      console.error('Error initializing from storage:', error)
      // Clear potentially corrupted data
      localStorage.clear()
      throw new StorageError('Failed to initialize storage', error)
    }
  }

  /**
   * Load GPTs from localStorage
   */
  private loadGPTs(): void {
    const storedGpts = localStorage.getItem(STORAGE_KEYS.GPTS)
    // Explicitly handle null/undefined and empty (or whitespace-only) strings
    if (storedGpts == null || storedGpts.trim() === '') return

    try {
      const gpts = JSON.parse(storedGpts) as Record<string, RawGPTData>
      Object.entries(gpts).forEach(([id, gpt]) => {
        try {
          const validatedGpt = GPTConfigurationSchema.parse({
            ...gpt,
            createdAt: new Date(gpt.createdAt),
            updatedAt: new Date(gpt.updatedAt),
          })
          this.gptsCache.set(id, validatedGpt)
        } catch (parseError) {
          console.error(`Error parsing GPT ${id}:`, parseError)
          // Skip invalid GPT but continue processing others
        }
      })
    } catch (error) {
      console.error('Error parsing GPTs from storage:', error)
      localStorage.removeItem(STORAGE_KEYS.GPTS)
    }
  }

  /**
   * Load conversations from localStorage
   */
  private loadConversations(): void {
    const storedConversations = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS)
    // Explicitly handle null/undefined and empty (or whitespace-only) strings
    if (storedConversations == null || storedConversations.trim() === '') return

    try {
      const conversations = JSON.parse(storedConversations) as Record<string, RawConversationData>
      Object.entries(conversations).forEach(([id, conversation]) => {
        try {
          const validatedConversation = ConversationSchema.parse({
            ...conversation,
            createdAt: new Date(conversation.createdAt),
            updatedAt: new Date(conversation.updatedAt),
            messages: conversation.messages.map(msg => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            })),
          })
          this.conversationsCache.set(id, validatedConversation)
        } catch (parseError) {
          console.error(`Error parsing conversation ${id}:`, parseError)
          // Skip invalid conversation but continue processing others
        }
      })
    } catch (error) {
      console.error('Error parsing conversations from storage:', error)
      localStorage.removeItem(STORAGE_KEYS.CONVERSATIONS)
    }
  }

  /**
   * Save cache to localStorage
   * @throws Error with 'QuotaExceededError' message if storage quota is exceeded
   * @throws StorageError for other persistence failures
   */
  private persistToStorage(): void {
    try {
      this.persistGPTs()
      this.persistConversations()
    } catch (error) {
      console.error('Error persisting to storage:', error)
      // Re-throw QuotaExceededError directly to maintain test compatibility
      if (error instanceof Error && error.message.includes('QuotaExceededError')) {
        throw error
      }
      throw new StorageError('Failed to persist data to storage', error)
    }
  }

  /**
   * Persist GPTs to localStorage
   * @throws Error if localStorage operation fails
   */
  private persistGPTs(): void {
    const gptsMap = new Map<string, GPTConfiguration>()
    for (const [key, value] of this.gptsCache.entries()) {
      gptsMap.set(key, value)
    }
    localStorage.setItem(STORAGE_KEYS.GPTS, JSON.stringify(Object.fromEntries(gptsMap)))
  }

  /**
   * Persist conversations to localStorage
   * @throws Error if localStorage operation fails
   */
  private persistConversations(): void {
    const conversationsMap = new Map<string, Conversation>()
    for (const [key, value] of this.conversationsCache.entries()) {
      conversationsMap.set(key, value)
    }
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(Object.fromEntries(conversationsMap)))
  }

  /**
   * Get a GPT configuration by ID
   * @param id The ID of the GPT to retrieve
   * @returns The GPT configuration or undefined if not found
   */
  getGPT(id: string): GPTConfiguration | undefined {
    return this.gptsCache.get(id)
  }

  /**
   * Get all GPT configurations
   * @returns Array of all GPT configurations
   */
  getAllGPTs(): GPTConfiguration[] {
    return Array.from(this.gptsCache.values())
  }

  /**
   * Save a GPT configuration
   * @param gpt The GPT configuration to save
   * @throws StorageError if validation or persistence fails
   * @throws Error with 'QuotaExceededError' message if storage quota is exceeded
   */
  saveGPT(gpt: GPTConfiguration): void {
    try {
      const validatedGpt = GPTConfigurationSchema.parse(gpt)
      this.gptsCache.set(gpt.id, validatedGpt)
      this.persistToStorage()
    } catch (error) {
      console.error('Error saving GPT:', error)
      if (error instanceof Error && error.message.includes('QuotaExceededError')) {
        throw error // Re-throw the original error to maintain the original message
      }
      throw new StorageError('Failed to save GPT configuration', error)
    }
  }

  /**
   * Delete a GPT configuration
   * @param id The ID of the GPT to delete
   * @throws StorageError if persistence fails
   * @throws Error with 'QuotaExceededError' message if storage quota is exceeded
   */
  deleteGPT(id: string): void {
    try {
      this.gptsCache.delete(id)
      this.persistToStorage()
    } catch (error) {
      console.error('Error deleting GPT:', error)
      if (error instanceof Error && error.message.includes('QuotaExceededError')) {
        throw error // Re-throw the original error to maintain the original message
      }
      throw new StorageError('Failed to delete GPT configuration', error)
    }
  }

  /**
   * Get a conversation by ID
   * @param id The ID of the conversation to retrieve
   * @returns The conversation or undefined if not found
   */
  getConversation(id: string): Conversation | undefined {
    return this.conversationsCache.get(id)
  }

  /**
   * Get all conversations for a GPT
   * @param gptId The ID of the GPT to get conversations for
   * @returns Array of conversations for the specified GPT
   */
  getConversationsForGPT(gptId: string): Conversation[] {
    return Array.from(this.conversationsCache.values()).filter(conversation => conversation.gptId === gptId)
  }

  /**
   * Save a conversation
   * @param conversation The conversation to save
   * @throws StorageError if validation or persistence fails
   * @throws Error with 'QuotaExceededError' message if storage quota is exceeded
   */
  saveConversation(conversation: Conversation): void {
    try {
      const validatedConversation = ConversationSchema.parse(conversation)
      this.conversationsCache.set(conversation.id, validatedConversation)
      this.persistToStorage()
    } catch (error) {
      console.error('Error saving conversation:', error)
      if (error instanceof Error && error.message.includes('QuotaExceededError')) {
        throw error // Re-throw the original error to maintain the original message
      }
      throw new StorageError('Failed to save conversation', error)
    }
  }

  /**
   * Delete a conversation
   * @param id The ID of the conversation to delete
   * @throws StorageError if persistence fails
   * @throws Error with 'QuotaExceededError' message if storage quota is exceeded
   */
  deleteConversation(id: string): void {
    try {
      this.conversationsCache.delete(id)
      this.persistToStorage()
    } catch (error) {
      console.error('Error deleting conversation:', error)
      if (error instanceof Error && error.message.includes('QuotaExceededError')) {
        throw error // Re-throw the original error to maintain the original message
      }
      throw new StorageError('Failed to delete conversation', error)
    }
  }

  /**
   * Clear all data from storage
   * @throws StorageError if clearing fails
   * @throws Error with 'QuotaExceededError' message if storage quota is exceeded
   */
  clearAll(): void {
    try {
      this.gptsCache.clear()
      this.conversationsCache.clear()
      localStorage.clear()
    } catch (error) {
      console.error('Error clearing storage:', error)
      if (error instanceof Error && error.message.includes('QuotaExceededError')) {
        throw error // Re-throw the original error to maintain the original message
      }
      throw new StorageError('Failed to clear storage', error)
    }
  }
}
