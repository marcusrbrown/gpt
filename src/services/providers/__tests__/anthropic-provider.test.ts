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
  } catch (caughtError) {
    if (errorType) {
      expect(caughtError).toBeInstanceOf(errorType)
    }
    return caughtError as ProviderError
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
