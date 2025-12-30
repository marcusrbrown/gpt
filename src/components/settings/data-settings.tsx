import {useStorage} from '@/hooks/use-storage'
import {useStorageQuota} from '@/hooks/use-storage-quota'
import {cn, ds} from '@/lib/design-system'
import {Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Progress, useDisclosure} from '@heroui/react'
import {Archive, RefreshCw, Trash2} from 'lucide-react'
import {useState} from 'react'
import {Link as RouterLink} from 'react-router-dom'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`
}

/**
 * Data management settings component.
 * Shows storage usage, provides backup/restore access, and clear data functionality.
 */
export function DataSettings() {
  const {used, total, percentage, isLoading, refresh} = useStorageQuota()
  const storage = useStorage()
  const {isOpen, onOpen, onClose} = useDisclosure()
  const [isClearing, setIsClearing] = useState(false)

  const handleClearData = async () => {
    setIsClearing(true)
    try {
      await storage.clearAll()
      onClose()
      window.location.reload()
    } catch (error_) {
      console.error('Failed to clear data:', error_)
    } finally {
      setIsClearing(false)
    }
  }

  const getProgressColor = () => {
    if (percentage > 90) return 'danger'
    if (percentage > 70) return 'warning'
    return 'primary'
  }

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h2 className={cn(ds.text.heading.h3)}>Data Management</h2>
        <p className={cn(ds.text.body.small, 'mt-1')}>Manage your local storage and data.</p>
      </div>

      <div className="space-y-6">
        {/* Storage Usage */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className={cn(ds.text.body.base, 'font-medium')}>Storage Usage</p>
            <div className="flex items-center gap-2">
              <p className={cn(ds.text.body.small)}>
                {isLoading ? 'Calculating...' : `${formatBytes(used)} / ${formatBytes(total)}`}
              </p>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                onPress={() => {
                  refresh().catch(console.error)
                }}
                aria-label="Refresh storage quota"
                isDisabled={isLoading}
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              </Button>
            </div>
          </div>
          <Progress
            value={percentage}
            color={getProgressColor()}
            aria-label="Storage usage"
            className="h-2"
            isIndeterminate={isLoading}
          />
          {percentage > 80 && (
            <p className={cn(ds.text.body.small, 'text-warning-600')}>
              Storage is getting full. Consider exporting and clearing old data.
            </p>
          )}
        </div>

        {/* Backup & Restore */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <p className={cn(ds.text.body.base, 'font-medium')}>Backup & Restore</p>
            <p className={cn(ds.text.body.small)}>Export your GPTs and settings or restore from a backup file.</p>
          </div>
          <Button
            as={RouterLink}
            to="/backup"
            variant="bordered"
            startContent={<Archive size={16} />}
            className="flex items-center gap-2"
          >
            Manage Backups
          </Button>
        </div>

        {/* Clear Data */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-border-default">
          <div className="flex-1">
            <p className={cn(ds.text.body.base, 'font-medium text-danger')}>Clear All Data</p>
            <p className={cn(ds.text.body.small)}>
              Permanently delete all GPTs, conversations, and settings. This cannot be undone.
            </p>
          </div>
          <Button
            color="danger"
            variant="light"
            startContent={<Trash2 size={16} />}
            onPress={onOpen}
            className="flex items-center gap-2"
          >
            Clear Data
          </Button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal isOpen={isOpen} onClose={onClose} placement="center">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">Clear All Data</ModalHeader>
          <ModalBody>
            <p>Are you sure you want to delete all local data? This will remove:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-content-secondary">
              <li>All your custom GPT configurations</li>
              <li>All conversation history</li>
              <li>All saved API keys and settings</li>
              <li>All folders and organization</li>
            </ul>
            <p className="mt-4 font-medium text-danger">This action cannot be undone.</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onClose}>
              Cancel
            </Button>
            <Button
              color="danger"
              onPress={() => {
                handleClearData().catch(console.error)
              }}
              isLoading={isClearing}
            >
              Delete Everything
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
