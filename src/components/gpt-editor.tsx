import {useAutoSave} from '@/hooks/use-auto-save'
import {useGPTValidation} from '@/hooks/use-gpt-validation'
import {useOpenAIService} from '@/hooks/use-openai-service'
import {useStorage} from '@/hooks/use-storage'
import {cn, ds, responsive} from '@/lib/design-system'
import {
  GPTConfigurationSchema,
  type ConversationMessage,
  type GPTCapabilities,
  type GPTConfiguration,
  type LocalFile,
  type MCPTool,
  type VectorStore,
} from '@/types/gpt'
import {Button, Input, Spinner, Tab, Tabs, Textarea} from '@heroui/react'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {v4 as uuidv4} from 'uuid'
import {CapabilitiesConfiguration} from './capabilities-configuration'
import {KnowledgeConfiguration} from './knowledge-configuration'
import {ToolsConfiguration} from './tools-configuration'
import {VersionHistoryPanel} from './version-history-panel'

interface GPTEditorProps {
  gptId?: string | undefined
  onSave?: (gpt: GPTConfiguration) => void
}

const DEFAULT_GPT: Omit<GPTConfiguration, 'id'> = {
  name: '',
  description: '',
  systemPrompt: '',
  tools: [],
  knowledge: {
    files: [],
    urls: [],
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

// Define update type for streamRun
interface AssistantRunUpdate {
  type: 'complete' | 'requires_action' | 'error'
  messages?: {
    id: string
    role: string
    content: {
      text?: {
        value: string
      }
    }[]
    created_at: number
  }[]
  error?: string
  required_action?: unknown
}

// Vector Knowledge component for managing vector stores
function VectorKnowledge({
  files,
  vectorStores,
  onCreateVectorStore,
  onDeleteVectorStore,
}: {
  files: LocalFile[]
  vectorStores?: VectorStore[]
  onCreateVectorStore: (name: string, fileIds: string[]) => void
  onDeleteVectorStore: (id: string) => void
}) {
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

      {error && <div className={cn(ds.state.error, 'p-2 rounded', ds.text.body.small)}>{error}</div>}

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

export function GPTEditor({gptId, onSave}: GPTEditorProps) {
  const {getGPT, saveGPT, createVersion, restoreVersion} = useStorage()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const importGptRef = useRef<HTMLInputElement>(null)
  const [gpt, setGpt] = useState<GPTConfiguration>(() => ({...DEFAULT_GPT, id: uuidv4(), tags: [], isArchived: false}))
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false)
  const {
    errors,
    validateForm,
    handleFieldValidation,
    clearFieldError,
    hasFieldSuccess,
    setValidationTiming,
    isValidating,
  } = useGPTValidation()

  // Set validation timing mode for consistent UX
  useEffect(() => {
    setValidationTiming('blur')
  }, [setValidationTiming])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAutoSave = useCallback(
    async (gptToSave: GPTConfiguration) => {
      if (gptToSave.id && gptToSave.name.trim()) {
        await createVersion(gptToSave.id, 'Auto-save')
        await saveGPT(gptToSave)
      }
    },
    [createVersion, saveGPT],
  )

  const {isSaving, lastSaved, hasUnsavedChanges, trackValue} = useAutoSave<GPTConfiguration>(handleAutoSave, {
    debounceMs: 2000,
    isEqual: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  })

  useEffect(() => {
    if (gptId && gpt.name.trim()) {
      trackValue(gpt)
    }
  }, [gpt, gptId, trackValue])
  const [activeTab, setActiveTab] = useState('edit')
  const [testMessage, setTestMessage] = useState('')
  const [testMessages, setTestMessages] = useState<ConversationMessage[]>([])
  const [isTesting, setIsTesting] = useState(false)
  const [files, setFiles] = useState<LocalFile[]>([])
  const [testResponse, setTestResponse] = useState<string | null>(null)
  const [isTestLoading, setIsTestLoading] = useState(false)
  const [testError, setTestError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  const openAIService = useOpenAIService()

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

  // Calculate completion percentage for required fields
  const completionPercentage = useMemo(() => {
    let completedFields = 0
    const totalRequiredFields = 3 // name, description, systemPrompt

    // Check basic required fields
    if (gpt.name.trim()) completedFields++
    if (gpt.description.trim()) completedFields++
    if (gpt.systemPrompt.trim()) completedFields++

    // Calculate the percentage
    return Math.floor((completedFields / totalRequiredFields) * 100)
  }, [gpt.name, gpt.description, gpt.systemPrompt])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const {name, value} = e.target
    setGpt(prev => ({
      ...prev,
      [name]: value,
      updatedAt: new Date(),
    }))
    // Clear error when user starts typing
    if (errors[name as keyof typeof errors]) {
      clearFieldError(name as keyof typeof errors)
    }
  }

  const handleCapabilityChange = (capability: keyof GPTCapabilities) => {
    setGpt(prev => ({
      ...prev,
      capabilities: {
        ...prev.capabilities,
        [capability]: !prev.capabilities[capability],
      },
      updatedAt: new Date(),
    }))
  }

  const handleAddTool = () => {
    const newTool: MCPTool = {
      name: '',
      description: '',
      schema: {},
      endpoint: '',
    }

    setGpt(prev => ({
      ...prev,
      tools: [...prev.tools, newTool],
      updatedAt: new Date(),
    }))
  }

  const handleRemoveTool = (index: number) => {
    setGpt(prev => ({
      ...prev,
      tools: prev.tools.filter((_, i) => i !== index),
      updatedAt: new Date(),
    }))
  }

  const handleToolChange = (index: number, field: keyof MCPTool, value: MCPTool[keyof MCPTool]) => {
    setGpt(prev => ({
      ...prev,
      tools: prev.tools.map((tool, i) => (i === index ? {...tool, [field]: value} : tool)),
      updatedAt: new Date(),
    }))
  }

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

    setFiles(prev => [...prev, ...newFiles])
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm(gpt)) {
      return
    }

    setIsSubmitting(true)
    try {
      await saveGPT(gpt)
      onSave?.(gpt)
    } catch (error: unknown) {
      console.error('Failed to save GPT:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTestMessage = (e: React.FormEvent) => {
    e.preventDefault()

    if (!testMessage.trim()) return

    setIsTestLoading(true)
    setTestError(null)

    // Add the user message to the test messages
    setTestMessages(prev => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        content: testMessage,
        timestamp: new Date(),
      },
    ])

    const testGPT = async () => {
      try {
        // Create an assistant with the current GPT configuration
        const assistant = await openAIService.createAssistant(gpt)

        // Create a thread for this test conversation
        const thread = await openAIService.createThread()

        // Add the user's message to the thread
        await openAIService.addMessage(thread.id, testMessage)

        // Run the assistant on the thread to generate a response
        let response: ConversationMessage | null = null

        // Use streamRun for real-time updates
        await openAIService.streamRun(thread.id, assistant.id, (update: unknown) => {
          // Type cast the update to AssistantRunUpdate
          const typedUpdate = update as AssistantRunUpdate
          if (typedUpdate.type === 'complete' && typedUpdate.messages) {
            // Find the assistant message in the messages
            const assistantMessages = typedUpdate.messages.filter(msg => msg.role === 'assistant')

            if (assistantMessages.length > 0) {
              const latestMessage = assistantMessages[0]
              if (latestMessage) {
                // Create a ConversationMessage from the assistant message
                response = {
                  id: latestMessage.id,
                  role: 'assistant',
                  content: latestMessage.content[0]?.text?.value || 'No response content',
                  timestamp: new Date(latestMessage.created_at * 1000),
                }

                // Add the message to the test messages and store response text
                if (response) {
                  const validResponse = response // TypeScript assertion that response is not null
                  setTestMessages(prev => [...prev, validResponse])
                  // Store the response text for display
                  setTestResponse(validResponse.content)
                }
              }
            }
            setIsTesting(false)
          } else if (typedUpdate.type === 'error') {
            // Handle error updates
            setTestError(typedUpdate.error || 'An error occurred during testing')
          }
        })
      } catch (error) {
        // Handle errors
        setTestError(error instanceof Error ? error.message : 'Failed to test GPT')
        console.error('Test GPT error:', error)
      } finally {
        setIsTestLoading(false)
      }
    }

    // Use void operator to explicitly ignore the promise
    testGPT().catch(error => {
      console.error('Failed to send message:', error)
    })
  }

  // Handle exporting the GPT configuration to a JSON file
  const handleExportGPT = () => {
    try {
      setIsExporting(true)
      // Convert the GPT configuration to a JSON string
      const gptJson = JSON.stringify(gpt, null, 2)

      // Create a blob with the JSON data
      const blob = new Blob([gptJson], {type: 'application/json'})

      // Create a URL for the blob
      const url = URL.createObjectURL(blob)

      // Create a link element to trigger the download
      const a = document.createElement('a')
      a.href = url
      a.download = `${gpt.name.replaceAll(/\s+/g, '-').toLowerCase()}-gpt-config.json`

      // Trigger the download
      document.body.append(a)
      a.click()

      // Clean up
      a.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting GPT:', error)
    } finally {
      setIsExporting(false)
    }
  }

  // Handle importing a GPT configuration from a JSON file
  const handleImportGPT = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null)

    const file = e.target.files?.[0]
    if (!file) {
      setImportError('No file selected. Please try again.')
      return
    }

    try {
      const text = await file.text()
      const importedData = JSON.parse(text) as GPTConfiguration
      const validatedGpt = GPTConfigurationSchema.parse({
        ...importedData,
        createdAt: new Date(importedData.createdAt),
        updatedAt: new Date(),
        id: gpt.id,
      })
      setGpt(validatedGpt)
    } catch (error) {
      console.error('Error importing GPT:', error)
      setImportError('Invalid GPT configuration file. Please try again with a valid file.')
    }

    if (importGptRef.current) importGptRef.current.value = ''
  }

  // Handle creating a vector store
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

  // Handle deleting a vector store
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

  return (
    <div className="flex flex-col h-full">
      <Tabs selectedKey={activeTab} onSelectionChange={key => setActiveTab(key as string)} aria-label="GPT Editor Tabs">
        <Tab key="edit" title="Edit">
          <div className="p-4 space-y-6 max-w-full overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className={responsive.heading.large}>GPT Configuration</h2>
                <div className="mt-2 w-64">
                  <div className={cn('flex justify-between mb-1', ds.text.caption, 'text-content-secondary')}>
                    <span>Completion</span>
                    <span>{completionPercentage}%</span>
                  </div>
                  <div className="w-full bg-surface-tertiary rounded-full h-2">
                    <div
                      className={cn(
                        'h-2 rounded-full transition-all duration-300',
                        completionPercentage === 100 ? 'bg-success-500' : 'bg-primary-500',
                      )}
                      style={{width: `${completionPercentage}%`}}
                    ></div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {/* eslint-disable-next-line @typescript-eslint/no-misused-promises */}
                <input type="file" ref={importGptRef} onChange={handleImportGPT} accept=".json" className="hidden" />
                <Button
                  color="secondary"
                  variant="solid"
                  onPress={() => importGptRef.current?.click()}
                  isDisabled={isSubmitting}
                  className={cn(ds.animation.buttonPress)}
                >
                  Import
                </Button>
                <Button
                  color="secondary"
                  variant="solid"
                  onPress={handleExportGPT}
                  isDisabled={isSubmitting || isExporting}
                  className={cn(ds.animation.buttonPress)}
                >
                  {isExporting ? <Spinner size="sm" /> : 'Export'}
                </Button>
                <Button
                  color="primary"
                  variant="solid"
                  onPress={() => {
                    handleSubmit(new Event('submit') as unknown as React.FormEvent).catch(console.error)
                  }}
                  isDisabled={isSubmitting}
                  className={cn(ds.animation.buttonPress)}
                >
                  {isSubmitting ? <Spinner size="sm" /> : 'Save'}
                </Button>
              </div>
            </div>

            {importError && <div className={cn(ds.state.error, 'p-2 my-2 rounded')}>{importError}</div>}

            <form
              onSubmit={e => {
                handleSubmit(e).catch(console.error)
              }}
              className={cn('space-y-6 relative', (isSubmitting || isValidating) && ds.state.loading)}
              aria-busy={isSubmitting || isValidating}
              {...(isSubmitting || isValidating ? {'aria-describedby': 'form-loading-status'} : {})}
            >
              {(isSubmitting || isValidating) && (
                <div
                  className="absolute inset-0 bg-surface-primary/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <div
                    className={cn(ds.card.base, ds.card.elevated, 'flex items-center gap-3 p-4', ds.animation.fadeIn)}
                  >
                    <Spinner size="md" color="primary" />
                    <span id="form-loading-status" className={cn(ds.text.body.base, 'text-content-primary')}>
                      {isValidating ? 'Validating configuration...' : 'Saving GPT configuration...'}
                    </span>
                  </div>
                </div>
              )}
              <div>
                <Input
                  type="text"
                  label="Name"
                  name="name"
                  id="name"
                  value={gpt.name}
                  onValueChange={value => {
                    setGpt(prev => ({
                      ...prev,
                      name: value,
                      updatedAt: new Date(),
                    }))
                    if (errors.name) {
                      clearFieldError('name')
                    }
                  }}
                  onBlur={() => {
                    // Validate on blur for consistent UX
                    handleFieldValidation('name', gpt.name, gpt, 'blur')
                  }}
                  isInvalid={!!errors.name}
                  errorMessage={errors.name}
                  isRequired
                  className={cn(
                    hasFieldSuccess('name') && !errors.name && ds.state.success,
                    ds.animation.transition,
                    ds.animation.formFocus,
                  )}
                />
              </div>
              <div>
                <label htmlFor="description" className={cn(ds.form.label)}>
                  Description
                </label>
                <Textarea
                  name="description"
                  id="description"
                  value={gpt.description}
                  onChange={handleInputChange}
                  onBlur={() => {
                    // Validate on blur for consistent UX
                    handleFieldValidation('description', gpt.description, gpt, 'blur')
                  }}
                  minRows={3}
                  isInvalid={!!errors.description}
                  errorMessage={errors.description}
                  isRequired
                  className={cn(
                    ds.form.fieldGroup,
                    hasFieldSuccess('description') && !errors.description && ds.state.success,
                    ds.animation.transition,
                    ds.animation.formFocus,
                  )}
                />
              </div>
              <div>
                <label htmlFor="systemPrompt" className={cn(ds.form.label)}>
                  System Prompt
                </label>
                <Textarea
                  name="systemPrompt"
                  id="systemPrompt"
                  value={gpt.systemPrompt}
                  onChange={handleInputChange}
                  onBlur={() => {
                    // Validate on blur for consistent UX
                    handleFieldValidation('systemPrompt', gpt.systemPrompt, gpt, 'blur')
                  }}
                  minRows={5}
                  isInvalid={!!errors.systemPrompt}
                  errorMessage={errors.systemPrompt}
                  isRequired
                  className={cn(
                    ds.form.fieldGroup,
                    hasFieldSuccess('systemPrompt') && !errors.systemPrompt && ds.state.success,
                    ds.animation.transition,
                    ds.animation.formFocus,
                  )}
                />
              </div>
              <ToolsConfiguration
                tools={gpt.tools}
                errors={{tools: errors.tools}}
                onAddTool={handleAddTool}
                onRemoveTool={handleRemoveTool}
                onToolChange={handleToolChange}
              />
              <CapabilitiesConfiguration capabilities={gpt.capabilities} onCapabilityChange={handleCapabilityChange} />{' '}
              <div>
                <div className="flex items-center justify-between">
                  <label className={cn('block', ds.text.heading.h4, 'text-content-primary')}>Knowledge Base</label>
                  <div className="flex gap-2">
                    <div className={cn('flex items-center gap-2 px-3', ds.text.body.small)}>
                      {isSaving ? (
                        <span className="text-warning-500 flex items-center gap-1">
                          <Spinner size="sm" />
                          Saving...
                        </span>
                      ) : hasUnsavedChanges ? (
                        <span className="text-warning-500">Unsaved changes</span>
                      ) : lastSaved ? (
                        <span className="text-success-500">Saved</span>
                      ) : null}
                    </div>
                    {gptId && (
                      <Button
                        color="secondary"
                        variant="flat"
                        onPress={() => setIsVersionHistoryOpen(true)}
                        className={cn(ds.animation.buttonPress)}
                      >
                        Version History
                      </Button>
                    )}
                    <div className="mb-4">
                      <h3 className={cn(ds.text.heading.h4, 'mb-2')}>Knowledge Files</h3>
                      <div className="space-y-2">
                        {gpt.knowledge.files.map((file, index) => (
                          <div
                            key={`file-${file.name}-${file.content?.slice(0, 50) || index}`}
                            className="flex items-center justify-between p-2 bg-surface-secondary rounded"
                          >
                            <span className={ds.text.body.small}>{file.name}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveFile(index)}
                              aria-label="Remove file"
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2">
                        <Button onClick={() => fileInputRef.current?.click()} className={cn(ds.animation.buttonPress)}>
                          Add File
                        </Button>
                        {/* eslint-disable-next-line @typescript-eslint/no-misused-promises */}
                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} multiple />
                      </div>
                    </div>
                    <Button
                      onPress={handleAddUrl}
                      size="sm"
                      color="primary"
                      variant="flat"
                      className={cn(ds.animation.buttonPress)}
                    >
                      Add URL
                    </Button>
                  </div>
                </div>

                {/* URLs Section */}
                <div className="mt-4">
                  <h4 className={cn(ds.text.heading.h4, 'text-content-primary mb-2')}>URLs</h4>
                  <div className="space-y-2">
                    {gpt.knowledge.urls.map((url, index) => (
                      <div key={`url-${url || index}`} className="flex items-center gap-2">
                        <Input
                          type="url"
                          value={url}
                          onChange={e => handleUrlChange(index, e.target.value)}
                          placeholder="https://example.com"
                          className={cn('flex-1', ds.animation.formFocus)}
                        />
                        <Button
                          onPress={() => handleRemoveUrl(index)}
                          size="sm"
                          color="danger"
                          variant="light"
                          className={cn(ds.animation.buttonPress)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </form>
          </div>
        </Tab>
        <Tab key="knowledge" title="Knowledge">
          <div className="p-4 space-y-6 max-w-full overflow-y-auto">
            <h2 className={responsive.heading.large}>Knowledge Sources</h2>

            <KnowledgeConfiguration
              files={gpt.knowledge.files}
              urls={gpt.knowledge.urls}
              errors={{knowledge: {urls: errors.knowledge?.urls || {}}}}
              // eslint-disable-next-line @typescript-eslint/no-misused-promises
              onFileUpload={handleFileUpload}
              onRemoveFile={handleRemoveFile}
              onAddUrl={handleAddUrl}
              onRemoveUrl={handleRemoveUrl}
              onUrlChange={handleUrlChange}
            />

            <div className="mt-8">
              <VectorKnowledge
                files={gpt.knowledge.files}
                vectorStores={gpt.knowledge.vectorStores || []}
                onCreateVectorStore={handleCreateVectorStore}
                onDeleteVectorStore={handleDeleteVectorStore}
              />
            </div>
          </div>
        </Tab>
        <Tab key="test" title="Test GPT">
          <div className="space-y-4">
            <div className="bg-surface-secondary rounded-lg p-4">
              <h3 className={cn(ds.text.heading.h4, 'text-content-primary mb-2')}>System Prompt</h3>
              <p className={cn(ds.text.body.small, 'text-content-secondary whitespace-pre-wrap')}>{gpt.systemPrompt}</p>
            </div>

            <div className="space-y-4">
              <h3 className={cn(ds.text.heading.h4, 'text-content-primary')}>Conversation</h3>
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {testMessages.map(message => (
                  <div
                    key={message.id}
                    className={`p-3 rounded-lg ${
                      message.role === 'user' ? 'bg-primary-50 text-primary-900' : 'bg-default-50 text-content-primary'
                    }`}
                  >
                    <div className={cn(ds.text.caption, 'font-medium mb-1')}>
                      {message.role === 'user' ? 'You' : 'Assistant'}
                    </div>
                    <div className={cn(ds.text.body.small, 'whitespace-pre-wrap')}>{message.content}</div>
                  </div>
                ))}
                {isTesting && (
                  <div className={cn('p-3 rounded-lg bg-default-50 text-content-primary', ds.animation.fadeIn)}>
                    <div className={cn(ds.text.caption, 'font-medium mb-1')}>Assistant</div>
                    <div className={cn(ds.text.body.small, 'flex items-center gap-2')}>
                      <Spinner size="sm" />
                      <span>Processing your message...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <form
              onSubmit={handleTestMessage}
              className={cn('flex gap-2', isTesting && ds.state.loading)}
              aria-busy={isTesting}
            >
              <Input
                value={testMessage}
                onChange={e => setTestMessage(e.target.value)}
                placeholder="Type your message..."
                disabled={isTesting}
                className={cn('flex-1', ds.animation.formFocus)}
                {...(isTesting ? {'aria-describedby': 'test-loading-status'} : {})}
              />
              <Button
                type="submit"
                color="primary"
                isLoading={isTesting}
                disabled={!testMessage.trim() || isTesting}
                className={cn(ds.animation.buttonPress)}
              >
                {isTesting ? 'Sending...' : 'Send'}
              </Button>
            </form>
          </div>
        </Tab>
      </Tabs>

      {/* Enhanced loading and error indicators for test tab */}
      {activeTab === 'test' && (
        <>
          {/* Show loading indicator with design system utilities */}
          {isTestLoading && (
            <div
              className={cn(ds.state.loading, 'flex items-center justify-center p-6', ds.animation.fadeIn)}
              aria-live="polite"
              aria-atomic="true"
            >
              <div className={cn(ds.card.base, 'flex items-center gap-3 p-4')}>
                <Spinner size="md" color="primary" />
                <span id="test-loading-status" className={cn(ds.text.body.base, 'text-content-primary')}>
                  Testing GPT configuration...
                </span>
              </div>
            </div>
          )}

          {/* Show error if any */}
          {testError && <div className={cn(ds.state.error, 'p-4 rounded my-2')}>Error: {testError}</div>}

          {/* Display file list */}
          {files.length > 0 && (
            <div className="mt-4">
              <h3 className={cn(ds.text.heading.h4, 'mb-2')}>Uploaded Files:</h3>
              <ul className={ds.text.body.small}>
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${file.size}-${file.lastModified || index}`}
                    className="flex items-center justify-between py-1"
                  >
                    <span>{file.name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveFile(index)}
                      aria-label="Remove file"
                      className={cn(ds.animation.buttonPress)}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Show test response if any */}
          {testResponse && !isTestLoading && !testError && (
            <div className="mt-4 p-4 bg-surface-secondary rounded">
              <h3 className={cn(ds.text.heading.h4, 'mb-2')}>Response:</h3>
              <div className="whitespace-pre-wrap">{testResponse}</div>
            </div>
          )}
        </>
      )}

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
              .catch(() => {})
          }}
        />
      )}
    </div>
  )
}
