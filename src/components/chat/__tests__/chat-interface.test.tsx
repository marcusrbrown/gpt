import type {GPTConfiguration} from '@/types/gpt'
import type {ChatProviderStatus, ChatTurnError} from '@/hooks/use-chat-completion'
import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {describe, expect, it, vi} from 'vitest'
import {MemoryRouter} from 'react-router-dom'
import {ChatInterface} from '../chat-interface'

const gpt = {id: 'gpt-1', name: 'Test', description: 'testing'} as GPTConfiguration
Element.prototype.scrollIntoView = vi.fn()
const messages = [
  {id: 'u1', role: 'user' as const, content: 'Question', timestamp: new Date()},
  {id: 'a1', role: 'assistant' as const, content: 'First answer', timestamp: new Date()},
  {id: 'u2', role: 'user' as const, content: 'Next question', timestamp: new Date()},
  {id: 'a2', role: 'assistant' as const, content: 'Partial answer', timestamp: new Date(), metadata: {stopped: true}},
]
const defaults = {
  gptConfig: gpt,
  conversations: [],
  messages,
  isLoading: false,
  isStreaming: false,
  providerName: 'OpenAI',
  model: 'gpt-4',
  status: 'ready' as ChatProviderStatus,
  streamingMessageId: null as string | null,
  turnErrors: {} as Record<string, ChatTurnError>,
  onSendMessage: vi.fn(),
  onSelectConversation: vi.fn(),
  onClearConversation: vi.fn(),
  onRegenerate: vi.fn(),
  onRetry: vi.fn(),
  onStop: vi.fn(),
}
function show(props: Partial<typeof defaults> = {}) {
  return render(
    <MemoryRouter>
      <ChatInterface {...defaults} {...props} />
    </MemoryRouter>,
  )
}

describe('ChatInterface', () => {
  it('shows the target, stopped tag and regenerate only on the last reply', () => {
    show()
    expect(screen.getByText('OpenAI · gpt-4')).toBeInTheDocument()
    expect(screen.getByText('Stopped')).toBeInTheDocument()
    expect(screen.getAllByRole('button', {name: 'Regenerate response'})).toHaveLength(1)
  })

  it('renders streamed text and disables regeneration during streaming', () => {
    show({isStreaming: true, streamingMessageId: 'a2'})
    expect(screen.getByText('Partial answer')).toBeInTheDocument()
    expect(screen.getByRole('button', {name: 'Regenerate response'})).toBeDisabled()
    expect(screen.getByRole('button', {name: 'Stop generating'})).toBeInTheDocument()
  })

  it('shows an inline failed turn and retries it', async () => {
    const onRetry = vi.fn()
    show({messages: messages.slice(0, 3), turnErrors: {u2: {message: 'Rate limited', type: 'rate_limit'}}, onRetry})
    expect(screen.getByText('Rate limited')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', {name: 'Retry'}))
    expect(onRetry).toHaveBeenCalledWith('u2')
  })

  it('keeps history visible when a provider is not configured', () => {
    show({status: 'not-configured', model: ''})
    expect(screen.getByText('No model set')).toBeInTheDocument()
    expect(screen.getByText('First answer')).toBeInTheDocument()
    expect(screen.getByText(/OpenAI isn't set up for this GPT/)).toBeInTheDocument()
  })

  it('keeps history visible when Azure is unsupported', () => {
    show({status: 'unsupported', providerName: 'Azure'})
    expect(screen.getByText('Azure isn’t supported yet.')).toBeInTheDocument()
    expect(screen.getByText('First answer')).toBeInTheDocument()
  })
})
