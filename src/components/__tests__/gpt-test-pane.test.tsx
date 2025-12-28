import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {SessionContext} from '../../contexts/session-context'
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

  const mockSessionContext = {
    status: 'unlocked' as const,
    remainingSeconds: 1800,
    isUnlocked: true,
    isPassphraseSet: true,
    isInitialized: true,
    webCryptoAvailable: true,
    unlock: vi.fn().mockResolvedValue(true),
    lock: vi.fn(),
    extendSession: vi.fn(),
    setInitialPassphrase: vi.fn().mockResolvedValue(undefined),
    changePassphrase: vi.fn().mockResolvedValue(undefined),
    getSecret: vi.fn().mockResolvedValue('test-api-key'),
    setSecret: vi.fn().mockResolvedValue(undefined),
    deleteSecret: vi.fn().mockResolvedValue(undefined),
    sessionConfig: {timeoutMinutes: 30, warningMinutes: 5},
    updateSessionConfig: vi.fn().mockResolvedValue(undefined),
    resetAllData: vi.fn().mockResolvedValue(undefined),
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
    archiveGPT: vi.fn().mockResolvedValue(undefined),
    restoreGPT: vi.fn().mockResolvedValue(undefined),
    getArchivedGPTs: vi.fn().mockResolvedValue([]),
    duplicateGPT: vi.fn().mockResolvedValue(undefined),
    deleteGPTPermanently: vi.fn().mockResolvedValue(undefined),
    createVersion: vi.fn().mockResolvedValue(undefined),
    getVersions: vi.fn().mockResolvedValue([]),
    restoreVersion: vi.fn().mockResolvedValue(undefined),
    createFolder: vi.fn().mockResolvedValue(undefined),
    renameFolder: vi.fn().mockResolvedValue(undefined),
    deleteFolder: vi.fn().mockResolvedValue(undefined),
    getFolderTree: vi.fn().mockResolvedValue([]),
    moveGPTToFolder: vi.fn().mockResolvedValue(undefined),
    pinConversation: vi.fn().mockResolvedValue(undefined),
    archiveConversation: vi.fn().mockResolvedValue(undefined),
    updateConversationTitle: vi.fn().mockResolvedValue(undefined),
    bulkPinConversations: vi.fn().mockResolvedValue(undefined),
    bulkArchiveConversations: vi.fn().mockResolvedValue(undefined),
    bulkDeleteConversations: vi.fn().mockResolvedValue(undefined),
    getConversations: vi.fn().mockResolvedValue([]),
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
      extractionMode: 'manual' as const,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    tags: [],
    isArchived: false,
    folderId: null,
    archivedAt: null,
  }

  const renderWithContext = (ui: React.ReactElement) => {
    return render(
      <SessionContext value={mockSessionContext}>
        <StorageContext value={mockStorageContext}>{ui}</StorageContext>
      </SessionContext>,
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useOpenAIServiceModule.useOpenAIService).mockReturnValue(mockOpenAIService)

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
    renderWithContext(<GPTTestPane gptConfig={mockConfig} />)

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

    renderWithContext(<GPTTestPane gptConfig={mockConfig} />)

    const input = screen.getByLabelText('Enter your message to send to the GPT')
    await user.type(input, 'Hello')

    const sendButton = screen.getByLabelText('Send message to GPT assistant')
    await user.click(sendButton)

    await waitFor(() => {
      expect(mockOpenAIService.setApiKey).toHaveBeenCalledWith('test-api-key')
      expect(mockOpenAIService.createAssistant).toHaveBeenCalledWith(mockConfig)
      expect(mockOpenAIService.createThread).toHaveBeenCalled()
    })
  })

  it('adds user message to the conversation', async () => {
    const user = userEvent.setup()

    mockOpenAIService.createAssistant.mockResolvedValueOnce({id: 'assistant-id'})
    mockOpenAIService.createThread.mockResolvedValueOnce({id: 'thread-id'})

    renderWithContext(<GPTTestPane gptConfig={mockConfig} />)

    const input = screen.getByLabelText('Enter your message to send to the GPT')
    await user.type(input, 'Hello')

    expect(input).toHaveValue('Hello')

    const sendButton = screen.getByLabelText('Send message to GPT assistant')
    await user.click(sendButton)

    await waitFor(() => {
      expect(input).toHaveValue('')
    })
  })

  it('displays proper accessibility attributes for HeroUI Input components', () => {
    renderWithContext(<GPTTestPane gptConfig={mockConfig} />)

    const conversationNameInput = screen.getByLabelText('Enter conversation name')
    const messageInput = screen.getByLabelText('Enter your message to send to the GPT')

    expect(conversationNameInput).toHaveAttribute('type', 'text')
    expect(messageInput).toBeInTheDocument()

    expect(conversationNameInput).toHaveAccessibleName()
    expect(messageInput).toHaveAccessibleName()
  })

  it('handles keyboard navigation properly with HeroUI components', async () => {
    const user = userEvent.setup()
    renderWithContext(<GPTTestPane gptConfig={mockConfig} />)

    const messageInput = screen.getByLabelText('Enter your message to send to the GPT')

    await user.click(messageInput)
    expect(messageInput).toHaveFocus()

    await user.type(messageInput, 'Test message')
    expect(messageInput).toHaveValue('Test message')

    const sendButton = screen.getByLabelText('Send message to GPT assistant')
    await user.click(sendButton)

    await waitFor(() => {
      expect(messageInput).toHaveValue('')
    })
  })
})
