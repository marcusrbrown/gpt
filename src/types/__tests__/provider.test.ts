import {
  CompletionChunkSchema,
  CompletionRequestSchema,
  ModelCapabilitiesSchema,
  ModelSchema,
  ProviderConfigSchema,
  ProviderError,
  ProviderIdSchema,
  ValidationResultSchema,
} from '@/types/provider'
import {describe, expect, it} from 'vitest'

describe('Provider Types', () => {
  describe('ProviderIdSchema', () => {
    it('accepts valid provider IDs', () => {
      expect(ProviderIdSchema.parse('openai')).toBe('openai')
      expect(ProviderIdSchema.parse('anthropic')).toBe('anthropic')
      expect(ProviderIdSchema.parse('ollama')).toBe('ollama')
      expect(ProviderIdSchema.parse('azure')).toBe('azure')
    })

    it('rejects invalid provider IDs', () => {
      expect(() => ProviderIdSchema.parse('invalid')).toThrow()
      expect(() => ProviderIdSchema.parse('')).toThrow()
      expect(() => ProviderIdSchema.parse(123)).toThrow()
    })
  })

  describe('ModelCapabilitiesSchema', () => {
    it('validates complete capabilities', () => {
      const capabilities = {
        supportsVision: true,
        supportsTools: true,
        supportsStreaming: true,
        contextWindow: 128000,
        maxOutputTokens: 4096,
      }
      expect(ModelCapabilitiesSchema.parse(capabilities)).toEqual(capabilities)
    })

    it('allows optional maxOutputTokens', () => {
      const capabilities = {
        supportsVision: false,
        supportsTools: false,
        supportsStreaming: true,
        contextWindow: 4096,
      }
      expect(ModelCapabilitiesSchema.parse(capabilities)).toEqual(capabilities)
    })

    it('rejects invalid contextWindow', () => {
      const capabilities = {
        supportsVision: true,
        supportsTools: true,
        supportsStreaming: true,
        contextWindow: -1,
      }
      expect(() => ModelCapabilitiesSchema.parse(capabilities)).toThrow()
    })
  })

  describe('ModelSchema', () => {
    it('validates a complete model', () => {
      const model = {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        capabilities: {
          supportsVision: true,
          supportsTools: true,
          supportsStreaming: true,
          contextWindow: 128000,
        },
        pricingTier: 'premium',
      }
      expect(ModelSchema.parse(model)).toEqual(model)
    })

    it('allows optional pricingTier', () => {
      const model = {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: 'openai',
        capabilities: {
          supportsVision: false,
          supportsTools: true,
          supportsStreaming: true,
          contextWindow: 16385,
        },
      }
      expect(ModelSchema.parse(model)).toEqual(model)
    })
  })

  describe('ProviderConfigSchema', () => {
    it('validates provider configuration', () => {
      const config = {
        id: 'openai',
        name: 'OpenAI',
        apiKeyRequired: true,
        isConfigured: true,
        isEnabled: true,
      }
      expect(ProviderConfigSchema.parse(config)).toEqual(config)
    })

    it('allows optional baseUrl', () => {
      const config = {
        id: 'azure',
        name: 'Azure OpenAI',
        apiKeyRequired: true,
        baseUrl: 'https://my-resource.openai.azure.com',
        isConfigured: false,
        isEnabled: true,
      }
      expect(ProviderConfigSchema.parse(config)).toEqual(config)
    })
  })

  describe('CompletionRequestSchema', () => {
    it('validates a basic completion request', () => {
      const request = {
        model: 'gpt-4o',
        messages: [
          {role: 'system', content: 'You are a helpful assistant.'},
          {role: 'user', content: 'Hello!'},
        ],
      }
      const parsed = CompletionRequestSchema.parse(request)
      expect(parsed.model).toBe('gpt-4o')
      expect(parsed.messages).toHaveLength(2)
      expect(parsed.stream).toBe(true)
    })

    it('validates request with all options', () => {
      const request = {
        model: 'gpt-4o',
        messages: [{role: 'user', content: 'Hello!'}],
        temperature: 0.7,
        maxTokens: 1000,
        stream: false,
        tools: [{type: 'function', function: {name: 'test'}}],
      }
      const parsed = CompletionRequestSchema.parse(request)
      expect(parsed.temperature).toBe(0.7)
      expect(parsed.maxTokens).toBe(1000)
      expect(parsed.stream).toBe(false)
    })

    it('rejects invalid temperature', () => {
      const request = {
        model: 'gpt-4o',
        messages: [{role: 'user', content: 'Hello!'}],
        temperature: 3,
      }
      expect(() => CompletionRequestSchema.parse(request)).toThrow()
    })

    it('validates tool message with toolCallId', () => {
      const request = {
        model: 'gpt-4o',
        messages: [{role: 'tool', content: 'Result', toolCallId: 'call_123'}],
      }
      expect(CompletionRequestSchema.parse(request)).toBeDefined()
    })
  })

  describe('CompletionChunkSchema', () => {
    it('validates content chunk', () => {
      const chunk = {
        id: 'chunk_1',
        content: 'Hello',
      }
      expect(CompletionChunkSchema.parse(chunk)).toEqual(chunk)
    })

    it('validates chunk with tool calls', () => {
      const chunk = {
        id: 'chunk_2',
        toolCalls: [{id: 'call_1', name: 'get_weather', arguments: '{"city": "SF"}'}],
      }
      expect(CompletionChunkSchema.parse(chunk)).toEqual(chunk)
    })

    it('validates chunk with usage and finish reason', () => {
      const chunk = {
        id: 'chunk_3',
        content: '',
        finishReason: 'stop',
        usage: {promptTokens: 10, completionTokens: 5},
      }
      expect(CompletionChunkSchema.parse(chunk)).toEqual(chunk)
    })
  })

  describe('ValidationResultSchema', () => {
    it('validates successful result', () => {
      const result = {
        valid: true,
        models: [
          {
            id: 'gpt-4o',
            name: 'GPT-4o',
            provider: 'openai',
            capabilities: {
              supportsVision: true,
              supportsTools: true,
              supportsStreaming: true,
              contextWindow: 128000,
            },
          },
        ],
      }
      expect(ValidationResultSchema.parse(result)).toEqual(result)
    })

    it('validates error result', () => {
      const result = {
        valid: false,
        error: 'Invalid API key',
      }
      expect(ValidationResultSchema.parse(result)).toEqual(result)
    })
  })

  describe('ProviderError', () => {
    it('creates error with all properties', () => {
      const error = new ProviderError('Test error', 'authentication', 'openai')
      expect(error.message).toBe('Test error')
      expect(error.type).toBe('authentication')
      expect(error.provider).toBe('openai')
      expect(error.name).toBe('ProviderError')
    })

    it('includes statusCode when provided', () => {
      const error = new ProviderError('Rate limited', 'rate_limit', 'anthropic', 429)
      expect(error.statusCode).toBe(429)
    })
  })
})
