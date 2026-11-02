import type {StorageContextType} from '@/contexts/storage-context'
import type {Conversation, ConversationMessage, GPTConfiguration} from '@/types/gpt'
import {StorageContext} from '@/contexts/storage-context'
import {act, render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {useState} from 'react'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {GPTTestPage} from '../gpt-test-page'

const routeState = vi.hoisted(() => ({
  conversationId: undefined as string | undefined,
  initialPrompt: undefined as string | undefined,
  options: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useParams: () => ({gptId: 'gpt-1', conversationId: routeState.conversationId}),
  useLocation: () => ({state: routeState.initialPrompt ? {initialPrompt: routeState.initialPrompt} : null}),
  useNavigate: () => routeState.navigate,
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
    conversations,
    onSendMessage,
  }: {
    messages: ConversationMessage[]
    conversations: Conversation[]
    onSendMessage: (content: string) => void
  }) => (
    <div>
      <ul aria-label="conversations">
        {conversations.map(conversation => (
          <li key={conversation.id}>{conversation.title}</li>
        ))}
      </ul>
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

function reportSaved(conversation: Conversation, info: {isNew: boolean; isCurrent: boolean}) {
  const options = routeState.options.mock.lastCall?.[0] as {
    onConversationSaved: (conversation: Conversation, info: {isNew: boolean; isCurrent: boolean}) => void
  }
  act(() => {
    options.onConversationSaved(conversation, info)
  })
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

  describe('when the completion hook reports a saved conversation', () => {
    const saved = (id: string, title: string, gptId = 'gpt-1') => ({id, title, gptId}) as Conversation

    it('lists a late save without navigating to a chat the user already left', async () => {
      render(renderPage(createStorage()))
      await screen.findByRole('button', {name: 'send'})

      reportSaved(saved('c1', 'First chat'), {isNew: true, isCurrent: false})

      expect(await screen.findByText('First chat')).toBeInTheDocument()
      expect(routeState.navigate).not.toHaveBeenCalled()
    })

    it('navigates to the first save of the chat on screen, replacing the route', async () => {
      render(renderPage(createStorage()))
      await screen.findByRole('button', {name: 'send'})

      reportSaved(saved('c2', 'Second chat'), {isNew: true, isCurrent: true})

      expect(await screen.findByText('Second chat')).toBeInTheDocument()
      expect(routeState.navigate).toHaveBeenCalledWith('/gpt/test/gpt-1/c/c2', {replace: true})
    })

    it('does not navigate again for a later save, and keeps another GPT\u2019s conversations out of the list', async () => {
      render(renderPage(createStorage()))
      await screen.findByRole('button', {name: 'send'})

      reportSaved(saved('c3', 'Later save'), {isNew: false, isCurrent: true})
      reportSaved(saved('c4', 'Elsewhere', 'gpt-2'), {isNew: true, isCurrent: false})

      expect(await screen.findByText('Later save')).toBeInTheDocument()
      expect(screen.queryByText('Elsewhere')).not.toBeInTheDocument()
      expect(routeState.navigate).not.toHaveBeenCalled()
    })
  })
})
