import type {GPTConfiguration} from '@/types/gpt'
import {useStorage} from '@/hooks/use-storage'
import {cn, ds, responsive} from '@/lib/design-system'
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
  Spinner,
  Tab,
  Tabs,
} from '@heroui/react'
import {Archive, Copy, Download, Edit, MoreVertical, Plus, RotateCcw, Search, Trash2} from 'lucide-react'
import {useCallback, useEffect, useMemo, useState} from 'react'
import {ArchiveDialog} from './archive-dialog'
import {GPTExportDialog} from './gpt-export-dialog'

interface GPTLibraryProps {
  onSelectGPT: (gptId: string) => void
  onCreateGPT: () => void
  folderId?: string | null
}

type ViewMode = 'active' | 'archived'

export function GPTLibrary({onSelectGPT, onCreateGPT, folderId = null}: GPTLibraryProps) {
  const {getAllGPTs, getArchivedGPTs, archiveGPT, restoreGPT, duplicateGPT, deleteGPTPermanently} = useStorage()
  const [gpts, setGpts] = useState<GPTConfiguration[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('active')
  const [searchQuery, setSearchQuery] = useState('')
  const [dialogGPT, setDialogGPT] = useState<GPTConfiguration | null>(null)
  const [dialogMode, setDialogMode] = useState<'archive' | 'delete'>('archive')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [exportGPT, setExportGPT] = useState<GPTConfiguration | null>(null)

  const loadGPTs = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = viewMode === 'active' ? await getAllGPTs() : await getArchivedGPTs()
      setGpts(result)
    } catch {
      setGpts([])
    } finally {
      setIsLoading(false)
    }
  }, [getAllGPTs, getArchivedGPTs, viewMode])

  useEffect(() => {
    loadGPTs().catch(() => {})
  }, [loadGPTs])

  const filteredGPTs = useMemo(() => {
    let result = gpts

    if (folderId !== null) {
      result = result.filter(gpt => gpt.folderId === folderId)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        gpt => gpt.name.toLowerCase().includes(query) || gpt.description.toLowerCase().includes(query),
      )
    }

    return result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [gpts, folderId, searchQuery])

  const handleArchive = useCallback((gpt: GPTConfiguration) => {
    setDialogGPT(gpt)
    setDialogMode('archive')
    setIsDialogOpen(true)
  }, [])

  const handleDelete = useCallback((gpt: GPTConfiguration) => {
    setDialogGPT(gpt)
    setDialogMode('delete')
    setIsDialogOpen(true)
  }, [])

  const handleDialogConfirm = useCallback(async () => {
    if (!dialogGPT) return

    setIsActionLoading(true)
    try {
      if (dialogMode === 'archive') {
        await archiveGPT(dialogGPT.id)
      } else {
        await deleteGPTPermanently(dialogGPT.id)
      }
      setIsDialogOpen(false)
      setDialogGPT(null)
      await loadGPTs()
    } catch {
      // Storage context handles errors
    } finally {
      setIsActionLoading(false)
    }
  }, [dialogGPT, dialogMode, archiveGPT, deleteGPTPermanently, loadGPTs])

  const handleRestore = useCallback(
    async (gpt: GPTConfiguration) => {
      try {
        await restoreGPT(gpt.id)
        await loadGPTs()
      } catch {
        // Storage context handles errors
      }
    },
    [restoreGPT, loadGPTs],
  )

  const handleDuplicate = useCallback(
    async (gpt: GPTConfiguration) => {
      try {
        await duplicateGPT(gpt.id)
        await loadGPTs()
      } catch {
        // Storage context handles errors
      }
    },
    [duplicateGPT, loadGPTs],
  )

  const handleExport = useCallback((gpt: GPTConfiguration) => {
    setExportGPT(gpt)
  }, [])

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString()
  }

  return (
    <div className="flex flex-col h-full" data-testid="gpt-library">
      <div className="flex items-center justify-between mb-6">
        <Tabs selectedKey={viewMode} onSelectionChange={key => setViewMode(key as ViewMode)} aria-label="GPT view mode">
          <Tab key="active" title="Active" data-testid="active-tab" />
          <Tab key="archived" title="Archived" data-testid="archived-tab" />
        </Tabs>

        <Button
          color="primary"
          className="flex items-center gap-2"
          startContent={<Plus className="h-4 w-4" />}
          onPress={onCreateGPT}
          data-testid="new-gpt-button"
        >
          New GPT
        </Button>
      </div>

      <div className="mb-4">
        <Input
          type="search"
          placeholder="Search GPTs..."
          value={searchQuery}
          onValueChange={setSearchQuery}
          startContent={<Search className="h-4 w-4 text-content-tertiary" />}
          variant="bordered"
          aria-label="Search GPTs"
          classNames={{
            base: 'max-w-md',
            input: 'text-sm',
            inputWrapper: 'h-10 flex items-center',
            innerWrapper: 'flex items-center',
            mainWrapper: 'h-10',
          }}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : filteredGPTs.length === 0 ? (
        <div className={cn(ds.state.empty)} data-testid="gpt-empty-state">
          <p className={cn(ds.text.body.base)} data-testid="gpt-empty-message">
            {searchQuery ? 'No GPTs match your search' : viewMode === 'active' ? 'No GPTs yet' : 'No archived GPTs'}
          </p>
          {viewMode === 'active' && !searchQuery && (
            <Button
              className="mt-4 flex items-center gap-2"
              color="primary"
              onPress={onCreateGPT}
              startContent={<Plus className="h-4 w-4" />}
              data-testid="create-first-gpt-button"
            >
              Create your first GPT
            </Button>
          )}
        </div>
      ) : (
        <div className={cn(responsive.cardGrid.threeColumn)} data-testid="gpt-list">
          {filteredGPTs.map(gpt => (
            <Card
              key={gpt.id}
              className={cn(
                'border border-border-default',
                ds.animation.transition,
                'hover:border-primary-300 cursor-pointer',
              )}
              data-testid="user-gpt-card"
            >
              <CardHeader className="flex justify-between items-start gap-2">
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => onSelectGPT(gpt.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSelectGPT(gpt.id)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Select ${gpt.name}`}
                >
                  <h3 className={cn(ds.text.heading.h4, 'truncate')} data-testid="gpt-name">
                    {gpt.name}
                  </h3>
                  <p className={cn(ds.text.body.small, 'truncate')}>{formatDate(gpt.updatedAt)}</p>
                </div>
                <Dropdown placement="bottom-end">
                  <DropdownTrigger>
                    <Button
                      size="sm"
                      variant="light"
                      isIconOnly
                      aria-label="GPT actions"
                      onClick={e => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu
                    aria-label="GPT actions menu"
                    classNames={{
                      base: 'min-w-[160px]',
                      list: 'bg-content1 shadow-lg border border-border-default rounded-lg',
                    }}
                  >
                    <DropdownItem
                      key="edit"
                      startContent={<Edit className="h-4 w-4" />}
                      onPress={() => onSelectGPT(gpt.id)}
                      data-testid="edit-gpt"
                    >
                      Edit
                    </DropdownItem>
                    <DropdownItem
                      key="duplicate"
                      startContent={<Copy className="h-4 w-4" />}
                      onPress={() => {
                        handleDuplicate(gpt).catch(() => {})
                      }}
                      data-testid="duplicate-gpt"
                    >
                      Duplicate
                    </DropdownItem>
                    <DropdownItem
                      key="export"
                      startContent={<Download className="h-4 w-4" />}
                      onPress={() => handleExport(gpt)}
                      data-testid="export-gpt"
                    >
                      Export
                    </DropdownItem>
                    {viewMode === 'active' ? (
                      <DropdownItem
                        key="archive"
                        startContent={<Archive className="h-4 w-4" />}
                        onPress={() => handleArchive(gpt)}
                        data-testid="archive-gpt"
                      >
                        Archive
                      </DropdownItem>
                    ) : (
                      <DropdownItem
                        key="restore"
                        startContent={<RotateCcw className="h-4 w-4" />}
                        onPress={() => {
                          handleRestore(gpt).catch(() => {})
                        }}
                        data-testid="restore-gpt"
                      >
                        Restore
                      </DropdownItem>
                    )}
                    <DropdownItem
                      key="delete"
                      className="text-danger"
                      color="danger"
                      startContent={<Trash2 className="h-4 w-4" />}
                      onPress={() => handleDelete(gpt)}
                      data-testid="delete-gpt"
                    >
                      Delete
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </CardHeader>
              <CardBody className="cursor-pointer" onClick={() => onSelectGPT(gpt.id)}>
                <p className={cn(ds.text.body.small, 'line-clamp-2')}>{gpt.description || 'No description'}</p>
              </CardBody>
              <CardFooter className="cursor-pointer" onClick={() => onSelectGPT(gpt.id)}>
                <div className="flex gap-2 flex-wrap">
                  {gpt.tags.slice(0, 3).map(tag => (
                    <span key={tag} className={cn('px-2 py-0.5 rounded-full text-xs bg-surface-tertiary')}>
                      {tag}
                    </span>
                  ))}
                  {gpt.tags.length > 3 && <span className={cn(ds.text.caption)}>+{gpt.tags.length - 3} more</span>}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <ArchiveDialog
        gpt={dialogGPT}
        mode={dialogMode}
        isOpen={isDialogOpen}
        onConfirm={() => {
          handleDialogConfirm().catch(() => {})
        }}
        onCancel={() => {
          setIsDialogOpen(false)
          setDialogGPT(null)
        }}
        isLoading={isActionLoading}
      />

      <GPTExportDialog
        isOpen={exportGPT !== null}
        onClose={() => setExportGPT(null)}
        gpt={exportGPT}
        onExport={async () => setExportGPT(null)}
      />
    </div>
  )
}
