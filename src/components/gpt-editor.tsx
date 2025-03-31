import {useState, useEffect, useRef} from 'react';
import {useStorage} from '../hooks/use-storage';
import {
  GPTConfiguration,
  GPTCapabilities,
  MCPTool,
  LocalFile,
  ConversationMessage,
  VectorStore,
  GPTConfigurationSchema,
} from '../types/gpt';
import {v4 as uuidv4} from 'uuid';
import {Button, Input, Select, SelectItem, Tabs, Tab, Spinner} from '@heroui/react';
import {useOpenAIService} from '../hooks/use-openai-service';

interface GPTEditorProps {
  gptId?: string | undefined;
  onSave?: (gpt: GPTConfiguration) => void;
}

interface FormErrors {
  name?: string;
  description?: string;
  systemPrompt?: string;
  tools: {
    [key: number]: {
      name?: string;
      description?: string;
      endpoint?: string;
      authentication?: string;
    };
  };
  knowledge: {
    urls: {
      [key: number]: string;
    };
  };
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
};

const AUTH_TYPES = [
  {label: 'Bearer Token', value: 'bearer'},
  {label: 'API Key', value: 'api_key'},
];

const DEFAULT_ERRORS: FormErrors = {
  tools: {},
  knowledge: {
    urls: {},
  },
};

// Define update type for streamRun
interface AssistantRunUpdate {
  type: 'complete' | 'requires_action' | 'error';
  messages?: Array<{
    id: string;
    role: string;
    content: Array<{
      text?: {
        value: string;
      };
    }>;
    created_at: number;
  }>;
  error?: string;
  required_action?: unknown;
}

// Vector Knowledge component for managing vector stores
function VectorKnowledge({
  files,
  vectorStores,
  onCreateVectorStore,
  onDeleteVectorStore,
}: {
  files: LocalFile[];
  vectorStores?: VectorStore[];
  onCreateVectorStore: (name: string, fileIds: string[]) => void;
  onDeleteVectorStore: (id: string) => void;
}) {
  const [newStoreName, setNewStoreName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateStore = () => {
    setError(null);

    if (!newStoreName.trim()) {
      setError('Please provide a name for the vector store');
      return;
    }

    if (selectedFiles.length === 0) {
      setError('Please select at least one file');
      return;
    }

    setIsCreating(true);

    try {
      onCreateVectorStore(newStoreName, selectedFiles);

      // Reset form
      setNewStoreName('');
      setSelectedFiles([]);
    } catch (e) {
      setError('Failed to create vector store');
      console.error(e);
    } finally {
      setIsCreating(false);
    }
  };

  const toggleFileSelection = (fileName: string) => {
    setSelectedFiles((prev) => (prev.includes(fileName) ? prev.filter((f) => f !== fileName) : [...prev, fileName]));
  };

  return (
    <div className='space-y-4'>
      <h3 className='text-lg font-medium'>Vector Knowledge Stores</h3>
      <p className='text-sm text-gray-600'>
        Create vector stores from your files to enable advanced retrieval capabilities.
      </p>

      {error && <div className='text-red-500 bg-red-50 p-2 rounded text-sm'>{error}</div>}

      <div className='border rounded-md p-4 space-y-4'>
        <div>
          <label htmlFor='storeName' className='block text-sm font-medium text-gray-700'>
            Vector Store Name
          </label>
          <Input
            id='storeName'
            value={newStoreName}
            onChange={(e) => setNewStoreName(e.target.value)}
            className='mt-1'
            placeholder='My Knowledge Base'
          />
        </div>

        <div>
          <label className='block text-sm font-medium text-gray-700 mb-2'>Select Files</label>
          <div className='max-h-40 overflow-y-auto border rounded-md p-2'>
            {files.length === 0 ? (
              <p className='text-gray-500 text-sm p-2'>No files available. Upload files in the Knowledge section.</p>
            ) : (
              files.map((file) => (
                <div key={file.name} className='flex items-center py-1'>
                  <input
                    type='checkbox'
                    id={`file-${file.name}`}
                    checked={selectedFiles.includes(file.name)}
                    onChange={() => toggleFileSelection(file.name)}
                    className='mr-2'
                  />
                  <label htmlFor={`file-${file.name}`} className='text-sm'>
                    {file.name}
                  </label>
                </div>
              ))
            )}
          </div>
        </div>

        <Button
          color='primary'
          onPress={handleCreateStore}
          isDisabled={isCreating || selectedFiles.length === 0 || !newStoreName.trim()}
        >
          {isCreating ? <Spinner size='sm' /> : 'Create Vector Store'}
        </Button>
      </div>

      {/* List existing vector stores */}
      <div className='mt-6'>
        <h4 className='text-md font-medium mb-2'>Existing Vector Stores</h4>
        {!vectorStores || vectorStores.length === 0 ? (
          <p className='text-gray-500 text-sm'>No vector stores created yet.</p>
        ) : (
          <div className='space-y-2'>
            {vectorStores.map((store) => (
              <div key={store.id} className='border rounded-md p-3 flex justify-between items-center'>
                <div>
                  <h5 className='font-medium'>{store.name}</h5>
                  <p className='text-xs text-gray-600'>{store.fileIds.length} files indexed</p>
                </div>
                <Button color='danger' size='sm' variant='ghost' onPress={() => onDeleteVectorStore(store.id)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function GPTEditor({gptId, onSave}: GPTEditorProps) {
  const {getGPT, saveGPT} = useStorage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importGptRef = useRef<HTMLInputElement>(null);
  const [gpt, setGpt] = useState<GPTConfiguration>(() => {
    if (gptId) {
      const existing = getGPT(gptId);
      return existing || {...DEFAULT_GPT, id: uuidv4()};
    }
    return {...DEFAULT_GPT, id: uuidv4()};
  });
  const [errors, setErrors] = useState<FormErrors>(DEFAULT_ERRORS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('edit');
  const [testMessage, setTestMessage] = useState('');
  const [testMessages, setTestMessages] = useState<ConversationMessage[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [completionPercentage, setCompletionPercentage] = useState(0);

  const openAIService = useOpenAIService();

  useEffect(() => {
    if (gptId) {
      const existing = getGPT(gptId);
      if (existing) {
        setGpt(existing);
      }
    }
  }, [gptId, getGPT]);

  // Calculate completion percentage for required fields
  useEffect(() => {
    let completedFields = 0;
    const totalRequiredFields = 3; // name, description, systemPrompt

    // Check basic required fields
    if (gpt.name.trim()) completedFields++;
    if (gpt.description.trim()) completedFields++;
    if (gpt.systemPrompt.trim()) completedFields++;

    // Calculate the percentage
    const percentage = Math.floor((completedFields / totalRequiredFields) * 100);
    setCompletionPercentage(percentage);
  }, [gpt.name, gpt.description, gpt.systemPrompt]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {
      tools: {},
      knowledge: {
        urls: {},
      },
    };

    let isValid = true;

    // Basic validation with more detailed error messages
    if (!gpt.name.trim()) {
      newErrors.name = 'Name is required for your GPT';
      isValid = false;
    } else if (gpt.name.length > 50) {
      newErrors.name = 'Name must be 50 characters or less';
      isValid = false;
    }

    if (!gpt.description.trim()) {
      newErrors.description = 'Description is required to explain what your GPT does';
      isValid = false;
    } else if (gpt.description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less';
      isValid = false;
    }

    if (!gpt.systemPrompt.trim()) {
      newErrors.systemPrompt = 'System prompt is required to define your GPT behavior';
      isValid = false;
    } else if (gpt.systemPrompt.length > 4000) {
      newErrors.systemPrompt = 'System prompt exceeds the maximum of 4000 characters';
      isValid = false;
    }

    // Tool validation with specific field requirements
    gpt.tools.forEach((tool, index) => {
      const toolErrors: FormErrors['tools'][number] = {};

      if (!tool.name.trim()) {
        toolErrors.name = 'Tool name is required';
        isValid = false;
      } else if (tool.name.length > 50) {
        toolErrors.name = 'Tool name must be 50 characters or less';
        isValid = false;
      }

      if (!tool.description.trim()) {
        toolErrors.description = 'Tool description is required';
        isValid = false;
      } else if (tool.description.length > 200) {
        toolErrors.description = 'Tool description must be 200 characters or less';
        isValid = false;
      }

      if (!tool.endpoint.trim()) {
        toolErrors.endpoint = 'Tool endpoint URL is required';
        isValid = false;
      } else if (!tool.endpoint.match(/^https?:\/\/.+/)) {
        toolErrors.endpoint = 'Tool endpoint must be a valid URL starting with http:// or https://';
        isValid = false;
      }

      if (tool.authentication?.type && !tool.authentication.value) {
        toolErrors.authentication = 'Authentication value is required when type is selected';
        isValid = false;
      }

      if (Object.keys(toolErrors).length > 0) {
        newErrors.tools[index] = toolErrors;
      }
    });

    // URL validation with proper format checking
    gpt.knowledge.urls.forEach((url, index) => {
      if (!url) {
        newErrors.knowledge.urls[index] = 'URL cannot be empty';
        isValid = false;
      } else if (!url.match(/^https?:\/\/.+/)) {
        newErrors.knowledge.urls[index] = 'Please enter a valid URL starting with http:// or https://';
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const {name, value} = e.target;
    setGpt((prev) => ({
      ...prev,
      [name]: value,
      updatedAt: new Date(),
    }));
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({...prev, [name]: undefined}));
    }
  };

  const handleCapabilityChange = (capability: keyof GPTCapabilities) => {
    setGpt((prev) => ({
      ...prev,
      capabilities: {
        ...prev.capabilities,
        [capability]: !prev.capabilities[capability],
      },
      updatedAt: new Date(),
    }));
  };

  const handleAddTool = () => {
    const newTool: MCPTool = {
      name: '',
      description: '',
      schema: {},
      endpoint: '',
    };

    setGpt((prev) => ({
      ...prev,
      tools: [...prev.tools, newTool],
      updatedAt: new Date(),
    }));
  };

  const handleRemoveTool = (index: number) => {
    setGpt((prev) => ({
      ...prev,
      tools: prev.tools.filter((_, i) => i !== index),
      updatedAt: new Date(),
    }));
  };

  const handleToolChange = (index: number, field: keyof MCPTool, value: MCPTool[keyof MCPTool]) => {
    setGpt((prev) => ({
      ...prev,
      tools: prev.tools.map((tool, i) => (i === index ? {...tool, [field]: value} : tool)),
      updatedAt: new Date(),
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles: LocalFile[] = [];

      Array.from(e.target.files).forEach((file) => {
        const reader = new FileReader();

        reader.onload = (event) => {
          if (event.target?.result) {
            // Ensure we're getting a string result
            const fileContent =
              typeof event.target.result === 'string'
                ? event.target.result
                : new TextDecoder().decode(event.target.result);

            // Create a valid LocalFile object
            const localFile: LocalFile = {
              name: file.name,
              content: fileContent,
              type: file.type,
              size: file.size,
              lastModified: file.lastModified,
            };

            newFiles.push(localFile);

            // After all files are processed, update both state variables
            if (newFiles.length === e.target.files!.length) {
              // Update temporary files state for test display
              setFiles((prev) => [...prev, ...newFiles]);

              // Also update the actual GPT configuration
              setGpt((prev) => ({
                ...prev,
                knowledge: {
                  ...prev.knowledge,
                  files: [...prev.knowledge.files, ...newFiles],
                },
                updatedAt: new Date(),
              }));
            }
          }
        };

        reader.readAsText(file);
      });
    }
  };

  const handleRemoveFile = (index: number) => {
    setGpt((prev) => ({
      ...prev,
      knowledge: {
        ...prev.knowledge,
        files: prev.knowledge.files.filter((_, i) => i !== index),
      },
      updatedAt: new Date(),
    }));
  };

  const handleAddUrl = () => {
    setGpt((prev) => ({
      ...prev,
      knowledge: {
        ...prev.knowledge,
        urls: [...prev.knowledge.urls, ''],
      },
      updatedAt: new Date(),
    }));
  };

  const handleRemoveUrl = (index: number) => {
    setGpt((prev) => ({
      ...prev,
      knowledge: {
        ...prev.knowledge,
        urls: prev.knowledge.urls.filter((_, i) => i !== index),
      },
      updatedAt: new Date(),
    }));
  };

  const handleUrlChange = (index: number, value: string) => {
    setGpt((prev) => ({
      ...prev,
      knowledge: {
        ...prev.knowledge,
        urls: prev.knowledge.urls.map((url, i) => (i === index ? value : url)),
      },
      updatedAt: new Date(),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      saveGPT(gpt);
      onSave?.(gpt);
    } catch (error: unknown) {
      console.error('Failed to save GPT:', error);
      // You might want to show an error toast here
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestMessage = (e: React.FormEvent) => {
    e.preventDefault();

    if (!testMessage.trim()) return;

    setIsTestLoading(true);
    setTestError(null);

    // Add the user message to the test messages
    setTestMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        content: testMessage,
        timestamp: new Date(),
      },
    ]);

    const testGPT = async () => {
      try {
        // Create an assistant with the current GPT configuration
        const assistant = await openAIService.createAssistant(gpt);

        // Create a thread for this test conversation
        const thread = await openAIService.createThread();

        // Add the user's message to the thread
        await openAIService.addMessage(thread.id, testMessage);

        // Run the assistant on the thread to generate a response
        let response: ConversationMessage | null = null;

        // Use streamRun for real-time updates
        await openAIService.streamRun(thread.id, assistant.id, (update: unknown) => {
          // Type cast the update to AssistantRunUpdate
          const typedUpdate = update as AssistantRunUpdate;
          if (typedUpdate.type === 'complete' && typedUpdate.messages) {
            // Find the assistant message in the messages
            const assistantMessages = typedUpdate.messages.filter((msg) => msg.role === 'assistant');

            if (assistantMessages.length > 0) {
              const latestMessage = assistantMessages[0];
              if (latestMessage) {
                // Create a ConversationMessage from the assistant message
                response = {
                  id: latestMessage.id,
                  role: 'assistant',
                  content: latestMessage.content[0]?.text?.value || 'No response content',
                  timestamp: new Date(latestMessage.created_at * 1000),
                };

                // Add the message to the test messages
                setTestMessages((prev) => [...prev, response!]);

                // Store the response text for display
                setTestResponse(response.content);
              }
            }
            setIsTesting(false);
          } else if (typedUpdate.type === 'error') {
            // Handle error updates
            setTestError(typedUpdate.error || 'An error occurred during testing');
          }
        });
      } catch (error) {
        // Handle errors
        setTestError(error instanceof Error ? error.message : 'Failed to test GPT');
        console.error('Test GPT error:', error);
      } finally {
        setIsTestLoading(false);
      }
    };

    // Use void operator to explicitly ignore the promise
    void testGPT();
  };

  // Handle exporting the GPT configuration to a JSON file
  const handleExportGPT = () => {
    try {
      setIsExporting(true);
      // Convert the GPT configuration to a JSON string
      const gptJson = JSON.stringify(gpt, null, 2);

      // Create a blob with the JSON data
      const blob = new Blob([gptJson], {type: 'application/json'});

      // Create a URL for the blob
      const url = URL.createObjectURL(blob);

      // Create a link element to trigger the download
      const a = document.createElement('a');
      a.href = url;
      a.download = `${gpt.name.replace(/\s+/g, '-').toLowerCase()}-gpt-config.json`;

      // Trigger the download
      document.body.appendChild(a);
      a.click();

      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting GPT:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle importing a GPT configuration from a JSON file
  const handleImportGPT = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);

    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file) {
        setImportError('No file selected. Please try again.');
        return;
      }
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          if (event.target?.result) {
            // Parse the JSON data
            const importedData = JSON.parse(event.target.result as string) as GPTConfiguration;

            // Validate the imported data against our schema
            const validatedGpt = GPTConfigurationSchema.parse({
              ...importedData,
              createdAt: new Date(importedData.createdAt),
              updatedAt: new Date(),
              id: gpt.id, // Keep the current ID
            });

            // Update the GPT configuration
            setGpt(validatedGpt);
          }
        } catch (error) {
          console.error('Error importing GPT:', error);
          setImportError('Invalid GPT configuration file. Please try again with a valid file.');
        }
      };

      reader.onerror = () => {
        setImportError('Error reading file. Please try again.');
      };

      reader.readAsText(file);
    }

    // Reset the file input
    if (importGptRef.current) {
      importGptRef.current.value = '';
    }
  };

  // Display form field error component for consistent error styling
  const FormFieldError = ({error}: {error?: string}) => {
    if (!error) return null;
    return <p className='text-red-500 text-sm mt-1'>{error}</p>;
  };

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
    };

    setGpt((prev) => ({
      ...prev,
      knowledge: {
        ...prev.knowledge,
        vectorStores: [...(prev.knowledge.vectorStores || []), newStore],
      },
      updatedAt: new Date(),
    }));
  };

  // Handle deleting a vector store
  const handleDeleteVectorStore = (id: string) => {
    setGpt((prev) => ({
      ...prev,
      knowledge: {
        ...prev.knowledge,
        vectorStores: (prev.knowledge.vectorStores || []).filter((store) => store.id !== id),
      },
      updatedAt: new Date(),
    }));
  };

  return (
    <div className='flex flex-col h-full'>
      <Tabs
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(key as string)}
        aria-label='GPT Editor Tabs'
      >
        <Tab key='edit' title='Edit'>
          <div className='p-4 space-y-6 max-w-full overflow-y-auto'>
            <div className='flex justify-between items-center mb-4'>
              <div>
                <h2 className='text-xl font-bold'>GPT Configuration</h2>
                <div className='mt-2 w-64'>
                  <div className='flex justify-between text-xs text-gray-600 mb-1'>
                    <span>Completion</span>
                    <span>{completionPercentage}%</span>
                  </div>
                  <div className='w-full bg-gray-200 rounded-full h-2'>
                    <div
                      className={`h-2 rounded-full ${completionPercentage === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{width: `${completionPercentage}%`}}
                    ></div>
                  </div>
                </div>
              </div>
              <div className='flex gap-2'>
                <input type='file' ref={importGptRef} onChange={handleImportGPT} accept='.json' className='hidden' />
                <Button color='secondary' onPress={() => importGptRef.current?.click()} isDisabled={isSubmitting}>
                  Import
                </Button>
                <Button color='secondary' onPress={handleExportGPT} isDisabled={isSubmitting || isExporting}>
                  {isExporting ? <Spinner size='sm' /> : 'Export'}
                </Button>
                <Button
                  color='primary'
                  onPress={() => handleSubmit(new Event('submit') as unknown as React.FormEvent)}
                  isDisabled={isSubmitting}
                >
                  {isSubmitting ? <Spinner size='sm' /> : 'Save'}
                </Button>
              </div>
            </div>

            {importError && <div className='text-red-500 p-2 my-2 bg-red-50 rounded'>{importError}</div>}

            <form onSubmit={handleSubmit} className='space-y-6'>
              <div>
                <label htmlFor='name' className='block text-sm font-medium text-gray-700'>
                  Name
                </label>
                <input
                  type='text'
                  name='name'
                  id='name'
                  value={gpt.name}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                    errors.name
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                  }`}
                  required
                />
                <FormFieldError error={errors.name!} />
              </div>

              <div>
                <label htmlFor='description' className='block text-sm font-medium text-gray-700'>
                  Description
                </label>
                <textarea
                  name='description'
                  id='description'
                  value={gpt.description}
                  onChange={handleInputChange}
                  rows={3}
                  className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                    errors.description
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                  }`}
                  required
                />
                <FormFieldError error={errors.description!} />
              </div>

              <div>
                <label htmlFor='systemPrompt' className='block text-sm font-medium text-gray-700'>
                  System Prompt
                </label>
                <textarea
                  name='systemPrompt'
                  id='systemPrompt'
                  value={gpt.systemPrompt}
                  onChange={handleInputChange}
                  rows={5}
                  className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                    errors.systemPrompt
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                  }`}
                  required
                />
                <FormFieldError error={errors.systemPrompt!} />
              </div>

              <div>
                <div className='flex items-center justify-between'>
                  <label className='block text-sm font-medium text-gray-700'>Tools</label>
                  <Button onPress={handleAddTool} size='sm' color='primary'>
                    Add Tool
                  </Button>
                </div>
                <div className='mt-4 space-y-4'>
                  {gpt.tools.map((tool, index) => (
                    <div key={index} className='p-4 border rounded-lg space-y-4'>
                      <div className='flex justify-between items-start'>
                        <h4 className='text-sm font-medium text-gray-700'>Tool {index + 1}</h4>
                        <Button onPress={() => handleRemoveTool(index)} size='sm' color='danger' variant='light'>
                          Remove
                        </Button>
                      </div>
                      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                        <div>
                          <label className='block text-sm font-medium text-gray-700'>Name</label>
                          <Input
                            value={tool.name}
                            onChange={(e) => handleToolChange(index, 'name', e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label className='block text-sm font-medium text-gray-700'>Description</label>
                          <Input
                            value={tool.description}
                            onChange={(e) => handleToolChange(index, 'description', e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label className='block text-sm font-medium text-gray-700'>Endpoint</label>
                          <Input
                            value={tool.endpoint}
                            onChange={(e) => handleToolChange(index, 'endpoint', e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label className='block text-sm font-medium text-gray-700'>Authentication Type</label>
                          <Select
                            value={tool.authentication?.type}
                            onChange={(e) =>
                              handleToolChange(index, 'authentication', {
                                type: e.target.value,
                                value: '',
                              })
                            }
                          >
                            {AUTH_TYPES.map((type) => (
                              <SelectItem key={type.value} textValue={type.label}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </Select>
                        </div>
                        {tool.authentication && (
                          <div className='sm:col-span-2'>
                            <label className='block text-sm font-medium text-gray-700'>Authentication Value</label>
                            <Input
                              type='password'
                              value={tool.authentication.value}
                              onChange={(e) =>
                                handleToolChange(index, 'authentication', {
                                  ...tool.authentication,
                                  value: e.target.value,
                                })
                              }
                              required
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700'>Capabilities</label>
                <div className='mt-2 space-y-2'>
                  {Object.entries(gpt.capabilities).map(([key, value]) => (
                    <div key={key} className='flex items-center'>
                      <input
                        type='checkbox'
                        id={key}
                        checked={typeof value === 'boolean' ? value : value.enabled}
                        onChange={() => handleCapabilityChange(key as keyof GPTCapabilities)}
                        className='h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500'
                      />
                      <label htmlFor={key} className='ml-2 block text-sm text-gray-900'>
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className='flex items-center justify-between'>
                  <label className='block text-sm font-medium text-gray-700'>Knowledge Base</label>
                  <div className='flex gap-2'>
                    <div className='mb-4'>
                      <h3 className='text-sm font-medium mb-2'>Knowledge Files</h3>
                      <div className='space-y-2'>
                        {gpt.knowledge.files.map((file, index) => (
                          <div
                            key={`${file.name}-${index}`}
                            className='flex items-center justify-between p-2 bg-gray-50 rounded'
                          >
                            <span className='text-sm'>{file.name}</span>
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() => handleRemoveFile(index)}
                              aria-label='Remove file'
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                      <div className='mt-2'>
                        <Button onClick={() => fileInputRef.current?.click()}>Add File</Button>
                        <input type='file' ref={fileInputRef} className='hidden' onChange={handleFileUpload} multiple />
                      </div>
                    </div>
                    <Button onPress={handleAddUrl} size='sm' color='primary' variant='flat'>
                      Add URL
                    </Button>
                  </div>
                </div>

                {/* URLs Section */}
                <div className='mt-4'>
                  <h4 className='text-sm font-medium text-gray-700 mb-2'>URLs</h4>
                  <div className='space-y-2'>
                    {gpt.knowledge.urls.map((url, index) => (
                      <div key={index} className='flex items-center gap-2'>
                        <Input
                          type='url'
                          value={url}
                          onChange={(e) => handleUrlChange(index, e.target.value)}
                          placeholder='https://example.com'
                          className='flex-1'
                        />
                        <Button onPress={() => handleRemoveUrl(index)} size='sm' color='danger' variant='light'>
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
        <Tab key='knowledge' title='Knowledge'>
          <div className='p-4 space-y-6 max-w-full overflow-y-auto'>
            <h2 className='text-xl font-bold'>Knowledge Sources</h2>

            <div className='space-y-4'>
              <h3 className='text-lg font-medium'>Files</h3>
              <div className='border-dashed border-2 border-gray-300 rounded-md p-6 text-center'>
                <input type='file' ref={fileInputRef} onChange={handleFileUpload} multiple className='hidden' />
                <button
                  type='button'
                  onClick={() => fileInputRef.current?.click()}
                  className='text-blue-600 hover:text-blue-800 focus:outline-none'
                >
                  Upload Files
                </button>
                <p className='mt-2 text-sm text-gray-600'>Upload files to use as knowledge sources for your GPT</p>
              </div>

              {/* Display uploaded files */}
              {gpt.knowledge.files.length > 0 && (
                <div className='mt-4'>
                  <h4 className='text-md font-medium mb-2'>Uploaded Files</h4>
                  <div className='border rounded-md overflow-hidden'>
                    <table className='min-w-full divide-y divide-gray-200'>
                      <thead className='bg-gray-50'>
                        <tr>
                          <th className='px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase'>Name</th>
                          <th className='px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase'>Type</th>
                          <th className='px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase'>Size</th>
                          <th className='px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase'>Actions</th>
                        </tr>
                      </thead>
                      <tbody className='bg-white divide-y divide-gray-200'>
                        {gpt.knowledge.files.map((file, index) => (
                          <tr key={index}>
                            <td className='px-3 py-2 text-sm text-gray-900'>{file.name}</td>
                            <td className='px-3 py-2 text-sm text-gray-500'>{file.type || 'Unknown'}</td>
                            <td className='px-3 py-2 text-sm text-gray-500'>{Math.round(file.size / 1024)} KB</td>
                            <td className='px-3 py-2 text-right'>
                              <button
                                type='button'
                                onClick={() => handleRemoveFile(index)}
                                className='text-red-600 hover:text-red-900 text-sm'
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className='space-y-4 mt-8'>
              <h3 className='text-lg font-medium'>Web URLs</h3>
              <div className='space-y-3'>
                {gpt.knowledge.urls.map((url, index) => (
                  <div key={index} className='flex space-x-2'>
                    <Input
                      value={url}
                      onChange={(e) => handleUrlChange(index, e.target.value)}
                      placeholder='https://example.com'
                      className='flex-1'
                    />
                    <Button color='danger' variant='ghost' onPress={() => handleRemoveUrl(index)}>
                      Remove
                    </Button>
                  </div>
                ))}
                <Button color='primary' variant='ghost' onPress={handleAddUrl}>
                  Add URL
                </Button>
              </div>
            </div>

            <div className='mt-8'>
              <VectorKnowledge
                files={gpt.knowledge.files}
                vectorStores={gpt.knowledge.vectorStores || []}
                onCreateVectorStore={handleCreateVectorStore}
                onDeleteVectorStore={handleDeleteVectorStore}
              />
            </div>
          </div>
        </Tab>
        <Tab key='test' title='Test GPT'>
          <div className='space-y-4'>
            <div className='bg-gray-50 rounded-lg p-4'>
              <h3 className='text-sm font-medium text-gray-700 mb-2'>System Prompt</h3>
              <p className='text-sm text-gray-600 whitespace-pre-wrap'>{gpt.systemPrompt}</p>
            </div>

            <div className='space-y-4'>
              <h3 className='text-sm font-medium text-gray-700'>Conversation</h3>
              <div className='space-y-4 max-h-[400px] overflow-y-auto'>
                {testMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-3 rounded-lg ${
                      message.role === 'user' ? 'bg-indigo-50 text-indigo-900' : 'bg-gray-50 text-gray-900'
                    }`}
                  >
                    <div className='text-xs font-medium mb-1'>{message.role === 'user' ? 'You' : 'Assistant'}</div>
                    <div className='text-sm whitespace-pre-wrap'>{message.content}</div>
                  </div>
                ))}
                {isTesting && (
                  <div className='p-3 rounded-lg bg-gray-50 text-gray-900'>
                    <div className='text-xs font-medium mb-1'>Assistant</div>
                    <div className='text-sm'>Thinking...</div>
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleTestMessage} className='flex gap-2'>
              <Input
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder='Type your message...'
                disabled={isTesting}
                className='flex-1'
              />
              <Button type='submit' color='primary' isLoading={isTesting} disabled={!testMessage.trim() || isTesting}>
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
            <div className='flex items-center justify-center p-4'>
              <Spinner size='md' />
              <span className='ml-2'>Testing GPT...</span>
            </div>
          )}

          {/* Show error if any */}
          {testError && <div className='text-red-500 p-4 rounded bg-red-50 my-2'>Error: {testError}</div>}

          {/* Display file list */}
          {files.length > 0 && (
            <div className='mt-4'>
              <h3 className='text-sm font-medium mb-2'>Uploaded Files:</h3>
              <ul className='text-sm'>
                {files.map((file, index) => (
                  <li key={`${file.name}-${index}`} className='flex items-center justify-between py-1'>
                    <span>{file.name}</span>
                    <Button size='sm' variant='ghost' onClick={() => handleRemoveFile(index)} aria-label='Remove file'>
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Show test response if any */}
          {testResponse && !isTestLoading && !testError && (
            <div className='mt-4 p-4 bg-gray-50 rounded'>
              <h3 className='text-sm font-medium mb-2'>Response:</h3>
              <div className='whitespace-pre-wrap'>{testResponse}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
