import type {LocalFile, VectorStore} from '@/types/gpt'
import {cn, ds, responsive} from '@/lib/design-system'
import {Button, Input, Spinner} from '@heroui/react'
import {useState} from 'react'

interface VectorKnowledgeProps {
  files: LocalFile[]
  vectorStores?: VectorStore[]
  onCreateVectorStore: (name: string, fileIds: string[]) => void
  onDeleteVectorStore: (id: string) => void
}

export function VectorKnowledge({files, vectorStores, onCreateVectorStore, onDeleteVectorStore}: VectorKnowledgeProps) {
  const [newStoreName, setNewStoreName] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateStore = () => {
    setError(null)

    if (!newStoreName.trim()) {
      setError('Please provide a name for the vector store')
      return
    }

    if (selectedFiles.length === 0) {
      setError('Please select at least one file')
      return
    }

    setIsCreating(true)

    try {
      onCreateVectorStore(newStoreName, selectedFiles)

      // Reset form
      setNewStoreName('')
      setSelectedFiles([])
    } catch (error_) {
      setError('Failed to create vector store')
      console.error(error_)
    } finally {
      setIsCreating(false)
    }
  }

  const toggleFileSelection = (fileName: string) => {
    setSelectedFiles(prev => (prev.includes(fileName) ? prev.filter(f => f !== fileName) : [...prev, fileName]))
  }

  return (
    <div className="space-y-4">
      <h3 className={responsive.heading.medium}>Vector Knowledge Stores</h3>
      <p className={cn(ds.text.body.base, 'text-content-secondary')}>
        Create vector stores from your files to enable advanced retrieval capabilities.
      </p>

      {error && (
        <div role="alert" aria-live="assertive" className={cn(ds.state.error, 'p-2 rounded', ds.text.body.small)}>
          {error}
        </div>
      )}

      <div className={cn('border rounded-md p-4 space-y-4', isCreating && ds.state.disabled)}>
        <div>
          <label htmlFor="storeName" className={cn(ds.form.label)}>
            Vector Store Name
          </label>
          <Input
            id="storeName"
            value={newStoreName}
            onChange={e => setNewStoreName(e.target.value)}
            className={cn('mt-1', ds.animation.formFocus)}
            placeholder="My Knowledge Base"
            isDisabled={isCreating}
          />
        </div>

        <div>
          <label className={cn('block mb-2', ds.text.heading.h4, 'text-content-primary')}>Select Files</label>
          <div className={cn('max-h-40 overflow-y-auto border rounded-md p-2', isCreating && ds.state.disabled)}>
            {files.length === 0 ? (
              <p className={cn(ds.text.body.small, 'text-content-tertiary p-2')}>
                No files available. Upload files in the Knowledge section.
              </p>
            ) : (
              files.map(file => (
                <div key={file.name} className="flex items-center py-1">
                  <input
                    type="checkbox"
                    id={`file-${file.name}`}
                    checked={selectedFiles.includes(file.name)}
                    onChange={() => toggleFileSelection(file.name)}
                    disabled={isCreating}
                    className="mr-2"
                  />
                  <label
                    htmlFor={`file-${file.name}`}
                    className={cn(ds.text.body.small, isCreating && 'text-content-tertiary')}
                  >
                    {file.name}
                  </label>
                </div>
              ))
            )}
          </div>
        </div>

        <Button
          color="primary"
          onPress={handleCreateStore}
          isDisabled={isCreating || selectedFiles.length === 0 || !newStoreName.trim()}
          className={cn(ds.animation.buttonPress)}
        >
          {isCreating ? <Spinner size="sm" /> : 'Create Vector Store'}
        </Button>
      </div>

      {/* List existing vector stores */}
      <div className="mt-6">
        <h4 className={responsive.heading.medium}>Existing Vector Stores</h4>
        {!vectorStores || vectorStores.length === 0 ? (
          <p className={cn(ds.text.body.small, 'text-content-tertiary')}>No vector stores created yet.</p>
        ) : (
          <div className="space-y-2">
            {vectorStores.map(store => (
              <div key={store.id} className="border rounded-md p-3 flex justify-between items-center">
                <div>
                  <h5 className={cn(ds.text.heading.h4, 'font-medium')}>{store.name}</h5>
                  <p className={cn(ds.text.caption, 'text-content-tertiary normal-case')}>
                    {store.fileIds.length} files indexed
                  </p>
                </div>
                <Button
                  color="danger"
                  size="sm"
                  variant="ghost"
                  onPress={() => onDeleteVectorStore(store.id)}
                  className={cn(ds.animation.buttonPress)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
