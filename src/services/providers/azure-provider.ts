import type {CompletionChunk, CompletionRequest, Model, ValidationResult} from '@/types/provider'
import {ProviderError} from '@/types/provider'
import {BaseLLMProvider} from './base-provider'

export class AzureProvider extends BaseLLMProvider {
  readonly id = 'azure' as const
  readonly name = 'Azure OpenAI'
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
    throw new ProviderError('Azure OpenAI provider is not yet implemented.', 'not_implemented', 'azure')
  }

  async listModels(): Promise<Model[]> {
    throw new ProviderError('Azure OpenAI provider is not yet implemented.', 'not_implemented', 'azure')
  }

  async *createCompletion(_request: CompletionRequest): AsyncIterable<CompletionChunk> {
    throw new ProviderError('Azure OpenAI provider is not yet implemented.', 'not_implemented', 'azure')
  }
}
