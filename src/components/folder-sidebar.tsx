import type {FolderTreeNode} from '@/types/gpt-extensions'
import {useStorage} from '@/hooks/use-storage'
import {cn, ds} from '@/lib/design-system'
import {Button, Spinner} from '@heroui/react'
import {ChevronDown, ChevronRight, Folder, FolderPlus, Home} from 'lucide-react'
import {useCallback, useEffect, useState} from 'react'

interface FolderSidebarProps {
  selectedFolderId: string | null
  onFolderSelect: (folderId: string | null) => void
  onCreateFolder: () => void
}

export function FolderSidebar({selectedFolderId, onFolderSelect, onCreateFolder}: FolderSidebarProps) {
  const {getFolderTree} = useStorage()
  const [folderTree, setFolderTree] = useState<FolderTreeNode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  useEffect(() => {
    const loadFolders = async () => {
      setIsLoading(true)
      try {
        const tree = await getFolderTree()
        setFolderTree(tree)
      } catch {
        setFolderTree([])
      } finally {
        setIsLoading(false)
      }
    }

    loadFolders().catch(() => {})
  }, [getFolderTree])

  const toggleExpand = useCallback((folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }, [])

  const renderFolderNode = (node: FolderTreeNode) => {
    const hasChildren = node.children.length > 0
    const isExpanded = expandedFolders.has(node.folder.id)
    const isSelected = selectedFolderId === node.folder.id

    return (
      <div key={node.folder.id}>
        <button
          type="button"
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left',
            'hover:bg-surface-secondary',
            ds.animation.transition,
            isSelected && 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300',
          )}
          style={{paddingLeft: `${(node.depth + 1) * 12}px`}}
          onClick={() => onFolderSelect(node.folder.id)}
          aria-label={`Select folder ${node.folder.name}`}
        >
          {hasChildren && (
            <button
              type="button"
              className="p-0.5 hover:bg-surface-tertiary rounded"
              onClick={e => {
                e.stopPropagation()
                toggleExpand(node.folder.id)
              }}
              aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
          {!hasChildren && <span className="w-5" />}
          <Folder className="h-4 w-4 shrink-0" />
          <span className={cn(ds.text.body.small, 'truncate flex-1')}>{node.folder.name}</span>
          {node.gptCount > 0 && <span className={cn(ds.text.caption, 'text-content-tertiary')}>{node.gptCount}</span>}
        </button>
        {hasChildren && isExpanded && <div>{node.children.map(child => renderFolderNode(child))}</div>}
      </div>
    )
  }

  return (
    <aside className={cn('w-64 border-r border-border-default p-4 flex flex-col h-full')}>
      <div className="flex items-center justify-between mb-4">
        <h2 className={cn(ds.text.heading.h4)}>Folders</h2>
        <Button size="sm" variant="light" isIconOnly onPress={onCreateFolder} aria-label="Create new folder">
          <FolderPlus className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner size="sm" />
        </div>
      ) : (
        <nav className="flex-1 overflow-y-auto space-y-1">
          <button
            type="button"
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left',
              'hover:bg-surface-secondary',
              ds.animation.transition,
              selectedFolderId === null &&
                'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300',
            )}
            onClick={() => onFolderSelect(null)}
            aria-label="Show all GPTs"
          >
            <Home className="h-4 w-4" />
            <span className={cn(ds.text.body.small)}>All GPTs</span>
          </button>

          {folderTree.map(node => renderFolderNode(node))}

          {folderTree.length === 0 && (
            <p className={cn(ds.text.body.small, 'text-content-tertiary px-3 py-2')}>No folders yet</p>
          )}
        </nav>
      )}
    </aside>
  )
}
