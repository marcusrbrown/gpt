import {useStorage} from '@/hooks/use-storage'
import {cn, ds} from '@/lib/design-system'
import {Button, Input, Modal, TextField, Label, Description, FieldError} from '@heroui/react'
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
    <Modal isOpen={isOpen} onOpenChange={open => !open && handleClose()}>
      <Modal.Backdrop />
      <Modal.Container placement="center">
        <Modal.Dialog>
          <Modal.Header className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            <span>Create New Folder</span>
          </Modal.Header>
          <Modal.Body>
            <TextField isInvalid={!!error} className="flex flex-col gap-1">
              <Label>Folder Name</Label>
              <Input
                autoFocus
                placeholder="Enter folder name"
                value={folderName}
                onChange={e => {
                  setFolderName(e.target.value)
                  setError(null)
                }}
                onKeyDown={handleKeyDown}
                maxLength={50}
              />
              {parentFolderId && <Description>This folder will be created inside the selected folder</Description>}
              <FieldError>{error}</FieldError>
            </TextField>
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
              Create Folder
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal>
  )
}
