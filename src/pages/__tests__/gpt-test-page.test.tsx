import type {StorageContextType} from '@/contexts/storage-context'
import type {ConversationMessage, GPTConfiguration} from '@/types/gpt'
import {StorageContext} from '@/contexts/storage-context'
import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {GPTTestPage} from '../gpt-test-page'

const routeState = vi.hoisted(() => ({conversationId: undefined as string | undefined}))

const openAIService = vi.hoisted(() => ({
  setApiKey: vi.fn(),
  // Never resolves: the assistant stays "initializing" so the sent message is the only chat state.
  createAssistant: vi.fn(async () => new Promise<never>(() => {})),
  createThread: vi.fn(),
  addMessage: vi.fn(),
  streamRun: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useParams: () => ({gptId: 'gpt-1', conversationId: routeState.conversationId}),
  useLocation: () => ({state: null}),
  useNavigate: () => vi.fn(),
}))

vi.mock('@/hooks/use-session', () => ({
  useSession: () => ({getSecret: vi.fn().mockResolvedValue('sk-test')}),
}))

vi.mock('@/hooks/use-openai-service', () => ({
  useOpenAIService: () => openAIService,
}))

vi.mock('@/hooks/use-mcp', () => ({
  useMCP: () => ({callTool: vi.fn()}),
  useAllConnectedTools: () => [],
}))

vi.mock('@/components/chat', () => ({
  ChatInterface: ({
    messages,
    onSendMessage,
  }: {
    messages: ConversationMessage[]
    onSendMessage: (content: string) => void
  }) => (
    <div>
      <button
        type="button"
        onClick={() => {
          onSendMessage('hello')
        }}
      >
        send
      </button>
      <ul>
        {messages.map(message => (
          <li key={message.id}>{message.content}</li>
        ))}
      </ul>
    </div>
  ),
}))

const gptConfig = {id: 'gpt-1', name: 'Test GPT'} as GPTConfiguration

function createStorage(overrides: Partial<StorageContextType> = {}): StorageContextType {
  return {
    getGPT: vi.fn().mockResolvedValue(gptConfig),
    getConversationsForGPT: vi.fn().mockResolvedValue([]),
    getConversation: vi.fn().mockResolvedValue(undefined),
    saveConversation: vi.fn().mockResolvedValue(undefined),
    isLoading: false,
    isMigrating: false,
    error: null,
    storageWarning: null,
    ...overrides,
  } as unknown as StorageContextType
}

function renderPage(storage: StorageContextType) {
  return (
    <StorageContext value={storage}>
      <GPTTestPage />
    </StorageContext>
  )
}

describe('GPTTestPage new-chat reset', () => {
  beforeEach(() => {
    routeState.conversationId = undefined
    vi.clearAllMocks()
  })

  it('keeps an in-progress new chat when the storage context identity changes', async () => {
    const user = userEvent.setup()
    const {rerender} = render(renderPage(createStorage()))

    // Wait for the GPT config and API key to load before sending.
    await screen.findByRole('button', {name: 'send'})
    await waitFor(() => {
      expect(openAIService.setApiKey).toHaveBeenCalledWith('sk-test')
    })

    await user.click(screen.getByRole('button', {name: 'send'}))
    expect(await screen.findByText('hello')).toBeInTheDocument()

    // Same conversation (none), new storage identity, e.g. isLoading/error/storageWarning changed.
    rerender(renderPage(createStorage({storageWarning: {type: 'approaching_limit', message: 'Full', percentUsed: 85}})))

    await waitFor(() => {
      expect(screen.getByText('hello')).toBeInTheDocument()
    })
  })
})
