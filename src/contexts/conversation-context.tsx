import type {ExportFormat} from '../services/conversation-export-service'
import type {SearchResult} from '../services/conversation-search-service'
import type {Conversation, ConversationMessage} from '../types/gpt'
import {createContext} from 'react'

export type BulkAction = 'pin' | 'unpin' | 'archive' | 'unarchive' | 'delete'

export interface GetConversationsOptions {
  gptId?: string
  includeArchived?: boolean
  pinnedOnly?: boolean
  limit?: number
  offset?: number
}

export interface ConversationContextType {
  conversations: Conversation[]
  currentConversation: Conversation | null
  isLoading: boolean
  error: Error | null

  createConversation: (gptId: string, initialMessage?: string) => Promise<Conversation>
  loadConversation: (id: string) => Promise<void>
  sendMessage: (content: string) => Promise<ConversationMessage | null>
  deleteConversation: (id: string) => Promise<boolean>

  pinConversation: (id: string, pinned: boolean) => Promise<void>
  archiveConversation: (id: string, archived: boolean) => Promise<void>
  updateConversationTitle: (id: string, title: string) => Promise<void>

  bulkPinConversations: (ids: string[], pinned: boolean) => Promise<void>
  bulkArchiveConversations: (ids: string[], archived: boolean) => Promise<void>
  bulkDeleteConversations: (ids: string[]) => Promise<void>

  getConversations: (options?: GetConversationsOptions) => Promise<Conversation[]>
  searchConversations: (query: string, options?: {gptId?: string; includeArchived?: boolean}) => Promise<SearchResult[]>

  exportConversation: (id: string, format?: ExportFormat) => Promise<string>
  downloadConversation: (id: string, format: ExportFormat, gptName?: string) => Promise<void>
  importConversation: (jsonData: string) => Promise<Conversation>
}

export const ConversationContext = createContext<ConversationContextType | undefined>(undefined)
