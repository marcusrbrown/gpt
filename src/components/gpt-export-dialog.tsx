import type {GPTExportOptions} from '@/types/export-import'
import type {GPTConfiguration} from '@/types/gpt'
import {cn} from '@/lib/design-system'
import {Button, Checkbox, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader} from '@heroui/react'
import {Download, FileJson, Package} from 'lucide-react'
import {useCallback, useState} from 'react'

interface GPTExportDialogProps {
  isOpen: boolean
  onClose: () => void
  gpt: GPTConfiguration | null
  gpts?: GPTConfiguration[]
  onExport: (options: GPTExportOptions) => Promise<void>
  isBulkExport?: boolean
}

export function GPTExportDialog({isOpen, onClose, gpt, gpts, onExport, isBulkExport = false}: GPTExportDialogProps) {
  const [includeKnowledge, setIncludeKnowledge] = useState(true)
  const [includeVersionHistory, setIncludeVersionHistory] = useState(false)
  const [includeConversations, setIncludeConversations] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = useCallback(async () => {
    setIsExporting(true)

    try {
      const options: GPTExportOptions = {
        includeKnowledge,
        includeVersionHistory,
        includeConversations,
      }

      await onExport(options)
      onClose()
    } catch (error_) {
      console.error('Export failed:', error_)
    } finally {
      setIsExporting(false)
    }
  }, [includeKnowledge, includeVersionHistory, includeConversations, onExport, onClose])

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date)
  }

  const itemCount = isBulkExport ? (gpts?.length ?? 0) : 1
  const title = isBulkExport ? `Export ${itemCount} GPTs` : 'Export GPT'

  if (!gpt && !gpts?.length) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            {isBulkExport ? (
              <Package className="w-5 h-5 text-primary" />
            ) : (
              <FileJson className="w-5 h-5 text-primary" />
            )}
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
          {!isBulkExport && gpt && <p className="text-sm text-content-tertiary font-normal">{gpt.name}</p>}
        </ModalHeader>

        <ModalBody className="gap-6">
          {isBulkExport && gpts && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-content-secondary">Selected GPTs</h3>
              <div className="bg-surface-secondary rounded-lg p-3 max-h-32 overflow-y-auto">
                <ul className="space-y-1">
                  {gpts.slice(0, 5).map(g => (
                    <li key={g.id} className="text-sm text-content-primary truncate">
                      {g.name}
                    </li>
                  ))}
                  {gpts.length > 5 && <li className="text-sm text-content-tertiary">...and {gpts.length - 5} more</li>}
                </ul>
              </div>
            </div>
          )}

          {!isBulkExport && gpt && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-content-secondary">GPT Details</h3>
              <div className="bg-surface-secondary rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-content-tertiary">Version</span>
                  <span className="text-content-primary">{gpt.version}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-content-tertiary">Created</span>
                  <span className="text-content-primary">{formatDate(gpt.createdAt)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-content-tertiary">Last Updated</span>
                  <span className="text-content-primary">{formatDate(gpt.updatedAt)}</span>
                </div>
                {gpt.knowledge.files.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-content-tertiary">Knowledge Files</span>
                    <span className="text-content-primary">{gpt.knowledge.files.length}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-content-secondary">Export Format</h3>
            <div
              className={cn('bg-surface-secondary rounded-lg p-4 border-2 border-primary', 'flex items-center gap-3')}
            >
              {isBulkExport ? (
                <>
                  <Package className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">ZIP Archive</p>
                    <p className="text-xs text-content-tertiary">Multiple GPTs packaged with manifest</p>
                  </div>
                </>
              ) : (
                <>
                  <FileJson className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">JSON</p>
                    <p className="text-xs text-content-tertiary">Machine-readable format for import/backup</p>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-content-secondary">Include</h3>
            <div className="space-y-3">
              <Checkbox isSelected={includeKnowledge} onValueChange={setIncludeKnowledge} size="sm">
                <div className="flex flex-col">
                  <span className="text-sm">Knowledge files</span>
                  <span className="text-xs text-content-tertiary">Attached documents and extracted text</span>
                </div>
              </Checkbox>
              <Checkbox isSelected={includeVersionHistory} onValueChange={setIncludeVersionHistory} size="sm">
                <div className="flex flex-col">
                  <span className="text-sm">Version history</span>
                  <span className="text-xs text-content-tertiary">Previous versions and change descriptions</span>
                </div>
              </Checkbox>
              <Checkbox isSelected={includeConversations} onValueChange={setIncludeConversations} size="sm">
                <div className="flex flex-col">
                  <span className="text-sm">Conversations</span>
                  <span className="text-xs text-content-tertiary">All conversation history for this GPT</span>
                </div>
              </Checkbox>
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button variant="flat" onPress={onClose} isDisabled={isExporting}>
            Cancel
          </Button>
          <Button
            color="primary"
            onPress={() => {
              handleExport().catch(console.error)
            }}
            isLoading={isExporting}
            startContent={!isExporting && <Download className="w-4 h-4" />}
          >
            {isBulkExport ? 'Export ZIP' : 'Export JSON'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
