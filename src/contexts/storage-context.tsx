import type {Conversation, GPTConfiguration} from '../types/gpt'
import {createContext} from 'react'

/**
 * Interface for the storage context
 * Provides methods for managing GPT configurations and conversations
 */
export interface StorageContextType {
  getGPT: (id: string) => GPTConfiguration | undefined
  getAllGPTs: () => GPTConfiguration[]
  saveGPT: (gpt: GPTConfiguration) => void
  deleteGPT: (id: string) => void
  getConversation: (id: string) => Conversation | undefined
  getConversationsForGPT: (gptId: string) => Conversation[]
  saveConversation: (conversation: Conversation) => void
  deleteConversation: (id: string) => void
  clearAll: () => void
  isLoading: boolean
  error: Error | null
}

export const StorageContext = createContext<StorageContextType | undefined>(undefined)
