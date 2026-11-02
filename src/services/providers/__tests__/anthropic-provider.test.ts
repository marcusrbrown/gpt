import {ProviderError} from '@/types/provider'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {AnthropicProvider, getAnthropicProvider, resetAnthropicProviderForTesting} from '../anthropic-provider'

interface CompletionChunk {
  id: string
  content?: string
  finishReason?: string
  toolCalls?: {id: string; name: string; arguments: string}[]
  usage?: {promptTokens: number; completionTokens: number}
}

const createMockResponse = (body: unknown, status = 200, headers: Record<string, string> = {}) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {'Content-Type': 'application/json', ...headers},
  })
}

const createMockStreamResponse = (events: string[]) => {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(event))
      }
      controller.close()
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {'Content-Type': 'text/event-stream'},
  })
}

/** SSE response that emits the given events and then stays open until the reader is cancelled. */
const createStalledStreamResponse = (events: string[]) => {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(event))
      }
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {'Content-Type': 'text/event-stream'},
  })
}

const MESSAGE_START_EVENT =
  'event: message_start\ndata: {"type":"message_start","message":{"id":"msg_abort","type":"message","role":"assistant","content":[],"model":"claude-sonnet-4-5-20250514","usage":{"input_tokens":10,"output_tokens":0}}}\n\n'
const TEXT_DELTA_EVENT =
  'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}\n\n'

const NON_STREAMING_BODY = {
  id: 'msg_test',
  type: 'message',
  role: 'assistant',
  content: [{type: 'text', text: 'Response'}],
  model: 'claude-sonnet-4-5-20250514',
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: {input_tokens: 10, output_tokens: 5},
}

async function collectChunks(generator: AsyncIterable<CompletionChunk>): Promise<CompletionChunk[]> {
  const chunks: CompletionChunk[] = []
  for await (const chunk of generator) {
    chunks.push(chunk)
  }
  return chunks
}

async function expectGeneratorThrows(
  generator: AsyncIterable<CompletionChunk>,
  errorType?: typeof ProviderError,
): Promise<ProviderError> {
  try {
    for await (const chunk of generator) {
      expect(chunk).toBeDefined()
    }
  } catch (error_) {
    if (errorType) {
      expect(error_).toBeInstanceOf(errorType)
    }
    return error_ as ProviderError
  }
  throw new Error('Expected generator to throw')
}

describe('AnthropicProvider', () => {
  beforeEach(() => {
    resetAnthropicProviderForTesting()
    vi.restoreAllMocks()
  })

  it.each([
    [{error: 'Bad request'}, 'Bad request'],
    [{error: {message: 'Model is invalid'}}, 'Model is invalid'],
    [{error: {details: 'internal'}}, 'Bad Request'],
  ])('extracts a human error message or falls back to status text', async (body, expected) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify(body), {status: 400, statusText: 'Bad Request'})),
    )
    const provider = new AnthropicProvider()
    provider.setApiKey('test')
    const error = await expectGeneratorThrows(
      provider.createCompletion({model: 'claude-test', messages: [{role: 'user', content: 'hi'}], stream: true}),
    )
    expect(error).toMatchObject({type: 'validation', message: expected})
    vi.unstubAllGlobals()
  })

  it('falls back to status text for a malformed error response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('not JSON', {status: 400, statusText: 'Bad Request'})),
    )
    const provider = new AnthropicProvider()
    provider.setApiKey('test')
    const error = await expectGeneratorThrows(
      provider.createCompletion({model: 'claude-test', messages: [{role: 'user', content: 'hi'}], stream: true}),
    )
    expect(error.message).toBe('Bad Request')
    vi.unstubAllGlobals()
  })

  describe('metadata', () => {
    it('has correct provider metadata', () => {
      const provider = new AnthropicProvider()

      expect(provider.id).toBe('anthropic')
      expect(provider.name).toBe('Anthropic')
      expect(provider.apiKeyRequired).toBe(true)
    })

    it('starts unconfigured and enabled', () => {
      const provider = new AnthropicProvider()

      expect(provider.isConfigured).toBe(false)
      expect(provider.isEnabled).toBe(true)
    })

    it('returns correct config', () => {
      const provider = new AnthropicProvider()
      const config = provider.getConfig()

      expect(config.id).toBe('anthropic')
      expect(config.name).toBe('Anthropic')
      expect(config.apiKeyRequired).toBe(true)
      expect(config.isConfigured).toBe(false)
      expect(config.isEnabled).toBe(true)
    })
  })

  describe('singleton', () => {
    it('returns same instance via getAnthropicProvider', () => {
      const provider1 = getAnthropicProvider()
      const provider2 = getAnthropicProvider()

      expect(provider1).toBe(provider2)
    })

    it('resets singleton for testing', () => {
      const provider1 = getAnthropicProvider()
      resetAnthropicProviderForTesting()
      const provider2 = getAnthropicProvider()

      expect(provider1).not.toBe(provider2)
    })
  })

  describe('API key management', () => {
    it('sets API key and marks as configured', () => {
      const provider = new AnthropicProvider()

      provider.setApiKey('test-api-key')

      expect(provider.isConfigured).toBe(true)
    })

    it('clears API key and marks as unconfigured', () => {
      const provider = new AnthropicProvider()
      provider.setApiKey('test-api-key')

      provider.clearApiKey()

      expect(provider.isConfigured).toBe(false)
    })
  })

  describe('validateCredentials', () => {
    it('returns valid result with models on success', async () => {
      const mockResponse = createMockResponse({
        id: 'msg_test',
        type: 'message',
        role: 'assistant',
        content: [{type: 'text', text: 'Hello'}],
        model: 'claude-sonnet-4-5-20250514',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {input_tokens: 10, output_tokens: 5},
      })
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse)

      const provider = new AnthropicProvider()
      const result = await provider.validateCredentials('test-key')

      expect(result.valid).toBe(true)
      expect(result.models).toBeDefined()
      expect(result.models?.length).toBeGreaterThan(0)
    })

    it('returns invalid result on 401 error', async () => {
      const mockResponse = createMockResponse(
        {type: 'error', error: {type: 'authentication_error', message: 'Invalid API key'}},
        401,
      )
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse)

      const provider = new AnthropicProvider()
      const result = await provider.validateCredentials('invalid-key')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid API key')
    })

    it('returns invalid result on network error', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'))

      const provider = new AnthropicProvider()
      const result = await provider.validateCredentials('test-key')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('Network error')
    })
  })

  describe('listModels', () => {
    it('returns available Claude models', async () => {
      const provider = new AnthropicProvider()
      provider.setApiKey('test-key')

      const models = await provider.listModels()

      expect(models.length).toBeGreaterThan(0)
      expect(models.every(m => m.provider === 'anthropic')).toBe(true)

      const modelIds = models.map(m => m.id)
      expect(modelIds).toContain('claude-opus-4-5-20250514')
      expect(modelIds).toContain('claude-sonnet-4-5-20250514')
      expect(modelIds).toContain('claude-haiku-4-5-20250514')
    })

    it('returns models without configuration (static list)', async () => {
      const provider = new AnthropicProvider()

      const models = await provider.listModels()
      expect(models.length).toBeGreaterThan(0)
    })

    it('models have correct capabilities', async () => {
      const provider = new AnthropicProvider()
      provider.setApiKey('test-key')

      const models = await provider.listModels()
      const opus = models.find(m => m.id === 'claude-opus-4-5-20250514')

      expect(opus?.capabilities.supportsVision).toBe(true)
      expect(opus?.capabilities.supportsTools).toBe(true)
      expect(opus?.capabilities.supportsStreaming).toBe(true)
      expect(opus?.capabilities.contextWindow).toBe(200000)
    })
  })

  describe('createCompletion', () => {
    it('throws when not configured', async () => {
      const provider = new AnthropicProvider()

      const generator = provider.createCompletion({
        model: 'claude-sonnet-4-5-20250514',
        messages: [{role: 'user', content: 'Hello'}],
        stream: false,
      })

      const thrownError = await expectGeneratorThrows(generator, ProviderError)
      expect(thrownError.type).toBe('authentication')
    })

    describe('non-streaming', () => {
      it('yields completion chunk from response', async () => {
        const mockResponse = createMockResponse({
          id: 'msg_test123',
          type: 'message',
          role: 'assistant',
          content: [{type: 'text', text: 'Hello, how can I help?'}],
          model: 'claude-sonnet-4-5-20250514',
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: {input_tokens: 10, output_tokens: 20},
        })
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse)

        const provider = new AnthropicProvider()
        provider.setApiKey('test-key')

        const chunks = await collectChunks(
          provider.createCompletion({
            model: 'claude-sonnet-4-5-20250514',
            messages: [{role: 'user', content: 'Hello'}],
            stream: false,
          }),
        )

        expect(chunks).toHaveLength(1)
        expect(chunks[0]).toMatchObject({
          id: 'msg_test123',
          content: 'Hello, how can I help?',
          finishReason: 'stop',
          usage: {promptTokens: 10, completionTokens: 20},
        })
      })

      it('handles tool use response', async () => {
        const mockResponse = createMockResponse({
          id: 'msg_tools',
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: 'tool_123',
              name: 'get_weather',
              input: {location: 'San Francisco'},
            },
          ],
          model: 'claude-sonnet-4-5-20250514',
          stop_reason: 'tool_use',
          stop_sequence: null,
          usage: {input_tokens: 15, output_tokens: 25},
        })
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse)

        const provider = new AnthropicProvider()
        provider.setApiKey('test-key')

        const chunks = await collectChunks(
          provider.createCompletion({
            model: 'claude-sonnet-4-5-20250514',
            messages: [{role: 'user', content: 'What is the weather?'}],
            tools: [{name: 'get_weather', description: 'Get weather', parameters: {type: 'object'}}],
            stream: false,
          }),
        )

        expect(chunks).toHaveLength(1)
        expect(chunks[0]).toMatchObject({
          finishReason: 'tool_calls',
          toolCalls: [{id: 'tool_123', name: 'get_weather', arguments: '{"location":"San Francisco"}'}],
        })
      })
    })

    describe('streaming', () => {
      it('yields chunks from SSE stream', async () => {
        const events = [
          'event: message_start\ndata: {"type":"message_start","message":{"id":"msg_stream","type":"message","role":"assistant","content":[],"model":"claude-sonnet-4-5-20250514","usage":{"input_tokens":10,"output_tokens":0}}}\n\n',
          'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n',
          'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}\n\n',
          'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" world"}}\n\n',
          'event: content_block_stop\ndata: {"type":"content_block_stop","index":0}\n\n',
          'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":5}}\n\n',
          'event: message_stop\ndata: {"type":"message_stop"}\n\n',
        ]
        const mockResponse = createMockStreamResponse(events)
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse)

        const provider = new AnthropicProvider()
        provider.setApiKey('test-key')

        const chunks = await collectChunks(
          provider.createCompletion({
            model: 'claude-sonnet-4-5-20250514',
            messages: [{role: 'user', content: 'Hello'}],
            stream: true,
          }),
        )

        expect(chunks.length).toBeGreaterThan(0)

        const textChunks = chunks.filter(c => c.content)
        expect(textChunks.map(c => c.content).join('')).toBe('Hello world')

        const finalChunk = chunks.at(-1)
        expect(finalChunk?.finishReason).toBe('stop')
      })

      it('handles thinking content in stream', async () => {
        const events = [
          'event: message_start\ndata: {"type":"message_start","message":{"id":"msg_think","type":"message","role":"assistant","content":[],"model":"claude-sonnet-4-5-20250514","usage":{"input_tokens":10,"output_tokens":0}}}\n\n',
          'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"thinking","thinking":""}}\n\n',
          'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"Let me think..."}}\n\n',
          'event: content_block_stop\ndata: {"type":"content_block_stop","index":0}\n\n',
          'event: content_block_start\ndata: {"type":"content_block_start","index":1,"content_block":{"type":"text","text":""}}\n\n',
          'event: content_block_delta\ndata: {"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"Answer"}}\n\n',
          'event: content_block_stop\ndata: {"type":"content_block_stop","index":1}\n\n',
          'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":10}}\n\n',
          'event: message_stop\ndata: {"type":"message_stop"}\n\n',
        ]
        const mockResponse = createMockStreamResponse(events)
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse)

        const provider = new AnthropicProvider()
        provider.setApiKey('test-key')

        const chunks = await collectChunks(
          provider.createCompletion({
            model: 'claude-sonnet-4-5-20250514',
            messages: [{role: 'user', content: 'Think about this'}],
            stream: true,
            providerOptions: {
              anthropic: {extendedThinking: {enabled: true, budgetTokens: 5000}},
            },
          }),
        )

        const thinkingChunks = chunks.filter(c => c.content?.startsWith('[thinking]'))
        expect(thinkingChunks.length).toBeGreaterThan(0)
      })

      it('ends a stream that stops before message_stop with a length finish so the text is flagged cut off', async () => {
        const events = [MESSAGE_START_EVENT, TEXT_DELTA_EVENT]
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(createMockStreamResponse(events))

        const provider = new AnthropicProvider()
        provider.setApiKey('test-key')

        const chunks = await collectChunks(
          provider.createCompletion({
            model: 'claude-sonnet-4-5-20250514',
            messages: [{role: 'user', content: 'Hello'}],
            stream: true,
          }),
        )

        expect(chunks.map(c => c.content ?? '').join('')).toBe('Hello')
        expect(chunks.at(-1)?.finishReason).toBe('length')
        expect(chunks.some(c => c.finishReason === 'stop')).toBe(false)
      })

      it('throws a ProviderError when the stream ends before message_stop with no text', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(createMockStreamResponse([MESSAGE_START_EVENT]))

        const provider = new AnthropicProvider()
        provider.setApiKey('test-key')

        const thrown = await expectGeneratorThrows(
          provider.createCompletion({
            model: 'claude-sonnet-4-5-20250514',
            messages: [{role: 'user', content: 'Hello'}],
            stream: true,
          }),
          ProviderError,
        )

        expect(thrown.provider).toBe('anthropic')
      })
    })

    describe('error handling', () => {
      it('throws ProviderError on API error', async () => {
        const mockResponse = createMockResponse(
          {type: 'error', error: {type: 'invalid_request_error', message: 'Bad request'}},
          400,
        )
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse)

        const provider = new AnthropicProvider()
        provider.setApiKey('test-key')

        const generator = provider.createCompletion({
          model: 'claude-sonnet-4-5-20250514',
          messages: [{role: 'user', content: 'Hello'}],
          stream: false,
        })

        const thrownError = await expectGeneratorThrows(generator, ProviderError)
        expect(thrownError.message).toContain('Bad request')
      })

      it('throws rate limit error on 429', async () => {
        const mockResponse = createMockResponse(
          {type: 'error', error: {type: 'rate_limit_error', message: 'Rate limited'}},
          429,
        )
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse)

        const provider = new AnthropicProvider()
        provider.setApiKey('test-key')

        const generator = provider.createCompletion({
          model: 'claude-sonnet-4-5-20250514',
          messages: [{role: 'user', content: 'Hello'}],
          stream: false,
        })

        const thrownError = await expectGeneratorThrows(generator, ProviderError)
        expect(thrownError.type).toBe('rate_limit')
      })

      it('throws authentication error on 401', async () => {
        const mockResponse = createMockResponse(
          {type: 'error', error: {type: 'authentication_error', message: 'Invalid key'}},
          401,
        )
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse)

        const provider = new AnthropicProvider()
        provider.setApiKey('test-key')

        const generator = provider.createCompletion({
          model: 'claude-sonnet-4-5-20250514',
          messages: [{role: 'user', content: 'Hello'}],
          stream: false,
        })

        const thrownError = await expectGeneratorThrows(generator, ProviderError)
        expect(thrownError.type).toBe('authentication')
      })
    })
  })

  describe('instructions', () => {
    const requestBody = (fetchSpy: ReturnType<typeof vi.spyOn>) =>
      JSON.parse((fetchSpy.mock.calls[0] as [string, RequestInit])[1].body as string) as {
        system?: string
        messages: unknown[]
      }

    it('sends instructions as the system prompt', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(createMockResponse(NON_STREAMING_BODY))
      const provider = new AnthropicProvider()
      provider.setApiKey('test-key')

      await collectChunks(
        provider.createCompletion({
          model: 'claude-sonnet-4-5-20250514',
          instructions: 'Answer in French.',
          messages: [{role: 'user', content: 'Hello'}],
          stream: false,
        }),
      )

      const body = requestBody(fetchSpy)
      expect(body.system).toBe('Answer in French.')
      expect(body.messages).toEqual([{role: 'user', content: 'Hello'}])
    })

    it('puts instructions before an existing system message without dropping it', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(createMockResponse(NON_STREAMING_BODY))
      const provider = new AnthropicProvider()
      provider.setApiKey('test-key')

      await collectChunks(
        provider.createCompletion({
          model: 'claude-sonnet-4-5-20250514',
          instructions: 'Answer in French.',
          messages: [
            {role: 'system', content: 'You are helpful'},
            {role: 'user', content: 'Hello'},
          ],
          stream: false,
        }),
      )

      const body = requestBody(fetchSpy)
      expect(body.system).toBe('Answer in French.\n\nYou are helpful')
      expect(body.messages).toEqual([{role: 'user', content: 'Hello'}])
    })

    it('keeps the existing system message when instructions are absent or empty', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockImplementation(async () => createMockResponse(NON_STREAMING_BODY))
      const provider = new AnthropicProvider()
      provider.setApiKey('test-key')

      for (const instructions of [undefined, '']) {
        await collectChunks(
          provider.createCompletion({
            model: 'claude-sonnet-4-5-20250514',
            instructions,
            messages: [
              {role: 'system', content: 'You are helpful'},
              {role: 'user', content: 'Hello'},
            ],
            stream: false,
          }),
        )
      }

      for (const call of fetchSpy.mock.calls) {
        expect(JSON.parse((call[1] as RequestInit).body as string).system).toBe('You are helpful')
      }
    })

    it('omits system when there are neither instructions nor a system message', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(createMockResponse(NON_STREAMING_BODY))
      const provider = new AnthropicProvider()
      provider.setApiKey('test-key')

      await collectChunks(
        provider.createCompletion({
          model: 'claude-sonnet-4-5-20250514',
          messages: [{role: 'user', content: 'Hello'}],
          stream: false,
        }),
      )

      expect(requestBody(fetchSpy).system).toBeUndefined()
    })

    it('ignores replay data on messages', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(createMockResponse(NON_STREAMING_BODY))
      const provider = new AnthropicProvider()
      provider.setApiKey('test-key')

      await collectChunks(
        provider.createCompletion({
          model: 'claude-sonnet-4-5-20250514',
          messages: [
            {role: 'user', content: 'Hello'},
            {role: 'assistant', content: 'Hi', replay: {openai: [{type: 'reasoning', encrypted_content: 'abc'}]}},
            {role: 'user', content: 'Again'},
          ],
          stream: false,
        }),
      )

      expect(requestBody(fetchSpy).messages).toEqual([
        {role: 'user', content: 'Hello'},
        {role: 'assistant', content: 'Hi'},
        {role: 'user', content: 'Again'},
      ])
    })
  })

  describe('abort signal', () => {
    const abortError = async (generator: AsyncIterable<CompletionChunk>): Promise<unknown> => {
      try {
        for await (const chunk of generator) {
          expect(chunk).toBeDefined()
        }
      } catch (error_) {
        return error_
      }
      throw new Error('Expected generator to throw')
    }

    it('passes the signal to fetch for streaming and non-streaming requests', async () => {
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(createMockStreamResponse([MESSAGE_START_EVENT, TEXT_DELTA_EVENT]))
        .mockResolvedValueOnce(createMockResponse(NON_STREAMING_BODY))
      const provider = new AnthropicProvider()
      provider.setApiKey('test-key')
      const controller = new AbortController()

      for (const stream of [true, false]) {
        await collectChunks(
          provider.createCompletion({
            model: 'claude-sonnet-4-5-20250514',
            messages: [{role: 'user', content: 'Hello'}],
            signal: controller.signal,
            stream,
          }),
        )
      }

      for (const call of fetchSpy.mock.calls) {
        expect((call[1] as RequestInit).signal).toBe(controller.signal)
      }
    })

    it('ends a stream with an abort error when aborted mid-stream, without a final chunk', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        createStalledStreamResponse([MESSAGE_START_EVENT, TEXT_DELTA_EVENT]),
      )
      const provider = new AnthropicProvider()
      provider.setApiKey('test-key')
      const controller = new AbortController()
      const received: CompletionChunk[] = []

      const thrown = await abortError(
        (async function* () {
          for await (const chunk of provider.createCompletion({
            model: 'claude-sonnet-4-5-20250514',
            messages: [{role: 'user', content: 'Hello'}],
            signal: controller.signal,
            stream: true,
          })) {
            received.push(chunk)
            if (chunk.content) controller.abort()
            yield chunk
          }
        })(),
      )

      expect(thrown).toBeInstanceOf(Error)
      expect((thrown as Error).name).toBe('AbortError')
      expect(thrown).not.toBeInstanceOf(ProviderError)
      expect(received.map(c => c.content).join('')).toBe('Hello')
      expect(received.some(c => c.finishReason === 'stop')).toBe(false)
    })

    it('throws an abort error without calling fetch when the signal is already aborted', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch')
      const provider = new AnthropicProvider()
      provider.setApiKey('test-key')
      const controller = new AbortController()
      controller.abort()

      const thrown = await abortError(
        provider.createCompletion({
          model: 'claude-sonnet-4-5-20250514',
          messages: [{role: 'user', content: 'Hello'}],
          signal: controller.signal,
          stream: true,
        }),
      )

      expect((thrown as Error).name).toBe('AbortError')
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('surfaces a rejected fetch as an abort error, not a ProviderError, once the signal aborted', async () => {
      const controller = new AbortController()
      vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async () => {
        controller.abort('user stopped')
        throw new Error('fetch failed after abort')
      })
      const provider = new AnthropicProvider()
      provider.setApiKey('test-key')

      const thrown = await abortError(
        provider.createCompletion({
          model: 'claude-sonnet-4-5-20250514',
          messages: [{role: 'user', content: 'Hello'}],
          signal: controller.signal,
          stream: false,
        }),
      )

      expect((thrown as Error).name).toBe('AbortError')
      expect(thrown).not.toBeInstanceOf(ProviderError)
    })

    it('still wraps non-abort failures in a ProviderError when a signal is supplied', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        createMockResponse({type: 'error', error: {type: 'authentication_error', message: 'Invalid key'}}, 401),
      )
      const provider = new AnthropicProvider()
      provider.setApiKey('test-key')

      const thrown = await expectGeneratorThrows(
        provider.createCompletion({
          model: 'claude-sonnet-4-5-20250514',
          messages: [{role: 'user', content: 'Hello'}],
          signal: new AbortController().signal,
          stream: false,
        }),
        ProviderError,
      )

      expect(thrown.type).toBe('authentication')
    })
  })

  describe('message mapping', () => {
    it('sends correct request structure', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        createMockResponse({
          id: 'msg_test',
          type: 'message',
          role: 'assistant',
          content: [{type: 'text', text: 'Response'}],
          model: 'claude-sonnet-4-5-20250514',
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: {input_tokens: 10, output_tokens: 5},
        }),
      )

      const provider = new AnthropicProvider()
      provider.setApiKey('test-key')

      await collectChunks(
        provider.createCompletion({
          model: 'claude-sonnet-4-5-20250514',
          messages: [
            {role: 'system', content: 'You are helpful'},
            {role: 'user', content: 'Hello'},
          ],
          temperature: 0.7,
          maxTokens: 1000,
          stream: false,
        }),
      )

      expect(fetchSpy).toHaveBeenCalledOnce()
      const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit]

      expect(url).toBe('https://api.anthropic.com/v1/messages')
      expect(options.method).toBe('POST')

      const headers = options.headers as Record<string, string>
      expect(headers['x-api-key']).toBe('test-key')
      expect(headers['anthropic-version']).toBe('2023-06-01')
      expect(headers['Content-Type']).toBe('application/json')

      const body = JSON.parse(options.body as string)
      expect(body.model).toBe('claude-sonnet-4-5-20250514')
      expect(body.system).toBe('You are helpful')
      expect(body.messages).toEqual([{role: 'user', content: 'Hello'}])
      expect(body.temperature).toBe(0.7)
      expect(body.max_tokens).toBe(1000)
      expect(body.stream).toBeUndefined()
    })

    it('maps tool definitions correctly', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        createMockResponse({
          id: 'msg_test',
          type: 'message',
          role: 'assistant',
          content: [{type: 'text', text: 'Response'}],
          model: 'claude-sonnet-4-5-20250514',
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: {input_tokens: 10, output_tokens: 5},
        }),
      )

      const provider = new AnthropicProvider()
      provider.setApiKey('test-key')

      await collectChunks(
        provider.createCompletion({
          model: 'claude-sonnet-4-5-20250514',
          messages: [{role: 'user', content: 'Hello'}],
          tools: [
            {
              name: 'get_weather',
              description: 'Get the weather',
              parameters: {
                type: 'object',
                properties: {location: {type: 'string'}},
                required: ['location'],
              },
            },
          ],
          stream: false,
        }),
      )

      const body = JSON.parse(fetchSpy.mock.calls[0]?.[1]?.body as string)
      expect(body.tools).toEqual([
        {
          name: 'get_weather',
          description: 'Get the weather',
          input_schema: {
            type: 'object',
            properties: {location: {type: 'string'}},
            required: ['location'],
          },
        },
      ])
    })
  })
})

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetAnthropicProviderForTesting()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows requests within rate limit', async () => {
    const provider = new AnthropicProvider()
    provider.setApiKey('test-key')

    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      createMockResponse({
        id: 'msg_test',
        type: 'message',
        role: 'assistant',
        content: [{type: 'text', text: 'Response'}],
        model: 'claude-sonnet-4-5-20250514',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {input_tokens: 10, output_tokens: 5},
      }),
    )

    for (let i = 0; i < 3; i++) {
      await collectChunks(
        provider.createCompletion({
          model: 'claude-sonnet-4-5-20250514',
          messages: [{role: 'user', content: 'Hello'}],
          stream: false,
        }),
      )
    }

    expect(globalThis.fetch).toHaveBeenCalledTimes(3)
  })
})

function modelsBody(ids: string[]) {
  return {
    data: ids.map(id => ({type: 'model', id, display_name: `Name of ${id}`, created_at: '2025-01-01T00:00:00Z'})),
    has_more: false,
  }
}

function lastCall(): {url: string; init: RequestInit} {
  const call = vi.mocked(globalThis.fetch).mock.calls.at(-1)
  if (!call) throw new Error('fetch was not called')
  return {url: String(call[0]), init: call[1] ?? {}}
}

describe('AnthropicProvider base URL', () => {
  const GATEWAY = 'http://localhost:8317/v1'
  const STREAM = [MESSAGE_START_EVENT, TEXT_DELTA_EVENT, 'event: message_stop\ndata: {"type":"message_stop"}\n\n']

  const completionRequest = {
    model: 'claude-sonnet-4-5-20250514',
    messages: [{role: 'user' as const, content: 'Hello'}],
  }

  beforeEach(() => {
    resetAnthropicProviderForTesting()
    vi.restoreAllMocks()
  })

  it('uses the Anthropic endpoints when no base URL is set', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    fetchSpy.mockResolvedValueOnce(createMockResponse(NON_STREAMING_BODY))
    const provider = new AnthropicProvider()
    provider.setApiKey('sk-ant-key')

    expect(provider.baseUrl).toBeUndefined()
    await provider.validateCredentials('sk-ant-key')
    expect(lastCall().url).toBe('https://api.anthropic.com/v1/messages')
    expect(lastCall().init.method).toBe('POST')

    fetchSpy.mockResolvedValueOnce(createMockStreamResponse(STREAM))
    await collectChunks(provider.createCompletion({...completionRequest, stream: true}))
    expect(lastCall().url).toBe('https://api.anthropic.com/v1/messages')
  })

  it('validates with GET <baseUrl>/models and the usual headers', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(createMockResponse(modelsBody(['claude-sonnet-4-5', 'gpt-5'])))
    const provider = new AnthropicProvider()
    provider.configure({baseUrl: GATEWAY})

    const result = await provider.validateCredentials('sk-gateway-key')

    const {url, init} = lastCall()
    expect(url).toBe(`${GATEWAY}/models`)
    expect(init.method ?? 'GET').toBe('GET')
    expect(init.headers).toMatchObject({'x-api-key': 'sk-gateway-key', 'anthropic-version': '2023-06-01'})
    expect(result.valid).toBe(true)
    expect(result.models?.map(m => [m.id, m.name])).toEqual([
      ['claude-sonnet-4-5', 'Name of claude-sonnet-4-5'],
      ['gpt-5', 'Name of gpt-5'],
    ])
  })

  it.each([
    [401, 'Invalid API key'],
    [403, 'Access denied. Check your API key permissions.'],
    [429, 'Rate limit exceeded. Please try again later.'],
  ])('reports a %i from the gateway as a failed validation', async (status, error) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(createMockResponse({error: {message: 'nope'}}, status))
    const provider = new AnthropicProvider()
    provider.configure({baseUrl: GATEWAY})

    expect(await provider.validateCredentials('sk-bad')).toEqual({valid: false, error})
  })

  it('does not treat a 400 from the gateway models endpoint as a valid key', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(createMockResponse({error: {message: 'Bad route'}}, 400))
    const provider = new AnthropicProvider()
    provider.configure({baseUrl: GATEWAY})

    expect(await provider.validateCredentials('sk-key')).toEqual({valid: false, error: 'Bad route'})
  })

  it('streams to <baseUrl>/messages', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(createMockStreamResponse(STREAM))
    const provider = new AnthropicProvider()
    provider.setApiKey('sk-gateway-key')
    provider.configure({baseUrl: GATEWAY})

    const chunks = await collectChunks(provider.createCompletion({...completionRequest, stream: true}))

    const {url, init} = lastCall()
    expect(url).toBe(`${GATEWAY}/messages`)
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({'x-api-key': 'sk-gateway-key'})
    expect(chunks.map(c => c.content ?? '').join('')).toBe('Hello')
  })

  it('sends a non-streaming completion to <baseUrl>/messages', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(createMockResponse(NON_STREAMING_BODY))
    const provider = new AnthropicProvider()
    provider.setApiKey('sk-gateway-key')
    provider.configure({baseUrl: GATEWAY})

    await collectChunks(provider.createCompletion({...completionRequest, stream: false}))

    expect(lastCall().url).toBe(`${GATEWAY}/messages`)
  })

  it.each(['http://localhost:8317/v1/', 'http://localhost:8317/v1///', '  http://localhost:8317/v1/  '])(
    'drops trailing slashes and whitespace from %j',
    async value => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(createMockResponse(modelsBody([])))
      const provider = new AnthropicProvider()

      provider.configure({baseUrl: value})
      await provider.validateCredentials('sk-key')

      expect(provider.baseUrl).toBe(GATEWAY)
      expect(lastCall().url).toBe(`${GATEWAY}/models`)
    },
  )

  it('lets validateCredentials try a URL without saving it', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(createMockResponse(modelsBody([])))
    const provider = new AnthropicProvider()

    await provider.validateCredentials('sk-key', 'https://gateway.example.com/v1/')

    expect(lastCall().url).toBe('https://gateway.example.com/v1/models')
    expect(provider.baseUrl).toBeUndefined()
  })

  it('lists the gateway models when a base URL is set, and the built-in list otherwise', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const provider = new AnthropicProvider()
    provider.setApiKey('sk-key')

    expect((await provider.listModels()).length).toBeGreaterThan(0)
    expect(fetchSpy).not.toHaveBeenCalled()

    fetchSpy.mockResolvedValueOnce(createMockResponse(modelsBody(['claude-opus-4-5-20250514', 'gemini-2.5-pro'])))
    provider.configure({baseUrl: GATEWAY})
    const models = await provider.listModels()

    expect(lastCall().url).toBe(`${GATEWAY}/models`)
    expect(models.map(m => m.id)).toEqual(['claude-opus-4-5-20250514', 'gemini-2.5-pro'])
    expect(models.every(m => m.provider === 'anthropic')).toBe(true)
  })

  it('rejects a gateway model list in the wrong shape', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(createMockResponse({models: []}))
    const provider = new AnthropicProvider()
    provider.setApiKey('sk-key')
    provider.configure({baseUrl: GATEWAY})

    await expect(provider.listModels()).rejects.toMatchObject({type: 'server', provider: 'anthropic'})
  })

  it('goes back to Anthropic when the base URL is cleared', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    fetchSpy
      .mockResolvedValueOnce(createMockResponse(NON_STREAMING_BODY))
      .mockResolvedValueOnce(createMockResponse(NON_STREAMING_BODY))
    const provider = new AnthropicProvider()
    provider.setApiKey('sk-key')

    provider.configure({baseUrl: GATEWAY})
    await collectChunks(provider.createCompletion({...completionRequest, stream: false}))
    expect(lastCall().url).toBe(`${GATEWAY}/messages`)

    provider.configure({baseUrl: undefined})
    await collectChunks(provider.createCompletion({...completionRequest, stream: false}))
    expect(lastCall().url).toBe('https://api.anthropic.com/v1/messages')
  })

  it.each([
    'localhost:8317/v1',
    'ftp://example.com/v1',
    'javascript:alert(1)',
    'http://user:pass@host/v1',
    'http://host/v1#frag',
    '',
  ])('refuses %j as a base URL', async value => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const provider = new AnthropicProvider()

    expect(() => {
      provider.configure({baseUrl: value})
    }).toThrow()
    expect(provider.baseUrl).toBeUndefined()

    const result = await provider.validateCredentials('sk-key', value)
    expect(result.valid).toBe(false)
    expect(result.error).toBeTruthy()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
