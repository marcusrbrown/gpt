import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {StorageContext} from '../../contexts/storage-context'
import * as useOpenAIServiceModule from '../../hooks/use-openai-service'
import {GPTTestPane} from '../gpt-test-pane'

// Mock the hooks
vi.mock('../../hooks/use-openai-service', () => ({
  useOpenAIService: vi.fn(),
}))

// Mock UUID generation
vi.mock('uuid', () => ({
  v4: () => 'test-uuid',
}))

// Mock the scrollIntoView method
Element.prototype.scrollIntoView = vi.fn()

describe('gPTTestPane', () => {
  // Define mock objects and functions
  const mockOpenAIService = {
    setApiKey: vi.fn(),
    getApiKey: vi.fn(),
    createAssistant: vi.fn(),
    createThread: vi.fn(),
    addMessage: vi.fn(),
    createRun: vi.fn(),
    checkRunStatus: vi.fn(),
    getMessages: vi.fn(),
    submitToolOutputs: vi.fn(),
    streamRun: vi.fn(),
    cancelRun: vi.fn(),
    uploadFile: vi.fn(),
    waitForRunCompletion: vi.fn(),
    createVectorStore: vi.fn(),
    addFilesToVectorStore: vi.fn(),
  }

  const mockStorageContext = {
    getGPT: vi.fn().mockResolvedValue(undefined),
    getAllGPTs: vi.fn().mockResolvedValue([]),
    saveGPT: vi.fn().mockResolvedValue(undefined),
    deleteGPT: vi.fn().mockResolvedValue(undefined),
    getConversation: vi.fn().mockResolvedValue(undefined),
    getConversationsForGPT: vi.fn().mockResolvedValue([]),
    saveConversation: vi.fn().mockResolvedValue(undefined),
    deleteConversation: vi.fn().mockResolvedValue(undefined),
    clearAll: vi.fn().mockResolvedValue(undefined),
    getStorageUsage: vi.fn().mockResolvedValue({used: 0, quota: 100000000, percentUsed: 0}),
    isLoading: false,
    isMigrating: false,
    error: null,
    storageWarning: null,
  }

  const mockConfig = {
    id: 'test-gpt-id',
    name: 'Test GPT',
    description: 'A test GPT',
    systemPrompt: 'You are a test assistant',
    tools: [],
    capabilities: {
      codeInterpreter: false,
      webBrowsing: false,
      imageGeneration: false,
      fileSearch: {
        enabled: false,
      },
    },
    knowledge: {
      files: [],
      urls: [],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    tags: [],
    isArchived: false,
  }

  const mockApiKey = 'test-api-key'

  // Helper function to render component with context
  const renderWithContext = (ui: React.ReactElement) => {
    return render(<StorageContext value={mockStorageContext}>{ui}</StorageContext>)
  }

  // Setup mocks before each test
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset the mocks
    vi.mocked(useOpenAIServiceModule.useOpenAIService).mockReturnValue(mockOpenAIService)

    // Setup default mock implementations
    mockOpenAIService.createAssistant.mockResolvedValue({id: 'assistant-id'})
    mockOpenAIService.createThread.mockResolvedValue({id: 'thread-id'})
    mockOpenAIService.createRun.mockResolvedValue({id: 'run-id'})
    mockOpenAIService.checkRunStatus.mockResolvedValue({status: 'completed'})
    mockOpenAIService.getMessages.mockResolvedValue({
      data: [
        {
          id: 'msg-1',
          role: 'assistant',
          content: [{type: 'text', text: {value: 'Hello, I am the assistant.'}}],
          created_at: Date.now() / 1000,
        },
        {
          id: 'msg-2',
          role: 'user',
          content: [{type: 'text', text: {value: 'Hello'}}],
          created_at: Date.now() / 1000,
        },
      ],
    })
  })

  it('renders without crashing', () => {
    renderWithContext(<GPTTestPane gptConfig={mockConfig} apiKey={mockApiKey} />)

    // Check for basic UI elements
    expect(screen.getByLabelText('Enter conversation name')).toBeInTheDocument()
    expect(screen.getByLabelText('Save current conversation to local storage')).toBeInTheDocument()
    expect(screen.getByLabelText('Export conversation as JSON file')).toBeInTheDocument()
    expect(screen.getByLabelText('Clear all messages from current conversation')).toBeInTheDocument()
    expect(screen.getByText('Start testing your GPT by sending a message below')).toBeInTheDocument()
    expect(screen.getByLabelText('Enter your message to send to the GPT')).toBeInTheDocument()
    expect(screen.getByLabelText('Send message to GPT assistant')).toBeInTheDocument()
  })

  it('initializes assistant and thread when sending a message', async () => {
    const user = userEvent.setup()

    renderWithContext(<GPTTestPane gptConfig={mockConfig} apiKey={mockApiKey} />)

    // Type and send a message to trigger initialization
    const input = screen.getByLabelText('Enter your message to send to the GPT')
    await user.type(input, 'Hello')

    const sendButton = screen.getByLabelText('Send message to GPT assistant')
    await user.click(sendButton)

    // Verify initialization happened
    await waitFor(() => {
      expect(mockOpenAIService.setApiKey).toHaveBeenCalledWith(mockApiKey)
      expect(mockOpenAIService.createAssistant).toHaveBeenCalledWith(mockConfig)
      expect(mockOpenAIService.createThread).toHaveBeenCalled()
    })
  })

  it('adds user message to the conversation', async () => {
    const user = userEvent.setup()

    // Force mock to resolve immediately
    mockOpenAIService.createAssistant.mockResolvedValueOnce({id: 'assistant-id'})
    mockOpenAIService.createThread.mockResolvedValueOnce({id: 'thread-id'})

    renderWithContext(<GPTTestPane gptConfig={mockConfig} apiKey={mockApiKey} />)

    // Type in the message input
    const input = screen.getByLabelText('Enter your message to send to the GPT')
    await user.type(input, 'Hello')

    // Verify the input has the text
    expect(input).toHaveValue('Hello')

    // Click the send button
    const sendButton = screen.getByLabelText('Send message to GPT assistant')
    await user.click(sendButton)

    // Input should be cleared after sending
    await waitFor(() => {
      expect(input).toHaveValue('')
    })
  })

  it('displays proper accessibility attributes for HeroUI Input components', () => {
    renderWithContext(<GPTTestPane gptConfig={mockConfig} apiKey={mockApiKey} />)

    // Verify HeroUI Input components have proper accessibility attributes
    const conversationNameInput = screen.getByLabelText('Enter conversation name')
    const messageInput = screen.getByLabelText('Enter your message to send to the GPT')

    // Check that inputs have proper ARIA attributes
    expect(conversationNameInput).toHaveAttribute('type', 'text')
    expect(messageInput).toBeInTheDocument()

    // Verify inputs are accessible and have proper labeling
    expect(conversationNameInput).toHaveAccessibleName()
    expect(messageInput).toHaveAccessibleName()
  })

  it('handles keyboard navigation properly with HeroUI components', async () => {
    const user = userEvent.setup()
    renderWithContext(<GPTTestPane gptConfig={mockConfig} apiKey={mockApiKey} />)

    const messageInput = screen.getByLabelText('Enter your message to send to the GPT')

    // Focus the message input and type
    await user.click(messageInput)
    expect(messageInput).toHaveFocus()

    // Type a message
    await user.type(messageInput, 'Test message')
    expect(messageInput).toHaveValue('Test message')

    // Verify send button can be focused and activated
    const sendButton = screen.getByLabelText('Send message to GPT assistant')
    await user.click(sendButton)

    // After sending, input should be cleared
    await waitFor(() => {
      expect(messageInput).toHaveValue('')
    })
  })
})
