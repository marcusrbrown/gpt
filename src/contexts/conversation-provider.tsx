import type {Conversation, ConversationMessage, GPTConfiguration} from '../types/gpt'
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

  // Initialize and load conversations
  useEffect(() => {
    if (!storageContext) return

    const loadData = (): void => {
      try {
        const allGpts = storageContext.getAllGPTs()
        const allConversations: Conversation[] = []

        // Gather all conversations for all GPTs
        allGpts.forEach((gpt: GPTConfiguration) => {
          const gptConversations = storageContext.getConversationsForGPT(gpt.id)
          if (gptConversations && gptConversations.length > 0) {
            allConversations.push(...gptConversations)
          }
        })

        setConversations(allConversations)
      } catch (error_) {
        setError(error_ instanceof Error ? error_ : new Error('Failed to load conversations'))
      } finally {
        setIsLoading(false)
      }
    }

    // Execute the loading function
    loadData()
  }, [storageContext])

  const createConversation = async (gptId: string, initialMessage?: string): Promise<Conversation> => {
    if (!storageContext) throw new Error('Storage context is not available')

    try {
      const now = new Date()
      const initialMessages: ConversationMessage[] = initialMessage
        ? [
            {
              id: uuid(),
              role: 'user',
              content: initialMessage,
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
      }

      await Promise.resolve() // Adds await to make the async function valid
      storageContext.saveConversation(newConversation)
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
      const conversation = storageContext.getConversation(id)

      if (!conversation) {
        throw new Error('Conversation not found')
      }

      await Promise.resolve() // Adds await to make the async function valid
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
      const updatedConversation = {
        ...currentConversation,
        messages: updatedMessages,
        updatedAt: now,
      }

      await Promise.resolve() // Adds await to make the async function valid
      storageContext.saveConversation(updatedConversation as Conversation)
      setCurrentConversation(updatedConversation as Conversation)
      setConversations(prev =>
        prev.map(conv => (conv.id === updatedConversation.id ? (updatedConversation as Conversation) : conv)),
      )

      return newMessage
    } catch (error_) {
      setError(error_ instanceof Error ? error_ : new Error('Failed to send message'))
      return null
    }
  }

  const deleteConversation = async (id: string): Promise<boolean> => {
    if (!storageContext) throw new Error('Storage context is not available')

    try {
      await Promise.resolve() // Adds await to make the async function valid
      storageContext.deleteConversation(id)
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

    await Promise.resolve() // Adds await to make the async function valid
    const conversation = storageContext.getConversation(id)

    if (!conversation) {
      throw new Error('Conversation not found')
    }

    return JSON.stringify(conversation, null, 2)
  }

  const importConversation = async (jsonData: string): Promise<Conversation> => {
    if (!storageContext) throw new Error('Storage context is not available')

    try {
      const importedConversation = JSON.parse(jsonData) as Conversation

      // Validate required fields
      if (!importedConversation.id || !importedConversation.gptId) {
        throw new Error('Invalid conversation data')
      }

      // Ensure dates are Date objects
      importedConversation.createdAt = new Date(importedConversation.createdAt)
      importedConversation.updatedAt = new Date()

      const processedMessages = importedConversation.messages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }))

      const validatedConversation = {
        ...importedConversation,
        messages: processedMessages,
      } as Conversation

      await Promise.resolve() // Adds await to make the async function valid
      storageContext.saveConversation(validatedConversation)
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
