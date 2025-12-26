import type {Conversation, GPTConfiguration} from '@/types/gpt'
import {ConversationList} from '@/components/conversation-list'
import {ConversationSearch} from '@/components/conversation-search'
import {ExportDialog} from '@/components/export-dialog'
import {GPTTestPane} from '@/components/gpt-test-pane'
import {useConversationContext} from '@/hooks/use-conversation-context'
import {useStorage} from '@/hooks/use-storage'
import {cn, ds} from '@/lib/design-system'
import {Button} from '@heroui/react'
import {Menu, X} from 'lucide-react'
import {useCallback, useEffect, useState} from 'react'
import {useParams} from 'react-router-dom'

export function GPTTestPage() {
  const {gptId} = useParams()
  const storage = useStorage()
  const {downloadConversation} = useConversationContext()
  const [gptConfig, setGptConfig] = useState<GPTConfiguration | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [exportConversation, setExportConversation] = useState<Conversation | null>(null)

  useEffect(() => {
    const loadGpt = async () => {
      try {
        if (typeof gptId === 'string' && gptId.trim() !== '') {
          const config = await storage.getGPT(gptId)
          setGptConfig(config)
        }
      } catch (error_) {
        console.error('Failed to load GPT', error_)
        setGptConfig(undefined)
      } finally {
        setIsLoading(false)
      }
    }
    loadGpt().catch(console.error)
  }, [gptId, storage])

  const handleSelectConversation = useCallback((conversation: Conversation) => {
    setSelectedConversation(conversation)
  }, [])

  const handleSearchSelect = useCallback((conversation: Conversation) => {
    setSelectedConversation(conversation)
  }, [])

  const handleExport = useCallback((conversation: Conversation) => {
    setExportConversation(conversation)
  }, [])

  const handleExportFormat = useCallback(
    (format: 'json' | 'markdown') => {
      if (exportConversation) {
        downloadConversation(exportConversation.id, format).catch(console.error)
      }
    },
    [exportConversation, downloadConversation],
  )

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen p-4">
        <p className={cn(ds.text.body.large, 'text-content-tertiary')}>Loading...</p>
      </div>
    )
  }

  if (!gptConfig) {
    return (
      <div className="flex flex-col h-screen p-4">
        <p className={cn(ds.text.body.large, 'text-content-tertiary')}>GPT not found. Please select a valid GPT.</p>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-var(--header-height))]">
      <aside
        className={cn(
          'border-r bg-surface-secondary transition-all duration-300 flex flex-col',
          sidebarOpen ? 'w-80' : 'w-0 overflow-hidden',
        )}
      >
        <div className="p-3 border-b flex items-center justify-between">
          <h2 className={cn(ds.text.heading.h4)}>Conversations</h2>
          <Button isIconOnly size="sm" variant="light" onPress={() => setSidebarOpen(false)} aria-label="Close sidebar">
            <X size={18} />
          </Button>
        </div>

        <div className="p-3 border-b">
          <ConversationSearch gptId={gptId} onSelect={handleSearchSelect} placeholder="Search conversations..." />
        </div>

        <div className="p-3 border-b flex items-center gap-2">
          <label className={cn(ds.text.body.small, 'flex items-center gap-2 cursor-pointer')}>
            <input
              type="checkbox"
              checked={showArchived}
              onChange={e => setShowArchived(e.target.checked)}
              className="rounded"
            />
            Show archived
          </label>
        </div>

        <div className="flex-1 overflow-y-auto">
          <ConversationList
            gptId={gptId}
            onSelect={handleSelectConversation}
            selectedId={selectedConversation?.id}
            showArchived={showArchived}
            selectionMode="single"
            onExport={handleExport}
          />
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        <div className="p-4 border-b flex items-center gap-4">
          {!sidebarOpen && (
            <Button isIconOnly size="sm" variant="light" onPress={() => setSidebarOpen(true)} aria-label="Open sidebar">
              <Menu size={18} />
            </Button>
          )}
          <h1 className={cn(ds.text.heading.h2)}>{gptConfig.name} - Test</h1>
        </div>
        <div className="flex-1">
          <GPTTestPane gptConfig={gptConfig} />
        </div>
      </main>

      <ExportDialog
        isOpen={exportConversation !== null}
        onClose={() => setExportConversation(null)}
        conversation={exportConversation}
        onExport={handleExportFormat}
      />
    </div>
  )
}
