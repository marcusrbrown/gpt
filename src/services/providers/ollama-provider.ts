import type {CompletionChunk, CompletionRequest, Model, ValidationResult} from '@/types/provider'
import {ProviderError} from '@/types/provider'
import {BaseLLMProvider} from './base-provider'

export class OllamaProvider extends BaseLLMProvider {
  readonly id = 'ollama' as const
  readonly name = 'Ollama'
  readonly apiKeyRequired = false

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
    throw new ProviderError('Ollama provider is not yet implemented. See RFC-010.', 'not_implemented', 'ollama')
  }

  async listModels(): Promise<Model[]> {
    throw new ProviderError('Ollama provider is not yet implemented. See RFC-010.', 'not_implemented', 'ollama')
  }

  async *createCompletion(_request: CompletionRequest): AsyncIterable<CompletionChunk> {
    throw new ProviderError('Ollama provider is not yet implemented. See RFC-010.', 'not_implemented', 'ollama')
  }
}
