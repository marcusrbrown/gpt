import {LRUCache} from 'lru-cache';
import {GPTConfiguration, Conversation, GPTConfigurationSchema, ConversationSchema} from '../types/gpt';

/**
 * Storage keys for different data types
 */
const STORAGE_KEYS = {
  GPTS: 'gpts',
  CONVERSATIONS: 'conversations',
  SETTINGS: 'settings',
} as const;

/**
 * Cache configuration for in-memory storage
 */
const CACHE_CONFIG = {
  max: 500, // Maximum number of items to store in memory
  ttl: 1000 * 60 * 60, // 1 hour TTL
} as const;

/**
 * Local storage service for managing GPT configurations and conversations
 */
export class LocalStorageService {
  private gptsCache: LRUCache<string, GPTConfiguration>;
  private conversationsCache: LRUCache<string, Conversation>;

  constructor() {
    this.gptsCache = new LRUCache<string, GPTConfiguration>(CACHE_CONFIG);
    this.conversationsCache = new LRUCache<string, Conversation>(CACHE_CONFIG);
    this.initializeFromStorage();
  }

  /**
   * Initialize cache from localStorage
   */
  private initializeFromStorage(): void {
    try {
      const storedGpts = localStorage.getItem(STORAGE_KEYS.GPTS);
      if (storedGpts) {
        try {
          const gpts = JSON.parse(storedGpts) as Record<string, GPTConfiguration>;
          Object.entries(gpts).forEach(([id, gpt]) => {
            const validatedGpt = GPTConfigurationSchema.parse({
              ...gpt,
              createdAt: new Date(gpt.createdAt),
              updatedAt: new Date(gpt.updatedAt),
            });
            this.gptsCache.set(id, validatedGpt);
          });
        } catch (error) {
          console.error('Error parsing GPTs from storage:', error);
          localStorage.removeItem(STORAGE_KEYS.GPTS);
        }
      }

      const storedConversations = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
      if (storedConversations) {
        try {
          const conversations = JSON.parse(storedConversations) as Record<string, Conversation>;
          Object.entries(conversations).forEach(([id, conversation]) => {
            const validatedConversation = ConversationSchema.parse({
              ...conversation,
              createdAt: new Date(conversation.createdAt),
              updatedAt: new Date(conversation.updatedAt),
              messages: conversation.messages.map((msg) => ({
                ...msg,
                timestamp: new Date(msg.timestamp),
              })),
            });
            this.conversationsCache.set(id, validatedConversation);
          });
        } catch (error) {
          console.error('Error parsing conversations from storage:', error);
          localStorage.removeItem(STORAGE_KEYS.CONVERSATIONS);
        }
      }
    } catch (error) {
      console.error('Error initializing from storage:', error);
      // Clear potentially corrupted data
      localStorage.clear();
      throw error;
    }
  }

  /**
   * Save cache to localStorage
   */
  private persistToStorage(): void {
    try {
      const gptsMap = new Map<string, GPTConfiguration>();
      for (const [key, value] of this.gptsCache.entries()) {
        gptsMap.set(key, value);
      }
      localStorage.setItem(STORAGE_KEYS.GPTS, JSON.stringify(Object.fromEntries(gptsMap)));

      const conversationsMap = new Map<string, Conversation>();
      for (const [key, value] of this.conversationsCache.entries()) {
        conversationsMap.set(key, value);
      }
      localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(Object.fromEntries(conversationsMap)));
    } catch (error) {
      console.error('Error persisting to storage:', error);
      throw error;
    }
  }

  /**
   * Get a GPT configuration by ID
   */
  getGPT(id: string): GPTConfiguration | undefined {
    return this.gptsCache.get(id);
  }

  /**
   * Get all GPT configurations
   */
  getAllGPTs(): GPTConfiguration[] {
    return Array.from(this.gptsCache.values());
  }

  /**
   * Save a GPT configuration
   */
  saveGPT(gpt: GPTConfiguration): void {
    try {
      const validatedGpt = GPTConfigurationSchema.parse(gpt);
      this.gptsCache.set(gpt.id, validatedGpt);
      this.persistToStorage();
    } catch (error) {
      console.error('Error saving GPT:', error);
      throw error;
    }
  }

  /**
   * Delete a GPT configuration
   */
  deleteGPT(id: string): void {
    try {
      this.gptsCache.delete(id);
      this.persistToStorage();
    } catch (error) {
      console.error('Error deleting GPT:', error);
      throw error;
    }
  }

  /**
   * Get a conversation by ID
   */
  getConversation(id: string): Conversation | undefined {
    return this.conversationsCache.get(id);
  }

  /**
   * Get all conversations for a GPT
   */
  getConversationsForGPT(gptId: string): Conversation[] {
    return Array.from(this.conversationsCache.values()).filter((conversation) => conversation.gptId === gptId);
  }

  /**
   * Save a conversation
   */
  saveConversation(conversation: Conversation): void {
    try {
      const validatedConversation = ConversationSchema.parse(conversation);
      this.conversationsCache.set(conversation.id, validatedConversation);
      this.persistToStorage();
    } catch (error) {
      console.error('Error saving conversation:', error);
      throw error;
    }
  }

  /**
   * Delete a conversation
   */
  deleteConversation(id: string): void {
    try {
      this.conversationsCache.delete(id);
      this.persistToStorage();
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }

  /**
   * Clear all data from storage
   */
  clearAll(): void {
    try {
      this.gptsCache.clear();
      this.conversationsCache.clear();
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  }
}
