import type {Conversation, ConversationMessage} from '../types/gpt'
import {use, useEffect, useState, type ReactNode} from 'react'
import {v4 as uuid} from 'uuid'
import {ConversationContext} from './conversation-context'
import {StorageContext} from './storage-context'

interface ConversationProviderProps {
  children: ReactNode
}

export function ConversationProvider({children}: ConversationProviderProps) {
  const storageContext = use(StorageContext)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!storageContext || storageContext.isLoading) return

    const loadData = async (): Promise<void> => {
      try {
        const allGpts = await storageContext.getAllGPTs()
        const allConversations: Conversation[] = []

        for (const gpt of allGpts) {
          const gptConversations = await storageContext.getConversationsForGPT(gpt.id)
          if (gptConversations.length > 0) {
            allConversations.push(...gptConversations)
          }
        }

        setConversations(allConversations)
      } catch (error_) {
        setError(error_ instanceof Error ? error_ : new Error('Failed to load conversations'))
      } finally {
        setIsLoading(false)
      }
    }

    loadData().catch(console.error)
  }, [storageContext])

  const createConversation = async (gptId: string, initialMessage?: string): Promise<Conversation> => {
    if (!storageContext) throw new Error('Storage context is not available')

    try {
      const now = new Date()
      const initialMessages: ConversationMessage[] =
        typeof initialMessage === 'string' && initialMessage.trim().length > 0
          ? [
              {
                id: uuid(),
                role: 'user',
                content: initialMessage.trim(),
                timestamp: now,
              },
            ]
          : []

      const newConversation: Conversation = {
        id: uuid(),
        gptId,
        messages: initialMessages,
        createdAt: now,
        updatedAt: now,
        messageCount: initialMessages.length,
        tags: [],
      }

      await storageContext.saveConversation(newConversation)
      setConversations(prev => [...prev, newConversation])
      setCurrentConversation(newConversation)

      return newConversation
    } catch (error_) {
      const error = error_ instanceof Error ? error_ : new Error('Failed to create conversation')
      setError(error)
      throw error
    }
  }

  const loadConversation = async (id: string): Promise<void> => {
    if (!storageContext) throw new Error('Storage context is not available')

    try {
      setIsLoading(true)
      const conversation = await storageContext.getConversation(id)

      if (!conversation) {
        throw new Error('Conversation not found')
      }

      setCurrentConversation(conversation)
    } catch (error_) {
      setError(error_ instanceof Error ? error_ : new Error('Failed to load conversation'))
      throw error_
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async (content: string): Promise<ConversationMessage | null> => {
    if (!storageContext) throw new Error('Storage context is not available')
    if (!currentConversation) throw new Error('No active conversation')

    try {
      const now = new Date()
      const newMessage: ConversationMessage = {
        id: uuid(),
        role: 'user',
        content,
        timestamp: now,
      }

      const updatedMessages = [...currentConversation.messages, newMessage]
      const updatedConversation: Conversation = {
        ...currentConversation,
        messages: updatedMessages,
        updatedAt: now,
        messageCount: updatedMessages.length,
      }

      await storageContext.saveConversation(updatedConversation)
      setCurrentConversation(updatedConversation)
      setConversations(prev => prev.map(conv => (conv.id === updatedConversation.id ? updatedConversation : conv)))

      return newMessage
    } catch (error_) {
      setError(error_ instanceof Error ? error_ : new Error('Failed to send message'))
      return null
    }
  }

  const deleteConversation = async (id: string): Promise<boolean> => {
    if (!storageContext) throw new Error('Storage context is not available')

    try {
      await storageContext.deleteConversation(id)
      setConversations(prev => prev.filter(conv => conv.id !== id))

      if (currentConversation?.id === id) {
        setCurrentConversation(null)
      }

      return true
    } catch (error_) {
      setError(error_ instanceof Error ? error_ : new Error('Failed to delete conversation'))
      return false
    }
  }

  const exportConversation = async (id: string): Promise<string> => {
    if (!storageContext) throw new Error('Storage context is not available')

    const conversation = await storageContext.getConversation(id)

    if (!conversation) {
      throw new Error('Conversation not found')
    }

    return JSON.stringify(conversation, null, 2)
  }

  const importConversation = async (jsonData: string): Promise<Conversation> => {
    if (!storageContext) throw new Error('Storage context is not available')

    try {
      const importedConversation = JSON.parse(jsonData) as Conversation

      if (!importedConversation.id || !importedConversation.gptId) {
        throw new Error('Invalid conversation data')
      }

      importedConversation.createdAt = new Date(importedConversation.createdAt)
      importedConversation.updatedAt = new Date()

      const processedMessages = importedConversation.messages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }))

      const validatedConversation: Conversation = {
        ...importedConversation,
        messages: processedMessages,
        messageCount: processedMessages.length,
        tags: importedConversation.tags ?? [],
      }

      await storageContext.saveConversation(validatedConversation)
      setConversations(prev => [...prev, validatedConversation])

      return validatedConversation
    } catch (error_) {
      const error = error_ instanceof Error ? error_ : new Error('Failed to import conversation')
      setError(error)
      throw error
    }
  }

  return (
    <ConversationContext
      value={{
        conversations,
        currentConversation,
        isLoading,
        error,
        createConversation,
        loadConversation,
        sendMessage,
        deleteConversation,
        exportConversation,
        importConversation,
      }}
    >
      {children}
    </ConversationContext>
  )
}
