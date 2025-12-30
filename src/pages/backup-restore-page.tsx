import {BackupRestorePanel} from '@/components/backup-restore-panel'
import {DefaultLayout} from '@/components/layouts'
import {useStorage} from '@/hooks/use-storage'
import {downloadFullBackup} from '@/services/export-service'
import {restoreBackup} from '@/services/import-service'
import {useCallback, useEffect, useState} from 'react'

interface ItemCounts {
  gpts: number
  conversations: number
  folders: number
}

export function BackupRestorePage() {
  const {getAllGPTs, getConversations, getFolderTree, getStorageUsage} = useStorage()
  const [itemCounts, setItemCounts] = useState<ItemCounts>({gpts: 0, conversations: 0, folders: 0})
  const [storageUsed, setStorageUsed] = useState(0)
  const [lastBackupDate, setLastBackupDate] = useState<Date | null>(null)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [gpts, conversations, folderTree, storage] = await Promise.all([
          getAllGPTs(),
          getConversations(),
          getFolderTree(),
          getStorageUsage(),
        ])

        setItemCounts({
          gpts: gpts.length,
          conversations: conversations.length,
          folders: folderTree.length,
        })

        setStorageUsed(storage.used ?? 0)

        const lastBackup = localStorage.getItem('lastBackupDate')
        if (lastBackup) {
          setLastBackupDate(new Date(lastBackup))
        }
      } catch (error_) {
        console.error('Failed to load stats:', error_)
      }
    }

    loadStats().catch(() => {})
  }, [getAllGPTs, getConversations, getFolderTree, getStorageUsage])

  const handleCreateBackup = useCallback(async () => {
    await downloadFullBackup()

    const now = new Date()
    localStorage.setItem('lastBackupDate', now.toISOString())
    setLastBackupDate(now)
  }, [])

  const handleRestoreBackup = useCallback(async (file: File, wipeExisting: boolean) => {
    const result = await restoreBackup(file, {wipeExisting})

    return {
      success: result.success,
      imported: result.imported,
      errors: result.errors.map(e => e.error),
    }
  }, [])

  return (
    <DefaultLayout maxWidth="lg">
      <BackupRestorePanel
        onCreateBackup={handleCreateBackup}
        onRestoreBackup={handleRestoreBackup}
        lastBackupDate={lastBackupDate}
        storageUsed={storageUsed}
        itemCounts={itemCounts}
      />
    </DefaultLayout>
  )
}
