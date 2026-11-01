import type {Conversation, ConversationMessage, GPTConfiguration} from '@/types/gpt'
import type {
  CompletionChunk,
  CompletionRequest,
  Model,
  ProviderConfig,
  ProviderId,
  ValidationResult,
} from '@/types/provider'
import type {ReactNode} from 'react'
import type {UseChatCompletionOptions} from '../use-chat-completion'
import {AIProviderContext} from '@/contexts/ai-provider-context'
import {StorageContext, type StorageContextType} from '@/contexts/storage-context'
import {BaseLLMProvider} from '@/services/providers/base-provider'
import {ProviderError} from '@/types/provider'
import {act, renderHook, waitFor} from '@testing-library/react'
import {createElement} from 'react'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {DEFAULT_MODEL_NAME, resolveChatTarget, useChatCompletion} from '../use-chat-completion'

/** One scripted completion: the test pushes chunks, completes or fails it, and it honors the abort signal. */
class ScriptedStream implements AsyncIterable<CompletionChunk> {
  private readonly items: ({chunk: CompletionChunk} | {error: unknown} | {end: true})[] = []
  private wake: (() => void) | null = null

  constructor(readonly request: CompletionRequest) {
    request.signal?.addEventListener('abort', () => {
      this.wake?.()
    })
  }

  get signal(): AbortSignal | undefined {
    return this.request.signal
  }

  emit(content: string): void {
    this.push({chunk: {id: 'resp', content}})
  }

  complete(replay?: CompletionChunk['replay']): void {
    this.push({chunk: {id: 'resp', finishReason: 'stop', ...(replay ? {replay} : {})}})
    this.push({end: true})
  }

  fail(error: unknown): void {
    this.push({error})
  }

  private push(item: ScriptedStream['items'][number]): void {
    this.items.push(item)
    this.wake?.()
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<CompletionChunk> {
    while (true) {
      if (this.request.signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError')
      const item = this.items.shift()
      if (!item) {
        await new Promise<void>(resolve => {
          this.wake = resolve
        })
        continue
      }
      if ('error' in item) throw item.error
      if ('end' in item) return
      yield item.chunk
    }
  }
}

class FakeProvider extends BaseLLMProvider {
  readonly name: string
  readonly streams: ScriptedStream[] = []

  constructor(
    readonly id: ProviderId,
    readonly apiKeyRequired = true,
  ) {
    super()
    this.name = id.toUpperCase()
  }

  get isConfigured(): boolean {
    return true
  }

  get isEnabled(): boolean {
    return true
  }

  get requests(): CompletionRequest[] {
    return this.streams.map(stream => stream.request)
  }

  setApiKey(): void {}
  clearApiKey(): void {}

  async validateCredentials(): Promise<ValidationResult> {
    return {valid: true}
  }

  async listModels(): Promise<Model[]> {
    return []
  }

  createCompletion(request: CompletionRequest): AsyncIterable<CompletionChunk> {
    const stream = new ScriptedStream(request)
    this.streams.push(stream)
    return stream
  }
}

const GPT_ID = '11111111-1111-4111-8111-111111111111'

function makeGpt(overrides: Partial<GPTConfiguration> = {}): GPTConfiguration {
  return {
    id: GPT_ID,
    name: 'Test GPT',
    description: '',
    systemPrompt: 'Be brief.',
    modelProvider: 'openai',
    modelName: 'gpt-4o',
    ...overrides,
  } as GPTConfiguration
}

function makeConversation(id: string, messages: ConversationMessage[]): Conversation {
  return {
    id,
    gptId: GPT_ID,
    title: `Saved ${id}`,
    messages,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
    messageCount: messages.length,
    tags: ['keep'],
    isPinned: true,
    isArchived: false,
    pinnedAt: new Date('2026-01-03T00:00:00Z'),
    archivedAt: null,
  }
}

function makeMessage(role: ConversationMessage['role'], content: string, metadata?: ConversationMessage['metadata']) {
  return {id: crypto.randomUUID(), role, content, timestamp: new Date('2026-01-01T00:00:00Z'), metadata}
}

interface Env {
  providersLoading: boolean
  /** Providers with a validated key. Ollama needs none. */
  configured: Set<ProviderId>
  providers: Record<ProviderId, FakeProvider>
  stored: Map<string, Conversation>
  saveConversation: ReturnType<typeof vi.fn<(conversation: Conversation) => Promise<void>>>
}

function createEnv(): Env {
  const stored = new Map<string, Conversation>()
  return {
    providersLoading: false,
    configured: new Set<ProviderId>(['openai', 'anthropic']),
    providers: {
      openai: new FakeProvider('openai'),
      anthropic: new FakeProvider('anthropic'),
      ollama: new FakeProvider('ollama', false),
      azure: new FakeProvider('azure'),
    },
    stored,
    saveConversation: vi.fn(async (conversation: Conversation) => {
      stored.set(conversation.id, conversation)
    }),
  }
}

let env: Env

function Wrapper({children}: {children: ReactNode}) {
  const providers: ProviderConfig[] = Object.values(env.providers).map(provider => ({
    id: provider.id,
    name: provider.name,
    apiKeyRequired: provider.apiKeyRequired,
    isConfigured: env.configured.has(provider.id),
    isEnabled: true,
  }))
  const ai = {
    providers,
    activeProvider: null,
    setActiveProvider: vi.fn(),
    getProvider: (id: ProviderId) => env.providers[id],
    validateProvider: vi.fn(),
    listModels: vi.fn(),
    isLoading: env.providersLoading,
  }
  const storage = {
    getConversation: vi.fn(async (id: string) => env.stored.get(id)),
    saveConversation: env.saveConversation,
  } as unknown as StorageContextType

  return createElement(StorageContext, {value: storage}, createElement(AIProviderContext, {value: ai}, children))
}

function setup(initial: Partial<UseChatCompletionOptions> = {}) {
  const props: UseChatCompletionOptions = {gpt: makeGpt(), conversationId: undefined, ...initial}
  return renderHook((hookProps: UseChatCompletionOptions) => useChatCompletion(hookProps), {
    initialProps: props,
    wrapper: Wrapper,
  })
}

type Hook = ReturnType<typeof setup>

let hook: Hook

/** Starts a send inside `act` and returns its promise; stream control happens through `env.providers`. */
async function startSend(hook: Hook, content: string): Promise<void> {
  let pending!: Promise<void>
  act(() => {
    pending = hook.result.current.send(content)
  })
  return pending
}

async function emit(stream: ScriptedStream, text: string, expectedReply: string): Promise<void> {
  await act(async () => {
    stream.emit(text)
  })
  await waitFor(() => {
    expect(lastMessage(hook).content).toBe(expectedReply)
  })
}

function lastMessage(target: Hook): ConversationMessage {
  const message = target.result.current.messages.at(-1)
  if (!message) throw new Error('no messages')
  return message
}

async function finish(stream: ScriptedStream, pending: Promise<void>, replay?: CompletionChunk['replay']) {
  await act(async () => {
    stream.complete(replay)
    await pending
  })
}

function savedMessages(callIndex = -1): ConversationMessage[] {
  const call = env.saveConversation.mock.calls.at(callIndex)
  if (!call) throw new Error('nothing saved')
  return call[0].messages
}

function messageAt(index: number): ConversationMessage {
  const message = hook.result.current.messages[index]
  if (!message) throw new Error(`no message at ${index}`)
  return message
}

function savedConversation(callIndex: number): Conversation {
  const call = env.saveConversation.mock.calls[callIndex]
  if (!call) throw new Error(`no save at ${callIndex}`)
  return call[0]
}

function storedConversation(id: string | undefined): Conversation {
  const conversation = id === undefined ? undefined : env.stored.get(id)
  if (!conversation) throw new Error(`no stored conversation ${id}`)
  return conversation
}

function streamAt(provider: ProviderId, index: number): ScriptedStream {
  const stream = env.providers[provider].streams[index]
  if (!stream) throw new Error(`no ${provider} stream at ${index}`)
  return stream
}

async function openConversationA() {
  const earlier = [makeMessage('user', 'earlier q'), makeMessage('assistant', 'earlier a')]
  env.stored.set('conv-a', makeConversation('conv-a', earlier))
  env.stored.set('conv-b', makeConversation('conv-b', [makeMessage('user', 'b question')]))
  const onConversationSaved = vi.fn()
  hook = setup({conversationId: 'conv-a', onConversationSaved})
  await waitFor(() => {
    expect(hook.result.current.messages).toHaveLength(2)
  })
  return onConversationSaved
}

async function chatWithOneReply() {
  hook = setup()
  const first = startSend(hook, 'one')
  await emit(streamAt('openai', 0), 'first reply', 'first reply')
  await finish(streamAt('openai', 0), first)
}

async function failFirstTurn() {
  hook = setup()
  const pending = startSend(hook, 'one')
  const stream = streamAt('openai', 0)
  await emit(stream, 'partial', 'partial')
  await act(async () => {
    stream.fail(new ProviderError('Rate limited', 'rate_limit', 'openai', 429))
    await pending
  })
  return messageAt(0)
}

describe('useChatCompletion', () => {
  beforeEach(() => {
    env = createEnv()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('provider status and target', () => {
    it('reports loading while providers load and sends nothing, then becomes ready', async () => {
      env.providersLoading = true
      hook = setup()
      expect(hook.result.current.status).toBe('loading')

      await startSend(hook, 'hi')
      expect(env.providers.openai.streams).toHaveLength(0)
      expect(hook.result.current.messages).toEqual([])

      env.providersLoading = false
      hook.rerender({gpt: makeGpt(), conversationId: undefined})
      expect(hook.result.current.status).toBe('ready')
    })

    it('reports not-configured for a provider without a validated key and never falls back to another provider', async () => {
      env.configured = new Set<ProviderId>(['anthropic'])
      hook = setup()
      expect(hook.result.current.status).toBe('not-configured')

      await startSend(hook, 'hi')
      expect(hook.result.current.messages).toEqual([])
      for (const provider of Object.values(env.providers)) expect(provider.streams).toHaveLength(0)
    })

    it('reports unsupported for Azure even when it has a key, and sends nothing', async () => {
      env.configured.add('azure')
      hook = setup({gpt: makeGpt({modelProvider: 'azure', modelName: 'gpt-4o'})})
      expect(hook.result.current.status).toBe('unsupported')

      await startSend(hook, 'hi')
      for (const provider of Object.values(env.providers)) expect(provider.streams).toHaveLength(0)
    })

    it('treats a provider that needs no key (Ollama) as ready', () => {
      env.configured.clear()
      hook = setup({gpt: makeGpt({modelProvider: 'ollama', modelName: 'llama3'})})
      expect(hook.result.current.status).toBe('ready')
    })

    it('resolves a GPT with no saved provider or model to OpenAI and the default model', async () => {
      hook = setup({gpt: makeGpt({modelProvider: undefined, modelName: undefined})})
      expect(hook.result.current).toMatchObject({provider: 'openai', model: DEFAULT_MODEL_NAME, status: 'ready'})

      const pending = startSend(hook, 'hi')
      expect(env.providers.openai.requests[0]?.model).toBe(DEFAULT_MODEL_NAME)
      await finish(streamAt('openai', 0), pending)
    })

    it('does not give another provider the OpenAI default model', () => {
      expect(resolveChatTarget({modelProvider: 'anthropic', modelName: undefined})).toEqual({
        provider: 'anthropic',
        model: '',
      })
      expect(resolveChatTarget({modelProvider: 'anthropic', modelName: '  '})).toEqual({
        provider: 'anthropic',
        model: '',
      })
    })

    it('fails the turn without a request when a non-OpenAI GPT has no model', async () => {
      hook = setup({gpt: makeGpt({modelProvider: 'anthropic', modelName: undefined})})
      expect(hook.result.current.model).toBe('')

      await startSend(hook, 'hi')
      const [userMessage] = hook.result.current.messages
      expect(env.providers.anthropic.streams).toHaveLength(0)
      expect(hook.result.current.turnErrors[userMessage?.id ?? '']).toEqual({
        message: 'This GPT has no model set',
        type: 'validation',
      })
    })
  })

  describe('send', () => {
    it('streams deltas into one pending message and saves it with its metadata on completion', async () => {
      hook = setup()
      const pending = startSend(hook, 'hello')
      const stream = streamAt('openai', 0)

      expect(hook.result.current.isStreaming).toBe(true)
      expect(hook.result.current.messages.map(message => [message.role, message.content])).toEqual([
        ['user', 'hello'],
        ['assistant', ''],
      ])
      expect(hook.result.current.streamingMessageId).toBe(messageAt(1).id)

      await emit(stream, 'Hel', 'Hel')
      await emit(stream, 'lo!', 'Hello!')
      expect(hook.result.current.messages).toHaveLength(2)
      expect(env.saveConversation).not.toHaveBeenCalled()

      await finish(stream, pending)

      expect(hook.result.current.isStreaming).toBe(false)
      expect(hook.result.current.streamingMessageId).toBeNull()
      const [saved] = env.saveConversation.mock.calls.map(call => call[0])
      expect(saved).toMatchObject({gptId: GPT_ID, messageCount: 2, lastMessagePreview: 'Hello!'})
      expect(saved?.id).toBe(hook.result.current.conversationId)
      expect(saved?.messages.at(-1)).toMatchObject({
        role: 'assistant',
        content: 'Hello!',
        metadata: {provider: 'openai', model: 'gpt-4o'},
      })
      expect(saved?.messages.at(-1)?.metadata?.stopped).toBeUndefined()
    })

    it('sends instructions, the model, the full history and an abort signal', async () => {
      hook = setup()
      const pending = startSend(hook, 'hello')
      const [request] = env.providers.openai.requests

      expect(request).toMatchObject({
        model: 'gpt-4o',
        instructions: 'Be brief.',
        stream: true,
        messages: [{role: 'user', content: 'hello'}],
      })
      expect(request?.signal).toBeInstanceOf(AbortSignal)
      await finish(streamAt('openai', 0), pending)
    })

    it('includes the first turn in the second turn request', async () => {
      hook = setup()
      const first = startSend(hook, 'one')
      await emit(streamAt('openai', 0), 'reply one', 'reply one')
      await finish(streamAt('openai', 0), first)

      const second = startSend(hook, 'two')
      expect(env.providers.openai.requests[1]?.messages).toEqual([
        {role: 'user', content: 'one'},
        {role: 'assistant', content: 'reply one'},
        {role: 'user', content: 'two'},
      ])
      await finish(streamAt('openai', 1), second)
    })

    it('ignores a second send while a reply is streaming', async () => {
      hook = setup()
      const first = startSend(hook, 'one')
      const second = startSend(hook, 'two')

      await second
      expect(env.providers.openai.streams).toHaveLength(1)
      expect(hook.result.current.messages.map(message => message.content)).toEqual(['one', ''])
      await finish(streamAt('openai', 0), first)
    })

    it('ignores blank messages', async () => {
      hook = setup()
      await startSend(hook, '   ')
      expect(env.providers.openai.streams).toHaveLength(0)
    })

    it('stores replay data from the final chunk and sends it back with that message', async () => {
      hook = setup({gpt: makeGpt({modelName: 'o3-mini'})})
      const replay = {openai: [{type: 'reasoning', id: 'rs_1', encrypted_content: 'enc'}]}
      const first = startSend(hook, 'one')
      await emit(streamAt('openai', 0), 'reply', 'reply')
      await finish(streamAt('openai', 0), first, replay)
      expect(lastMessage(hook).metadata?.replay).toEqual(replay)

      const second = startSend(hook, 'two')
      expect(env.providers.openai.requests[1]?.messages[1]).toEqual({role: 'assistant', content: 'reply', replay})
      await finish(streamAt('openai', 1), second)
    })

    it('drops saved replay data that no longer parses instead of sending it', async () => {
      const conversation = makeConversation('conv-a', [
        makeMessage('user', 'q'),
        makeMessage('assistant', 'a', {provider: 'openai', model: 'gpt-4o', replay: {openai: 'x', bogus: 1} as never}),
      ])
      env.stored.set('conv-a', conversation)
      hook = setup({conversationId: 'conv-a'})
      await waitFor(() => {
        expect(hook.result.current.isLoadingConversation).toBe(false)
      })

      const pending = startSend(hook, 'next')
      expect(env.providers.openai.requests[0]?.messages[1]).toEqual({role: 'assistant', content: 'a'})
      await finish(streamAt('openai', 0), pending)
    })

    describe('replay safety', () => {
      const replay = {openai: [{type: 'reasoning', id: 'rs_1', encrypted_content: 'enc'}]}

      async function openWithReplayFrom(source: {provider?: ProviderId; model?: string}) {
        env.stored.set(
          'conv-a',
          makeConversation('conv-a', [makeMessage('user', 'q'), makeMessage('assistant', 'a', {...source, replay})]),
        )
        hook = setup({conversationId: 'conv-a'})
        await waitFor(() => {
          expect(hook.result.current.isLoadingConversation).toBe(false)
        })
      }

      it('sends replay from the same provider and model', async () => {
        await openWithReplayFrom({provider: 'openai', model: 'gpt-4o'})
        const pending = startSend(hook, 'next')
        expect(env.providers.openai.requests[0]?.messages[1]).toEqual({role: 'assistant', content: 'a', replay})
        await finish(streamAt('openai', 0), pending)
      })

      it('does not send replay produced by another model', async () => {
        await openWithReplayFrom({provider: 'openai', model: 'o3-mini'})
        const pending = startSend(hook, 'next')
        expect(env.providers.openai.requests[0]?.messages[1]).toEqual({role: 'assistant', content: 'a'})
        await finish(streamAt('openai', 0), pending)
      })

      it('does not send replay produced by another provider', async () => {
        await openWithReplayFrom({provider: 'anthropic', model: 'gpt-4o'})
        const pending = startSend(hook, 'next')
        expect(env.providers.openai.requests[0]?.messages[1]).toEqual({role: 'assistant', content: 'a'})
        await finish(streamAt('openai', 0), pending)
      })

      it('does not send replay that records no provider or model', async () => {
        await openWithReplayFrom({})
        const pending = startSend(hook, 'next')
        expect(env.providers.openai.requests[0]?.messages[1]).toEqual({role: 'assistant', content: 'a'})
        await finish(streamAt('openai', 0), pending)
      })

      it('retries exactly once without replay when the request is rejected as invalid', async () => {
        await openWithReplayFrom({provider: 'openai', model: 'gpt-4o'})
        const pending = startSend(hook, 'next')
        expect(env.providers.openai.requests[0]?.messages[1]).toEqual({role: 'assistant', content: 'a', replay})

        await act(async () => {
          streamAt('openai', 0).fail(new ProviderError('encrypted content invalid', 'validation', 'openai', 400))
        })
        await waitFor(() => {
          expect(env.providers.openai.streams).toHaveLength(2)
        })
        expect(env.providers.openai.requests[1]?.messages).toEqual([
          {role: 'user', content: 'q'},
          {role: 'assistant', content: 'a'},
          {role: 'user', content: 'next'},
        ])

        await emit(streamAt('openai', 1), 'worked', 'worked')
        await finish(streamAt('openai', 1), pending)
        expect(hook.result.current.turnErrors).toEqual({})
        expect(lastMessage(hook).content).toBe('worked')
      })

      it('does not retry a second time when the retry is rejected too', async () => {
        await openWithReplayFrom({provider: 'openai', model: 'gpt-4o'})
        const pending = startSend(hook, 'next')
        await act(async () => {
          streamAt('openai', 0).fail(new ProviderError('bad request', 'validation', 'openai', 400))
        })
        await waitFor(() => {
          expect(env.providers.openai.streams).toHaveLength(2)
        })
        await act(async () => {
          streamAt('openai', 1).fail(new ProviderError('still bad', 'validation', 'openai', 400))
          await pending
        })

        expect(env.providers.openai.streams).toHaveLength(2)
        const userMessage = messageAt(hook.result.current.messages.length - 1)
        expect(hook.result.current.turnErrors[userMessage.id]).toEqual({message: 'still bad', type: 'validation'})
      })

      it('does not retry when no replay was sent', async () => {
        await openWithReplayFrom({provider: 'openai', model: 'o3-mini'})
        const pending = startSend(hook, 'next')
        await act(async () => {
          streamAt('openai', 0).fail(new ProviderError('bad request', 'validation', 'openai', 400))
          await pending
        })
        expect(env.providers.openai.streams).toHaveLength(1)
      })

      it('does not retry other kinds of failure', async () => {
        await openWithReplayFrom({provider: 'openai', model: 'gpt-4o'})
        const pending = startSend(hook, 'next')
        await act(async () => {
          streamAt('openai', 0).fail(new ProviderError('down', 'server', 'openai', 500))
          await pending
        })
        expect(env.providers.openai.streams).toHaveLength(1)
      })
    })

    it('routes an Anthropic GPT to the Anthropic provider with the instructions and full history', async () => {
      hook = setup({gpt: makeGpt({modelProvider: 'anthropic', modelName: 'claude-sonnet'})})
      const first = startSend(hook, 'one')
      await emit(streamAt('anthropic', 0), 'reply', 'reply')
      await finish(streamAt('anthropic', 0), first)
      const second = startSend(hook, 'two')

      expect(env.providers.openai.streams).toHaveLength(0)
      expect(env.providers.anthropic.requests[1]).toMatchObject({
        model: 'claude-sonnet',
        instructions: 'Be brief.',
        messages: [
          {role: 'user', content: 'one'},
          {role: 'assistant', content: 'reply'},
          {role: 'user', content: 'two'},
        ],
      })
      await finish(streamAt('anthropic', 1), second)
      expect(savedMessages().at(-1)?.metadata).toMatchObject({provider: 'anthropic', model: 'claude-sonnet'})
    })
  })

  describe('autosave', () => {
    it('reports a new conversation once, then keeps it and its stored fields on later saves', async () => {
      const onConversationSaved = vi.fn()
      hook = setup({onConversationSaved})

      const first = startSend(hook, 'a long first message that becomes the conversation title')
      await finish(streamAt('openai', 0), first)
      const {conversationId} = hook.result.current
      expect(onConversationSaved).toHaveBeenLastCalledWith(expect.objectContaining({id: conversationId}), {isNew: true})
      expect(hook.result.current.conversationTitle).toBe('a long first message that becomes the conversation…')

      // Another screen pins the conversation between turns; the next autosave must not undo it.
      env.stored.set(conversationId ?? '', {...storedConversation(conversationId), isPinned: true, tags: ['x']})

      const second = startSend(hook, 'more')
      await finish(streamAt('openai', 1), second)
      expect(onConversationSaved).toHaveBeenLastCalledWith(expect.objectContaining({id: conversationId}), {
        isNew: false,
      })
      expect(storedConversation(conversationId)).toMatchObject({isPinned: true, tags: ['x'], messageCount: 4})
    })

    it('does not reset an in-progress new chat when the storage context identity changes', async () => {
      hook = setup()
      const pending = startSend(hook, 'hello')
      await emit(streamAt('openai', 0), 'part', 'part')

      hook.rerender({gpt: makeGpt(), conversationId: undefined})
      expect(hook.result.current.messages.map(message => message.content)).toEqual(['hello', 'part'])
      expect(hook.result.current.isStreaming).toBe(true)
      await finish(streamAt('openai', 0), pending)
    })

    it('does not reset the chat on screen when the route catches up to the id the hook assigned', async () => {
      hook = setup()
      const pending = startSend(hook, 'hello')
      await emit(streamAt('openai', 0), 'part', 'part')
      const {conversationId} = hook.result.current

      hook.rerender({gpt: makeGpt(), conversationId})
      expect(hook.result.current.isStreaming).toBe(true)
      expect(hook.result.current.messages).toHaveLength(2)
      await finish(streamAt('openai', 0), pending)
      expect(env.saveConversation).toHaveBeenCalledTimes(1)
    })
  })

  describe('stop', () => {
    it('keeps the partial text, marks it stopped, saves it, and includes it in the next send', async () => {
      hook = setup()
      const pending = startSend(hook, 'one')
      const stream = streamAt('openai', 0)
      await emit(stream, 'partial', 'partial')

      act(() => {
        hook.result.current.stop()
      })
      await pending

      expect(stream.signal?.aborted).toBe(true)
      expect(hook.result.current.isStreaming).toBe(false)
      expect(lastMessage(hook)).toMatchObject({
        content: 'partial',
        metadata: {stopped: true, provider: 'openai', model: 'gpt-4o'},
      })
      expect(hook.result.current.turnErrors).toEqual({})
      await waitFor(() => {
        expect(env.saveConversation).toHaveBeenCalledTimes(1)
      })
      expect(savedMessages().at(-1)).toMatchObject({content: 'partial', metadata: {stopped: true}})

      const next = startSend(hook, 'two')
      expect(env.providers.openai.requests[1]?.messages).toEqual([
        {role: 'user', content: 'one'},
        {role: 'assistant', content: 'partial'},
        {role: 'user', content: 'two'},
      ])
      await finish(streamAt('openai', 1), next)
    })

    it('stopping before the first delta keeps an empty stopped reply that later requests leave out', async () => {
      hook = setup()
      const pending = startSend(hook, 'one')
      act(() => {
        hook.result.current.stop()
      })
      await pending

      expect(lastMessage(hook)).toMatchObject({role: 'assistant', content: '', metadata: {stopped: true}})
      await waitFor(() => {
        expect(env.saveConversation).toHaveBeenCalledTimes(1)
      })

      const next = startSend(hook, 'two')
      expect(env.providers.openai.requests[1]?.messages).toEqual([
        {role: 'user', content: 'one'},
        {role: 'user', content: 'two'},
      ])
      await finish(streamAt('openai', 1), next)
    })

    it('is a no-op when nothing is streaming', async () => {
      hook = setup()
      act(() => {
        hook.result.current.stop()
      })
      expect(env.saveConversation).not.toHaveBeenCalled()
    })

    it('ignores chunks that arrive after the stop', async () => {
      hook = setup()
      const pending = startSend(hook, 'one')
      const stream = streamAt('openai', 0)
      await emit(stream, 'a', 'a')
      act(() => {
        hook.result.current.stop()
      })
      await act(async () => {
        stream.emit('late')
        stream.complete()
        await pending
      })

      expect(lastMessage(hook).content).toBe('a')
      expect(env.saveConversation).toHaveBeenCalledTimes(1)
    })
  })

  describe('leaving the conversation mid-stream', () => {
    it('saves the stopped reply into the original conversation, never the newly selected one', async () => {
      const onConversationSaved = await openConversationA()
      const pending = startSend(hook, 'ask')
      const stream = streamAt('openai', 0)
      await emit(stream, 'partial', 'partial')

      hook.rerender({gpt: makeGpt(), conversationId: 'conv-b', onConversationSaved})
      await pending

      expect(stream.signal?.aborted).toBe(true)
      await waitFor(() => {
        expect(env.saveConversation).toHaveBeenCalledTimes(1)
      })
      const saved = savedConversation(0)
      expect(saved.id).toBe('conv-a')
      expect(saved.messages.map(message => message.content)).toEqual(['earlier q', 'earlier a', 'ask', 'partial'])
      expect(saved.messages.at(-1)?.metadata?.stopped).toBe(true)
      // Stored fields set elsewhere survive the autosave.
      expect(saved).toMatchObject({isPinned: true, tags: ['keep'], title: 'Saved conv-a'})

      await waitFor(() => {
        expect(hook.result.current.messages.map(message => message.content)).toEqual(['b question'])
      })
      expect(hook.result.current.conversationId).toBe('conv-b')
      expect(hook.result.current.isStreaming).toBe(false)
      expect(env.stored.get('conv-b')?.messages).toHaveLength(1)
      // The page only hears about saves of the conversation still on screen.
      expect(onConversationSaved).not.toHaveBeenCalled()
    })

    it('saves into the original conversation when the route returns to a new chat', async () => {
      const onConversationSaved = await openConversationA()
      const pending = startSend(hook, 'ask')
      await emit(streamAt('openai', 0), 'partial', 'partial')

      hook.rerender({gpt: makeGpt(), conversationId: undefined, onConversationSaved})
      await pending

      await waitFor(() => {
        expect(env.saveConversation).toHaveBeenCalledTimes(1)
      })
      expect(savedConversation(0).id).toBe('conv-a')
      expect(hook.result.current.messages).toEqual([])
      expect(hook.result.current.conversationId).toBeUndefined()
      expect(hook.result.current.conversationTitle).toBe('New Chat')
    })

    it('starting a new chat with reset() stops and saves into the conversation it started in', async () => {
      hook = setup()
      const pending = startSend(hook, 'ask')
      await emit(streamAt('openai', 0), 'partial', 'partial')
      const startedIn = hook.result.current.conversationId

      act(() => {
        hook.result.current.reset()
      })
      await pending

      expect(hook.result.current.messages).toEqual([])
      expect(hook.result.current.conversationId).toBeUndefined()
      await waitFor(() => {
        expect(env.saveConversation).toHaveBeenCalledTimes(1)
      })
      expect(savedConversation(0)).toMatchObject({id: startedIn})
      expect(savedMessages().at(-1)).toMatchObject({content: 'partial', metadata: {stopped: true}})

      // The next chat gets its own conversation id.
      const next = startSend(hook, 'fresh')
      await finish(streamAt('openai', 1), next)
      expect(hook.result.current.conversationId).not.toBe(startedIn)
    })

    it('stops and saves on unmount', async () => {
      hook = setup()
      const pending = startSend(hook, 'ask')
      const stream = streamAt('openai', 0)
      await emit(stream, 'partial', 'partial')

      hook.unmount()
      await pending

      expect(stream.signal?.aborted).toBe(true)
      await waitFor(() => {
        expect(env.saveConversation).toHaveBeenCalledTimes(1)
      })
      expect(savedMessages().at(-1)).toMatchObject({content: 'partial', metadata: {stopped: true}})
    })
  })

  describe('loading a saved conversation', () => {
    it('shows saved messages (including old ones without metadata) and continues with their history', async () => {
      env.stored.set(
        'conv-a',
        makeConversation('conv-a', [makeMessage('user', 'old q'), makeMessage('assistant', 'old a')]),
      )
      hook = setup({conversationId: 'conv-a'})
      expect(hook.result.current.isLoadingConversation).toBe(true)

      await startSend(hook, 'ignored while loading')
      expect(env.providers.openai.streams).toHaveLength(0)

      await waitFor(() => {
        expect(hook.result.current.isLoadingConversation).toBe(false)
      })
      expect(hook.result.current.conversationTitle).toBe('Saved conv-a')

      const pending = startSend(hook, 'next')
      expect(env.providers.openai.requests[0]?.messages).toEqual([
        {role: 'user', content: 'old q'},
        {role: 'assistant', content: 'old a'},
        {role: 'user', content: 'next'},
      ])
      await finish(streamAt('openai', 0), pending)
      expect(savedConversation(0)).toMatchObject({id: 'conv-a', title: 'Saved conv-a'})
    })
  })

  describe('regenerate', () => {
    it('replaces the last reply without duplicating it, and the request ends at the last user message', async () => {
      await chatWithOneReply()
      const [, firstReply] = hook.result.current.messages

      let pending!: Promise<void>
      act(() => {
        pending = hook.result.current.regenerate()
      })
      expect(env.providers.openai.requests[1]?.messages).toEqual([{role: 'user', content: 'one'}])
      expect(hook.result.current.messages.map(message => message.role)).toEqual(['user', 'assistant'])
      expect(lastMessage(hook).id).not.toBe(firstReply?.id)
      expect(lastMessage(hook).content).toBe('')

      await emit(streamAt('openai', 1), 'second reply', 'second reply')
      await finish(streamAt('openai', 1), pending)

      expect(hook.result.current.messages.map(message => message.content)).toEqual(['one', 'second reply'])
      expect(savedMessages().map(message => message.content)).toEqual(['one', 'second reply'])
    })

    it('is a no-op while a reply is streaming', async () => {
      hook = setup()
      const pending = startSend(hook, 'one')
      await act(async () => {
        await hook.result.current.regenerate()
      })
      expect(env.providers.openai.streams).toHaveLength(1)
      await finish(streamAt('openai', 0), pending)
    })

    it('is a no-op when the last message is not an assistant reply', async () => {
      hook = setup()
      await act(async () => {
        await hook.result.current.regenerate()
      })
      expect(env.providers.openai.streams).toHaveLength(0)

      // A failed turn ends on the user message: that is retry's job.
      const failed = startSend(hook, 'one')
      streamAt('openai', 0).fail(new ProviderError('boom', 'server', 'openai'))
      await failed
      await act(async () => {
        await hook.result.current.regenerate()
      })
      expect(env.providers.openai.streams).toHaveLength(1)
    })

    it('stopping during a regenerate keeps its partial text and the history intact', async () => {
      await chatWithOneReply()
      let pending!: Promise<void>
      act(() => {
        pending = hook.result.current.regenerate()
      })
      await emit(streamAt('openai', 1), 'partial', 'partial')

      act(() => {
        hook.result.current.stop()
      })
      await pending

      expect(streamAt('openai', 1).signal?.aborted).toBe(true)
      expect(hook.result.current.messages.map(message => message.content)).toEqual(['one', 'partial'])
      expect(lastMessage(hook).metadata?.stopped).toBe(true)
      await waitFor(() => {
        expect(env.saveConversation).toHaveBeenCalledTimes(2)
      })
      expect(savedMessages().map(message => message.content)).toEqual(['one', 'partial'])
    })
  })

  describe('failure and retry', () => {
    it('keeps the user message, records the error against that turn and drops the partial reply', async () => {
      const userMessage = await failFirstTurn()

      expect(hook.result.current.messages).toEqual([userMessage])
      expect(hook.result.current.isStreaming).toBe(false)
      expect(hook.result.current.turnErrors).toEqual({[userMessage.id]: {message: 'Rate limited', type: 'rate_limit'}})
      expect(env.saveConversation).not.toHaveBeenCalled()
    })

    it('records unexpected errors as unknown', async () => {
      hook = setup()
      const pending = startSend(hook, 'one')
      await act(async () => {
        streamAt('openai', 0).fail(new TypeError('network down'))
        await pending
      })
      const [userMessage] = hook.result.current.messages
      expect(hook.result.current.turnErrors[userMessage?.id ?? '']).toEqual({message: 'network down', type: 'unknown'})
    })

    it('retry resends that turn, and success clears the error and saves', async () => {
      const userMessage = await failFirstTurn()

      let pending!: Promise<void>
      act(() => {
        pending = hook.result.current.retry(userMessage.id)
      })
      expect(env.providers.openai.requests[1]?.messages).toEqual([{role: 'user', content: 'one'}])
      expect(messageAt(0).id).toBe(userMessage.id)

      await emit(streamAt('openai', 1), 'worked', 'worked')
      await finish(streamAt('openai', 1), pending)

      expect(hook.result.current.turnErrors).toEqual({})
      expect(hook.result.current.messages.map(message => message.content)).toEqual(['one', 'worked'])
      expect(savedMessages().map(message => message.content)).toEqual(['one', 'worked'])
    })

    it('records the error again when the retry fails too', async () => {
      const userMessage = await failFirstTurn()
      let pending!: Promise<void>
      act(() => {
        pending = hook.result.current.retry(userMessage.id)
      })
      await act(async () => {
        streamAt('openai', 1).fail(new ProviderError('Still down', 'server', 'openai', 500))
        await pending
      })

      expect(hook.result.current.turnErrors).toEqual({[userMessage.id]: {message: 'Still down', type: 'server'}})
      expect(hook.result.current.messages).toEqual([userMessage])
    })

    it('ignores retry for a turn without an error and for turns that are no longer last', async () => {
      const userMessage = await failFirstTurn()

      await act(async () => {
        await hook.result.current.retry('not-a-turn')
      })
      expect(env.providers.openai.streams).toHaveLength(1)

      // The user moves on instead of retrying: the old turn's error is superseded.
      const next = startSend(hook, 'two')
      expect(hook.result.current.turnErrors).toEqual({})
      await finish(streamAt('openai', 1), next)
      await act(async () => {
        await hook.result.current.retry(userMessage.id)
      })
      expect(env.providers.openai.streams).toHaveLength(2)
    })

    it('stopping a retry in flight keeps its partial text', async () => {
      const userMessage = await failFirstTurn()
      let pending!: Promise<void>
      act(() => {
        pending = hook.result.current.retry(userMessage.id)
      })
      await emit(streamAt('openai', 1), 'half', 'half')
      act(() => {
        hook.result.current.stop()
      })
      await pending

      expect(hook.result.current.messages.map(message => message.content)).toEqual(['one', 'half'])
      expect(hook.result.current.turnErrors).toEqual({})
    })
  })

  describe('initial prompt', () => {
    it('waits for providers to load, then sends exactly once', async () => {
      env.providersLoading = true
      const onInitialPromptSent = vi.fn()
      hook = setup({initialPrompt: 'from navigation', onInitialPromptSent})

      await act(async () => {
        await Promise.resolve()
      })
      expect(env.providers.openai.streams).toHaveLength(0)
      expect(onInitialPromptSent).not.toHaveBeenCalled()

      env.providersLoading = false
      hook.rerender({gpt: makeGpt(), conversationId: undefined, initialPrompt: 'from navigation', onInitialPromptSent})
      await waitFor(() => {
        expect(env.providers.openai.streams).toHaveLength(1)
      })
      expect(env.providers.openai.requests[0]?.messages).toEqual([{role: 'user', content: 'from navigation'}])

      // Re-renders, and the reply finishing, must not send it again.
      await finish(streamAt('openai', 0), Promise.resolve())
      hook.rerender({gpt: makeGpt(), conversationId: undefined, initialPrompt: 'from navigation', onInitialPromptSent})
      await act(async () => {
        await Promise.resolve()
      })
      expect(env.providers.openai.streams).toHaveLength(1)
      expect(onInitialPromptSent).toHaveBeenCalledTimes(1)
    })

    it('does not send it for a provider that is not configured', async () => {
      env.configured.clear()
      hook = setup({initialPrompt: 'from navigation'})
      await act(async () => {
        await Promise.resolve()
      })
      expect(hook.result.current.status).toBe('not-configured')
      for (const provider of Object.values(env.providers)) expect(provider.streams).toHaveLength(0)
    })
  })
})
