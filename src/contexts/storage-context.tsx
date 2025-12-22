import type {StorageEstimate, StorageWarning} from '@/services/storage'
import type {Conversation, GPTConfiguration} from '@/types/gpt'
import {createContext} from 'react'

export interface StorageContextType {
  getGPT: (id: string) => Promise<GPTConfiguration | undefined>
  getAllGPTs: () => Promise<GPTConfiguration[]>
  saveGPT: (gpt: GPTConfiguration) => Promise<void>
  deleteGPT: (id: string) => Promise<void>
  getConversation: (id: string) => Promise<Conversation | undefined>
  getConversationsForGPT: (gptId: string) => Promise<Conversation[]>
  saveConversation: (conversation: Conversation) => Promise<void>
  deleteConversation: (id: string) => Promise<void>
  clearAll: () => Promise<void>
  getStorageUsage: () => Promise<StorageEstimate>
  isLoading: boolean
  isMigrating: boolean
  error: Error | null
  storageWarning: StorageWarning | null
}

export const StorageContext = createContext<StorageContextType | undefined>(undefined)
