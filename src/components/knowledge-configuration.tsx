import type {LocalFile} from '@/types/gpt'
import type {
  CachedURLDB,
  CreateSnippetInput,
  ExtractionStatus,
  KnowledgeSummary,
  SearchResult,
  TextSnippetDB,
  UpdateSnippetInput,
} from '@/types/knowledge'
import {cn, ds} from '@/lib/design-system'
import {
  Button,
  Card,
  Chip,
  Input,
  Radio,
  RadioGroup,
  Tabs,
  TextArea,
  TextField,
  Label,
  Tooltip,
  FieldError,
} from '@heroui/react'
import {AlertCircle, CheckCircle, FileText, Loader2, RefreshCw, Search, Trash2, Upload} from 'lucide-react'
import {useRef, useState} from 'react'

interface FormErrors {
  knowledge: {
    urls: {
      [key: number]: string
    }
  }
}

interface KnowledgeConfigurationProps {
  gptId: string
  files: LocalFile[]
  knowledgeFiles?: unknown[]
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveFile: (index: number) => void
  extractionMode: 'manual' | 'auto'
  onExtractionModeChange: (mode: 'manual' | 'auto') => void
  onExtractFile: (fileId: string) => Promise<void>
  onExtractAllPending: () => Promise<void>
  urls: string[]
  errors: FormErrors
  onAddUrl: () => void
  onRemoveUrl: (index: number) => void
  onUrlChange: (index: number, value: string) => void
  onCacheUrl: (url: string) => Promise<void>
  onRefreshCachedUrl: (urlId: string) => Promise<void>
  onRemoveCachedUrl: (urlId: string) => Promise<void>
  cachedUrls: CachedURLDB[]
  onCreateSnippet: (input: CreateSnippetInput) => Promise<void>
  onUpdateSnippet: (id: string, input: UpdateSnippetInput) => Promise<void>
  onDeleteSnippet: (id: string) => Promise<void>
  snippets: TextSnippetDB[]
  onSearch: (query: string) => Promise<SearchResult[]>
  summary: KnowledgeSummary
}

type UIFile = LocalFile & {
  id?: string
  extractionStatus?: ExtractionStatus
  extractionError?: string
}

export function KnowledgeConfiguration({
  files,
  onFileUpload,
  onRemoveFile,
  extractionMode,
  onExtractionModeChange,
  onExtractFile,
  onExtractAllPending,
  urls,
  errors,
  onAddUrl,
  onRemoveUrl,
  onUrlChange,
  onCacheUrl,
  onRefreshCachedUrl,
  onRemoveCachedUrl,
  cachedUrls,
  onCreateSnippet,
  onUpdateSnippet,
  onDeleteSnippet,
  snippets,
  onSearch,
  summary,
}: KnowledgeConfigurationProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [newUrlCache, setNewUrlCache] = useState('')
  const [snippetForm, setSnippetForm] = useState<Partial<CreateSnippetInput>>({})
  const [isEditingSnippet, setIsEditingSnippet] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  const handleCacheUrl = () => {
    if (!newUrlCache) return
    onCacheUrl(newUrlCache)
      .then(() => setNewUrlCache(''))
      .catch(console.error)
  }

  const handleSaveSnippet = () => {
    if (!snippetForm.title || !snippetForm.content) return

    const save = async () => {
      try {
        if (isEditingSnippet) {
          await onUpdateSnippet(isEditingSnippet, snippetForm)
        } else {
          await onCreateSnippet(snippetForm as CreateSnippetInput)
        }
        setSnippetForm({})
        setIsEditingSnippet(null)
      } catch (error) {
        console.error('Failed to save snippet', error)
      }
    }
    save().catch(console.error)
  }

  const handleEditSnippet = (snippet: TextSnippetDB) => {
    setSnippetForm({
      title: snippet.title,
      content: snippet.content,
      tags: snippet.tags,
    })
    setIsEditingSnippet(snippet.id)
  }

  const handleSearch = (query: string) => {
    setIsSearching(true)
    const search = async () => {
      try {
        await onSearch(query)
      } finally {
        setIsSearching(false)
      }
    }
    search().catch(console.error)
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`
  }

  const getStatusChip = (status?: ExtractionStatus, error?: string) => {
    switch (status) {
      case 'completed':
        return (
          <Chip variant="secondary" size="sm">
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Ready
            </div>
          </Chip>
        )
      case 'processing':
        return (
          <Chip variant="secondary" size="sm">
            <div className="flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Processing
            </div>
          </Chip>
        )
      case 'failed':
        return (
          <Tooltip>
            <Tooltip.Trigger>
              <Chip variant="secondary" size="sm">
                <div className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Failed
                </div>
              </Chip>
            </Tooltip.Trigger>
            <Tooltip.Content>{error || 'Extraction failed'}</Tooltip.Content>
          </Tooltip>
        )
      case 'unsupported':
        return (
          <Chip variant="secondary" size="sm" className="bg-content-tertiary/20 text-content-tertiary">
            Unsupported
          </Chip>
        )
      default:
        return (
          <Chip variant="secondary" size="sm">
            Pending
          </Chip>
        )
    }
  }

  const pendingCount = files.filter(f => (f as UIFile).extractionStatus === 'pending').length

  return (
    <div className={cn(ds.form.fieldGroup)}>
      <div className="relative flex items-center w-full bg-surface-secondary rounded-lg border border-border-default focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 transition-all h-10 mb-4">
        <div className="pl-3 flex items-center pointer-events-none">
          {isSearching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4 text-content-tertiary" />
          )}
        </div>
        <Input
          placeholder="Search knowledge base..."
          onChange={e => handleSearch(e.target.value)}
          aria-label="Search knowledge base"
          className="flex-1 bg-transparent border-none focus:ring-0 px-3 py-2 text-sm"
        />
      </div>

      <Tabs aria-label="Knowledge configuration">
        <Tabs.List>
          <Tabs.Tab id="files">Files</Tabs.Tab>
          <Tabs.Tab id="urls">URLs</Tabs.Tab>
          <Tabs.Tab id="snippets">Snippets</Tabs.Tab>
          <Tabs.Tab id="summary">Summary</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel id="files">
          <div className="space-y-6 pt-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="w-full max-w-md">
                <span className={cn(ds.form.label, 'block mb-3')}>Extraction Mode</span>
                <RadioGroup
                  orientation="vertical"
                  value={extractionMode}
                  onChange={val => onExtractionModeChange(val as 'manual' | 'auto')}
                  className="gap-3"
                >
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-secondary/50 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Manual</span>
                      <span className="text-xs text-content-tertiary">Extract when ready</span>
                    </div>
                    <Radio value="manual" aria-label="Manual" className="m-0 p-0" />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-secondary/50 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Auto-extract</span>
                      <span className="text-xs text-content-tertiary">Extract on upload</span>
                    </div>
                    <Radio value="auto" aria-label="Auto-extract" className="m-0 p-0" />
                  </div>
                </RadioGroup>
              </div>

              {extractionMode === 'manual' && pendingCount > 0 && (
                <Button
                  onPress={() => {
                    onExtractAllPending().catch(console.error)
                  }}
                  variant="primary"
                >
                  <RefreshCw className="w-4 h-4" />
                  Extract All Pending ({pendingCount})
                </Button>
              )}
            </div>

            <div
              className="border-dashed border-2 border-border-default rounded-lg p-8 text-center hover:bg-surface-secondary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Click to upload files"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={onFileUpload}
                multiple
                className="hidden"
                tabIndex={-1}
                aria-hidden="true"
              />
              <div className="flex flex-col items-center gap-2">
                <div className="p-3 bg-primary-50 rounded-full text-primary-600">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className={ds.text.heading.h4}>Upload Files</h4>
                <p className={ds.text.body.small}>Drag and drop or click to browse</p>
              </div>
            </div>

            {files.length > 0 && (
              <div className="border border-border-default rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-border-default">
                  <thead className="bg-surface-secondary">
                    <tr>
                      <th className={cn('px-4 py-3 text-left font-medium', ds.text.caption)}>Name</th>
                      <th className={cn('px-4 py-3 text-left font-medium', ds.text.caption)}>Status</th>
                      <th className={cn('px-4 py-3 text-left font-medium', ds.text.caption)}>Size</th>
                      <th className={cn('px-4 py-3 text-right font-medium', ds.text.caption)}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-surface-primary divide-y divide-border-default">
                    {files.map((file, index) => {
                      const f = file as UIFile
                      return (
                        <tr key={f.id ?? `${f.name}-${index}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-content-tertiary" />
                              <span className={ds.text.body.small}>{f.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">{getStatusChip(f.extractionStatus, f.extractionError)}</td>
                          <td className={cn('px-4 py-3', ds.text.body.small)}>{formatBytes(f.size)}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              {f.extractionStatus === 'pending' && (
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="tertiary"
                                  onPress={() => {
                                    if (f.id) onExtractFile(f.id).catch(console.error)
                                  }}
                                  aria-label="Extract file"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                isIconOnly
                                size="sm"
                                variant="danger"
                                onPress={() => onRemoveFile(index)}
                                aria-label="Remove file"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Tabs.Panel>

        <Tabs.Panel id="urls">
          <div className="space-y-6 pt-4">
            <div className="grid gap-6">
              <Card>
                <Card.Content>
                  <div className="flex gap-2 items-end">
                    <TextField className="flex-1 flex flex-col gap-1">
                      <Label>Add URL to cache</Label>
                      <Input
                        placeholder="https://example.com/docs"
                        value={newUrlCache}
                        onChange={e => setNewUrlCache(e.target.value)}
                      />
                    </TextField>
                    <Button onPress={handleCacheUrl} variant="primary" className="h-10">
                      Cache URL
                    </Button>
                  </div>
                </Card.Content>
              </Card>

              {urls.length > 0 && (
                <div className="space-y-2">
                  <h4 className={ds.text.heading.h4}>Simple URLs (Legacy)</h4>
                  {urls.map((url, index) => (
                    <div key={`legacy-url-${url || 'empty'}-${index}`} className="flex gap-2 items-center">
                      <TextField isInvalid={!!errors.knowledge.urls[index]} className="flex-1 flex flex-col gap-1">
                        <Input
                          value={url}
                          onChange={e => onUrlChange(index, e.target.value)}
                          aria-label={`URL ${index + 1}`}
                        />
                        <FieldError>{errors.knowledge.urls[index]}</FieldError>
                      </TextField>
                      <Button isIconOnly variant="danger" onPress={() => onRemoveUrl(index)} aria-label="Remove URL">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="ghost" onPress={onAddUrl} className="w-full">
                    Add Simple URL
                  </Button>
                </div>
              )}

              {cachedUrls && cachedUrls.length > 0 && (
                <div>
                  <h4 className={cn(ds.text.heading.h4, 'mb-4')}>Cached URLs</h4>
                  <div className="border border-border-default rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-border-default">
                      <thead className="bg-surface-secondary">
                        <tr>
                          <th className={cn('px-4 py-3 text-left', ds.text.caption)}>URL</th>
                          <th className={cn('px-4 py-3 text-left', ds.text.caption)}>Status</th>
                          <th className={cn('px-4 py-3 text-left', ds.text.caption)}>Cached</th>
                          <th className={cn('px-4 py-3 text-right', ds.text.caption)}>Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-surface-primary divide-y divide-border-default">
                        {cachedUrls.map(url => (
                          <tr key={url.id}>
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className={cn('font-medium', ds.text.body.small)}>{url.title || url.url}</span>
                                <span className="text-xs text-content-tertiary truncate max-w-50">{url.url}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {url.status === 'ready' ? (
                                <Chip variant="secondary" size="sm">
                                  Ready
                                </Chip>
                              ) : url.status === 'fetching' ? (
                                <Chip variant="secondary" size="sm">
                                  <div className="flex items-center gap-1">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Fetching
                                  </div>
                                </Chip>
                              ) : (
                                <Chip variant="secondary" size="sm">
                                  Failed
                                </Chip>
                              )}
                            </td>
                            <td className={cn('px-4 py-3', ds.text.body.small)}>
                              {url.fetchedAtISO ? new Date(url.fetchedAtISO).toLocaleDateString() : '-'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="tertiary"
                                  onPress={() => {
                                    onRefreshCachedUrl(url.id).catch(console.error)
                                  }}
                                  aria-label="Refresh URL"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </Button>
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="danger"
                                  onPress={() => {
                                    onRemoveCachedUrl(url.id).catch(console.error)
                                  }}
                                  aria-label="Remove URL"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Tabs.Panel>

        <Tabs.Panel id="snippets">
          <div className="space-y-6 pt-4">
            <Card>
              <Card.Content className="space-y-4">
                <TextField className="flex flex-col gap-1">
                  <Label>Title</Label>
                  <Input
                    placeholder="My code snippet"
                    value={snippetForm.title || ''}
                    onChange={e => setSnippetForm(prev => ({...prev, title: e.target.value}))}
                    required
                  />
                </TextField>
                <TextField className="flex flex-col gap-1">
                  <Label>Content</Label>
                  <TextArea
                    placeholder="Paste your text..."
                    value={snippetForm.content || ''}
                    onChange={e => setSnippetForm(prev => ({...prev, content: e.target.value}))}
                    rows={8}
                    maxLength={100000}
                    required
                  />
                </TextField>
                <TextField className="flex flex-col gap-1">
                  <Label>Tags (comma-separated)</Label>
                  <Input
                    placeholder="typescript, react, hooks"
                    value={snippetForm.tags?.join(', ') || ''}
                    onChange={e =>
                      setSnippetForm(prev => ({
                        ...prev,
                        tags: e.target.value
                          .split(',')
                          .map(t => t.trim())
                          .filter(Boolean),
                      }))
                    }
                  />
                </TextField>
                <div className="flex gap-2">
                  <Button
                    onPress={handleSaveSnippet}
                    variant="primary"
                    isDisabled={!snippetForm.title || !snippetForm.content}
                  >
                    {isEditingSnippet ? 'Update Snippet' : 'Save Snippet'}
                  </Button>
                  {isEditingSnippet && (
                    <Button
                      onPress={() => {
                        setIsEditingSnippet(null)
                        setSnippetForm({})
                      }}
                      variant="tertiary"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </Card.Content>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {snippets &&
                snippets.map(snippet => (
                  <Card key={snippet.id} className="h-full">
                    <Card.Content className="flex flex-col justify-between h-full">
                      <div>
                        <h4 className={cn('font-semibold mb-2', ds.text.body.base)}>{snippet.title}</h4>
                        <p className={cn('text-sm line-clamp-3 mb-3', ds.text.body.small)}>{snippet.content}</p>
                        {snippet.tags && snippet.tags.length > 0 && (
                          <div className="flex gap-1 flex-wrap mb-4">
                            {snippet.tags.map(tag => (
                              <Chip key={tag} size="sm" variant="secondary" className="text-xs">
                                {tag}
                              </Chip>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 justify-end border-t border-border-default pt-3 mt-auto">
                        <Button size="sm" variant="tertiary" onPress={() => handleEditSnippet(snippet)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onPress={() => {
                            onDeleteSnippet(snippet.id).catch(console.error)
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </Card.Content>
                  </Card>
                ))}
            </div>
          </div>
        </Tabs.Panel>

        <Tabs.Panel id="summary">
          <div className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card>
                <Card.Content>
                  <p className={ds.text.body.small}>Total Files</p>
                  <p className="text-2xl font-bold text-content-primary">{summary?.filesCount || 0}</p>
                </Card.Content>
              </Card>
              <Card>
                <Card.Content>
                  <p className={ds.text.body.small}>Extracted Files</p>
                  <p className="text-2xl font-bold text-content-primary">{summary?.extractedFilesCount || 0}</p>
                </Card.Content>
              </Card>
              <Card>
                <Card.Content>
                  <p className={ds.text.body.small}>Pending Extraction</p>
                  <p className="text-2xl font-bold text-content-primary">{summary?.pendingExtractionCount || 0}</p>
                </Card.Content>
              </Card>
              <Card>
                <Card.Content>
                  <p className={ds.text.body.small}>Cached URLs</p>
                  <p className="text-2xl font-bold text-content-primary">{summary?.urlsCount || 0}</p>
                </Card.Content>
              </Card>
              <Card>
                <Card.Content>
                  <p className={ds.text.body.small}>Text Snippets</p>
                  <p className="text-2xl font-bold text-content-primary">{summary?.snippetsCount || 0}</p>
                </Card.Content>
              </Card>
              <Card>
                <Card.Content>
                  <p className={ds.text.body.small}>Total Storage</p>
                  <p className="text-2xl font-bold text-content-primary">{formatBytes(summary?.totalSize || 0)}</p>
                </Card.Content>
              </Card>
            </div>
          </div>
        </Tabs.Panel>
      </Tabs>
    </div>
  )
}
