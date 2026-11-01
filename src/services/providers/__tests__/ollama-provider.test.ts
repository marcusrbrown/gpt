import {ProviderError} from '@/types/provider'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {
  clearOllamaModelCacheForTesting,
  getOllamaProvider,
  OllamaProvider,
  resetOllamaProviderForTesting,
} from '../ollama-provider'

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

const createMockStreamResponse = (chunks: object[]) => {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(`${JSON.stringify(chunk)}\n`))
      }
      controller.close()
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {'Content-Type': 'application/x-ndjson'},
  })
}

/** NDJSON response that emits the given chunks and then stays open until the reader is cancelled. */
const createStalledStreamResponse = (chunks: object[]) => {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(`${JSON.stringify(chunk)}\n`))
      }
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {'Content-Type': 'application/x-ndjson'},
  })
}

const helloChunk = {
  model: 'llama3.3:latest',
  created_at: '2025-01-01T00:00:00Z',
  message: {role: 'assistant', content: 'Hello'},
  done: false,
}

const nonStreamingBody = {
  model: 'llama3.3:latest',
  created_at: '2024-01-01T00:00:00Z',
  message: {role: 'assistant', content: 'Hi'},
  done: true,
  done_reason: 'stop',
  prompt_eval_count: 1,
  eval_count: 1,
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

describe('OllamaProvider', () => {
  beforeEach(() => {
    resetOllamaProviderForTesting()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it.each([
    [{error: 'Model is unavailable'}, 'Model is unavailable'],
    [{error: {message: 'Server is busy'}}, 'Server is busy'],
    [{error: {details: 'internal'}}, 'Service Unavailable'],
  ])('extracts a human error message or falls back to status text', async (body, expected) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify(body), {status: 500, statusText: 'Service Unavailable'})),
    )
    const provider = new OllamaProvider()
    const error = await expectGeneratorThrows(
      provider.createCompletion({model: 'llama', messages: [{role: 'user', content: 'hi'}], stream: true}),
    )
    expect(error).toMatchObject({type: 'server', message: expected})
  })

  it('falls back to HTTP status when the error response is not JSON and has no status text', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>private details</html>', {status: 500})))
    const error = await expectGeneratorThrows(
      new OllamaProvider().createCompletion({model: 'llama', messages: [{role: 'user', content: 'hi'}], stream: true}),
    )
    expect(error.message).toBe('HTTP 500')
  })

  describe('metadata', () => {
    it('has correct provider metadata', () => {
      const provider = new OllamaProvider()

      expect(provider.id).toBe('ollama')
      expect(provider.name).toBe('Ollama')
      expect(provider.apiKeyRequired).toBe(false)
    })

    it('starts configured (no API key required) and enabled', () => {
      const provider = new OllamaProvider()

      expect(provider.isConfigured).toBe(true)
      expect(provider.isEnabled).toBe(true)
    })

    it('returns correct config', () => {
      const provider = new OllamaProvider()
      const config = provider.getConfig()

      expect(config.id).toBe('ollama')
      expect(config.name).toBe('Ollama')
      expect(config.apiKeyRequired).toBe(false)
      expect(config.isConfigured).toBe(true)
      expect(config.isEnabled).toBe(true)
    })

    it('has default base URL', () => {
      const provider = new OllamaProvider()
      expect(provider.baseUrl).toBe('http://localhost:11434')
    })
  })

  describe('singleton', () => {
    it('returns same instance via getOllamaProvider', () => {
      const provider1 = getOllamaProvider()
      const provider2 = getOllamaProvider()

      expect(provider1).toBe(provider2)
    })

    it('resets singleton for testing', () => {
      const provider1 = getOllamaProvider()
      resetOllamaProviderForTesting()
      const provider2 = getOllamaProvider()

      expect(provider1).not.toBe(provider2)
    })
  })

  describe('configuration', () => {
    it('allows configuring base URL', () => {
      const provider = new OllamaProvider()

      provider.configure({baseUrl: 'http://custom:8080'})

      expect(provider.baseUrl).toBe('http://custom:8080')
    })

    it('API key methods are no-ops', () => {
      const provider = new OllamaProvider()

      provider.setApiKey('test')
      expect(provider.isConfigured).toBe(true)

      provider.clearApiKey()
      expect(provider.isConfigured).toBe(true)
    })
  })

  describe('validateCredentials', () => {
    it('returns valid result when Ollama is accessible', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        createMockResponse({
          models: [
            {
              name: 'llama3.3:latest',
              model: 'llama3.3:latest',
              size: 4000000000,
              modified_at: '2024-01-01T00:00:00Z',
              digest: 'abc123',
              details: {family: 'llama', parameter_size: '8B', quantization_level: 'Q4_0', format: 'gguf'},
            },
          ],
        }),
      )
      vi.stubGlobal('fetch', mockFetch)

      const provider = new OllamaProvider()
      const result = await provider.validateCredentials('')

      expect(result.valid).toBe(true)
      expect(result.models).toBeDefined()
      expect(result.models?.length).toBeGreaterThan(0)
      expect(mockFetch).toHaveBeenCalled()
    })

    it('returns invalid result on connection failure', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Connection refused'))
      vi.stubGlobal('fetch', mockFetch)

      const provider = new OllamaProvider()
      const result = await provider.validateCredentials('')

      expect(result.valid).toBe(false)
      expect(result.error).toContain('Connection refused')
    })

    it('returns invalid result on CORS error', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
      vi.stubGlobal('fetch', mockFetch)

      const provider = new OllamaProvider()
      const result = await provider.validateCredentials('')

      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('listModels', () => {
    it('returns models from Ollama API with correct structure', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        createMockResponse({
          models: [
            {
              name: 'llama3.3:latest',
              model: 'llama3.3:latest',
              size: 4000000000,
              modified_at: '2024-01-01T00:00:00Z',
              digest: 'abc123',
              details: {family: 'llama', parameter_size: '8B', quantization_level: 'Q4_0', format: 'gguf'},
            },
          ],
        }),
      )
      vi.stubGlobal('fetch', mockFetch)

      const provider = new OllamaProvider()
      clearOllamaModelCacheForTesting(provider)

      const models = await provider.listModels()

      expect(models).toHaveLength(1)
      expect(models[0]).toMatchObject({
        id: 'llama3.3:latest',
        provider: 'ollama',
      })
      expect(models[0]?.name).toContain('llama3.3:latest')
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/tags'), expect.any(Object))
    })

    it('detects vision capabilities for vision models', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        createMockResponse({
          models: [
            {
              name: 'llava:latest',
              model: 'llava:latest',
              size: 5000000000,
              modified_at: '2024-01-01T00:00:00Z',
              digest: 'abc123',
              details: {family: 'llava', parameter_size: '7B', quantization_level: 'Q4_0', format: 'gguf'},
            },
          ],
        }),
      )
      vi.stubGlobal('fetch', mockFetch)

      const provider = new OllamaProvider()
      clearOllamaModelCacheForTesting(provider)

      const models = await provider.listModels()
      const llava = models.find(m => m.id === 'llava:latest')

      expect(llava?.capabilities.supportsVision).toBe(true)
    })

    it('caches models with TTL', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        createMockResponse({
          models: [
            {
              name: 'llama3.3:latest',
              model: 'llama3.3:latest',
              size: 4000000000,
              modified_at: '2024-01-01T00:00:00Z',
              digest: 'abc123',
              details: {family: 'llama', parameter_size: '8B', quantization_level: 'Q4_0', format: 'gguf'},
            },
          ],
        }),
      )
      vi.stubGlobal('fetch', mockFetch)

      const provider = new OllamaProvider()
      clearOllamaModelCacheForTesting(provider)

      // First call should fetch
      const models1 = await provider.listModels()
      expect(models1).toHaveLength(1)

      // Second call should use cache
      const models2 = await provider.listModels()
      expect(models2).toHaveLength(1)

      // Should only fetch once due to caching
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('createCompletion', () => {
    describe('non-streaming', () => {
      it('yields completion chunk from response', async () => {
        const mockFetch = vi.fn().mockResolvedValue(
          createMockResponse({
            model: 'llama3.3:latest',
            created_at: '2024-01-01T00:00:00Z',
            message: {role: 'assistant', content: 'Hello, how can I help?'},
            done: true,
            done_reason: 'stop',
            total_duration: 1000000000,
            prompt_eval_count: 10,
            eval_count: 20,
          }),
        )
        vi.stubGlobal('fetch', mockFetch)

        const provider = new OllamaProvider()

        const chunks = await collectChunks(
          provider.createCompletion({
            model: 'llama3.3:latest',
            messages: [{role: 'user', content: 'Hello'}],
            stream: false,
          }),
        )

        expect(chunks).toHaveLength(1)
        expect(chunks[0]).toMatchObject({
          content: 'Hello, how can I help?',
          finishReason: 'stop',
          usage: {promptTokens: 10, completionTokens: 20},
        })
      })
    })

    describe('streaming', () => {
      it('yields chunks from newline-delimited JSON stream', async () => {
        const streamChunks = [
          {
            model: 'llama3.3:latest',
            created_at: '2025-01-01T00:00:00Z',
            message: {role: 'assistant', content: 'Hello'},
            done: false,
          },
          {
            model: 'llama3.3:latest',
            created_at: '2025-01-01T00:00:01Z',
            message: {role: 'assistant', content: ' world'},
            done: false,
          },
          {
            model: 'llama3.3:latest',
            created_at: '2025-01-01T00:00:02Z',
            message: {role: 'assistant', content: ''},
            done: true,
            done_reason: 'stop',
            prompt_eval_count: 10,
            eval_count: 5,
          },
        ]
        const mockFetch = vi.fn().mockResolvedValue(createMockStreamResponse(streamChunks))
        vi.stubGlobal('fetch', mockFetch)

        const provider = new OllamaProvider()

        const chunks = await collectChunks(
          provider.createCompletion({
            model: 'llama3.3:latest',
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

      it('handles reasoning/thinking content in stream', async () => {
        const streamChunks = [
          {
            model: 'deepseek-r1:latest',
            created_at: '2025-01-01T00:00:00Z',
            message: {role: 'assistant', content: '<think>Let me think about this...</think>'},
            done: false,
          },
          {
            model: 'deepseek-r1:latest',
            created_at: '2025-01-01T00:00:01Z',
            message: {role: 'assistant', content: 'The answer is 42'},
            done: false,
          },
          {
            model: 'deepseek-r1:latest',
            created_at: '2025-01-01T00:00:02Z',
            message: {role: 'assistant', content: ''},
            done: true,
            done_reason: 'stop',
            prompt_eval_count: 10,
            eval_count: 20,
          },
        ]
        const mockFetch = vi.fn().mockResolvedValue(createMockStreamResponse(streamChunks))
        vi.stubGlobal('fetch', mockFetch)

        const provider = new OllamaProvider()

        const chunks = await collectChunks(
          provider.createCompletion({
            model: 'deepseek-r1:latest',
            messages: [{role: 'user', content: 'What is the meaning of life?'}],
            stream: true,
          }),
        )

        // Should yield chunks
        expect(chunks.length).toBeGreaterThan(0)
        // Should have a final chunk with finishReason
        const finalChunk = chunks.find(c => c.finishReason)
        expect(finalChunk).toBeDefined()
        expect(finalChunk?.finishReason).toBe('stop')
      })
    })

    describe('error handling', () => {
      it('throws ProviderError on connection failure', async () => {
        const mockFetch = vi.fn().mockRejectedValue(new Error('Connection refused'))
        vi.stubGlobal('fetch', mockFetch)

        const provider = new OllamaProvider()

        const generator = provider.createCompletion({
          model: 'llama3.3:latest',
          messages: [{role: 'user', content: 'Hello'}],
          stream: false,
        })

        const thrownError = await expectGeneratorThrows(generator, ProviderError)
        expect(thrownError.type).toBe('unknown')
      })

      it('throws ProviderError on invalid model', async () => {
        const mockFetch = vi.fn().mockResolvedValue(createMockResponse({error: 'model "invalid" not found'}, 404))
        vi.stubGlobal('fetch', mockFetch)

        const provider = new OllamaProvider()

        const generator = provider.createCompletion({
          model: 'invalid',
          messages: [{role: 'user', content: 'Hello'}],
          stream: false,
        })

        const thrownError = await expectGeneratorThrows(generator, ProviderError)
        expect(thrownError.type).toBe('not_found')
      })

      it('throws ProviderError on server error', async () => {
        const mockFetch = vi.fn().mockResolvedValue(createMockResponse({error: 'Internal server error'}, 500))
        vi.stubGlobal('fetch', mockFetch)

        const provider = new OllamaProvider()

        const generator = provider.createCompletion({
          model: 'llama3.3:latest',
          messages: [{role: 'user', content: 'Hello'}],
          stream: false,
        })

        const thrownError = await expectGeneratorThrows(generator, ProviderError)
        expect(thrownError.type).toBe('server')
      })
    })
  })

  describe('instructions', () => {
    const sentMessages = (mockFetch: ReturnType<typeof vi.fn>, call = 0) =>
      (JSON.parse((mockFetch.mock.calls[call] as [string, RequestInit])[1].body as string) as {messages: unknown[]})
        .messages

    it('sends instructions as the system message', async () => {
      const mockFetch = vi.fn().mockResolvedValue(createMockResponse(nonStreamingBody))
      vi.stubGlobal('fetch', mockFetch)

      await collectChunks(
        new OllamaProvider().createCompletion({
          model: 'llama3.3:latest',
          instructions: 'Answer in French.',
          messages: [{role: 'user', content: 'Hello'}],
          stream: false,
        }),
      )

      expect(sentMessages(mockFetch)).toEqual([
        {role: 'system', content: 'Answer in French.'},
        {role: 'user', content: 'Hello'},
      ])
    })

    it('puts instructions before an existing system message without dropping it', async () => {
      const mockFetch = vi.fn().mockResolvedValue(createMockResponse(nonStreamingBody))
      vi.stubGlobal('fetch', mockFetch)

      await collectChunks(
        new OllamaProvider().createCompletion({
          model: 'llama3.3:latest',
          instructions: 'Answer in French.',
          messages: [
            {role: 'system', content: 'You are helpful'},
            {role: 'user', content: 'Hello'},
          ],
          stream: false,
        }),
      )

      expect(sentMessages(mockFetch)).toEqual([
        {role: 'system', content: 'Answer in French.'},
        {role: 'system', content: 'You are helpful'},
        {role: 'user', content: 'Hello'},
      ])
    })

    it('adds no system message for absent or empty instructions', async () => {
      const mockFetch = vi.fn().mockImplementation(async () => createMockResponse(nonStreamingBody))
      vi.stubGlobal('fetch', mockFetch)
      const provider = new OllamaProvider()

      for (const instructions of [undefined, '']) {
        await collectChunks(
          provider.createCompletion({
            model: 'llama3.3:latest',
            instructions,
            messages: [{role: 'user', content: 'Hello'}],
            stream: false,
          }),
        )
      }

      expect(sentMessages(mockFetch, 0)).toEqual([{role: 'user', content: 'Hello'}])
      expect(sentMessages(mockFetch, 1)).toEqual([{role: 'user', content: 'Hello'}])
    })

    it('keeps instructions first when the qwen3 /think suffix is applied', async () => {
      const mockFetch = vi.fn().mockResolvedValue(createMockResponse({...nonStreamingBody, model: 'qwen3:8b'}))
      vi.stubGlobal('fetch', mockFetch)

      await collectChunks(
        new OllamaProvider().createCompletion({
          model: 'qwen3:8b',
          instructions: 'Answer in French.',
          messages: [{role: 'user', content: 'Hello'}],
          stream: false,
        }),
      )

      expect(sentMessages(mockFetch)).toEqual([
        {role: 'system', content: 'Answer in French.\n\n/think'},
        {role: 'user', content: 'Hello'},
      ])
    })

    it('ignores replay data on messages', async () => {
      const mockFetch = vi.fn().mockResolvedValue(createMockResponse(nonStreamingBody))
      vi.stubGlobal('fetch', mockFetch)

      await collectChunks(
        new OllamaProvider().createCompletion({
          model: 'llama3.3:latest',
          messages: [
            {role: 'user', content: 'Hello'},
            {role: 'assistant', content: 'Hi', replay: {openai: [{type: 'reasoning', encrypted_content: 'abc'}]}},
            {role: 'user', content: 'Again'},
          ],
          stream: false,
        }),
      )

      expect(sentMessages(mockFetch)).toEqual([
        {role: 'user', content: 'Hello'},
        {role: 'assistant', content: 'Hi'},
        {role: 'user', content: 'Again'},
      ])
    })
  })

  describe('abort signal', () => {
    const thrownBy = async (generator: AsyncIterable<CompletionChunk>): Promise<unknown> => {
      try {
        for await (const chunk of generator) {
          expect(chunk).toBeDefined()
        }
      } catch (error_) {
        return error_
      }
      throw new Error('Expected generator to throw')
    }

    it('still applies the configured timeout when no signal is supplied', async () => {
      const mockFetch = vi.fn().mockResolvedValue(createMockResponse(nonStreamingBody))
      vi.stubGlobal('fetch', mockFetch)
      const timeoutSpy = vi.spyOn(AbortSignal, 'timeout')

      await collectChunks(
        new OllamaProvider().createCompletion({
          model: 'llama3.3:latest',
          messages: [{role: 'user', content: 'Hello'}],
          stream: false,
        }),
      )

      expect(timeoutSpy).toHaveBeenCalledWith(120000)
      expect((mockFetch.mock.calls[0] as [string, RequestInit])[1].signal).toBeInstanceOf(AbortSignal)
    })

    it('combines the caller signal with the timeout signal for streaming and non-streaming requests', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce(createMockStreamResponse([helloChunk]))
        .mockResolvedValueOnce(createMockResponse(nonStreamingBody))
      vi.stubGlobal('fetch', mockFetch)
      const timeoutSpy = vi.spyOn(AbortSignal, 'timeout')
      const provider = new OllamaProvider()
      const controller = new AbortController()

      for (const stream of [true, false]) {
        await collectChunks(
          provider.createCompletion({
            model: 'llama3.3:latest',
            messages: [{role: 'user', content: 'Hello'}],
            signal: controller.signal,
            stream,
          }),
        )
      }

      expect(timeoutSpy).toHaveBeenCalledTimes(2)
      for (const call of mockFetch.mock.calls) {
        const fetchSignal = (call as [string, RequestInit])[1].signal as AbortSignal
        expect(fetchSignal).not.toBe(controller.signal)
        expect(fetchSignal.aborted).toBe(false)
      }

      controller.abort()
      for (const call of mockFetch.mock.calls) {
        expect(((call as [string, RequestInit])[1].signal as AbortSignal).aborted).toBe(true)
      }
    })

    it('ends a stream with an abort error when aborted mid-stream, without a final chunk', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createStalledStreamResponse([helloChunk])))
      const provider = new OllamaProvider()
      const controller = new AbortController()
      const received: CompletionChunk[] = []

      const thrown = await thrownBy(
        (async function* () {
          for await (const chunk of provider.createCompletion({
            model: 'llama3.3:latest',
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
      const mockFetch = vi.fn()
      vi.stubGlobal('fetch', mockFetch)
      const controller = new AbortController()
      controller.abort()

      const thrown = await thrownBy(
        new OllamaProvider().createCompletion({
          model: 'llama3.3:latest',
          messages: [{role: 'user', content: 'Hello'}],
          signal: controller.signal,
          stream: true,
        }),
      )

      expect((thrown as Error).name).toBe('AbortError')
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('surfaces a rejected fetch as an abort error, not a timeout ProviderError, once the signal aborted', async () => {
      const controller = new AbortController()
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(async () => {
          controller.abort('user stopped')
          throw new Error('The operation was aborted due to timeout')
        }),
      )

      const thrown = await thrownBy(
        new OllamaProvider().createCompletion({
          model: 'llama3.3:latest',
          messages: [{role: 'user', content: 'Hello'}],
          signal: controller.signal,
          stream: false,
        }),
      )

      expect((thrown as Error).name).toBe('AbortError')
      expect(thrown).not.toBeInstanceOf(ProviderError)
    })

    it('still wraps non-abort failures in a ProviderError when a signal is supplied', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createMockResponse({error: 'boom'}, 500)))

      const thrown = await expectGeneratorThrows(
        new OllamaProvider().createCompletion({
          model: 'llama3.3:latest',
          messages: [{role: 'user', content: 'Hello'}],
          signal: new AbortController().signal,
          stream: false,
        }),
        ProviderError,
      )

      expect(thrown.type).toBe('server')
    })
  })

  describe('model operations', () => {
    it('pulls a model', async () => {
      const streamChunks = [
        {status: 'pulling manifest'},
        {status: 'pulling', completed: 50, total: 100},
        {status: 'pulling', completed: 100, total: 100},
        {status: 'success'},
      ]
      const mockFetch = vi.fn().mockResolvedValue(createMockStreamResponse(streamChunks))
      vi.stubGlobal('fetch', mockFetch)

      const provider = new OllamaProvider()
      const progressUpdates: number[] = []

      await provider.pullModel('llama3.3:latest', progress => {
        progressUpdates.push(progress)
      })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/pull'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('llama3.3:latest'),
        }),
      )
      expect(progressUpdates.length).toBeGreaterThan(0)
    })

    it('deletes a model', async () => {
      const mockFetch = vi.fn().mockResolvedValue(createMockResponse({}, 200))
      vi.stubGlobal('fetch', mockFetch)

      const provider = new OllamaProvider()

      await provider.deleteModel('llama3.3:latest')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/delete'),
        expect.objectContaining({
          method: 'DELETE',
          body: expect.stringContaining('llama3.3:latest'),
        }),
      )
    })

    it('gets model details via API', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        createMockResponse({
          models: [
            {
              name: 'llama3.3:latest',
              model: 'llama3.3:latest',
              size: 4000000000,
              modified_at: '2024-01-01T00:00:00Z',
              digest: 'abc123',
              details: {
                family: 'llama',
                parameter_size: '8B',
                quantization_level: 'Q4_0',
                format: 'gguf',
              },
            },
          ],
        }),
      )
      vi.stubGlobal('fetch', mockFetch)

      const provider = new OllamaProvider()
      clearOllamaModelCacheForTesting(provider)

      const info = await provider.getModelDetails('llama3.3:latest')

      expect(info).toMatchObject({
        name: 'llama3.3:latest',
      })
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/tags'), expect.any(Object))
    })
  })

  describe('capability detection', () => {
    let originalFetch: typeof fetch

    beforeEach(() => {
      originalFetch = globalThis.fetch
    })

    afterEach(() => {
      globalThis.fetch = originalFetch
    })

    const testCases = [
      {model: 'llava:latest', expectedVision: true},
      {model: 'gemma3:latest', expectedVision: true},
      {model: 'deepseek-r1:latest', expectedVision: false},
      {model: 'qwen3:latest', expectedVision: false},
      {model: 'llama3.3:latest', expectedVision: false},
    ]

    for (const {model, expectedVision} of testCases) {
      it(`detects vision capability for ${model}`, async () => {
        const mockFetch = vi.fn().mockResolvedValue(
          createMockResponse({
            models: [
              {
                name: model,
                model,
                size: 4000000000,
                modified_at: '2024-01-01T00:00:00Z',
                digest: 'abc123',
                details: {family: 'test', parameter_size: '7B', quantization_level: 'Q4_0', format: 'gguf'},
              },
            ],
          }),
        )
        globalThis.fetch = mockFetch

        const provider = new OllamaProvider()
        clearOllamaModelCacheForTesting(provider)

        const models = await provider.listModels()
        const foundModel = models.find(m => m.id === model)

        expect(foundModel?.capabilities.supportsVision).toBe(expectedVision)
      })
    }
  })
})
