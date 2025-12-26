import type {ExportFormat} from '../services/conversation-export-service'
import type {SearchResult} from '../services/conversation-search-service'
import type {Conversation, ConversationMessage} from '../types/gpt'
import type {GetConversationsOptions} from './conversation-context'
import {use, useCallback, useEffect, useMemo, useState, type ReactNode} from 'react'
import {v4 as uuid} from 'uuid'
import {conversationExportService} from '../services/conversation-export-service'
import {conversationSearchService} from '../services/conversation-search-service'
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

  const createConversation = useCallback(
    async (gptId: string, initialMessage?: string): Promise<Conversation> => {
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
          isPinned: false,
          isArchived: false,
          pinnedAt: null,
          archivedAt: null,
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
    },
    [storageContext],
  )

  const loadConversation = useCallback(
    async (id: string): Promise<void> => {
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
    },
    [storageContext],
  )

  const sendMessage = useCallback(
    async (content: string): Promise<ConversationMessage | null> => {
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
    },
    [storageContext, currentConversation],
  )

  const deleteConversation = useCallback(
    async (id: string): Promise<boolean> => {
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
    },
    [storageContext, currentConversation],
  )

  const importConversation = useCallback(
    async (jsonData: string): Promise<Conversation> => {
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
          isPinned: importedConversation.isPinned ?? false,
          isArchived: importedConversation.isArchived ?? false,
          pinnedAt: importedConversation.pinnedAt ? new Date(importedConversation.pinnedAt) : null,
          archivedAt: importedConversation.archivedAt ? new Date(importedConversation.archivedAt) : null,
        }

        await storageContext.saveConversation(validatedConversation)
        setConversations(prev => [...prev, validatedConversation])

        return validatedConversation
      } catch (error_) {
        const error = error_ instanceof Error ? error_ : new Error('Failed to import conversation')
        setError(error)
        throw error
      }
    },
    [storageContext],
  )

  const pinConversation = useCallback(
    async (id: string, pinned: boolean): Promise<void> => {
      if (!storageContext) throw new Error('Storage context is not available')

      try {
        await storageContext.pinConversation(id, pinned)
        const now = pinned ? new Date() : null
        setConversations(prev => prev.map(conv => (conv.id === id ? {...conv, isPinned: pinned, pinnedAt: now} : conv)))
        if (currentConversation?.id === id) {
          setCurrentConversation(prev => (prev ? {...prev, isPinned: pinned, pinnedAt: now} : null))
        }
      } catch (error_) {
        const error = error_ instanceof Error ? error_ : new Error('Failed to pin conversation')
        setError(error)
        throw error
      }
    },
    [storageContext, currentConversation],
  )

  const archiveConversation = useCallback(
    async (id: string, archived: boolean): Promise<void> => {
      if (!storageContext) throw new Error('Storage context is not available')

      try {
        await storageContext.archiveConversation(id, archived)
        const now = archived ? new Date() : null
        setConversations(prev =>
          prev.map(conv => (conv.id === id ? {...conv, isArchived: archived, archivedAt: now} : conv)),
        )
        if (currentConversation?.id === id) {
          setCurrentConversation(prev => (prev ? {...prev, isArchived: archived, archivedAt: now} : null))
        }
      } catch (error_) {
        const error = error_ instanceof Error ? error_ : new Error('Failed to archive conversation')
        setError(error)
        throw error
      }
    },
    [storageContext, currentConversation],
  )

  const updateConversationTitle = useCallback(
    async (id: string, title: string): Promise<void> => {
      if (!storageContext) throw new Error('Storage context is not available')

      try {
        await storageContext.updateConversationTitle(id, title)
        setConversations(prev => prev.map(conv => (conv.id === id ? {...conv, title} : conv)))
        if (currentConversation?.id === id) {
          setCurrentConversation(prev => (prev ? {...prev, title} : null))
        }
      } catch (error_) {
        const error = error_ instanceof Error ? error_ : new Error('Failed to update conversation title')
        setError(error)
        throw error
      }
    },
    [storageContext, currentConversation],
  )

  const bulkPinConversations = useCallback(
    async (ids: string[], pinned: boolean): Promise<void> => {
      if (!storageContext) throw new Error('Storage context is not available')

      try {
        await storageContext.bulkPinConversations(ids, pinned)
        const now = pinned ? new Date() : null
        const idSet = new Set(ids)
        setConversations(prev =>
          prev.map(conv => (idSet.has(conv.id) ? {...conv, isPinned: pinned, pinnedAt: now} : conv)),
        )
      } catch (error_) {
        const error = error_ instanceof Error ? error_ : new Error('Failed to bulk pin conversations')
        setError(error)
        throw error
      }
    },
    [storageContext],
  )

  const bulkArchiveConversations = useCallback(
    async (ids: string[], archived: boolean): Promise<void> => {
      if (!storageContext) throw new Error('Storage context is not available')

      try {
        await storageContext.bulkArchiveConversations(ids, archived)
        const now = archived ? new Date() : null
        const idSet = new Set(ids)
        setConversations(prev =>
          prev.map(conv => (idSet.has(conv.id) ? {...conv, isArchived: archived, archivedAt: now} : conv)),
        )
      } catch (error_) {
        const error = error_ instanceof Error ? error_ : new Error('Failed to bulk archive conversations')
        setError(error)
        throw error
      }
    },
    [storageContext],
  )

  const bulkDeleteConversations = useCallback(
    async (ids: string[]): Promise<void> => {
      if (!storageContext) throw new Error('Storage context is not available')

      try {
        await storageContext.bulkDeleteConversations(ids)
        const idSet = new Set(ids)
        setConversations(prev => prev.filter(conv => !idSet.has(conv.id)))
        if (currentConversation && idSet.has(currentConversation.id)) {
          setCurrentConversation(null)
        }
      } catch (error_) {
        const error = error_ instanceof Error ? error_ : new Error('Failed to bulk delete conversations')
        setError(error)
        throw error
      }
    },
    [storageContext, currentConversation],
  )

  const getConversations = useCallback(
    async (options?: GetConversationsOptions): Promise<Conversation[]> => {
      if (!storageContext) throw new Error('Storage context is not available')

      try {
        return await storageContext.getConversations(options)
      } catch (error_) {
        const error = error_ instanceof Error ? error_ : new Error('Failed to get conversations')
        setError(error)
        throw error
      }
    },
    [storageContext],
  )

  const searchConversations = useCallback(
    async (query: string, options?: {gptId?: string; includeArchived?: boolean}): Promise<SearchResult[]> => {
      if (!storageContext) throw new Error('Storage context is not available')

      try {
        const allConversations = await storageContext.getConversations({
          gptId: options?.gptId,
          includeArchived: options?.includeArchived ?? false,
        })
        return conversationSearchService.search(allConversations, query)
      } catch (error_) {
        const error = error_ instanceof Error ? error_ : new Error('Failed to search conversations')
        setError(error)
        throw error
      }
    },
    [storageContext],
  )

  const exportConversationWithFormat = useCallback(
    async (id: string, format: ExportFormat = 'json'): Promise<string> => {
      if (!storageContext) throw new Error('Storage context is not available')

      const conversation = await storageContext.getConversation(id)
      if (!conversation) {
        throw new Error('Conversation not found')
      }

      return conversationExportService.export(conversation, {
        format,
        includeMetadata: true,
        includeTimestamps: true,
      })
    },
    [storageContext],
  )

  const downloadConversation = useCallback(
    async (id: string, format: ExportFormat, gptName?: string): Promise<void> => {
      if (!storageContext) throw new Error('Storage context is not available')

      const conversation = await storageContext.getConversation(id)
      if (!conversation) {
        throw new Error('Conversation not found')
      }

      const content = conversationExportService.export(conversation, {
        format,
        includeMetadata: true,
        includeTimestamps: true,
      })

      const filename = conversationExportService.generateFilename(conversation, format, gptName)
      const mimeType = format === 'json' ? 'application/json' : 'text/markdown'
      conversationExportService.downloadExport(content, filename, mimeType)
    },
    [storageContext],
  )

  const value = useMemo(
    () => ({
      conversations,
      currentConversation,
      isLoading,
      error,
      createConversation,
      loadConversation,
      sendMessage,
      deleteConversation,
      pinConversation,
      archiveConversation,
      updateConversationTitle,
      bulkPinConversations,
      bulkArchiveConversations,
      bulkDeleteConversations,
      getConversations,
      searchConversations,
      exportConversation: exportConversationWithFormat,
      downloadConversation,
      importConversation,
    }),
    [
      conversations,
      currentConversation,
      isLoading,
      error,
      createConversation,
      loadConversation,
      sendMessage,
      deleteConversation,
      pinConversation,
      archiveConversation,
      updateConversationTitle,
      bulkPinConversations,
      bulkArchiveConversations,
      bulkDeleteConversations,
      getConversations,
      searchConversations,
      exportConversationWithFormat,
      downloadConversation,
      importConversation,
    ],
  )

  return <ConversationContext value={value}>{children}</ConversationContext>
}
