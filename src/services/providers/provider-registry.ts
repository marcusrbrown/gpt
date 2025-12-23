import type {Model, ProviderConfig, ProviderId} from '@/types/provider'

import type {BaseLLMProvider} from './base-provider'

interface ProviderState {
  provider: BaseLLMProvider
  isConfigured: boolean
  cachedModels: Model[] | null
}

class ProviderRegistryImpl {
  private readonly providers: Map<ProviderId, ProviderState> = new Map()

  register(provider: BaseLLMProvider): void {
    this.providers.set(provider.id, {
      provider,
      isConfigured: false,
      cachedModels: null,
    })
  }

  get(id: ProviderId): BaseLLMProvider | undefined {
    return this.providers.get(id)?.provider
  }

  getState(id: ProviderId): ProviderState | undefined {
    return this.providers.get(id)
  }

  setConfigured(id: ProviderId, isConfigured: boolean): void {
    const state = this.providers.get(id)
    if (state) {
      state.isConfigured = isConfigured
    }
  }

  setCachedModels(id: ProviderId, models: Model[]): void {
    const state = this.providers.get(id)
    if (state) {
      state.cachedModels = models
    }
  }

  getCachedModels(id: ProviderId): Model[] | null {
    return this.providers.get(id)?.cachedModels ?? null
  }

  clearCache(id: ProviderId): void {
    const state = this.providers.get(id)
    if (state) {
      state.cachedModels = null
    }
  }

  list(): ProviderConfig[] {
    const configs: ProviderConfig[] = []
    for (const [id, state] of this.providers) {
      configs.push({
        id,
        name: state.provider.name,
        apiKeyRequired: state.provider.apiKeyRequired,
        isConfigured: state.isConfigured,
        isEnabled: true,
      })
    }
    return configs
  }

  getConfigured(): ProviderConfig[] {
    return this.list().filter(config => config.isConfigured)
  }

  getProviderIds(): ProviderId[] {
    return Array.from(this.providers.keys())
  }

  has(id: ProviderId): boolean {
    return this.providers.has(id)
  }

  clear(): void {
    this.providers.clear()
  }
}

let registryInstance: ProviderRegistryImpl | null = null

export function getProviderRegistry(): ProviderRegistryImpl {
  if (!registryInstance) {
    registryInstance = new ProviderRegistryImpl()
  }
  return registryInstance
}

export function resetProviderRegistryForTesting(): void {
  registryInstance = null
}

export type ProviderRegistry = ProviderRegistryImpl
