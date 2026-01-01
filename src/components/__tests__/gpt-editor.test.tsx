import type {GPTConfiguration} from '../../types/gpt'
import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {StorageContext} from '../../contexts/storage-context'
import {GPTEditor} from '../gpt-editor'

// Mock the hooks
vi.mock('../../hooks/use-openai-service', () => ({
  useOpenAIService: () => ({
    createAssistant: vi.fn().mockResolvedValue({id: 'assistant-id'}),
    createThread: vi.fn().mockResolvedValue({id: 'thread-id'}),
    addMessage: vi.fn().mockResolvedValue({}),
    streamRun: vi.fn().mockImplementation(async () => Promise.resolve()),
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

const mockStorageContext = {
  getGPT: vi.fn().mockImplementation(async id => {
    return Promise.resolve(id === 'test-gpt-id' ? mockGPT : undefined)
  }),
  saveGPT: vi.fn().mockResolvedValue(undefined),
  getAllGPTs: vi.fn().mockResolvedValue([mockGPT]),
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

describe('gPTEditor', () => {
  // Setup
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Helper function to render component with context
  const renderWithContext = (component: React.ReactElement) => {
    return render(<StorageContext value={mockStorageContext}>{component}</StorageContext>)
  }

  it('renders the editor with basic form elements', () => {
    renderWithContext(<GPTEditor />)
    // Note: GPTEditor is deprecated - the title is now managed by GPTEditorPage
    // Just verify the form renders
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
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
  }, 10_000)

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

  it('displays error states for invalid form inputs', async () => {
    const user = userEvent.setup()
    renderWithContext(<GPTEditor />)

    // Find the save button and click it without filling required fields
    const saveButton = screen.getByText('Save')
    await user.click(saveButton)

    // Check that form inputs show error states using HeroUI error patterns
    const nameInput = screen.getByLabelText('Name')
    const descriptionInput = screen.getByLabelText('Description')
    const systemPromptInput = screen.getByLabelText('System Prompt')

    // HeroUI Input components should have aria-invalid when there's an error
    expect(nameInput).toHaveAttribute('aria-invalid', 'true')
    expect(descriptionInput).toHaveAttribute('aria-invalid', 'true')
    expect(systemPromptInput).toHaveAttribute('aria-invalid', 'true')
  })

  it('clears error states when user starts typing', async () => {
    const user = userEvent.setup()
    renderWithContext(<GPTEditor />)

    // Trigger validation by trying to save empty form
    const saveButton = screen.getByText('Save')
    await user.click(saveButton)

    const nameInput = screen.getByLabelText('Name')

    // Initially should have error state
    expect(nameInput).toHaveAttribute('aria-invalid', 'true')

    // Type in the input to clear the error
    await user.type(nameInput, 'Test GPT')

    // Error state should be cleared - aria-invalid should be false or not present
    expect(nameInput).not.toHaveAttribute('aria-invalid', 'true')
  })

  it('uses proper ARIA labels and roles for form accessibility', () => {
    renderWithContext(<GPTEditor />)

    // Verify form elements have proper labels
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
    expect(screen.getByLabelText('System Prompt')).toBeInTheDocument()

    // Verify buttons have proper labels
    expect(screen.getByRole('button', {name: /save/i})).toBeInTheDocument()

    // Verify checkboxes are properly labeled
    expect(screen.getByLabelText(/code interpreter/i)).toBeInTheDocument()
  })
})
