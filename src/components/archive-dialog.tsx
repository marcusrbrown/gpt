import type {GPTConfiguration} from '@/types/gpt'
import {cn, ds} from '@/lib/design-system'
import '@/styles/heroui-v3.css'
import {Button, Modal, Spinner} from '@heroui-v3/react'
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
  // v3 has no warning variant: archive keeps the warning colour through token classes on the primary variant.
  const confirmVariant = isDelete ? 'danger' : 'primary'
  const confirmClassName = isDelete ? undefined : 'bg-warning text-warning-foreground hover:bg-warning/90'

  return (
    <Modal.Backdrop
      isOpen={isOpen}
      onOpenChange={open => {
        if (!open) onCancel()
      }}
      variant="opaque"
    >
      <Modal.Container size="md" placement="center">
        <Modal.Dialog className="border border-border-default shadow-xl">
          <Modal.CloseTrigger />
          <Modal.Header className="flex-row items-center gap-2 pr-8">
            <Icon className={cn('h-5 w-5 shrink-0', isDelete ? 'text-danger' : 'text-warning')} />
            <Modal.Heading className="text-lg font-semibold">{title}</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="text-base text-foreground">
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
                  <AlertTriangle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
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
          </Modal.Body>
          <Modal.Footer>
            <Button variant="tertiary" onPress={onCancel} isDisabled={isLoading}>
              Cancel
            </Button>
            <Button
              variant={confirmVariant}
              className={confirmClassName}
              onPress={onConfirm}
              isPending={isLoading}
              data-testid={isDelete ? 'confirm-delete' : 'confirm-archive'}
            >
              {({isPending}) => (
                <>
                  {isPending ? <Spinner size="sm" color="current" /> : <Icon className="h-4 w-4" />}
                  {confirmText}
                </>
              )}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}
