import type {GPTConfiguration, LocalFile, VectorStore} from '@/types/gpt'
import type {
  CachedURLDB,
  CreateSnippetInput,
  KnowledgeFileDB,
  KnowledgeSummary,
  SearchResult,
  TextSnippetDB,
  UpdateSnippetInput,
} from '@/types/knowledge'
import {AdvancedSettingsTab} from '@/components/gpt-editor-tabs/advanced-settings-tab'
import {GeneralTab} from '@/components/gpt-editor-tabs/general-tab'
import {KnowledgeTab} from '@/components/gpt-editor-tabs/knowledge-tab'
import {ToolsTab} from '@/components/gpt-editor-tabs/tools-tab'
import {VersionHistoryPanel} from '@/components/version-history-panel'
import {useAutoSave} from '@/hooks/use-auto-save'
import {useGPTValidation} from '@/hooks/use-gpt-validation'
import {useStorage} from '@/hooks/use-storage'
import {cn, ds, theme} from '@/lib/design-system'
import {KnowledgeService} from '@/services/knowledge-service'
import {GPTConfigurationSchema} from '@/types/gpt'
import {Button, Spinner, Tab, Tabs} from '@heroui/react'
import {Download, History, Play, Settings, Upload} from 'lucide-react'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {Link as RouterLink, useNavigate, useParams} from 'react-router-dom'
import {v4 as uuidv4} from 'uuid'

const DEFAULT_GPT: Omit<GPTConfiguration, 'id'> = {
  name: 'New GPT',
  description: '',
  systemPrompt: 'You are a helpful assistant.',
  tools: [],
  knowledge: {
    files: [],
    urls: [],
    extractionMode: 'manual',
  },
  capabilities: {
    codeInterpreter: false,
    webBrowsing: false,
    imageGeneration: false,
    fileSearch: {
      enabled: false,
    },
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  version: 1,
  tags: [],
  isArchived: false,
  folderId: null,
  archivedAt: null,
}

export function GPTEditorPage() {
  const {gptId} = useParams()
  const navigate = useNavigate()
  const {getGPT, saveGPT, createVersion, restoreVersion} = useStorage()

  // -- State --
  const [gpt, setGpt] = useState<GPTConfiguration>(() => ({
    ...DEFAULT_GPT,
    id: gptId || uuidv4(),
  }))

  const [activeTab, setActiveTab] = useState('general')
  const [isExporting, setIsExporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false)

  const importGptRef = useRef<HTMLInputElement>(null)

  // -- Validation --
  const {errors, handleFieldValidation, hasFieldSuccess, setValidationTiming, isValidating} = useGPTValidation()

  useEffect(() => {
    setValidationTiming('blur')
  }, [setValidationTiming])

  // -- Auto-save --
  const handleAutoSave = useCallback(
    async (gptToSave: GPTConfiguration) => {
      if (gptToSave.id && gptToSave.name.trim()) {
        // Save the GPT first, then create a version
        // This order is important because createVersion requires the GPT to exist
        await saveGPT(gptToSave)
        try {
          await createVersion(gptToSave.id, 'Auto-save')
        } catch {
          // Version creation may fail for first save, which is OK
        }
      }
    },
    [createVersion, saveGPT],
  )

  const {isSaving, lastSaved, hasUnsavedChanges, trackValue} = useAutoSave<GPTConfiguration>(handleAutoSave, {
    debounceMs: 2000,
    isEqual: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  })

  useEffect(() => {
    if (gpt.name.trim()) {
      trackValue(gpt)
    }
  }, [gpt, trackValue])

  // -- Knowledge Base State --
  const [knowledgeFiles, setKnowledgeFiles] = useState<KnowledgeFileDB[]>([])
  const [cachedUrls, setCachedUrls] = useState<CachedURLDB[]>([])
  const [snippets, setSnippets] = useState<TextSnippetDB[]>([])
  const [knowledgeSummary, setKnowledgeSummary] = useState<KnowledgeSummary>({
    filesCount: 0,
    extractedFilesCount: 0,
    pendingExtractionCount: 0,
    urlsCount: 0,
    snippetsCount: 0,
    totalSize: 0,
    extractedTextLength: 0,
  })

  const knowledgeService = useMemo(() => new KnowledgeService(), [])

  // -- Load Data --
  useEffect(() => {
    const loadGpt = async () => {
      if (gptId) {
        const existing = await getGPT(gptId)
        if (existing) {
          setGpt(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(existing)) {
              return existing
            }
            return prev
          })
        }
      }
    }
    loadGpt().catch(console.error)
  }, [gptId, getGPT])

  const loadKnowledgeData = useCallback(async () => {
    if (!gpt.id) return

    try {
      const [files, urls, snippetsData, summary] = await Promise.all([
        knowledgeService.listKnowledgeFiles(gpt.id),
        knowledgeService.listCachedUrls(gpt.id),
        knowledgeService.listSnippets(gpt.id),
        knowledgeService.getKnowledgeSummary(gpt.id),
      ])

      setKnowledgeFiles(files)
      setCachedUrls(urls)
      setSnippets(snippetsData)
      setKnowledgeSummary(summary)
    } catch (error_) {
      console.error('Failed to load knowledge data:', error_)
    }
  }, [gpt.id, knowledgeService])

  useEffect(() => {
    loadKnowledgeData().catch(console.error)
  }, [loadKnowledgeData])

  // -- Handlers --

  const handleUpdate = (updates: Partial<GPTConfiguration>) => {
    setGpt(prev => ({
      ...prev,
      ...updates,
      updatedAt: new Date(),
    }))
  }

  const handleTestGpt = () => {
    if (gpt) {
      const result = navigate(`/gpt/test/${gpt.id}`)
      if (result instanceof Promise) {
        result.catch(console.error)
      }
    }
  }

  const completionPercentage = useMemo(() => {
    let completedFields = 0
    const totalRequiredFields = 3 // name, description, systemPrompt

    if (gpt.name.trim()) completedFields++
    if (gpt.description.trim()) completedFields++
    if (gpt.systemPrompt.trim()) completedFields++

    return Math.floor((completedFields / totalRequiredFields) * 100)
  }, [gpt.name, gpt.description, gpt.systemPrompt])

  // Knowledge Handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return

    const filesArray = Array.from(e.target.files)
    const newFiles: LocalFile[] = await Promise.all(
      filesArray.map(async file => {
        const content = await file.text()
        return {
          name: file.name,
          content,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified,
        }
      }),
    )

    if (gpt.id) {
      await knowledgeService.addKnowledgeFiles(gpt.id, filesArray)
      await loadKnowledgeData()
    }

    setGpt(prev => ({
      ...prev,
      knowledge: {
        ...prev.knowledge,
        files: [...prev.knowledge.files, ...newFiles],
      },
      updatedAt: new Date(),
    }))
  }

  const handleRemoveFile = (index: number) => {
    setGpt(prev => ({
      ...prev,
      knowledge: {
        ...prev.knowledge,
        files: prev.knowledge.files.filter((_, i) => i !== index),
      },
      updatedAt: new Date(),
    }))
  }

  const handleAddUrl = () => {
    setGpt(prev => ({
      ...prev,
      knowledge: {
        ...prev.knowledge,
        urls: [...prev.knowledge.urls, ''],
      },
      updatedAt: new Date(),
    }))
  }

  const handleRemoveUrl = (index: number) => {
    setGpt(prev => ({
      ...prev,
      knowledge: {
        ...prev.knowledge,
        urls: prev.knowledge.urls.filter((_, i) => i !== index),
      },
      updatedAt: new Date(),
    }))
  }

  const handleUrlChange = (index: number, value: string) => {
    setGpt(prev => ({
      ...prev,
      knowledge: {
        ...prev.knowledge,
        urls: prev.knowledge.urls.map((url, i) => (i === index ? value : url)),
      },
      updatedAt: new Date(),
    }))
  }

  const handleExtractFile = async (fileId: string) => {
    await knowledgeService.extractKnowledgeFile(fileId)
    await loadKnowledgeData()
  }

  const handleExtractAllPending = async () => {
    if (!gpt.id) return
    await knowledgeService.extractAllPending(gpt.id)
    await loadKnowledgeData()
  }

  const handleCacheUrl = async (url: string) => {
    if (!gpt.id) return
    await knowledgeService.addCachedUrl(gpt.id, url)
    await loadKnowledgeData()
  }

  const handleRefreshCachedUrl = async (urlId: string) => {
    await knowledgeService.refreshCachedUrl(urlId)
    await loadKnowledgeData()
  }

  const handleRemoveCachedUrl = async (urlId: string) => {
    await knowledgeService.removeCachedUrl(urlId)
    await loadKnowledgeData()
  }

  const handleCreateSnippet = async (input: CreateSnippetInput) => {
    if (!gpt.id) return
    await knowledgeService.createSnippet(gpt.id, input)
    await loadKnowledgeData()
  }

  const handleUpdateSnippet = async (id: string, input: UpdateSnippetInput) => {
    await knowledgeService.updateSnippet(id, input)
    await loadKnowledgeData()
  }

  const handleDeleteSnippet = async (id: string) => {
    await knowledgeService.deleteSnippet(id)
    await loadKnowledgeData()
  }

  const handleSearch = async (query: string): Promise<SearchResult[]> => {
    if (!gpt.id || !query.trim()) return []
    return knowledgeService.searchKnowledge(gpt.id, query)
  }

  const handleCreateVectorStore = (name: string, fileIds: string[]) => {
    const newStore: VectorStore = {
      id: uuidv4(),
      name,
      fileIds,
      expiresAfter: {
        anchor: 'last_active_at',
        days: 30,
      },
    }

    setGpt(prev => ({
      ...prev,
      knowledge: {
        ...prev.knowledge,
        vectorStores: [...(prev.knowledge.vectorStores || []), newStore],
      },
      updatedAt: new Date(),
    }))
  }

  const handleDeleteVectorStore = (id: string) => {
    setGpt(prev => ({
      ...prev,
      knowledge: {
        ...prev.knowledge,
        vectorStores: (prev.knowledge.vectorStores || []).filter(store => store.id !== id),
      },
      updatedAt: new Date(),
    }))
  }

  const enrichedFiles = useMemo(() => {
    return gpt.knowledge.files.map(localFile => {
      const dbFile = knowledgeFiles.find(kf => kf.gptId === gpt.id && kf.name === localFile.name)
      return {
        ...localFile,
        id: dbFile?.id,
        extractionStatus: dbFile?.extractionStatus ?? 'pending',
        extractionError: dbFile?.extractionError,
      }
    })
  }, [gpt.id, gpt.knowledge.files, knowledgeFiles])

  // Export/Import
  const handleExportGPT = () => {
    try {
      setIsExporting(true)
      const gptJson = JSON.stringify(gpt, null, 2)
      const blob = new Blob([gptJson], {type: 'application/json'})
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${gpt.name.replaceAll(/\s+/g, '-').toLowerCase()}-gpt-config.json`
      document.body.append(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting GPT:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportGPT = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null)
    const file = e.target.files?.[0]
    if (!file) {
      setImportError('No file selected.')
      return
    }

    file
      .text()
      .then(text => {
        const importedData = JSON.parse(text) as GPTConfiguration
        const validatedGpt = GPTConfigurationSchema.parse({
          ...importedData,
          createdAt: new Date(importedData.createdAt),
          updatedAt: new Date(),
          id: gpt.id,
        })
        setGpt(validatedGpt)
      })
      .catch(error => {
        console.error('Error importing GPT:', error)
        setImportError('Invalid GPT configuration file.')
      })
      .finally(() => {
        if (importGptRef.current) importGptRef.current.value = ''
      })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height))] relative">
      {isValidating && (
        <div
          className="absolute inset-0 bg-surface-primary/50 backdrop-blur-sm z-50 flex items-center justify-center"
          aria-live="polite"
        >
          <div className={cn(ds.card.base, ds.card.elevated, 'flex items-center gap-3 p-4')}>
            <Spinner size="md" color="primary" />
            <span className={cn(ds.text.body.base, 'text-content-primary')}>Validating...</span>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className={cn('flex-none p-6 border-b', theme.surface(1), theme.border())}>
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-4">
              <h1 className={cn(ds.text.heading.h2)}>{gpt.name || 'New GPT'}</h1>
              <div className="flex items-center gap-2">
                {isSaving ? (
                  <span className={cn(ds.text.caption, 'text-warning-500 flex items-center gap-1')}>
                    <Spinner size="sm" />
                    Saving...
                  </span>
                ) : hasUnsavedChanges ? (
                  <span className={cn(ds.text.caption, 'text-warning-500')}>Unsaved changes</span>
                ) : lastSaved ? (
                  <span className={cn(ds.text.caption, 'text-success-500')}>Saved</span>
                ) : null}
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2 mt-2 w-64">
              <span className={cn(ds.text.caption, 'text-content-secondary w-20')}>Completion</span>
              <div className="flex-1 bg-surface-tertiary rounded-full h-1.5 overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all duration-300',
                    completionPercentage === 100 ? 'bg-success-500' : 'bg-primary-500',
                  )}
                  style={{width: `${completionPercentage}%`}}
                />
              </div>
              <span className={cn(ds.text.caption, 'text-content-secondary w-8 text-right')}>
                {completionPercentage}%
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Hidden file input for import */}
            <input
              type="file"
              ref={importGptRef}
              onChange={handleImportGPT}
              accept=".json"
              className="hidden"
              tabIndex={-1}
              aria-hidden="true"
            />

            {gptId && (
              <Button
                variant="flat"
                isIconOnly
                onPress={() => setIsVersionHistoryOpen(true)}
                className={cn(ds.animation.buttonPress)}
                title="Version History"
              >
                <History size={18} />
              </Button>
            )}

            <Button
              variant="flat"
              isIconOnly
              onPress={() => importGptRef.current?.click()}
              className={cn(ds.animation.buttonPress)}
              title="Import GPT Config"
            >
              <Upload size={18} />
            </Button>

            <Button
              variant="flat"
              isIconOnly
              onPress={handleExportGPT}
              isDisabled={isExporting}
              className={cn(ds.animation.buttonPress)}
              title="Export GPT Config"
            >
              {isExporting ? <Spinner size="sm" /> : <Download size={18} />}
            </Button>

            <Button
              variant="flat"
              as={RouterLink}
              to="/settings"
              className={cn(ds.animation.buttonPress, 'min-w-0')}
              startContent={<Settings size={18} />}
            >
              Settings
            </Button>

            <Button
              color="primary"
              size="lg"
              startContent={<Play size={18} />}
              onPress={handleTestGpt}
              className="flex items-center shadow-sm"
              isDisabled={!gpt.id}
            >
              Test GPT
            </Button>
          </div>
        </div>

        {importError && (
          <div
            role="alert"
            aria-live="assertive"
            className={cn(ds.state.error, 'mt-4 p-3 rounded-lg flex items-center justify-between')}
          >
            <span>{importError}</span>
            <Button size="sm" variant="light" onPress={() => setImportError(null)}>
              Dismiss
            </Button>
          </div>
        )}
      </div>

      {/* Tabs Layout */}
      <div className="flex-1 overflow-hidden flex flex-col bg-surface-primary">
        <Tabs
          selectedKey={activeTab}
          onSelectionChange={key => setActiveTab(key as string)}
          variant="underlined"
          color="primary"
          aria-label="GPT Editor Sections"
          classNames={{
            base: 'w-full border-b border-default-200 bg-surface-primary z-10',
            tabList: 'px-6 gap-8',
            cursor: 'w-full h-0.5',
            tab: 'max-w-fit px-0 h-14',
            tabContent: 'group-data-[selected=true]:text-primary font-medium text-base',
            panel: 'p-0 h-[calc(100%-3.5rem)]',
          }}
        >
          <Tab key="general" title="General">
            <div className="h-full overflow-y-auto">
              <div className="max-w-5xl mx-auto py-8 px-6">
                <GeneralTab
                  gpt={gpt}
                  onUpdate={handleUpdate}
                  errors={errors as unknown as Record<string, string | undefined>}
                  handleFieldValidation={handleFieldValidation}
                  hasFieldSuccess={hasFieldSuccess}
                />
              </div>
            </div>
          </Tab>

          <Tab key="knowledge" title="Knowledge">
            <div className="h-full overflow-y-auto">
              <div className="max-w-5xl mx-auto py-8 px-6">
                <KnowledgeTab
                  gpt={gpt}
                  gptId={gptId}
                  enrichedFiles={enrichedFiles}
                  knowledgeFiles={knowledgeFiles}
                  cachedUrls={cachedUrls}
                  snippets={snippets}
                  knowledgeSummary={knowledgeSummary}
                  errors={errors}
                  onUpdate={handleUpdate}
                  onExtractFile={handleExtractFile}
                  onExtractAllPending={handleExtractAllPending}
                  onCacheUrl={handleCacheUrl}
                  onRefreshCachedUrl={handleRefreshCachedUrl}
                  onRemoveCachedUrl={handleRemoveCachedUrl}
                  onCreateSnippet={handleCreateSnippet}
                  onUpdateSnippet={handleUpdateSnippet}
                  onDeleteSnippet={handleDeleteSnippet}
                  onSearch={handleSearch}
                  onFileUpload={handleFileUpload}
                  onRemoveFile={handleRemoveFile}
                  onAddUrl={handleAddUrl}
                  onRemoveUrl={handleRemoveUrl}
                  onUrlChange={handleUrlChange}
                  onCreateVectorStore={handleCreateVectorStore}
                  onDeleteVectorStore={handleDeleteVectorStore}
                />
              </div>
            </div>
          </Tab>

          <Tab key="tools" title="Tools">
            <div className="h-full overflow-y-auto">
              <div className="max-w-5xl mx-auto py-8 px-6">
                <ToolsTab gpt={gpt} onUpdate={handleUpdate} errors={errors} />
              </div>
            </div>
          </Tab>

          <Tab key="advanced" title="Advanced">
            <div className="h-full overflow-y-auto">
              <div className="max-w-5xl mx-auto py-8 px-6">
                <AdvancedSettingsTab gpt={gpt} onUpdate={handleUpdate} />
              </div>
            </div>
          </Tab>
        </Tabs>
      </div>

      {gptId && (
        <VersionHistoryPanel
          gptId={gptId}
          isOpen={isVersionHistoryOpen}
          onClose={() => setIsVersionHistoryOpen(false)}
          onRestore={version => {
            restoreVersion(version.id)
              .then(restored => {
                if (restored) {
                  setGpt(restored)
                }
                setIsVersionHistoryOpen(false)
              })
              .catch((restoreError: unknown) => {
                console.error('Failed to restore version:', restoreError)
              })
          }}
        />
      )}
    </div>
  )
}
