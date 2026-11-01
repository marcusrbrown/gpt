import {useStorage} from '@/hooks/use-storage'
import {cn, ds} from '@/lib/design-system'
import '@/styles/heroui-v3.css'
import {Input} from '@heroui/react'
import {Button, Modal, Spinner} from '@heroui-v3/react'
import {Folder} from 'lucide-react'
import {useCallback, useState} from 'react'

interface CreateFolderModalProps {
  isOpen: boolean
  onClose: () => void
  onFolderCreated: () => void
  parentFolderId: string | null
}

export function CreateFolderModal({isOpen, onClose, onFolderCreated, parentFolderId}: CreateFolderModalProps) {
  const {createFolder} = useStorage()
  const [folderName, setFolderName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = useCallback(async () => {
    const trimmedName = folderName.trim()
    if (!trimmedName) {
      setError('Folder name is required')
      return
    }

    if (trimmedName.length > 50) {
      setError('Folder name must be 50 characters or less')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await createFolder(trimmedName, parentFolderId)
      setFolderName('')
      onFolderCreated()
    } catch (error_) {
      const message = error_ instanceof Error ? error_.message : 'Failed to create folder'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [folderName, parentFolderId, createFolder, onFolderCreated])

  const handleClose = useCallback(() => {
    setFolderName('')
    setError(null)
    onClose()
  }, [onClose])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !isLoading && folderName.trim()) {
        handleSubmit().catch(() => {})
      }
    },
    [handleSubmit, isLoading, folderName],
  )

  return (
    <Modal.Backdrop
      isOpen={isOpen}
      onOpenChange={open => {
        if (!open) handleClose()
      }}
      variant="opaque"
    >
      <Modal.Container placement="center">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header className="flex-row items-center gap-2 pr-8">
            <Folder className="h-5 w-5" />
            <Modal.Heading className="text-lg font-semibold">Create New Folder</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <Input
              autoFocus
              label="Folder Name"
              placeholder="Enter folder name"
              value={folderName}
              onValueChange={value => {
                setFolderName(value)
                setError(null)
              }}
              onKeyDown={handleKeyDown}
              isInvalid={!!error}
              errorMessage={error}
              maxLength={50}
              description={parentFolderId ? 'This folder will be created inside the selected folder' : undefined}
            />
            {parentFolderId && (
              <p className={cn(ds.text.caption, 'text-content-tertiary mt-2')}>
                Note: Folders can be nested up to 3 levels deep.
              </p>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="tertiary" onPress={handleClose} isDisabled={isLoading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onPress={() => {
                handleSubmit().catch(() => {})
              }}
              isPending={isLoading}
              isDisabled={!folderName.trim()}
            >
              {({isPending}) => (
                <>
                  {isPending && <Spinner size="sm" color="current" />}
                  Create Folder
                </>
              )}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}
