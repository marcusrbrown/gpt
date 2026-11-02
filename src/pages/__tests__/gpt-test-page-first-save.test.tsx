import type {StorageContextType} from '@/contexts/storage-context'
import type {Conversation, GPTConfiguration} from '@/types/gpt'
import {StorageContext} from '@/contexts/storage-context'
import {routeTransitionKey} from '@/lib/route-transition-key'
import {act, render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {useState} from 'react'
import {MemoryRouter, Route, Routes, useLocation} from 'react-router-dom'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {GPTTestPage} from '../gpt-test-page'

const hook = vi.hoisted(() => ({options: vi.fn()}))
const mounts = vi.hoisted(() => ({count: 0}))

vi.mock('@/hooks/use-chat-completion', () => ({
  useChatCompletion: (options: unknown) => {
    hook.options(options)
    return {
      messages: [],
      conversationTitle: 'New Chat',
      status: 'ready',
      providerName: 'OpenAI',
      model: 'gpt-4',
      isStreaming: false,
      streamingMessageId: null,
      isLoadingConversation: false,
      turnErrors: {},
      send: vi.fn(),
      stop: vi.fn(),
      regenerate: vi.fn(),
      retry: vi.fn(),
      reset: vi.fn(),
    }
  },
}))

// Stands in for the chat input: it keeps its draft in local state, as the real one does.
vi.mock('@/components/chat', () => ({
  ChatInterface: () => {
    const [draft, setDraft] = useState('')
    const [mountId] = useState(() => ++mounts.count)
    return (
      <div data-mount={mountId}>
        <textarea
          aria-label="draft"
          value={draft}
          onChange={event => {
            setDraft(event.target.value)
          }}
        />
      </div>
    )
  },
}))

const gptConfig = {id: 'gpt-1', name: 'Test GPT'} as GPTConfiguration

const storage = {
  getGPT: vi.fn().mockResolvedValue(gptConfig),
  getConversationsForGPT: vi.fn().mockResolvedValue([]),
} as unknown as StorageContextType

/** The routing of `App`: `Routes` remounted by `routeTransitionKey`, with both chat routes rendering the page. */
function KeyedRoutes() {
  const location = useLocation()
  return (
    <Routes key={routeTransitionKey(location.pathname)}>
      <Route path="/gpt/test/:gptId" element={<GPTTestPage />} />
      <Route path="/gpt/test/:gptId/c/:conversationId" element={<GPTTestPage />} />
    </Routes>
  )
}

function LocationProbe() {
  return <p data-testid="path">{useLocation().pathname}</p>
}

function renderAt(path: string) {
  return render(
    <StorageContext value={storage}>
      <MemoryRouter initialEntries={[path]}>
        <KeyedRoutes />
        <LocationProbe />
      </MemoryRouter>
    </StorageContext>,
  )
}

function reportFirstSave(id: string) {
  const options = hook.options.mock.lastCall?.[0] as {
    onConversationSaved: (conversation: Conversation, info: {isNew: boolean; isCurrent: boolean}) => void
  }
  act(() => {
    options.onConversationSaved({id, gptId: 'gpt-1', title: 'Chat'} as Conversation, {isNew: true, isCurrent: true})
  })
}

describe('GPTTestPage first save', () => {
  beforeEach(() => {
    mounts.count = 0
    vi.clearAllMocks()
  })

  it('keeps a draft typed while the first save was pending when the route moves to the conversation', async () => {
    const user = userEvent.setup()
    renderAt('/gpt/test/gpt-1')
    const input = await screen.findByLabelText('draft')

    await user.type(input, 'second question')
    reportFirstSave('conv-1')

    await waitFor(() => {
      expect(screen.getByTestId('path')).toHaveTextContent('/gpt/test/gpt-1/c/conv-1')
    })
    expect(screen.getByLabelText('draft')).toHaveValue('second question')
    expect(mounts.count).toBe(1)
  })
})
