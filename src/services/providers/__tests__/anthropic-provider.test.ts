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
