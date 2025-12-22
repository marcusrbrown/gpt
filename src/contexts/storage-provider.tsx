import type {Conversation, GPTConfiguration} from '@/types/gpt'
import {migrateFromLocalStorage, needsMigration} from '@/services/migration'
import {IndexedDBStorageService, type StorageWarning} from '@/services/storage'
import {useCallback, useEffect, useRef, useState, type ReactNode} from 'react'
import {StorageContext} from './storage-context'

interface StorageProviderProps {
  children: ReactNode
}

export function StorageProvider({children}: StorageProviderProps) {
  const storageServiceRef = useRef<IndexedDBStorageService | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMigrating, setIsMigrating] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [storageWarning, setStorageWarning] = useState<StorageWarning | null>(null)
  const [, setVersion] = useState(0)

  useEffect(() => {
    const initializeStorage = async (): Promise<void> => {
      try {
        setIsLoading(true)
        setError(null)

        const service = new IndexedDBStorageService()
        storageServiceRef.current = service

        if (needsMigration()) {
          setIsMigrating(true)
          const result = await migrateFromLocalStorage()
          if (!result.success) {
            console.error('Migration failed:', result.errors)
          }
          setIsMigrating(false)
        }

        service.onDataChange(() => {
          setVersion(v => v + 1)
        })

        const usage = await service.getStorageEstimate()
        if (usage.percentUsed >= 90) {
          setStorageWarning({
            type: 'quota_critical',
            message: `Storage is ${usage.percentUsed.toFixed(0)}% full. Consider deleting unused data.`,
            percentUsed: usage.percentUsed,
          })
        } else if (usage.percentUsed >= 80) {
          setStorageWarning({
            type: 'quota_warning',
            message: `Storage is ${usage.percentUsed.toFixed(0)}% full.`,
            percentUsed: usage.percentUsed,
          })
        }
      } catch (error_) {
        console.error('Failed to initialize storage service:', error_)
        setError(error_ instanceof Error ? error_ : new Error('Unknown storage initialization error'))
      } finally {
        setIsLoading(false)
      }
    }

    initializeStorage().catch(console.error)

    return () => {
      storageServiceRef.current?.destroy()
    }
  }, [])

  const getGPT = useCallback(async (id: string): Promise<GPTConfiguration | undefined> => {
    try {
      if (!storageServiceRef.current) return undefined
      return await storageServiceRef.current.getGPT(id)
    } catch (error_) {
      console.error(`Error getting GPT ${id}:`, error_)
      setError(error_ instanceof Error ? error_ : new Error(`Failed to get GPT ${id}`))
      return undefined
    }
  }, [])

  const getAllGPTs = useCallback(async (): Promise<GPTConfiguration[]> => {
    try {
      if (!storageServiceRef.current) return []
      return await storageServiceRef.current.getAllGPTs()
    } catch (error_) {
      console.error('Error getting all GPTs:', error_)
      setError(error_ instanceof Error ? error_ : new Error('Failed to get all GPTs'))
      return []
    }
  }, [])

  const saveGPT = useCallback(async (gpt: GPTConfiguration): Promise<void> => {
    try {
      if (!storageServiceRef.current) throw new Error('Storage not initialized')
      await storageServiceRef.current.saveGPT(gpt)
      setVersion(v => v + 1)
    } catch (error_) {
      console.error('Error saving GPT:', error_)
      setError(error_ instanceof Error ? error_ : new Error('Failed to save GPT'))
      throw error_
    }
  }, [])

  const deleteGPT = useCallback(async (id: string): Promise<void> => {
    try {
      if (!storageServiceRef.current) throw new Error('Storage not initialized')
      await storageServiceRef.current.deleteGPT(id)
      setVersion(v => v + 1)
    } catch (error_) {
      console.error(`Error deleting GPT ${id}:`, error_)
      setError(error_ instanceof Error ? error_ : new Error(`Failed to delete GPT ${id}`))
      throw error_
    }
  }, [])

  const getConversation = useCallback(async (id: string): Promise<Conversation | undefined> => {
    try {
      if (!storageServiceRef.current) return undefined
      return await storageServiceRef.current.getConversation(id)
    } catch (error_) {
      console.error(`Error getting conversation ${id}:`, error_)
      setError(error_ instanceof Error ? error_ : new Error(`Failed to get conversation ${id}`))
      return undefined
    }
  }, [])

  const getConversationsForGPT = useCallback(async (gptId: string): Promise<Conversation[]> => {
    try {
      if (!storageServiceRef.current) return []
      return await storageServiceRef.current.getConversationsForGPT(gptId)
    } catch (error_) {
      console.error(`Error getting conversations for GPT ${gptId}:`, error_)
      setError(error_ instanceof Error ? error_ : new Error(`Failed to get conversations for GPT ${gptId}`))
      return []
    }
  }, [])

  const saveConversation = useCallback(async (conversation: Conversation): Promise<void> => {
    try {
      if (!storageServiceRef.current) throw new Error('Storage not initialized')
      await storageServiceRef.current.saveConversation(conversation)
      setVersion(v => v + 1)
    } catch (error_) {
      console.error('Error saving conversation:', error_)
      setError(error_ instanceof Error ? error_ : new Error('Failed to save conversation'))
      throw error_
    }
  }, [])

  const deleteConversation = useCallback(async (id: string): Promise<void> => {
    try {
      if (!storageServiceRef.current) throw new Error('Storage not initialized')
      await storageServiceRef.current.deleteConversation(id)
      setVersion(v => v + 1)
    } catch (error_) {
      console.error(`Error deleting conversation ${id}:`, error_)
      setError(error_ instanceof Error ? error_ : new Error(`Failed to delete conversation ${id}`))
      throw error_
    }
  }, [])

  const clearAll = useCallback(async (): Promise<void> => {
    try {
      if (!storageServiceRef.current) throw new Error('Storage not initialized')
      await storageServiceRef.current.clearAll()
      setVersion(v => v + 1)
    } catch (error_) {
      console.error('Error clearing storage:', error_)
      setError(error_ instanceof Error ? error_ : new Error('Failed to clear storage'))
      throw error_
    }
  }, [])

  const getStorageUsage = useCallback(async () => {
    try {
      if (!storageServiceRef.current) return {used: 0, quota: 0, percentUsed: 0}
      return await storageServiceRef.current.getStorageEstimate()
    } catch (error_) {
      console.error('Error getting storage usage:', error_)
      return {used: 0, quota: 0, percentUsed: 0}
    }
  }, [])

  const value = {
    getGPT,
    getAllGPTs,
    saveGPT,
    deleteGPT,
    getConversation,
    getConversationsForGPT,
    saveConversation,
    deleteConversation,
    clearAll,
    getStorageUsage,
    isLoading,
    isMigrating,
    error,
    storageWarning,
  }

  return <StorageContext value={value}>{children}</StorageContext>
}
