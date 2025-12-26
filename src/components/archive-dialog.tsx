import type {GPTConfiguration} from '@/types/gpt'
import {cn, ds} from '@/lib/design-system'
import {Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader} from '@heroui/react'
import {AlertTriangle, Archive, Trash2} from 'lucide-react'

interface ArchiveDialogProps {
  gpt: GPTConfiguration | null
  mode: 'archive' | 'delete'
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

export function ArchiveDialog({gpt, mode, isOpen, onConfirm, onCancel, isLoading = false}: ArchiveDialogProps) {
  if (!gpt) return null

  const isDelete = mode === 'delete'
  const Icon = isDelete ? Trash2 : Archive
  const title = isDelete ? 'Delete GPT Permanently' : 'Archive GPT'
  const confirmText = isDelete ? 'Delete Permanently' : 'Archive'
  const confirmColor = isDelete ? 'danger' : 'warning'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      size="md"
      placement="center"
      backdrop="opaque"
      classNames={{
        backdrop: 'bg-black/50',
        base: 'border border-border-default shadow-xl',
      }}
    >
      <ModalContent>
        <ModalHeader className="flex items-center gap-2 pr-12">
          <Icon className={cn('h-5 w-5 flex-shrink-0', isDelete ? 'text-danger' : 'text-warning')} />
          <span>{title}</span>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <p className={cn(ds.text.body.base)}>
              {isDelete ? (
                <>
                  Are you sure you want to <strong>permanently delete</strong> &ldquo;{gpt.name}&rdquo;?
                </>
              ) : (
                <>Are you sure you want to archive &ldquo;{gpt.name}&rdquo;?</>
              )}
            </p>

            {isDelete && (
              <div
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg',
                  'bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800',
                )}
              >
                <AlertTriangle className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
                <div className={cn(ds.text.body.small, 'text-danger-700 dark:text-danger-300')}>
                  <p className="font-medium">This action cannot be undone.</p>
                  <p className="mt-1">
                    All conversations, knowledge files, and version history will be permanently deleted.
                  </p>
                </div>
              </div>
            )}

            {!isDelete && (
              <p className={cn(ds.text.body.small)}>Archived GPTs can be restored later from the archive view.</p>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onCancel} isDisabled={isLoading}>
            Cancel
          </Button>
          <Button
            color={confirmColor}
            onPress={onConfirm}
            isLoading={isLoading}
            startContent={!isLoading && <Icon className="h-4 w-4" />}
            data-testid={isDelete ? 'confirm-delete' : 'confirm-archive'}
          >
            {confirmText}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
