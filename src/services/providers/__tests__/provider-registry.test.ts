import {beforeEach, describe, expect, it} from 'vitest'
import {AnthropicProvider} from '../anthropic-provider'
import {AzureProvider} from '../azure-provider'
import {OllamaProvider} from '../ollama-provider'
import {OpenAIProvider} from '../openai-provider'
import {getProviderRegistry} from '../provider-registry'

describe('ProviderRegistry', () => {
  beforeEach(() => {
    const registry = getProviderRegistry()
    registry.clear()
  })

  describe('register', () => {
    it('registers a provider', () => {
      const registry = getProviderRegistry()
      const provider = new OpenAIProvider()

      registry.register(provider)

      expect(registry.get('openai')).toBe(provider)
    })

    it('overwrites on duplicate registration', () => {
      const registry = getProviderRegistry()
      const provider1 = new OpenAIProvider()
      const provider2 = new OpenAIProvider()

      registry.register(provider1)
      registry.register(provider2)

      expect(registry.get('openai')).toBe(provider2)
    })
  })

  describe('get', () => {
    it('returns undefined for unregistered provider', () => {
      const registry = getProviderRegistry()

      expect(registry.get('openai')).toBeUndefined()
    })

    it('returns registered provider', () => {
      const registry = getProviderRegistry()
      const provider = new OpenAIProvider()
      registry.register(provider)

      expect(registry.get('openai')).toBe(provider)
    })
  })

  describe('list', () => {
    it('returns empty array when no providers registered', () => {
      const registry = getProviderRegistry()

      expect(registry.list()).toEqual([])
    })

    it('returns all registered provider configs', () => {
      const registry = getProviderRegistry()
      registry.register(new OpenAIProvider())
      registry.register(new AnthropicProvider())

      const configs = registry.list()

      expect(configs).toHaveLength(2)
      expect(configs.map(c => c.id)).toContain('openai')
      expect(configs.map(c => c.id)).toContain('anthropic')
    })

    it('reflects configuration status', () => {
      const registry = getProviderRegistry()
      registry.register(new OpenAIProvider())

      const configsBefore = registry.list()
      expect(configsBefore[0]?.isConfigured).toBe(false)

      registry.setConfigured('openai', true)

      const configsAfter = registry.list()
      expect(configsAfter[0]?.isConfigured).toBe(true)
    })
  })

  describe('getConfigured', () => {
    it('returns only configured providers', () => {
      const registry = getProviderRegistry()
      registry.register(new OpenAIProvider())
      registry.register(new AnthropicProvider())
      registry.setConfigured('openai', true)

      const configured = registry.getConfigured()

      expect(configured).toHaveLength(1)
      expect(configured[0]?.id).toBe('openai')
    })

    it('returns empty when none configured', () => {
      const registry = getProviderRegistry()
      registry.register(new OpenAIProvider())
      registry.register(new AnthropicProvider())

      expect(registry.getConfigured()).toEqual([])
    })
  })

  describe('setConfigured', () => {
    it('updates provider configuration status', () => {
      const registry = getProviderRegistry()
      registry.register(new OpenAIProvider())

      registry.setConfigured('openai', true)
      expect(registry.list()[0]?.isConfigured).toBe(true)

      registry.setConfigured('openai', false)
      expect(registry.list()[0]?.isConfigured).toBe(false)
    })

    it('silently ignores unregistered provider', () => {
      const registry = getProviderRegistry()

      registry.setConfigured('openai', true)
      expect(registry.list()).toEqual([])
    })
  })

  describe('clear', () => {
    it('removes all registered providers', () => {
      const registry = getProviderRegistry()
      registry.register(new OpenAIProvider())
      registry.register(new AnthropicProvider())

      registry.clear()

      expect(registry.list()).toEqual([])
    })
  })

  describe('singleton behavior', () => {
    it('returns same instance', () => {
      const registry1 = getProviderRegistry()
      const registry2 = getProviderRegistry()

      expect(registry1).toBe(registry2)
    })
  })
})

describe('Provider implementations', () => {
  describe('OpenAIProvider', () => {
    it('has correct metadata', () => {
      const provider = new OpenAIProvider()

      expect(provider.id).toBe('openai')
      expect(provider.name).toBe('OpenAI')
      expect(provider.apiKeyRequired).toBe(true)
    })

    it('starts unconfigured', () => {
      const provider = new OpenAIProvider()

      expect(provider.isConfigured).toBe(false)
      expect(provider.isEnabled).toBe(true)
    })

    it('returns correct config', () => {
      const provider = new OpenAIProvider()
      const config = provider.getConfig()

      expect(config.id).toBe('openai')
      expect(config.name).toBe('OpenAI')
      expect(config.apiKeyRequired).toBe(true)
      expect(config.isConfigured).toBe(false)
      expect(config.isEnabled).toBe(true)
    })
  })

  describe('AnthropicProvider', () => {
    it('has correct metadata', () => {
      const provider = new AnthropicProvider()

      expect(provider.id).toBe('anthropic')
      expect(provider.name).toBe('Anthropic')
      expect(provider.apiKeyRequired).toBe(true)
    })

    it('validates credentials with API call', async () => {
      const provider = new AnthropicProvider()
      const result = await provider.validateCredentials('test-key')

      expect(result).toHaveProperty('valid')
      expect(typeof result.valid).toBe('boolean')
    })

    it('lists available models', async () => {
      const provider = new AnthropicProvider()
      const models = await provider.listModels()

      expect(models.length).toBeGreaterThan(0)
      expect(models[0]?.id).toBeDefined()
      expect(models[0]?.name).toBeDefined()
      expect(models[0]?.provider).toBe('anthropic')
    })
  })

  describe('OllamaProvider', () => {
    it('has correct metadata', () => {
      const provider = new OllamaProvider()

      expect(provider.id).toBe('ollama')
      expect(provider.name).toBe('Ollama')
      expect(provider.apiKeyRequired).toBe(false)
    })
  })

  describe('AzureProvider', () => {
    it('has correct metadata', () => {
      const provider = new AzureProvider()

      expect(provider.id).toBe('azure')
      expect(provider.name).toBe('Azure OpenAI')
      expect(provider.apiKeyRequired).toBe(true)
    })
  })
})
