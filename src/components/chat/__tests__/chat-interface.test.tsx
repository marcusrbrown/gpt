import type {ConversationMessage, GPTConfiguration} from '@/types/gpt'
import type {ComponentProps} from 'react'
import type {ChatProviderStatus, ChatTurnError} from '@/hooks/use-chat-completion'
import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {describe, expect, it, vi} from 'vitest'
import {MemoryRouter} from 'react-router-dom'
import {ChatInterface} from '../chat-interface'

const gpt = {id: 'gpt-1', name: 'Test', description: 'testing'} as GPTConfiguration
Element.prototype.scrollIntoView = vi.fn()
const messages: ConversationMessage[] = [
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
function show(props: Partial<ComponentProps<typeof ChatInterface>> = {}) {
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

  it('passes the truncated flag through as a Cut off tag', () => {
    show({
      messages: [
        ...messages.slice(0, 3),
        {
          id: 'a2',
          role: 'assistant' as const,
          content: 'Cut answer',
          timestamp: new Date(),
          metadata: {truncated: true},
        },
      ],
    })
    expect(screen.getByText('Cut off')).toBeInTheDocument()
    expect(screen.queryByText('Stopped')).not.toBeInTheDocument()
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
    expect(screen.getByText('Rate limit reached. Try again shortly.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', {name: 'Retry'}))
    expect(onRetry).toHaveBeenCalledWith('u2')
  })

  it.each([
    ['server', '{"error":"Provider unavailable"}', "Couldn't reach Ollama. Check that it's running."],
    ['connection', 'Failed to fetch', "Couldn't reach Ollama. Check that it's running."],
    ['authentication', 'invalid key', 'Your API key was rejected.'],
    ['validation', 'Choose a different model.', 'Choose a different model.'],
    ['unknown', '{"detail":"secret"}', 'Something went wrong. Try again.'],
    ['unknown', '<html>Failure</html>', 'Something went wrong. Try again.'],
    ['unknown', 'null', 'Something went wrong. Try again.'],
    ['unknown', 'x'.repeat(161), 'Something went wrong. Try again.'],
  ] as const)('shows readable copy for %s errors', (type, message, expected) => {
    show({providerName: 'Ollama', messages: messages.slice(0, 3), turnErrors: {u2: {message, type}}})
    expect(screen.getByText(expected)).toBeInTheDocument()
    expect(screen.queryByText(message) === null).toBe(message !== expected)
  })

  it('keeps history visible when a provider is not configured', () => {
    show({status: 'not-configured', model: ''})
    expect(screen.getByText('No model set')).toBeInTheDocument()
    expect(screen.getByText('First answer')).toBeInTheDocument()
    expect(screen.getByText(/OpenAI isn't set up for this GPT/)).toBeInTheDocument()
  })

  it('replaces the input with a message and a Try again action when the conversation failed to load', async () => {
    const onReload = vi.fn()
    show({messages: [], loadError: 'IndexedDB unavailable', onReload})

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load this conversation.")
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', {name: 'Try again'}))
    expect(onReload).toHaveBeenCalledTimes(1)
  })

  it('warns that the conversation is unsaved, keeps the input, and offers Try again', async () => {
    const onRetrySave = vi.fn()
    show({saveError: 'QuotaExceededError', onRetrySave})

    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't save this conversation.")
    expect(screen.getByText('First answer')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', {name: 'Try again'}))
    expect(onRetrySave).toHaveBeenCalledTimes(1)
  })

  it('shows no save warning when the conversation is saved', () => {
    show({saveError: null})
    expect(screen.queryByText("Couldn't save this conversation.")).not.toBeInTheDocument()
  })

  it('shows the input and no load message when there is no load error', () => {
    show({loadError: null})
    expect(screen.queryByText("Couldn't load this conversation.")).not.toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('keeps history visible when Azure is unsupported', () => {
    show({status: 'unsupported', providerName: 'Azure'})
    expect(screen.getByText('Azure isn’t supported yet.')).toBeInTheDocument()
    expect(screen.getByText('First answer')).toBeInTheDocument()
  })
})
