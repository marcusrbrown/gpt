import type {StorageEstimate, StorageWarning} from '@/services/storage'
import type {Conversation, GPTConfiguration} from '@/types/gpt'
import type {DeleteResult, FolderTreeNode, GPTFolder, GPTVersion} from '@/types/gpt-extensions'
import {createContext} from 'react'

export interface StorageContextType {
  getGPT: (id: string) => Promise<GPTConfiguration | undefined>
  getAllGPTs: () => Promise<GPTConfiguration[]>
  saveGPT: (gpt: GPTConfiguration) => Promise<void>
  deleteGPT: (id: string) => Promise<void>
  archiveGPT: (id: string) => Promise<void>
  restoreGPT: (id: string) => Promise<void>
  getArchivedGPTs: () => Promise<GPTConfiguration[]>
  duplicateGPT: (id: string, newName?: string) => Promise<GPTConfiguration>
  deleteGPTPermanently: (id: string) => Promise<DeleteResult>
  getConversation: (id: string) => Promise<Conversation | undefined>
  getConversationsForGPT: (gptId: string) => Promise<Conversation[]>
  saveConversation: (conversation: Conversation) => Promise<void>
  deleteConversation: (id: string) => Promise<void>
  createVersion: (gptId: string, changeDescription?: string) => Promise<GPTVersion>
  getVersions: (gptId: string) => Promise<GPTVersion[]>
  restoreVersion: (versionId: string) => Promise<GPTConfiguration>
  createFolder: (name: string, parentId?: string | null) => Promise<GPTFolder>
  renameFolder: (id: string, name: string) => Promise<void>
  deleteFolder: (id: string) => Promise<void>
  getFolderTree: () => Promise<FolderTreeNode[]>
  moveGPTToFolder: (gptId: string, folderId: string | null) => Promise<void>
  clearAll: () => Promise<void>
  getStorageUsage: () => Promise<StorageEstimate>
  isLoading: boolean
  isMigrating: boolean
  error: Error | null
  storageWarning: StorageWarning | null
}

export const StorageContext = createContext<StorageContextType | undefined>(undefined)
