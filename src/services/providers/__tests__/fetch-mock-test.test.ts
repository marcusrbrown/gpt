import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

describe('fetch mocking with OllamaProvider (dynamic import)', () => {
  let originalFetch: typeof fetch
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    originalFetch = globalThis.fetch
    mockFetch = vi.fn()
    globalThis.fetch = mockFetch as typeof fetch
    // Reset module cache so OllamaProvider will use our mock
    vi.resetModules()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('should mock fetch for OllamaProvider.listModels', async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          models: [
            {
              name: 'test-model:latest',
              model: 'test-model:latest',
              size: 1000,
              modified_at: '2024-01-01T00:00:00Z',
              digest: 'abc123',
              details: {family: 'test', parameter_size: '7B', quantization_level: 'Q4_0', format: 'gguf'},
            },
          ],
        }),
        {status: 200, headers: {'Content-Type': 'application/json'}},
      ),
    )

    // Dynamic import AFTER mock is set up
    const {OllamaProvider} = await import('../ollama-provider')

    const provider = new OllamaProvider()
    const models = await provider.listModels()

    expect(mockFetch).toHaveBeenCalled()
    expect(models).toHaveLength(1)
    expect(models && models.length > 0 && models[0]?.id).toBe('test-model:latest')
  })
})
