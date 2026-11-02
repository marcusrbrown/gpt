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
import '@/styles/heroui-v3.css'
import {Chip, Tab, Tabs} from '@heroui/react'
import {
  Button,
  Card,
  FieldError,
  Input,
  InputGroup,
  Label,
  Radio,
  RadioGroup,
  TextArea,
  TextField,
  Tooltip,
} from '@heroui-v3/react'
import {AlertCircle, CheckCircle, FileText, Loader2, RefreshCw, Search, Trash2, Upload} from 'lucide-react'
import {useId, useRef, useState} from 'react'

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
  const extractionModeLabelId = useId()
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
      } catch (error_) {
        console.error('Failed to save snippet', error_)
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
          <Chip startContent={<CheckCircle className="w-3 h-3" />} color="success" variant="flat" size="sm">
            Ready
          </Chip>
        )
      case 'processing':
        return (
          <Chip startContent={<Loader2 className="w-3 h-3 animate-spin" />} color="primary" variant="flat" size="sm">
            Processing
          </Chip>
        )
      case 'failed':
        return (
          <Tooltip delay={0}>
            <Tooltip.Trigger>
              <Chip startContent={<AlertCircle className="w-3 h-3" />} color="danger" variant="flat" size="sm">
                Failed
              </Chip>
            </Tooltip.Trigger>
            <Tooltip.Content>{error || 'Extraction failed'}</Tooltip.Content>
          </Tooltip>
        )
      case 'unsupported':
        return (
          <Chip variant="flat" size="sm" className="bg-content-tertiary/20 text-content-tertiary">
            Unsupported
          </Chip>
        )
      default:
        return (
          <Chip color="warning" variant="flat" size="sm">
            Pending
          </Chip>
        )
    }
  }

  const pendingCount = files.filter(f => (f as UIFile).extractionStatus === 'pending').length

  return (
    <div className={cn(ds.form.fieldGroup)}>
      <TextField onChange={handleSearch} className="mb-4" aria-label="Search knowledge base" fullWidth>
        <InputGroup fullWidth>
          <InputGroup.Prefix>
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="w-4 h-4 text-content-tertiary" aria-hidden="true" />
            )}
          </InputGroup.Prefix>
          <InputGroup.Input placeholder="Search knowledge base..." />
        </InputGroup>
      </TextField>

      <Tabs aria-label="Knowledge configuration" color="primary" variant="underlined">
        <Tab key="files" title="Files">
          <div className="space-y-6 pt-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="w-full max-w-md">
                <span id={extractionModeLabelId} className={cn(ds.form.label, 'block mb-3')}>
                  Extraction Mode
                </span>
                <RadioGroup
                  name="extraction-mode"
                  aria-labelledby={extractionModeLabelId}
                  value={extractionMode}
                  onChange={val => onExtractionModeChange(val as 'manual' | 'auto')}
                  className="gap-3"
                >
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-secondary/50 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Manual</span>
                      <span className="text-xs text-content-tertiary">Extract when ready</span>
                    </div>
                    <Radio value="manual" aria-label="Manual" className="m-0 p-0">
                      <Radio.Content>
                        <Radio.Control className="size-5">
                          <Radio.Indicator />
                        </Radio.Control>
                      </Radio.Content>
                    </Radio>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-secondary/50 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Auto-extract</span>
                      <span className="text-xs text-content-tertiary">Extract on upload</span>
                    </div>
                    <Radio value="auto" aria-label="Auto-extract" className="m-0 p-0">
                      <Radio.Content>
                        <Radio.Control className="size-5">
                          <Radio.Indicator />
                        </Radio.Control>
                      </Radio.Content>
                    </Radio>
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
                                variant="danger-soft"
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
        </Tab>

        <Tab key="urls" title="URLs">
          <div className="space-y-6 pt-4">
            <div className="grid gap-6">
              <Card>
                <Card.Content>
                  <div className="flex gap-2">
                    <TextField value={newUrlCache} onChange={setNewUrlCache} className="flex-1" fullWidth>
                      <Label>Add URL to cache</Label>
                      <Input placeholder="https://example.com/docs" />
                    </TextField>
                    <Button onPress={handleCacheUrl} variant="primary" className="h-full">
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
                      <TextField
                        value={url}
                        onChange={value => onUrlChange(index, value)}
                        className="flex-1"
                        isInvalid={!!errors.knowledge.urls[index]}
                        aria-label={`URL ${index + 1}`}
                        fullWidth
                      >
                        <Input />
                        <FieldError>{errors.knowledge.urls[index]}</FieldError>
                      </TextField>
                      <Button
                        isIconOnly
                        variant="danger-soft"
                        onPress={() => onRemoveUrl(index)}
                        aria-label="Remove URL"
                      >
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
                                <Chip color="success" variant="flat" size="sm">
                                  Ready
                                </Chip>
                              ) : url.status === 'fetching' ? (
                                <Chip
                                  color="primary"
                                  variant="flat"
                                  size="sm"
                                  startContent={<Loader2 className="w-3 h-3 animate-spin" />}
                                >
                                  Fetching
                                </Chip>
                              ) : (
                                <Chip color="danger" variant="flat" size="sm">
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
                                  variant="danger-soft"
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
        </Tab>

        <Tab key="snippets" title="Snippets">
          <div className="space-y-6 pt-4">
            <Card>
              <Card.Content className="space-y-4">
                <TextField
                  value={snippetForm.title || ''}
                  onChange={value => setSnippetForm(prev => ({...prev, title: value}))}
                  isRequired
                  fullWidth
                >
                  <Label>Title</Label>
                  <Input placeholder="My code snippet" />
                </TextField>
                <TextField
                  value={snippetForm.content || ''}
                  onChange={value => setSnippetForm(prev => ({...prev, content: value}))}
                  maxLength={100000}
                  isRequired
                  fullWidth
                >
                  <Label>Content</Label>
                  <TextArea placeholder="Paste your text..." rows={8} />
                </TextField>
                <TextField
                  value={snippetForm.tags?.join(', ') || ''}
                  onChange={value =>
                    setSnippetForm(prev => ({
                      ...prev,
                      tags: value
                        .split(',')
                        .map(t => t.trim())
                        .filter(Boolean),
                    }))
                  }
                  fullWidth
                >
                  <Label>Tags (comma-separated)</Label>
                  <Input placeholder="typescript, react, hooks" />
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
                              <Chip key={tag} size="sm" variant="flat" className="text-xs">
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
                          variant="danger-soft"
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
        </Tab>

        <Tab key="summary" title="Summary">
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
        </Tab>
      </Tabs>
    </div>
  )
}
