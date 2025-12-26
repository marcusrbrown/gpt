import type {ExportFormat} from '@/services/conversation-export-service'
import type {Conversation} from '@/types/gpt'
import {cn} from '@/lib/design-system'
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Radio,
  RadioGroup,
  Switch,
} from '@heroui/react'
import {Download, FileJson, FileText} from 'lucide-react'
import {useCallback, useState} from 'react'

interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
  conversation: Conversation | null
  onExport: (format: ExportFormat) => void
}

export function ExportDialog({isOpen, onClose, conversation, onExport}: ExportDialogProps) {
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
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Export Conversation</h2>
          <p className="text-sm text-content-tertiary font-normal">{conversation.title || 'Untitled Conversation'}</p>
        </ModalHeader>

        <ModalBody className="gap-6">
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
            <h3 className="text-sm font-medium text-content-secondary">Export Format</h3>
            <RadioGroup value={format} onValueChange={value => setFormat(value as ExportFormat)}>
              <Radio
                value="json"
                classNames={{
                  base: cn(
                    'inline-flex m-0 bg-surface-secondary hover:bg-surface-tertiary',
                    'items-center justify-between flex-row-reverse',
                    'max-w-full cursor-pointer rounded-lg gap-4 p-4 border-2',
                    'data-[selected=true]:border-primary border-transparent',
                  ),
                }}
              >
                <div className="flex items-center gap-3">
                  <FileJson className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">JSON</p>
                    <p className="text-xs text-content-tertiary">Machine-readable format for import/backup</p>
                  </div>
                </div>
              </Radio>
              <Radio
                value="markdown"
                classNames={{
                  base: cn(
                    'inline-flex m-0 bg-surface-secondary hover:bg-surface-tertiary',
                    'items-center justify-between flex-row-reverse',
                    'max-w-full cursor-pointer rounded-lg gap-4 p-4 border-2',
                    'data-[selected=true]:border-primary border-transparent',
                  ),
                }}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-success" />
                  <div>
                    <p className="font-medium">Markdown</p>
                    <p className="text-xs text-content-tertiary">Human-readable format for documentation</p>
                  </div>
                </div>
              </Radio>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-content-secondary">Options</h3>
            <div className="space-y-4">
              <Switch isSelected={includeMetadata} onValueChange={setIncludeMetadata} size="sm">
                <div className="flex flex-col">
                  <span className="text-sm">Include metadata</span>
                  <span className="text-xs text-content-tertiary">Model info, token usage, tool calls</span>
                </div>
              </Switch>
              <Switch isSelected={includeTimestamps} onValueChange={setIncludeTimestamps} size="sm">
                <div className="flex flex-col">
                  <span className="text-sm">Include timestamps</span>
                  <span className="text-xs text-content-tertiary">Date and time for each message</span>
                </div>
              </Switch>
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button variant="flat" onPress={onClose}>
            Cancel
          </Button>
          <Button
            color="primary"
            onPress={handleExport}
            isLoading={isExporting}
            startContent={!isExporting && <Download className="w-4 h-4" />}
          >
            Export
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
