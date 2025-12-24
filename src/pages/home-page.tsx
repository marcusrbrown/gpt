import {CreateFolderModal} from '@/components/create-folder-modal'
import {FolderSidebar} from '@/components/folder-sidebar'
import {GPTLibrary} from '@/components/gpt-library'
import {cn, ds} from '@/lib/design-system'
import {useCallback, useState} from 'react'
import {useNavigate} from 'react-router-dom'

export function HomePage() {
  const navigate = useNavigate()
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false)
  const [folderRefreshKey, setFolderRefreshKey] = useState(0)

  const handleSelectGPT = useCallback(
    (gptId: string) => {
      navigate(`/gpt/edit/${gptId}`) as void
    },
    [navigate],
  )

  const handleCreateGPT = useCallback(() => {
    navigate('/gpt/new') as void
  }, [navigate])

  const handleFolderSelect = useCallback((folderId: string | null) => {
    setSelectedFolderId(folderId)
  }, [])

  const handleCreateFolder = useCallback(() => {
    setIsCreateFolderOpen(true)
  }, [])

  const handleFolderCreated = useCallback(() => {
    setIsCreateFolderOpen(false)
    setFolderRefreshKey(prev => prev + 1)
  }, [])

  return (
    <main
      className={cn(ds.animation.fadeIn, 'flex flex-col h-[calc(100vh-var(--header-height)-var(--footer-height,0px))]')}
    >
      <header className={cn(ds.layout.container, 'text-center py-8 md:py-12')}>
        <h1 className="text-4xl md:text-5xl font-bold text-content-primary mb-4">Custom GPTs</h1>
        <p className="text-lg text-content-secondary max-w-2xl mx-auto">
          Create and manage your own AI assistants, stored securely on your device
        </p>
      </header>

      <div className="flex flex-1 overflow-hidden border-t border-border-default">
        <aside className="hidden md:block">
          <FolderSidebar
            key={folderRefreshKey}
            selectedFolderId={selectedFolderId}
            onFolderSelect={handleFolderSelect}
            onCreateFolder={handleCreateFolder}
          />
        </aside>

        <section className={cn('flex-1 overflow-auto p-6', ds.layout.container)}>
          <GPTLibrary onSelectGPT={handleSelectGPT} onCreateGPT={handleCreateGPT} folderId={selectedFolderId} />
        </section>
      </div>

      <CreateFolderModal
        isOpen={isCreateFolderOpen}
        onClose={() => setIsCreateFolderOpen(false)}
        onFolderCreated={handleFolderCreated}
        parentFolderId={selectedFolderId}
      />
    </main>
  )
}
