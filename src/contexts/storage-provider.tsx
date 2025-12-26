import type {Conversation, GPTConfiguration} from '@/types/gpt'
import type {DeleteResult, FolderTreeNode, GPTFolder, GPTVersion} from '@/types/gpt-extensions'
import {FolderService} from '@/services/folder-service'
import {migrateFromLocalStorage, needsMigration} from '@/services/migration'
import {IndexedDBStorageService, type GetConversationsOptions, type StorageWarning} from '@/services/storage'
import {VersionHistoryService} from '@/services/version-history'
import {useCallback, useEffect, useMemo, useRef, useState, type ReactNode} from 'react'
import {StorageContext} from './storage-context'

interface StorageProviderProps {
  children: ReactNode
}

export function StorageProvider({children}: StorageProviderProps) {
  const storageServiceRef = useRef<IndexedDBStorageService | null>(null)
  const versionHistoryRef = useRef<VersionHistoryService | null>(null)
  const folderServiceRef = useRef<FolderService | null>(null)
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
        versionHistoryRef.current = new VersionHistoryService()
        folderServiceRef.current = new FolderService()

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
            type: 'critical_limit',
            message: `Storage is ${usage.percentUsed.toFixed(0)}% full. Consider deleting unused data.`,
            percentUsed: usage.percentUsed,
          })
        } else if (usage.percentUsed >= 80) {
          setStorageWarning({
            type: 'approaching_limit',
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

  const archiveGPT = useCallback(async (id: string): Promise<void> => {
    if (!storageServiceRef.current) throw new Error('Storage not initialized')
    await storageServiceRef.current.archiveGPT(id)
    setVersion(v => v + 1)
  }, [])

  const restoreGPT = useCallback(async (id: string): Promise<void> => {
    if (!storageServiceRef.current) throw new Error('Storage not initialized')
    await storageServiceRef.current.restoreGPT(id)
    setVersion(v => v + 1)
  }, [])

  const getArchivedGPTs = useCallback(async (): Promise<GPTConfiguration[]> => {
    if (!storageServiceRef.current) return []
    return storageServiceRef.current.getArchivedGPTs()
  }, [])

  const duplicateGPT = useCallback(async (id: string, newName?: string): Promise<GPTConfiguration> => {
    if (!storageServiceRef.current) throw new Error('Storage not initialized')
    const duplicate = await storageServiceRef.current.duplicateGPT(id, newName)
    setVersion(v => v + 1)
    return duplicate
  }, [])

  const deleteGPTPermanently = useCallback(async (id: string): Promise<DeleteResult> => {
    if (!storageServiceRef.current) throw new Error('Storage not initialized')
    const result = await storageServiceRef.current.deleteGPTPermanently(id)
    setVersion(v => v + 1)
    return result
  }, [])

  const createVersion = useCallback(async (gptId: string, changeDescription?: string): Promise<GPTVersion> => {
    if (!versionHistoryRef.current) throw new Error('Version history not initialized')
    return versionHistoryRef.current.createVersion(gptId, changeDescription)
  }, [])

  const getVersions = useCallback(async (gptId: string): Promise<GPTVersion[]> => {
    if (!versionHistoryRef.current) return []
    return versionHistoryRef.current.getVersions(gptId)
  }, [])

  const restoreVersion = useCallback(async (versionId: string): Promise<GPTConfiguration> => {
    if (!versionHistoryRef.current) throw new Error('Version history not initialized')
    const restored = await versionHistoryRef.current.restoreVersion(versionId)
    setVersion(v => v + 1)
    return restored
  }, [])

  const createFolder = useCallback(async (name: string, parentId?: string | null): Promise<GPTFolder> => {
    if (!folderServiceRef.current) throw new Error('Folder service not initialized')
    const folder = await folderServiceRef.current.createFolder(name, parentId ?? null)
    setVersion(v => v + 1)
    return folder
  }, [])

  const renameFolder = useCallback(async (id: string, name: string): Promise<void> => {
    if (!folderServiceRef.current) throw new Error('Folder service not initialized')
    await folderServiceRef.current.renameFolder(id, name)
    setVersion(v => v + 1)
  }, [])

  const deleteFolder = useCallback(async (id: string): Promise<void> => {
    if (!folderServiceRef.current) throw new Error('Folder service not initialized')
    await folderServiceRef.current.deleteFolder(id)
    setVersion(v => v + 1)
  }, [])

  const getFolderTree = useCallback(async (): Promise<FolderTreeNode[]> => {
    if (!folderServiceRef.current) return []
    return folderServiceRef.current.getFolderTree()
  }, [])

  const moveGPTToFolder = useCallback(async (gptId: string, folderId: string | null): Promise<void> => {
    if (!storageServiceRef.current) throw new Error('Storage not initialized')
    const gpt = await storageServiceRef.current.getGPT(gptId)
    if (!gpt) throw new Error(`GPT ${gptId} not found`)
    await storageServiceRef.current.saveGPT({...gpt, folderId, updatedAt: new Date()})
    setVersion(v => v + 1)
  }, [])

  const pinConversation = useCallback(async (id: string, pinned: boolean): Promise<void> => {
    if (!storageServiceRef.current) throw new Error('Storage not initialized')
    await storageServiceRef.current.pinConversation(id, pinned)
    setVersion(v => v + 1)
  }, [])

  const archiveConversation = useCallback(async (id: string, archived: boolean): Promise<void> => {
    if (!storageServiceRef.current) throw new Error('Storage not initialized')
    await storageServiceRef.current.archiveConversation(id, archived)
    setVersion(v => v + 1)
  }, [])

  const updateConversationTitle = useCallback(async (id: string, title: string): Promise<void> => {
    if (!storageServiceRef.current) throw new Error('Storage not initialized')
    await storageServiceRef.current.updateConversationTitle(id, title)
    setVersion(v => v + 1)
  }, [])

  const bulkPinConversations = useCallback(async (ids: string[], pinned: boolean): Promise<void> => {
    if (!storageServiceRef.current) throw new Error('Storage not initialized')
    await storageServiceRef.current.bulkPinConversations(ids, pinned)
    setVersion(v => v + 1)
  }, [])

  const bulkArchiveConversations = useCallback(async (ids: string[], archived: boolean): Promise<void> => {
    if (!storageServiceRef.current) throw new Error('Storage not initialized')
    await storageServiceRef.current.bulkArchiveConversations(ids, archived)
    setVersion(v => v + 1)
  }, [])

  const bulkDeleteConversations = useCallback(async (ids: string[]): Promise<void> => {
    if (!storageServiceRef.current) throw new Error('Storage not initialized')
    await storageServiceRef.current.bulkDeleteConversations(ids)
    setVersion(v => v + 1)
  }, [])

  const getConversations = useCallback(async (options?: GetConversationsOptions): Promise<Conversation[]> => {
    if (!storageServiceRef.current) return []
    return storageServiceRef.current.getConversations(options)
  }, [])

  const value = useMemo(
    () => ({
      getGPT,
      getAllGPTs,
      saveGPT,
      deleteGPT,
      archiveGPT,
      restoreGPT,
      getArchivedGPTs,
      duplicateGPT,
      deleteGPTPermanently,
      getConversation,
      getConversationsForGPT,
      saveConversation,
      deleteConversation,
      createVersion,
      getVersions,
      restoreVersion,
      createFolder,
      renameFolder,
      deleteFolder,
      getFolderTree,
      moveGPTToFolder,
      pinConversation,
      archiveConversation,
      updateConversationTitle,
      bulkPinConversations,
      bulkArchiveConversations,
      bulkDeleteConversations,
      getConversations,
      clearAll,
      getStorageUsage,
      isLoading,
      isMigrating,
      error,
      storageWarning,
    }),
    [
      getGPT,
      getAllGPTs,
      saveGPT,
      deleteGPT,
      archiveGPT,
      restoreGPT,
      getArchivedGPTs,
      duplicateGPT,
      deleteGPTPermanently,
      getConversation,
      getConversationsForGPT,
      saveConversation,
      deleteConversation,
      createVersion,
      getVersions,
      restoreVersion,
      createFolder,
      renameFolder,
      deleteFolder,
      getFolderTree,
      moveGPTToFolder,
      pinConversation,
      archiveConversation,
      updateConversationTitle,
      bulkPinConversations,
      bulkArchiveConversations,
      bulkDeleteConversations,
      getConversations,
      clearAll,
      getStorageUsage,
      isLoading,
      isMigrating,
      error,
      storageWarning,
    ],
  )

  return <StorageContext value={value}>{children}</StorageContext>
}
