import {useStorage} from '@/hooks/use-storage'
import {cn, ds} from '@/lib/design-system'
import {Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader} from '@heroui/react'
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
    <Modal isOpen={isOpen} onClose={handleClose} placement="center">
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <Folder className="h-5 w-5" />
          <span>Create New Folder</span>
        </ModalHeader>
        <ModalBody>
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
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={handleClose} isDisabled={isLoading}>
            Cancel
          </Button>
          <Button
            color="primary"
            onPress={() => {
              handleSubmit().catch(() => {})
            }}
            isLoading={isLoading}
            isDisabled={!folderName.trim()}
          >
            Create Folder
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
