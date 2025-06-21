import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {StorageContext} from '../../contexts/storage-context'
import {type GPTConfiguration} from '../../types/gpt'
import {GPTEditor} from '../gpt-editor'

// Mock the hooks
vi.mock('../../hooks/use-openai-service', () => ({
  useOpenAIService: () => ({
    createAssistant: vi.fn().mockResolvedValue({id: 'assistant-id'}),
    createThread: vi.fn().mockResolvedValue({id: 'thread-id'}),
    addMessage: vi.fn().mockResolvedValue({}),
    streamRun: vi.fn().mockImplementation(() => Promise.resolve()),
  }),
}))

// Mock UUID generation
vi.mock('uuid', () => ({
  v4: () => 'test-uuid',
}))

// Mock the storage context
const mockGPT: Partial<GPTConfiguration> = {
  id: 'test-gpt-id',
  name: 'Test GPT',
  description: 'A test GPT',
  systemPrompt: 'You are a test assistant',
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

const mockStorageContext = {
  getGPT: vi.fn().mockImplementation(id => {
    return id === 'test-gpt-id' ? mockGPT : undefined
  }),
  saveGPT: vi.fn(),
  getAllGPTs: vi.fn().mockReturnValue([mockGPT]),
  deleteGPT: vi.fn(),
  getConversation: vi.fn(),
  getConversationsForGPT: vi.fn(),
  saveConversation: vi.fn(),
  deleteConversation: vi.fn(),
  clearAll: vi.fn(),
  isLoading: false,
  error: null,
}

describe('GPTEditor', () => {
  // Setup
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Helper function to render component with context
  const renderWithContext = (component: React.ReactElement) => {
    return render(<StorageContext.Provider value={mockStorageContext}>{component}</StorageContext.Provider>)
  }

  it('renders the editor with the correct title', () => {
    renderWithContext(<GPTEditor />)
    expect(screen.getByText('GPT Configuration')).toBeInTheDocument()
  })

  it('calls getGPT with the correct id when provided', () => {
    renderWithContext(<GPTEditor gptId="test-gpt-id" />)
    expect(mockStorageContext.getGPT).toHaveBeenCalledWith('test-gpt-id')
  })

  it('renders form inputs correctly', () => {
    renderWithContext(<GPTEditor />)

    // Check for basic form inputs
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
    expect(screen.getByLabelText('System Prompt')).toBeInTheDocument()
  })

  it('allows updating input field values', async () => {
    const user = userEvent.setup()
    renderWithContext(<GPTEditor />)

    // Find the input elements
    const nameInput = screen.getByLabelText('Name')

    // Type in the name input
    await user.type(nameInput, 'New Test GPT')

    // Check if the value was updated
    expect(nameInput).toHaveValue('New Test GPT')
  })

  it('saves GPT configuration when Save button is clicked', async () => {
    const user = userEvent.setup()
    const onSaveMock = vi.fn()
    renderWithContext(<GPTEditor onSave={onSaveMock} />)

    // Fill in required fields
    const nameInput = screen.getByLabelText('Name')
    const descriptionInput = screen.getByLabelText('Description')
    const systemPromptInput = screen.getByLabelText('System Prompt')

    await user.type(nameInput, 'Test GPT Name')
    await user.type(descriptionInput, 'Test GPT Description')
    await user.type(systemPromptInput, 'Test System Prompt')

    // Click the Save button
    const saveButton = screen.getByText('Save')
    await user.click(saveButton)

    // Verify that the save function was called
    expect(mockStorageContext.saveGPT).toHaveBeenCalled()
    expect(onSaveMock).toHaveBeenCalled()
  })

  it('toggles capabilities when checkboxes are clicked', async () => {
    const user = userEvent.setup()
    renderWithContext(<GPTEditor />)

    // Get all checkboxes in the capabilities section
    const codeInterpreterCheckbox = screen.getByLabelText(/code interpreter/i)

    // Verify initial state
    expect(codeInterpreterCheckbox).not.toBeChecked()

    // Toggle the checkbox
    await user.click(codeInterpreterCheckbox)

    // Verify the checkbox is now checked
    expect(codeInterpreterCheckbox).toBeChecked()

    // Toggle it back
    await user.click(codeInterpreterCheckbox)

    // Verify it's unchecked again
    expect(codeInterpreterCheckbox).not.toBeChecked()
  })
})
