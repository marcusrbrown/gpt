import type {ExportFormat} from '@/services/conversation-export-service'
import type {Conversation} from '@/types/gpt'
import {cn} from '@/lib/design-system'
import '@/styles/heroui-v3.css'
import {Button, Description, Label, Modal, Radio, RadioGroup, Spinner, Switch} from '@heroui-v3/react'
import {Download, FileJson, FileText} from 'lucide-react'
import {useCallback, useId, useState} from 'react'

interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
  conversation: Conversation | null
  onExport: (format: ExportFormat) => void
}

const FORMAT_CARD_CLASSES = cn(
  'w-full flex-row-reverse items-center justify-between gap-4 rounded-lg border-2 p-4',
  'bg-surface-secondary hover:bg-surface-tertiary border-transparent data-[selected=true]:border-primary',
)

export function ExportDialog({isOpen, onClose, conversation, onExport}: ExportDialogProps) {
  const formatLabelId = useId()
  const [format, setFormat] = useState<ExportFormat>('json')
  const [includeMetadata, setIncludeMetadata] = useState(true)
  const [includeTimestamps, setIncludeTimestamps] = useState(true)
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = useCallback(() => {
    setIsExporting(true)
    try {
      onExport(format)
      onClose()
    } finally {
      setIsExporting(false)
    }
  }, [format, onExport, onClose])

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date)
  }

  if (!conversation) return null

  return (
    <Modal.Backdrop
      isOpen={isOpen}
      onOpenChange={open => {
        if (!open) onClose()
      }}
      variant="opaque"
    >
      <Modal.Container size="md" placement="center" scroll="outside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header className="gap-1 pr-8">
            <Modal.Heading className="text-lg font-semibold">Export Conversation</Modal.Heading>
            <p className="text-sm text-content-tertiary font-normal">{conversation.title || 'Untitled Conversation'}</p>
          </Modal.Header>

          <Modal.Body className="flex flex-col gap-6 text-base text-foreground">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-content-secondary">Conversation Details</h3>
              <div className="bg-surface-secondary rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-content-tertiary">Messages</span>
                  <span className="text-content-primary">{conversation.messageCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-content-tertiary">Created</span>
                  <span className="text-content-primary">{formatDate(conversation.createdAt)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-content-tertiary">Last Updated</span>
                  <span className="text-content-primary">{formatDate(conversation.updatedAt)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 id={formatLabelId} className="text-sm font-medium text-content-secondary">
                Export Format
              </h3>
              <RadioGroup
                name="export-format"
                aria-labelledby={formatLabelId}
                value={format}
                onChange={value => setFormat(value as ExportFormat)}
                className="gap-2"
              >
                <Radio value="json" className="mt-0">
                  <Radio.Content className={FORMAT_CARD_CLASSES}>
                    <Radio.Control className="size-5">
                      <Radio.Indicator />
                    </Radio.Control>
                    <div className="flex items-center gap-3">
                      <FileJson className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium">JSON</p>
                        <p className="text-xs font-normal text-content-tertiary">
                          Machine-readable format for import/backup
                        </p>
                      </div>
                    </div>
                  </Radio.Content>
                </Radio>
                <Radio value="markdown" className="mt-0">
                  <Radio.Content className={FORMAT_CARD_CLASSES}>
                    <Radio.Control className="size-5">
                      <Radio.Indicator />
                    </Radio.Control>
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-success" />
                      <div>
                        <p className="font-medium">Markdown</p>
                        <p className="text-xs font-normal text-content-tertiary">
                          Human-readable format for documentation
                        </p>
                      </div>
                    </div>
                  </Radio.Content>
                </Radio>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium text-content-secondary">Options</h3>
              <div className="space-y-4">
                <Switch isSelected={includeMetadata} onChange={setIncludeMetadata} size="sm">
                  <Switch.Content>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                    <Label className="font-normal">Include metadata</Label>
                  </Switch.Content>
                  <Description className="text-content-tertiary">Model info, token usage, tool calls</Description>
                </Switch>
                <Switch isSelected={includeTimestamps} onChange={setIncludeTimestamps} size="sm">
                  <Switch.Content>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                    <Label className="font-normal">Include timestamps</Label>
                  </Switch.Content>
                  <Description className="text-content-tertiary">Date and time for each message</Description>
                </Switch>
              </div>
            </div>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="tertiary" onPress={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onPress={handleExport} isPending={isExporting}>
              {({isPending}) => (
                <>
                  {isPending ? <Spinner size="sm" color="current" /> : <Download className="w-4 h-4" />}
                  Export
                </>
              )}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}
