import type {CompletionChunk, CompletionRequest, Model, ValidationResult} from '@/types/provider'
import {ProviderError} from '@/types/provider'
import {BaseLLMProvider} from './base-provider'

export class AnthropicProvider extends BaseLLMProvider {
  readonly id = 'anthropic' as const
  readonly name = 'Anthropic'
  readonly apiKeyRequired = true

  private apiKey: string | null = null
  private readonly enabled = false

  get isConfigured(): boolean {
    return this.apiKey !== null
  }

  get isEnabled(): boolean {
    return this.enabled
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey
  }

  clearApiKey(): void {
    this.apiKey = null
  }

  async validateCredentials(_apiKey: string, _baseUrl?: string): Promise<ValidationResult> {
    throw new ProviderError('Anthropic provider is not yet implemented. See RFC-008.', 'not_implemented', 'anthropic')
  }

  async listModels(): Promise<Model[]> {
    throw new ProviderError('Anthropic provider is not yet implemented. See RFC-008.', 'not_implemented', 'anthropic')
  }

  async *createCompletion(_request: CompletionRequest): AsyncIterable<CompletionChunk> {
    throw new ProviderError('Anthropic provider is not yet implemented. See RFC-008.', 'not_implemented', 'anthropic')
  }
}
