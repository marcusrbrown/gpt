import {useState, useEffect, useRef} from 'react';
import {useStorage} from '../hooks/use-storage';
import {GPTConfiguration, GPTCapabilities, MCPTool, LocalFile, ConversationMessage} from '../types/gpt';
import {v4 as uuidv4} from 'uuid';
import {Button, Input, Select, SelectItem, Tabs, Tab} from '@heroui/react';
import {openAIService} from '../services/openai-service';

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

export function GPTEditor({gptId, onSave}: GPTEditorProps) {
  const {getGPT, saveGPT} = useStorage();
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    if (gptId) {
      const existing = getGPT(gptId);
      if (existing) {
        setGpt(existing);
      }
    }
  }, [gptId, getGPT]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {
      tools: {},
      knowledge: {
        urls: {},
      },
    };

    // Basic validation
    if (!gpt.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!gpt.description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (!gpt.systemPrompt.trim()) {
      newErrors.systemPrompt = 'System prompt is required';
    }

    // Tool validation
    gpt.tools.forEach((tool, index) => {
      const toolErrors: FormErrors['tools'][number] = {};
      if (!tool.name.trim()) {
        toolErrors.name = 'Tool name is required';
      }
      if (!tool.description.trim()) {
        toolErrors.description = 'Tool description is required';
      }
      if (!tool.endpoint.trim()) {
        toolErrors.endpoint = 'Tool endpoint is required';
      }
      if (tool.authentication?.type && !tool.authentication.value) {
        toolErrors.authentication = 'Authentication value is required';
      }
      if (Object.keys(toolErrors).length > 0) {
        newErrors.tools[index] = toolErrors;
      }
    });

    // URL validation
    gpt.knowledge.urls.forEach((url, index) => {
      if (url && !url.match(/^https?:\/\/.+/)) {
        newErrors.knowledge.urls[index] = 'Please enter a valid URL starting with http:// or https://';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
    const files = e.target.files;
    if (!files) return;

    void (async () => {
      const newFiles: LocalFile[] = await Promise.all(
        Array.from(files).map(async (file) => ({
          name: file.name,
          content: await file.text(),
          type: file.type,
          size: file.size,
          lastModified: file.lastModified,
        })),
      );

      setGpt((prev) => ({
        ...prev,
        knowledge: {
          ...prev.knowledge,
          files: [...prev.knowledge.files, ...newFiles],
        },
        updatedAt: new Date(),
      }));
    })();
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

    setTestMessages((prev) => [
      ...prev,
      {
        id: 'user-' + Date.now(),
        role: 'user',
        content: testMessage,
        timestamp: new Date(),
      },
    ]);
    setTestMessage('');
    setIsTesting(true);

    void (async () => {
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
              }
            }
            setIsTesting(false);
          } else if (typedUpdate.type === 'error') {
            console.error('Error during assistant run:', typedUpdate.error);
            setTestMessages((prev) => [
              ...prev,
              {
                id: 'error-' + Date.now(),
                role: 'system',
                content: `Error: ${typedUpdate.error || 'Unknown error occurred'}`,
                timestamp: new Date(),
              },
            ]);
            setIsTesting(false);
          }
        });
      } catch (error) {
        console.error('Error testing GPT:', error);
        // Add error message to the test messages
        setTestMessages((prev) => [
          ...prev,
          {
            id: 'error-' + Date.now(),
            role: 'system',
            content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
            timestamp: new Date(),
          },
        ]);
        setIsTesting(false);
      }
    })();
  };

  return (
    <div className='space-y-6'>
      <Tabs selectedKey={activeTab} onSelectionChange={(key) => setActiveTab(key as string)}>
        <Tab key='edit' title='Edit GPT'>
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
              {errors.name && <p className='mt-1 text-sm text-red-600'>{errors.name}</p>}
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
              {errors.description && <p className='mt-1 text-sm text-red-600'>{errors.description}</p>}
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
              {errors.systemPrompt && <p className='mt-1 text-sm text-red-600'>{errors.systemPrompt}</p>}
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
                      checked={value}
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
                  <button
                    type='button'
                    onClick={() => fileInputRef.current?.click()}
                    className='inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
                  >
                    Upload Files
                  </button>
                  <input ref={fileInputRef} type='file' multiple onChange={handleFileUpload} className='hidden' />
                  <Button onPress={handleAddUrl} size='sm' color='primary' variant='flat'>
                    Add URL
                  </Button>
                </div>
              </div>

              {/* Files Section */}
              <div className='mt-4'>
                <h4 className='text-sm font-medium text-gray-700 mb-2'>Files</h4>
                <div className='space-y-2'>
                  {gpt.knowledge.files.map((file, index) => (
                    <div key={index} className='flex items-center justify-between p-2 bg-gray-50 rounded'>
                      <div className='flex items-center gap-2'>
                        <span className='text-sm text-gray-600'>{file.name}</span>
                        <span className='text-xs text-gray-500'>({file.type})</span>
                      </div>
                      <Button onPress={() => handleRemoveFile(index)} size='sm' color='danger' variant='light'>
                        Remove
                      </Button>
                    </div>
                  ))}
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

            <div className='flex justify-end'>
              <button
                type='submit'
                disabled={isSubmitting}
                className={`ml-3 inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? 'Saving...' : 'Save GPT'}
              </button>
            </div>
          </form>
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
    </div>
  );
}
