import {Button, Input, Spinner, Tab, Tabs, Textarea} from '@heroui/react'
import {useEffect, useRef, useState} from 'react'
import {v4 as uuidv4} from 'uuid'
import {useGPTValidation} from '../hooks/use-gpt-validation'
import {useOpenAIService} from '../hooks/use-openai-service'
import {useStorage} from '../hooks/use-storage'
import {cn, ds} from '../lib/design-system'
import {
  GPTConfigurationSchema,
  type ConversationMessage,
  type GPTCapabilities,
  type GPTConfiguration,
  type LocalFile,
  type MCPTool,
  type VectorStore,
} from '../types/gpt'
import {CapabilitiesConfiguration} from './capabilities-configuration'
import {KnowledgeConfiguration} from './knowledge-configuration'
import {ToolsConfiguration} from './tools-configuration'

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
      <h3 className={ds.text.heading.h3}>Vector Knowledge Stores</h3>
      <p className={cn(ds.text.body.base, 'text-content-secondary')}>
        Create vector stores from your files to enable advanced retrieval capabilities.
      </p>

      {error && <div className={cn(ds.state.error, 'p-2 rounded', ds.text.body.small)}>{error}</div>}

      <div className="border rounded-md p-4 space-y-4">
        <div>
          <label htmlFor="storeName" className={cn(ds.form.label)}>
            Vector Store Name
          </label>
          <Input
            id="storeName"
            value={newStoreName}
            onChange={e => setNewStoreName(e.target.value)}
            className="mt-1"
            placeholder="My Knowledge Base"
          />
        </div>

        <div>
          <label className={cn('block mb-2', ds.text.heading.h4, 'text-content-primary')}>Select Files</label>
          <div className="max-h-40 overflow-y-auto border rounded-md p-2">
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
                    className="mr-2"
                  />
                  <label htmlFor={`file-${file.name}`} className={ds.text.body.small}>
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
        >
          {isCreating ? <Spinner size="sm" /> : 'Create Vector Store'}
        </Button>
      </div>

      {/* List existing vector stores */}
      <div className="mt-6">
        <h4 className={ds.text.heading.h4}>Existing Vector Stores</h4>
        {!vectorStores || vectorStores.length === 0 ? (
          <p className={cn(ds.text.body.small, 'text-content-tertiary')}>No vector stores created yet.</p>
        ) : (
          <div className="space-y-2">
            {vectorStores.map(store => (
              <div key={store.id} className="border rounded-md p-3 flex justify-between items-center">
                <div>
                  <h5 className="font-medium">{store.name}</h5>
                  <p className={cn(ds.text.caption, 'text-content-tertiary normal-case')}>
                    {store.fileIds.length} files indexed
                  </p>
                </div>
                <Button color="danger" size="sm" variant="ghost" onPress={() => onDeleteVectorStore(store.id)}>
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
  const {getGPT, saveGPT} = useStorage()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const importGptRef = useRef<HTMLInputElement>(null)
  const [gpt, setGpt] = useState<GPTConfiguration>(() => {
    if (gptId) {
      const existing = getGPT(gptId)
      return existing || {...DEFAULT_GPT, id: uuidv4()}
    }
    return {...DEFAULT_GPT, id: uuidv4()}
  })
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
  const [completionPercentage, setCompletionPercentage] = useState(0)

  const openAIService = useOpenAIService()

  useEffect(() => {
    if (gptId) {
      const existing = getGPT(gptId)
      if (existing) {
        setGpt(existing)
      }
    }
  }, [gptId, getGPT])

  // Calculate completion percentage for required fields
  useEffect(() => {
    let completedFields = 0
    const totalRequiredFields = 3 // name, description, systemPrompt

    // Check basic required fields
    if (gpt.name.trim()) completedFields++
    if (gpt.description.trim()) completedFields++
    if (gpt.systemPrompt.trim()) completedFields++

    // Calculate the percentage
    const percentage = Math.floor((completedFields / totalRequiredFields) * 100)
    setCompletionPercentage(percentage)
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm(gpt)) {
      return
    }

    setIsSubmitting(true)
    try {
      saveGPT(gpt)
      onSave?.(gpt)
    } catch (error: unknown) {
      console.error('Failed to save GPT:', error)
      // You might want to show an error toast here
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

                // Add the message to the test messages
                setTestMessages(prev => [...prev, response!])

                // Store the response text for display
                setTestResponse(response.content)
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
    testGPT()
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
                <h2 className={ds.text.heading.h2}>GPT Configuration</h2>
                <div className="mt-2 w-64">
                  <div className={cn('flex justify-between mb-1', ds.text.caption, 'text-content-secondary')}>
                    <span>Completion</span>
                    <span>{completionPercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${completionPercentage === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{width: `${completionPercentage}%`}}
                    ></div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <input type="file" ref={importGptRef} onChange={handleImportGPT} accept=".json" className="hidden" />
                <Button color="secondary" onPress={() => importGptRef.current?.click()} isDisabled={isSubmitting}>
                  Import
                </Button>
                <Button color="secondary" onPress={handleExportGPT} isDisabled={isSubmitting || isExporting}>
                  {isExporting ? <Spinner size="sm" /> : 'Export'}
                </Button>
                <Button
                  color="primary"
                  onPress={() => handleSubmit(new Event('submit') as unknown as React.FormEvent)}
                  isDisabled={isSubmitting}
                >
                  {isSubmitting ? <Spinner size="sm" /> : 'Save'}
                </Button>
              </div>
            </div>

            {importError && <div className={cn(ds.state.error, 'p-2 my-2 rounded')}>{importError}</div>}

            <form
              onSubmit={handleSubmit}
              className={cn('space-y-6 relative', (isSubmitting || isValidating) && ds.state.loading)}
            >
              {(isSubmitting || isValidating) && (
                <div className="absolute inset-0 bg-surface-primary/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                  <div className="flex items-center gap-3 p-4 bg-surface-secondary rounded-lg shadow-lg border border-border-default">
                    <Spinner size="sm" color="primary" />
                    <span className={cn(ds.text.body.base)}>{isValidating ? 'Validating...' : 'Saving GPT...'}</span>
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
                    'transition-colors duration-200',
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
                    'transition-colors duration-200',
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
                    'transition-colors duration-200',
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
                    <div className="mb-4">
                      <h3 className={cn(ds.text.heading.h4, 'mb-2')}>Knowledge Files</h3>
                      <div className="space-y-2">
                        {gpt.knowledge.files.map((file, index) => (
                          <div
                            key={`${file.name}-${index}`}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded"
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
                        <Button onClick={() => fileInputRef.current?.click()}>Add File</Button>
                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} multiple />
                      </div>
                    </div>
                    <Button onPress={handleAddUrl} size="sm" color="primary" variant="flat">
                      Add URL
                    </Button>
                  </div>
                </div>

                {/* URLs Section */}
                <div className="mt-4">
                  <h4 className={cn(ds.text.heading.h4, 'text-content-primary mb-2')}>URLs</h4>
                  <div className="space-y-2">
                    {gpt.knowledge.urls.map((url, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          type="url"
                          value={url}
                          onChange={e => handleUrlChange(index, e.target.value)}
                          placeholder="https://example.com"
                          className="flex-1"
                        />
                        <Button onPress={() => handleRemoveUrl(index)} size="sm" color="danger" variant="light">
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
            <h2 className={ds.text.heading.h2}>Knowledge Sources</h2>

            <KnowledgeConfiguration
              files={gpt.knowledge.files}
              urls={gpt.knowledge.urls}
              errors={{knowledge: {urls: errors.knowledge?.urls || {}}}}
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
            <div className="bg-gray-50 rounded-lg p-4">
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
                      message.role === 'user' ? 'bg-indigo-50 text-indigo-900' : 'bg-gray-50 text-gray-900'
                    }`}
                  >
                    <div className={cn(ds.text.caption, 'font-medium mb-1')}>
                      {message.role === 'user' ? 'You' : 'Assistant'}
                    </div>
                    <div className={cn(ds.text.body.small, 'whitespace-pre-wrap')}>{message.content}</div>
                  </div>
                ))}
                {isTesting && (
                  <div className="p-3 rounded-lg bg-gray-50 text-gray-900">
                    <div className={cn(ds.text.caption, 'font-medium mb-1')}>Assistant</div>
                    <div className={ds.text.body.small}>Thinking...</div>
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleTestMessage} className="flex gap-2">
              <Input
                value={testMessage}
                onChange={e => setTestMessage(e.target.value)}
                placeholder="Type your message..."
                disabled={isTesting}
                className="flex-1"
              />
              <Button type="submit" color="primary" isLoading={isTesting} disabled={!testMessage.trim() || isTesting}>
                Send
              </Button>
            </form>
          </div>
        </Tab>
      </Tabs>

      {/* Add indicators for loading and errors in the test tab */}
      {activeTab === 'test' && (
        <>
          {/* Show loading indicator */}
          {isTestLoading && (
            <div className="flex items-center justify-center p-4">
              <Spinner size="md" />
              <span className="ml-2">Testing GPT...</span>
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
                  <li key={`${file.name}-${index}`} className="flex items-center justify-between py-1">
                    <span>{file.name}</span>
                    <Button size="sm" variant="ghost" onClick={() => handleRemoveFile(index)} aria-label="Remove file">
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Show test response if any */}
          {testResponse && !isTestLoading && !testError && (
            <div className="mt-4 p-4 bg-gray-50 rounded">
              <h3 className={cn(ds.text.heading.h4, 'mb-2')}>Response:</h3>
              <div className="whitespace-pre-wrap">{testResponse}</div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
