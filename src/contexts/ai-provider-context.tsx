import {useSession} from '@/hooks/use-session'

import {
  AnthropicProvider,
  AzureProvider,
  getProviderRegistry,
  OllamaProvider,
  OpenAIProvider,
  type BaseLLMProvider,
  type Model,
  type ProviderConfig,
  type ProviderId,
  type ValidationResult,
} from '@/services/providers'
import {createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode} from 'react'

interface AIProviderContextValue {
  providers: ProviderConfig[]
  activeProvider: ProviderId | null
  setActiveProvider: (id: ProviderId) => void
  getProvider: (id: ProviderId) => BaseLLMProvider | undefined
  validateProvider: (id: ProviderId, apiKey: string, baseUrl?: string) => Promise<ValidationResult>
  listModels: (providerId: ProviderId) => Promise<Model[]>
  isLoading: boolean
}

export const AIProviderContext = createContext<AIProviderContextValue | null>(null)

interface AIProviderProps {
  children: ReactNode
}

export function AIProvider({children}: AIProviderProps) {
  const {getSecret} = useSession()
  const [activeProvider, setActiveProvider] = useState<ProviderId | null>('openai')
  const [providers, setProviders] = useState<ProviderConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const registry = useMemo(() => {
    const reg = getProviderRegistry()

    if (!reg.has('openai')) {
      reg.register(new OpenAIProvider())
      reg.register(new AnthropicProvider())
      reg.register(new OllamaProvider())
      reg.register(new AzureProvider())
    }

    return reg
  }, [])

  useEffect(() => {
    const initializeProviders = async () => {
      setIsLoading(true)
      try {
        const providerList = registry.list()

        await Promise.all(
          providerList.map(async config => {
            if (config.apiKeyRequired) {
              const apiKey = await getSecret(config.id)
              if (apiKey) {
                const provider = registry.get(config.id)
                if (provider) {
                  try {
                    const result = await provider.validateCredentials(apiKey)
                    if (result.valid) {
                      provider.setApiKey(apiKey)
                      registry.setConfigured(config.id, true)
                    } else {
                      registry.setConfigured(config.id, false)
                    }
                  } catch {
                    // Provider validation failed (e.g., not yet implemented)
                    registry.setConfigured(config.id, false)
                  }
                }
              }
            }
          }),
        )

        // Use registry.list() to get the canonical configured state
        setProviders(registry.list())
      } finally {
        setIsLoading(false)
      }
    }

    initializeProviders().catch(console.error)
  }, [registry, getSecret])

  const getProvider = useCallback(
    (id: ProviderId): BaseLLMProvider | undefined => {
      return registry.get(id)
    },
    [registry],
  )

  const validateProvider = useCallback(
    async (id: ProviderId, apiKey: string, baseUrl?: string): Promise<ValidationResult> => {
      const provider = registry.get(id)
      if (!provider) {
        return {valid: false, error: `Provider ${id} not found`}
      }

      const result = await provider.validateCredentials(apiKey, baseUrl)
      if (result.valid) {
        provider.setApiKey(apiKey)
      }
      registry.setConfigured(id, result.valid)

      setProviders(registry.list())

      return result
    },
    [registry],
  )

  const listModels = useCallback(
    async (providerId: ProviderId): Promise<Model[]> => {
      const provider = registry.get(providerId)
      if (!provider) {
        return []
      }

      return provider.listModels()
    },
    [registry],
  )

  const value = useMemo<AIProviderContextValue>(
    () => ({
      providers,
      activeProvider,
      setActiveProvider,
      getProvider,
      validateProvider,
      listModels,
      isLoading,
    }),
    [providers, activeProvider, getProvider, validateProvider, listModels, isLoading],
  )

  return <AIProviderContext value={value}>{children}</AIProviderContext>
}

export function useAIProvider(): AIProviderContextValue {
  const context = use(AIProviderContext)
  if (!context) {
    throw new Error('useAIProvider must be used within an AIProviderProvider')
  }
  return context
}
