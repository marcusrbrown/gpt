import type {StorageContextType} from '@/contexts/storage-context'
import type {ConversationMessage, GPTConfiguration} from '@/types/gpt'
import {StorageContext} from '@/contexts/storage-context'
import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {useState} from 'react'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {GPTTestPage} from '../gpt-test-page'

const routeState = vi.hoisted(() => ({
  conversationId: undefined as string | undefined,
  initialPrompt: undefined as string | undefined,
  options: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useParams: () => ({gptId: 'gpt-1', conversationId: routeState.conversationId}),
  useLocation: () => ({state: routeState.initialPrompt ? {initialPrompt: routeState.initialPrompt} : null}),
  useNavigate: () => vi.fn(),
}))

vi.mock('@/hooks/use-chat-completion', () => ({
  useChatCompletion: (options: unknown) => {
    routeState.options(options)
    const [messages, setMessages] = useState<ConversationMessage[]>([])
    return {
      messages,
      conversationTitle: 'New Chat',
      status: 'ready',
      providerName: 'OpenAI',
      model: 'gpt-4',
      isStreaming: false,
      streamingMessageId: null,
      isLoadingConversation: false,
      turnErrors: {},
      send: async (content: string) => {
        setMessages([{id: 'user', role: 'user', content, timestamp: new Date()}])
      },
      stop: vi.fn(),
      regenerate: vi.fn(),
      retry: vi.fn(),
      reset: vi.fn(),
    }
  },
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
    routeState.initialPrompt = undefined
    vi.clearAllMocks()
  })

  it('keeps an in-progress new chat when the storage context identity changes', async () => {
    const user = userEvent.setup()
    const {rerender} = render(renderPage(createStorage()))

    // Wait for the GPT config before sending.
    await screen.findByRole('button', {name: 'send'})

    await user.click(screen.getByRole('button', {name: 'send'}))
    expect(await screen.findByText('hello')).toBeInTheDocument()

    // Same conversation (none), new storage identity, e.g. isLoading/error/storageWarning changed.
    rerender(renderPage(createStorage({storageWarning: {type: 'approaching_limit', message: 'Full', percentUsed: 85}})))

    await waitFor(() => {
      expect(screen.getByText('hello')).toBeInTheDocument()
    })
  })

  it('passes the navigation prompt to the completion hook', async () => {
    routeState.initialPrompt = 'from showcase'
    render(renderPage(createStorage()))
    await screen.findByRole('button', {name: 'send'})
    expect(routeState.options).toHaveBeenLastCalledWith(
      expect.objectContaining({
        initialPrompt: 'from showcase',
        onInitialPromptSent: expect.any(Function),
      }),
    )
  })
})
