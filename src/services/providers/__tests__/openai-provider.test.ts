import type {CompletionChunk, CompletionRequest} from '@/types/provider'
import {ProviderError} from '@/types/provider'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {getOpenAIProvider, isReasoningModel, OpenAIProvider, resetOpenAIProviderForTesting} from '../openai-provider'

const RESPONSE_ID = 'resp_test'
const MESSAGE_ID = 'msg_test'

const REASONING_ITEM = {
  type: 'reasoning',
  id: 'rs_test',
  summary: [],
  encrypted_content: 'encrypted-blob',
}

const USAGE = {
  input_tokens: 12,
  input_tokens_details: {cached_tokens: 0},
  output_tokens: 7,
  output_tokens_details: {reasoning_tokens: 0},
  total_tokens: 19,
}

interface RecordedRequest {
  url: string
  headers: Headers
  body: Record<string, unknown>
}

function sse(type: string, data: Record<string, unknown>, sequence: number): string {
  return `event: ${type}\ndata: ${JSON.stringify({type, sequence_number: sequence, ...data})}\n\n`
}

function responseObject(
  overrides: Record<string, unknown> = {},
  output: unknown[] = [],
  model = 'gpt-4o',
): Record<string, unknown> {
  return {
    id: RESPONSE_ID,
    object: 'response',
    created_at: 0,
    status: 'in_progress',
    model,
    output,
    output_text: '',
    error: null,
    incomplete_details: null,
    instructions: null,
    metadata: null,
    parallel_tool_calls: false,
    temperature: null,
    tool_choice: 'auto',
    tools: [],
    top_p: null,
    ...overrides,
  }
}

function messageItem(text: string, status: 'in_progress' | 'completed' = 'completed'): Record<string, unknown> {
  return {
    type: 'message',
    id: MESSAGE_ID,
    role: 'assistant',
    status,
    content: status === 'completed' ? [{type: 'output_text', text, annotations: []}] : [],
  }
}

interface TextStreamOptions {
  /** Extra output items (for example reasoning) that precede the message in the completed response. */
  leadingOutput?: unknown[]
  model?: string
  /** Replaces the terminal `response.completed` event. */
  terminal?: string
}

/** Well-formed Responses SSE frames for one assistant message streamed as the given deltas. */
function textStreamEvents(deltas: string[], options: TextStreamOptions = {}): string[] {
  const {leadingOutput = [], model = 'gpt-4o'} = options
  const text = deltas.join('')
  const outputIndex = leadingOutput.length
  let sequence = 0
  const next = () => sequence++

  const events = [
    sse('response.created', {response: responseObject({}, [], model)}, next()),
    ...leadingOutput.flatMap((item, index) => [
      sse('response.output_item.added', {output_index: index, item}, next()),
      sse('response.output_item.done', {output_index: index, item}, next()),
    ]),
    sse('response.output_item.added', {output_index: outputIndex, item: messageItem('', 'in_progress')}, next()),
    sse(
      'response.content_part.added',
      {
        item_id: MESSAGE_ID,
        output_index: outputIndex,
        content_index: 0,
        part: {type: 'output_text', text: '', annotations: []},
      },
      next(),
    ),
    ...deltas.map(delta =>
      sse(
        'response.output_text.delta',
        {item_id: MESSAGE_ID, output_index: outputIndex, content_index: 0, delta, logprobs: []},
        next(),
      ),
    ),
    sse(
      'response.output_text.done',
      {item_id: MESSAGE_ID, output_index: outputIndex, content_index: 0, text, logprobs: []},
      next(),
    ),
    sse('response.output_item.done', {output_index: outputIndex, item: messageItem(text)}, next()),
  ]

  events.push(
    options.terminal ??
      sse(
        'response.completed',
        {
          response: responseObject(
            {status: 'completed', usage: USAGE, output_text: text},
            [...leadingOutput, messageItem(text)],
            model,
          ),
        },
        next(),
      ),
  )

  return events
}

function streamResponse(events: string[], options: {stall?: boolean; signal?: AbortSignal | null} = {}): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(event))
      }
      if (!options.stall) {
        controller.close()
        return
      }
      // Like a real fetch body, a stalled stream errors once the request is aborted.
      options.signal?.addEventListener(
        'abort',
        () => controller.error(new DOMException('The operation was aborted.', 'AbortError')),
        {once: true},
      )
    },
  })

  return new Response(stream, {status: 200, headers: {'Content-Type': 'text/event-stream'}})
}

function errorResponse(status: number, message: string, code: string | null = null): Response {
  return new Response(JSON.stringify({error: {message, type: 'invalid_request_error', param: null, code}}), {
    status,
    // Stops the SDK's built-in retry/backoff so error tests stay fast.
    headers: {'Content-Type': 'application/json', 'x-should-retry': 'false'},
  })
}

/** Replaces `fetch`, records each request the SDK makes, and answers with the given response factory. */
function mockFetch(respond: (init: RequestInit | undefined) => Response | Promise<Response>) {
  const requests: RecordedRequest[] = []
  const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    requests.push({
      url: input instanceof Request ? input.url : String(input),
      headers: new Headers(init?.headers),
      body: typeof init?.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : {},
    })
    return respond(init)
  })
  return {requests, spy}
}

async function collectChunks(generator: AsyncIterable<CompletionChunk>): Promise<CompletionChunk[]> {
  const chunks: CompletionChunk[] = []
  for await (const chunk of generator) {
    chunks.push(chunk)
  }
  return chunks
}

async function thrownBy(generator: AsyncIterable<CompletionChunk>): Promise<unknown> {
  try {
    for await (const chunk of generator) {
      expect(chunk).toBeDefined()
    }
  } catch (error_) {
    return error_
  }
  throw new Error('Expected generator to throw')
}

function createProvider(): OpenAIProvider {
  const provider = new OpenAIProvider()
  provider.setApiKey('sk-test-key')
  return provider
}

function request(overrides: Partial<CompletionRequest> = {}): CompletionRequest {
  return {
    model: 'gpt-4o',
    messages: [{role: 'user', content: 'Hello'}],
    stream: true,
    ...overrides,
  }
}

describe('OpenAIProvider', () => {
  beforeEach(() => {
    resetOpenAIProviderForTesting()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('metadata and key handling', () => {
    it('has correct provider metadata', () => {
      const provider = new OpenAIProvider()

      expect(provider.id).toBe('openai')
      expect(provider.name).toBe('OpenAI')
      expect(provider.apiKeyRequired).toBe(true)
      expect(provider.isConfigured).toBe(false)
      expect(provider.isEnabled).toBe(true)
    })

    it('tracks configuration as the API key is set and cleared', () => {
      const provider = new OpenAIProvider()

      provider.setApiKey('sk-test-key')
      expect(provider.isConfigured).toBe(true)

      provider.clearApiKey()
      expect(provider.isConfigured).toBe(false)
    })

    it('returns the same instance from getOpenAIProvider until reset', () => {
      const first = getOpenAIProvider()

      expect(getOpenAIProvider()).toBe(first)

      resetOpenAIProviderForTesting()
      expect(getOpenAIProvider()).not.toBe(first)
    })

    it('rejects a completion without an API key as an authentication error', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch')

      const error = await thrownBy(new OpenAIProvider().createCompletion(request()))

      expect(error).toBeInstanceOf(ProviderError)
      expect((error as ProviderError).type).toBe('authentication')
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('lists the static model set once a key is set', async () => {
      const models = await createProvider().listModels()

      expect(models.map(m => m.id)).toContain('gpt-4o')
    })
  })

  describe('validateCredentials', () => {
    it('is valid when the models endpoint answers', async () => {
      mockFetch(
        () =>
          new Response(JSON.stringify({object: 'list', data: []}), {
            status: 200,
            headers: {'Content-Type': 'application/json'},
          }),
      )

      const result = await new OpenAIProvider().validateCredentials('sk-good')

      expect(result.valid).toBe(true)
      expect(result.models?.length).toBeGreaterThan(0)
    })

    it('reports an invalid key on 401', async () => {
      mockFetch(() => errorResponse(401, 'Incorrect API key provided', 'invalid_api_key'))

      const result = await new OpenAIProvider().validateCredentials('sk-bad')

      expect(result).toEqual({valid: false, error: 'Invalid API key'})
    })
  })

  describe('isReasoningModel', () => {
    it.each(['o1', 'o3', 'o3-mini', 'o4-mini', 'gpt-5', 'gpt-5.1', 'gpt-5-mini', 'GPT-5-nano'])(
      'treats %s as a reasoning model',
      model => {
        expect(isReasoningModel(model)).toBe(true)
      },
    )

    it.each(['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo', 'gpt-5-chat-latest', 'omni-moderation'])(
      'treats %s as a non-reasoning model',
      model => {
        expect(isReasoningModel(model)).toBe(false)
      },
    )
  })

  describe('createCompletion (streaming)', () => {
    it('sends the full history with instructions and store: false to /v1/responses', async () => {
      const {requests} = mockFetch(() => streamResponse(textStreamEvents(['Hi'])))

      await collectChunks(
        createProvider().createCompletion(
          request({
            instructions: 'Be terse.',
            messages: [
              {role: 'user', content: 'First question'},
              {role: 'assistant', content: 'First answer'},
              {role: 'user', content: 'Second question'},
            ],
            maxTokens: 256,
            temperature: 0.4,
          }),
        ),
      )

      expect(requests).toHaveLength(1)
      const [sent] = requests
      expect(sent?.url).toMatch(/\/v1\/responses$/)
      expect(sent?.headers.get('authorization')).toBe('Bearer sk-test-key')
      expect(sent?.body).toMatchObject({
        model: 'gpt-4o',
        instructions: 'Be terse.',
        store: false,
        stream: true,
        max_output_tokens: 256,
        temperature: 0.4,
        input: [
          {role: 'user', content: 'First question'},
          {role: 'assistant', content: 'First answer'},
          {role: 'user', content: 'Second question'},
        ],
      })
      expect(sent?.body).not.toHaveProperty('include')
      expect(sent?.body).not.toHaveProperty('tools')
    })

    it('emits text deltas as content chunks in order, then a final chunk with finishReason and usage', async () => {
      mockFetch(() => streamResponse(textStreamEvents(['Hel', 'lo', ' world'])))

      const chunks = await collectChunks(createProvider().createCompletion(request()))

      const contentChunks = chunks.filter(chunk => chunk.content !== undefined)
      expect(contentChunks.map(chunk => chunk.content)).toEqual(['Hel', 'lo', ' world'])
      expect(contentChunks.every(chunk => chunk.finishReason === undefined)).toBe(true)

      const final = chunks.at(-1)
      expect(final).toEqual({id: RESPONSE_ID, finishReason: 'stop', usage: {promptTokens: 12, completionTokens: 7}})
      expect(chunks.filter(chunk => chunk.finishReason !== undefined)).toHaveLength(1)
    })

    it('sends system messages in history as in-place system input items, separate from instructions', async () => {
      const {requests} = mockFetch(() => streamResponse(textStreamEvents(['ok'])))

      await collectChunks(
        createProvider().createCompletion(
          request({
            instructions: 'Top-level guidance',
            messages: [
              {role: 'system', content: 'Earlier system note'},
              {role: 'user', content: 'Hello'},
            ],
          }),
        ),
      )

      expect(requests[0]?.body.instructions).toBe('Top-level guidance')
      expect(requests[0]?.body.input).toEqual([
        {role: 'system', content: 'Earlier system note'},
        {role: 'user', content: 'Hello'},
      ])
    })

    it('omits instructions when none are given', async () => {
      const {requests} = mockFetch(() => streamResponse(textStreamEvents(['ok'])))

      await collectChunks(createProvider().createCompletion(request()))

      expect(requests[0]?.body).not.toHaveProperty('instructions')
      expect(requests[0]?.body.store).toBe(false)
    })

    it('rejects an empty history before making a request', async () => {
      const {spy} = mockFetch(() => streamResponse(textStreamEvents(['ok'])))

      const error = await thrownBy(createProvider().createCompletion(request({messages: []})))

      expect(error).toBeInstanceOf(ProviderError)
      expect((error as ProviderError).type).toBe('validation')
      expect(spy).not.toHaveBeenCalled()
    })

    it('rejects tool-role messages instead of dropping them', async () => {
      const {spy} = mockFetch(() => streamResponse(textStreamEvents(['ok'])))

      const error = await thrownBy(
        createProvider().createCompletion(
          request({
            messages: [
              {role: 'user', content: 'Hello'},
              {role: 'tool', content: '{}', toolCallId: 'call_1'},
            ],
          }),
        ),
      )

      expect((error as ProviderError).type).toBe('validation')
      expect(spy).not.toHaveBeenCalled()
    })

    it('reports a length finish reason when the response is incomplete for max_output_tokens', async () => {
      const terminal = sse(
        'response.incomplete',
        {
          response: responseObject(
            {status: 'incomplete', incomplete_details: {reason: 'max_output_tokens'}, usage: USAGE},
            [messageItem('Hi')],
          ),
        },
        99,
      )
      mockFetch(() => streamResponse(textStreamEvents(['Hi'], {terminal})))

      const chunks = await collectChunks(createProvider().createCompletion(request()))

      expect(chunks.at(-1)?.finishReason).toBe('length')
    })
  })

  describe('reasoning models', () => {
    const gpt5Request = (overrides: Partial<CompletionRequest> = {}) => request({model: 'gpt-5', ...overrides})

    it('requests encrypted reasoning and omits temperature for a reasoning model', async () => {
      const {requests} = mockFetch(() => streamResponse(textStreamEvents(['ok'], {model: 'gpt-5'})))

      await collectChunks(createProvider().createCompletion(gpt5Request({temperature: 0.7})))

      expect(requests[0]?.body.include).toEqual(['reasoning.encrypted_content'])
      expect(requests[0]?.body.store).toBe(false)
      expect(requests[0]?.body).not.toHaveProperty('temperature')
    })

    it('sends earlier replay items back immediately before the assistant message they belong to', async () => {
      const earlierReasoning = {type: 'reasoning', id: 'rs_earlier', summary: [], encrypted_content: 'earlier-blob'}
      const {requests} = mockFetch(() => streamResponse(textStreamEvents(['ok'], {model: 'gpt-5'})))

      await collectChunks(
        createProvider().createCompletion(
          gpt5Request({
            messages: [
              {role: 'user', content: 'Q1'},
              {role: 'assistant', content: 'A1', replay: {openai: [earlierReasoning]}},
              {role: 'user', content: 'Q2'},
              {role: 'assistant', content: 'A2 without replay'},
              {role: 'user', content: 'Q3'},
            ],
          }),
        ),
      )

      expect(requests[0]?.body.input).toEqual([
        {role: 'user', content: 'Q1'},
        earlierReasoning,
        {role: 'assistant', content: 'A1'},
        {role: 'user', content: 'Q2'},
        {role: 'assistant', content: 'A2 without replay'},
        {role: 'user', content: 'Q3'},
      ])
    })

    it('returns the reasoning items of the completed response as replay.openai on the final chunk', async () => {
      mockFetch(() => streamResponse(textStreamEvents(['Hi'], {model: 'gpt-5', leadingOutput: [REASONING_ITEM]})))

      const chunks = await collectChunks(createProvider().createCompletion(gpt5Request()))

      const final = chunks.at(-1)
      expect(final?.finishReason).toBe('stop')
      expect(final?.replay).toEqual({openai: [REASONING_ITEM]})
      expect(chunks.slice(0, -1).every(chunk => chunk.replay === undefined)).toBe(true)
    })

    it('leaves replay off the final chunk when the response has no reasoning items', async () => {
      mockFetch(() => streamResponse(textStreamEvents(['Hi'], {model: 'gpt-5'})))

      const chunks = await collectChunks(createProvider().createCompletion(gpt5Request()))

      expect(chunks.at(-1)).not.toHaveProperty('replay')
    })

    it('ignores reasoning items that carry no encrypted content', async () => {
      const bare = {type: 'reasoning', id: 'rs_bare', summary: []}
      mockFetch(() => streamResponse(textStreamEvents(['Hi'], {model: 'gpt-5', leadingOutput: [bare]})))

      const chunks = await collectChunks(createProvider().createCompletion(gpt5Request()))

      expect(chunks.at(-1)).not.toHaveProperty('replay')
    })

    it('sends no include, no replay items and keeps temperature for a non-reasoning model', async () => {
      const {requests} = mockFetch(() => streamResponse(textStreamEvents(['ok'])))

      const chunks = await collectChunks(
        createProvider().createCompletion(
          request({
            model: 'gpt-4o',
            temperature: 0.7,
            messages: [
              {role: 'user', content: 'Q1'},
              {role: 'assistant', content: 'A1', replay: {openai: [REASONING_ITEM]}},
              {role: 'user', content: 'Q2'},
            ],
          }),
        ),
      )

      expect(requests[0]?.body).not.toHaveProperty('include')
      expect(requests[0]?.body.temperature).toBe(0.7)
      expect(requests[0]?.body.input).toEqual([
        {role: 'user', content: 'Q1'},
        {role: 'assistant', content: 'A1'},
        {role: 'user', content: 'Q2'},
      ])
      expect(chunks.at(-1)).not.toHaveProperty('replay')
    })

    it('drops replay data that is not a list of typed items instead of sending it', async () => {
      const {requests} = mockFetch(() => streamResponse(textStreamEvents(['ok'], {model: 'gpt-5'})))

      await collectChunks(
        createProvider().createCompletion(
          gpt5Request({
            messages: [
              {role: 'user', content: 'Q1'},
              {role: 'assistant', content: 'A1', replay: {openai: {nope: true}}},
              {role: 'user', content: 'Q2'},
            ],
          }),
        ),
      )

      expect(requests[0]?.body.input).toEqual([
        {role: 'user', content: 'Q1'},
        {role: 'assistant', content: 'A1'},
        {role: 'user', content: 'Q2'},
      ])
    })

    it('ignores replay data that belongs to another provider', async () => {
      const {requests} = mockFetch(() => streamResponse(textStreamEvents(['ok'], {model: 'gpt-5'})))

      await collectChunks(
        createProvider().createCompletion(
          gpt5Request({
            messages: [
              {role: 'user', content: 'Q1'},
              {role: 'assistant', content: 'A1', replay: {anthropic: [REASONING_ITEM]}},
              {role: 'user', content: 'Q2'},
            ],
          }),
        ),
      )

      expect(requests[0]?.body.input).toEqual([
        {role: 'user', content: 'Q1'},
        {role: 'assistant', content: 'A1'},
        {role: 'user', content: 'Q2'},
      ])
    })
  })

  describe('error mapping', () => {
    it.each([
      [401, 'authentication', 'Incorrect API key provided'],
      [403, 'permission', 'Forbidden'],
      [404, 'not_found', 'The model does not exist'],
      [429, 'rate_limit', 'Rate limit reached'],
      [500, 'server', 'The server had an error'],
      [503, 'server', 'Service unavailable'],
      [400, 'validation', 'Unsupported parameter'],
    ])('maps HTTP %i to a %s ProviderError', async (status, type, message) => {
      mockFetch(() => errorResponse(status, message))

      const error = await thrownBy(createProvider().createCompletion(request()))

      expect(error).toBeInstanceOf(ProviderError)
      expect(error).toMatchObject({type, provider: 'openai', statusCode: status})
      expect((error as ProviderError).message).toContain(message)
    })

    it('maps a network failure to a connection ProviderError', async () => {
      mockFetch(() => {
        throw new TypeError('fetch failed')
      })

      const error = await thrownBy(createProvider().createCompletion(request()))

      expect(error).toBeInstanceOf(ProviderError)
      expect((error as ProviderError).type).toBe('connection')
      // The SDK retries connection failures with backoff before giving up.
    }, 15_000)

    it('turns a response.failed event into a ProviderError', async () => {
      const failed = sse(
        'response.failed',
        {
          response: responseObject({status: 'failed', error: {code: 'server_error', message: 'The model crashed'}}),
        },
        1,
      )
      mockFetch(() => streamResponse([sse('response.created', {response: responseObject()}, 0), failed]))

      const chunks: CompletionChunk[] = []
      const error = await thrownBy(
        (async function* () {
          for await (const chunk of createProvider().createCompletion(request())) {
            chunks.push(chunk)
            yield chunk
          }
        })(),
      )

      expect(error).toBeInstanceOf(ProviderError)
      expect(error).toMatchObject({type: 'server', provider: 'openai', message: 'The model crashed'})
      expect(chunks.some(chunk => chunk.finishReason === 'stop')).toBe(false)
    })

    it('turns a mid-stream error event into a ProviderError and stops', async () => {
      const errorEvent = sse('error', {code: 'rate_limit_exceeded', message: 'Slow down', param: null}, 3)
      mockFetch(() => streamResponse([...textStreamEvents(['Part']).slice(0, 4), errorEvent]))

      const received: CompletionChunk[] = []
      const error = await thrownBy(
        (async function* () {
          for await (const chunk of createProvider().createCompletion(request())) {
            received.push(chunk)
            yield chunk
          }
        })(),
      )

      expect(error).toBeInstanceOf(ProviderError)
      expect(error).toMatchObject({type: 'rate_limit', message: 'Slow down'})
      expect(received.map(chunk => chunk.content)).toEqual(['Part'])
    })
  })

  describe('abort', () => {
    it('ends with an AbortError and no final chunk when aborted mid-stream', async () => {
      const controller = new AbortController()
      mockFetch(init => streamResponse(textStreamEvents(['Hello']).slice(0, 4), {stall: true, signal: init?.signal}))
      const received: CompletionChunk[] = []

      const error = await thrownBy(
        (async function* () {
          for await (const chunk of createProvider().createCompletion(request({signal: controller.signal}))) {
            received.push(chunk)
            if (chunk.content) controller.abort()
            yield chunk
          }
        })(),
      )

      expect(error).toBeInstanceOf(Error)
      expect((error as Error).name).toBe('AbortError')
      expect(error).not.toBeInstanceOf(ProviderError)
      expect(received.map(chunk => chunk.content)).toEqual(['Hello'])
      expect(received.some(chunk => chunk.finishReason !== undefined)).toBe(false)
    })

    it('does not deliver already-buffered events after the signal aborts', async () => {
      const controller = new AbortController()
      mockFetch(() => streamResponse(textStreamEvents(['A', 'B', 'C'])))
      const received: CompletionChunk[] = []

      const error = await thrownBy(
        (async function* () {
          for await (const chunk of createProvider().createCompletion(request({signal: controller.signal}))) {
            received.push(chunk)
            if (chunk.content === 'A') controller.abort()
            yield chunk
          }
        })(),
      )

      expect((error as Error).name).toBe('AbortError')
      expect(received.map(chunk => chunk.content)).toEqual(['A'])
    })

    it('throws an AbortError without making a request when the signal is already aborted', async () => {
      const {spy} = mockFetch(() => streamResponse(textStreamEvents(['ok'])))
      const controller = new AbortController()
      controller.abort()

      const error = await thrownBy(createProvider().createCompletion(request({signal: controller.signal})))

      expect((error as Error).name).toBe('AbortError')
      expect(spy).not.toHaveBeenCalled()
    })

    it('aborts the underlying fetch when the caller aborts', async () => {
      const controller = new AbortController()
      let fetchSignal: AbortSignal | null | undefined
      mockFetch(init => {
        fetchSignal = init?.signal
        return streamResponse(textStreamEvents(['Hello']).slice(0, 4), {stall: true, signal: init?.signal})
      })

      await thrownBy(
        (async function* () {
          for await (const chunk of createProvider().createCompletion(request({signal: controller.signal}))) {
            if (chunk.content) controller.abort()
            yield chunk
          }
        })(),
      )

      expect(fetchSignal?.aborted).toBe(true)
    })

    it('surfaces a fetch that rejects after the abort as an AbortError, not a ProviderError', async () => {
      const controller = new AbortController()
      mockFetch(() => {
        controller.abort('user stopped')
        throw new Error('fetch failed after abort')
      })

      // Defer the abort until the request is in flight by aborting inside fetch itself.
      const error = await thrownBy(createProvider().createCompletion(request({signal: controller.signal})))

      expect((error as Error).name).toBe('AbortError')
      expect(error).not.toBeInstanceOf(ProviderError)
    })

    it('still wraps non-abort failures in a ProviderError when a signal is supplied', async () => {
      mockFetch(() => errorResponse(401, 'Incorrect API key provided'))

      const error = await thrownBy(createProvider().createCompletion(request({signal: new AbortController().signal})))

      expect(error).toBeInstanceOf(ProviderError)
      expect((error as ProviderError).type).toBe('authentication')
    })
  })

  describe('createCompletion (non-streaming)', () => {
    it('uses a non-streaming Responses call and returns one chunk with content, usage and replay', async () => {
      const {requests} = mockFetch(
        () =>
          new Response(
            JSON.stringify(
              responseObject({status: 'completed', usage: USAGE, output_text: 'Full reply'}, [
                REASONING_ITEM,
                messageItem('Full reply'),
              ]),
            ),
            {status: 200, headers: {'Content-Type': 'application/json'}},
          ),
      )

      const chunks = await collectChunks(
        createProvider().createCompletion(request({model: 'gpt-5', instructions: 'Be terse.', stream: false})),
      )

      expect(requests[0]?.url).toMatch(/\/v1\/responses$/)
      expect(requests[0]?.body).toMatchObject({
        model: 'gpt-5',
        instructions: 'Be terse.',
        store: false,
        include: ['reasoning.encrypted_content'],
      })
      expect(requests[0]?.body.stream).not.toBe(true)
      expect(chunks).toEqual([
        {
          id: RESPONSE_ID,
          content: 'Full reply',
          finishReason: 'stop',
          usage: {promptTokens: 12, completionTokens: 7},
          replay: {openai: [REASONING_ITEM]},
        },
      ])
    })

    it('maps non-streaming HTTP errors the same way', async () => {
      mockFetch(() => errorResponse(429, 'Rate limit reached'))

      const error = await thrownBy(createProvider().createCompletion(request({stream: false})))

      expect(error).toMatchObject({type: 'rate_limit', statusCode: 429})
    })
  })
})
