import type {BulkAction} from '@/contexts/conversation-context'
import type {Conversation} from '@/types/gpt'
import {useConversationContext} from '@/hooks/use-conversation-context'
import {cn, ds} from '@/lib/design-system'
import {
  Button,
  Card,
  CardBody,
  Checkbox,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
  Spinner,
  Tab,
  Tabs,
} from '@heroui/react'
import {Archive, ArchiveRestore, Edit2, FileDown, MoreVertical, Pin, PinOff, Search, Trash2} from 'lucide-react'
import {useCallback, useEffect, useMemo, useState} from 'react'

interface ConversationListProps {
  gptId?: string
  onSelect: (conversation: Conversation) => void
  selectedId?: string
  showArchived?: boolean
  selectionMode?: 'single' | 'multiple'
  onExport?: (conversation: Conversation) => void
}

type ViewMode = 'active' | 'archived'

export function ConversationList({
  gptId,
  onSelect,
  selectedId,
  showArchived = false,
  selectionMode = 'single',
  onExport,
}: ConversationListProps) {
  const {
    getConversations,
    pinConversation,
    archiveConversation,
    updateConversationTitle,
    bulkPinConversations,
    bulkArchiveConversations,
    bulkDeleteConversations,
    deleteConversation,
  } = useConversationContext()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('active')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  const loadConversations = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getConversations({
        gptId,
        includeArchived: viewMode === 'archived',
      })
      const filtered = viewMode === 'archived' ? result.filter(c => c.isArchived) : result.filter(c => !c.isArchived)
      setConversations(filtered)
    } catch {
      setConversations([])
    } finally {
      setIsLoading(false)
    }
  }, [getConversations, gptId, viewMode])

  useEffect(() => {
    loadConversations().catch(console.error)
  }, [loadConversations])

  const {pinnedConversations, unpinnedConversations} = useMemo(() => {
    let filtered = conversations

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        c => c.title?.toLowerCase().includes(query) || c.lastMessagePreview?.toLowerCase().includes(query),
      )
    }

    const sorted = [...filtered].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

    return {
      pinnedConversations: sorted.filter(c => c.isPinned),
      unpinnedConversations: sorted.filter(c => !c.isPinned),
    }
  }, [conversations, searchQuery])

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    const allIds = conversations.map(c => c.id)
    setSelectedIds(new Set(allIds))
  }, [conversations])

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const handleBulkAction = useCallback(
    async (action: BulkAction) => {
      const ids = Array.from(selectedIds)
      if (ids.length === 0) return

      try {
        switch (action) {
          case 'pin':
            await bulkPinConversations(ids, true)
            break
          case 'unpin':
            await bulkPinConversations(ids, false)
            break
          case 'archive':
            await bulkArchiveConversations(ids, true)
            break
          case 'unarchive':
            await bulkArchiveConversations(ids, false)
            break
          case 'delete':
            await bulkDeleteConversations(ids)
            break
        }
        setSelectedIds(new Set())
        await loadConversations()
      } catch {
        // Error handled by context
      }
    },
    [selectedIds, bulkPinConversations, bulkArchiveConversations, bulkDeleteConversations, loadConversations],
  )

  const handlePin = useCallback(
    async (id: string, pinned: boolean) => {
      await pinConversation(id, pinned)
      await loadConversations()
    },
    [pinConversation, loadConversations],
  )

  const handleArchive = useCallback(
    async (id: string, archived: boolean) => {
      await archiveConversation(id, archived)
      await loadConversations()
    },
    [archiveConversation, loadConversations],
  )

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteConversation(id)
      await loadConversations()
    },
    [deleteConversation, loadConversations],
  )

  const handleStartRename = useCallback((conversation: Conversation) => {
    setEditingId(conversation.id)
    setEditingTitle(conversation.title || '')
  }, [])

  const handleSaveRename = useCallback(async () => {
    if (!editingId || !editingTitle.trim()) return
    await updateConversationTitle(editingId, editingTitle.trim())
    setEditingId(null)
    setEditingTitle('')
    await loadConversations()
  }, [editingId, editingTitle, updateConversationTitle, loadConversations])

  const handleCancelRename = useCallback(() => {
    setEditingId(null)
    setEditingTitle('')
  }, [])

  const formatDate = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
    } else if (days === 1) {
      return 'Yesterday'
    } else if (days < 7) {
      return date.toLocaleDateString([], {weekday: 'short'})
    }
    return date.toLocaleDateString([], {month: 'short', day: 'numeric'})
  }

  const renderConversationItem = (conversation: Conversation) => {
    const isSelected = selectedId === conversation.id
    const isChecked = selectedIds.has(conversation.id)
    const isEditing = editingId === conversation.id

    const handleCardClick = () => {
      if (!isEditing) {
        onSelect(conversation)
      }
    }

    const handleCardKeyDown = (e: React.KeyboardEvent) => {
      if (!isEditing && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        onSelect(conversation)
      }
    }

    return (
      <Card
        key={conversation.id}
        className={cn(
          'mb-2 transition-all',
          isSelected && 'ring-2 ring-primary',
          isChecked && 'bg-primary-50 dark:bg-primary-900/20',
          !isEditing && 'hover:bg-content2 cursor-pointer',
        )}
      >
        <CardBody className="p-3">
          <div className="flex items-start gap-3">
            {selectionMode === 'multiple' && (
              <Checkbox
                isSelected={isChecked}
                onValueChange={() => handleToggleSelect(conversation.id)}
                onClick={e => e.stopPropagation()}
                aria-label={`Select ${conversation.title || 'Untitled'}`}
              />
            )}

            <div
              className="flex-1 min-w-0"
              onClick={handleCardClick}
              onKeyDown={handleCardKeyDown}
              role={isEditing ? undefined : 'button'}
              tabIndex={isEditing ? undefined : 0}
              aria-label={isEditing ? undefined : `Open ${conversation.title || 'Untitled Conversation'}`}
            >
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    size="sm"
                    value={editingTitle}
                    onValueChange={setEditingTitle}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        handleSaveRename().catch(console.error)
                      }
                      if (e.key === 'Escape') handleCancelRename()
                    }}
                    autoFocus
                    aria-label="Rename conversation"
                  />
                  <Button
                    size="sm"
                    color="primary"
                    onPress={() => {
                      handleSaveRename().catch(console.error)
                    }}
                  >
                    Save
                  </Button>
                  <Button size="sm" variant="flat" onPress={handleCancelRename}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    {conversation.isPinned && <Pin className="w-3 h-3 text-warning" aria-label="Pinned" />}
                    <span className={cn(ds.text.body.base, 'font-medium truncate')}>
                      {conversation.title || 'Untitled Conversation'}
                    </span>
                  </div>
                  {conversation.lastMessagePreview && (
                    <p className={cn(ds.text.body.small, 'truncate mt-1')}>{conversation.lastMessagePreview}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className={ds.text.caption}>{formatDate(conversation.updatedAt)}</span>
                    <span className={ds.text.caption}>• {conversation.messageCount} messages</span>
                  </div>
                </>
              )}
            </div>

            {!isEditing && (
              <Dropdown placement="bottom-end">
                <DropdownTrigger>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    aria-label="Conversation actions"
                    onClick={e => e.stopPropagation()}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu
                  aria-label="Conversation actions"
                  classNames={{
                    base: 'min-w-[160px]',
                    list: 'bg-content1 shadow-lg border border-border-default rounded-lg',
                  }}
                >
                  <DropdownItem
                    key="rename"
                    startContent={<Edit2 className="w-4 h-4" />}
                    onPress={() => handleStartRename(conversation)}
                  >
                    Rename
                  </DropdownItem>
                  <DropdownItem
                    key="pin"
                    startContent={conversation.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                    onPress={() => {
                      handlePin(conversation.id, !conversation.isPinned).catch(console.error)
                    }}
                  >
                    {conversation.isPinned ? 'Unpin' : 'Pin'}
                  </DropdownItem>
                  <DropdownItem
                    key="export"
                    className={onExport ? '' : 'hidden'}
                    startContent={<FileDown className="w-4 h-4" />}
                    onPress={() => onExport?.(conversation)}
                  >
                    Export
                  </DropdownItem>
                  <DropdownItem
                    key="archive"
                    startContent={
                      conversation.isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />
                    }
                    onPress={() => {
                      handleArchive(conversation.id, !conversation.isArchived).catch(console.error)
                    }}
                  >
                    {conversation.isArchived ? 'Restore' : 'Archive'}
                  </DropdownItem>
                  <DropdownItem
                    key="delete"
                    className="text-danger"
                    color="danger"
                    startContent={<Trash2 className="w-4 h-4" />}
                    onPress={() => {
                      handleDelete(conversation.id).catch(console.error)
                    }}
                  >
                    Delete
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            )}
          </div>
        </CardBody>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <Input
          placeholder="Search conversations..."
          value={searchQuery}
          onValueChange={setSearchQuery}
          startContent={<Search className="w-4 h-4 text-content-tertiary" />}
          size="sm"
          aria-label="Search conversations"
        />
      </div>

      {showArchived && (
        <Tabs
          selectedKey={viewMode}
          onSelectionChange={key => setViewMode(key as ViewMode)}
          className="mb-4"
          aria-label="View mode"
        >
          <Tab key="active" title="Active" />
          <Tab key="archived" title="Archived" />
        </Tabs>
      )}

      {selectionMode === 'multiple' && selectedIds.size > 0 && (
        <div className="flex items-center gap-2 mb-4 p-2 bg-surface-secondary rounded-lg">
          <span className={ds.text.body.small}>{selectedIds.size} selected</span>
          <div className="flex-1" />
          <Button size="sm" variant="flat" onPress={handleSelectAll}>
            Select All
          </Button>
          <Button size="sm" variant="flat" onPress={handleDeselectAll}>
            Deselect
          </Button>
          <Button
            size="sm"
            variant="flat"
            startContent={<Pin className="w-4 h-4" />}
            onPress={() => {
              handleBulkAction('pin').catch(console.error)
            }}
          >
            Pin
          </Button>
          <Button
            size="sm"
            variant="flat"
            startContent={<Archive className="w-4 h-4" />}
            onPress={() => {
              handleBulkAction(viewMode === 'archived' ? 'unarchive' : 'archive').catch(console.error)
            }}
          >
            {viewMode === 'archived' ? 'Restore' : 'Archive'}
          </Button>
          <Button
            size="sm"
            color="danger"
            variant="flat"
            startContent={<Trash2 className="w-4 h-4" />}
            onPress={() => {
              handleBulkAction('delete').catch(console.error)
            }}
          >
            Delete
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {pinnedConversations.length === 0 && unpinnedConversations.length === 0 ? (
          <div className={ds.state.empty}>
            <p>No conversations found</p>
          </div>
        ) : (
          <>
            {pinnedConversations.length > 0 && (
              <div className="mb-4">
                <h3 className={cn(ds.text.caption, 'mb-2 flex items-center gap-1')}>
                  <Pin className="w-3 h-3" /> Pinned
                </h3>
                {pinnedConversations.map(renderConversationItem)}
              </div>
            )}

            {unpinnedConversations.length > 0 && (
              <div>
                {pinnedConversations.length > 0 && <h3 className={cn(ds.text.caption, 'mb-2')}>Recent</h3>}
                {unpinnedConversations.map(renderConversationItem)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
