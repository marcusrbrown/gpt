import {createContext} from 'react'
import {type Conversation, type ConversationMessage} from '../types/gpt'

export interface ConversationContextType {
  conversations: Conversation[]
  currentConversation: Conversation | null
  isLoading: boolean
  error: Error | null
  createConversation: (gptId: string, initialMessage?: string) => Promise<Conversation>
  loadConversation: (id: string) => Promise<void>
  sendMessage: (content: string) => Promise<ConversationMessage | null>
  deleteConversation: (id: string) => Promise<boolean>
  exportConversation: (id: string) => Promise<string>
  importConversation: (jsonData: string) => Promise<Conversation>
}

export const ConversationContext = createContext<ConversationContextType | undefined>(undefined)
