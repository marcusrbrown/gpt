import {useSession} from '@/hooks/use-session'

import {loadProviderBaseUrls, saveProviderBaseUrl} from '@/services/provider-base-urls'
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
import {BaseUrlProviderIdSchema, type BaseUrlProviderId, type ProviderBaseUrls} from '@/types/provider'
import {createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode} from 'react'

interface AIProviderContextValue {
  providers: ProviderConfig[]
  /** Saved endpoint overrides for OpenAI and Anthropic. A provider without an entry uses the vendor's own endpoint. */
  baseUrls: ProviderBaseUrls
  activeProvider: ProviderId | null
  setActiveProvider: (id: ProviderId) => void
  getProvider: (id: ProviderId) => BaseLLMProvider | undefined
  validateProvider: (id: ProviderId, apiKey: string, baseUrl?: string) => Promise<ValidationResult>
  /**
   * Saves (or, with `undefined`, clears) a provider's base URL and applies it. Needs no passphrase. When the session is
   * unlocked and a key is stored, the key is checked against the new URL and that result is returned; otherwise `null`.
   * Throws if the URL is invalid.
   */
  setBaseUrl: (id: BaseUrlProviderId, baseUrl: string | undefined) => Promise<ValidationResult | null>
  listModels: (providerId: ProviderId) => Promise<Model[]>
  isLoading: boolean
}

export const AIProviderContext = createContext<AIProviderContextValue | null>(null)

interface AIProviderProps {
  children: ReactNode
}

function applyBaseUrls(providers: {get: (id: ProviderId) => BaseLLMProvider | undefined}, baseUrls: ProviderBaseUrls) {
  for (const id of BaseUrlProviderIdSchema.options) {
    const provider = providers.get(id)
    if (provider instanceof OpenAIProvider || provider instanceof AnthropicProvider) {
      provider.configure({baseUrl: baseUrls[id]})
    }
  }
}

export function AIProvider({children}: AIProviderProps) {
  const {getSecret, isUnlocked, isPassphraseSet} = useSession()
  const [activeProvider, setActiveProvider] = useState<ProviderId | null>('openai')
  const [providers, setProviders] = useState<ProviderConfig[]>([])
  const [baseUrls, setBaseUrls] = useState<ProviderBaseUrls>({})
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

  // Stored keys can only be read once the session is unlocked, so load them again whenever `isUnlocked` changes.
  // `isPassphraseSet` is a dependency too: resetting a forgotten passphrase deletes the stored keys while locked.
  useEffect(() => {
    let cancelled = false

    const initializeProviders = async () => {
      setIsLoading(true)
      try {
        // Base URLs are not secret, so they apply whether or not the session is unlocked. Do this before any key is
        // validated so the check goes to the right endpoint.
        const storedBaseUrls = await loadProviderBaseUrls()
        if (cancelled) return
        applyBaseUrls(registry, storedBaseUrls)
        setBaseUrls(storedBaseUrls)

        const providerList = registry.list()

        await Promise.all(
          providerList.map(async config => {
            // Locked: forget any key held from the last unlock so a locked session leaves nothing usable in memory.
            if (config.apiKeyRequired && !isUnlocked) {
              registry.get(config.id)?.clearApiKey()
              registry.setConfigured(config.id, false)
              return
            }

            if (config.apiKeyRequired && isUnlocked) {
              const apiKey = await getSecret(config.id)
              if (apiKey && !cancelled) {
                const provider = registry.get(config.id)
                if (provider) {
                  try {
                    const result = await provider.validateCredentials(apiKey)
                    if (cancelled) return
                    if (result.valid) {
                      provider.setApiKey(apiKey)
                      registry.setConfigured(config.id, true)
                    } else {
                      registry.setConfigured(config.id, false)
                    }
                  } catch {
                    // Provider validation failed (e.g., not yet implemented)
                    if (!cancelled) registry.setConfigured(config.id, false)
                  }
                }
              }
            }
          }),
        )

        // Use registry.list() to get the canonical configured state
        if (!cancelled) setProviders(registry.list())
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    initializeProviders().catch(console.error)

    return () => {
      cancelled = true
    }
  }, [registry, getSecret, isUnlocked, isPassphraseSet])

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

  const setBaseUrl = useCallback(
    async (id: BaseUrlProviderId, baseUrl: string | undefined): Promise<ValidationResult | null> => {
      const saved = await saveProviderBaseUrl(id, baseUrl)
      applyBaseUrls(registry, saved)
      setBaseUrls(saved)

      // The stored key can only be read while unlocked; otherwise the next unlock validates it against the new URL.
      if (!isUnlocked) return null
      const apiKey = await getSecret(id)
      if (!apiKey) return null

      return validateProvider(id, apiKey)
    },
    [registry, isUnlocked, getSecret, validateProvider],
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
      baseUrls,
      activeProvider,
      setActiveProvider,
      getProvider,
      validateProvider,
      setBaseUrl,
      listModels,
      isLoading,
    }),
    [providers, baseUrls, activeProvider, getProvider, validateProvider, setBaseUrl, listModels, isLoading],
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
