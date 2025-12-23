import type {
  CompletionChunk,
  CompletionRequest,
  Model,
  ProviderConfig,
  ProviderId,
  ValidationResult,
} from '@/types/provider'

export abstract class BaseLLMProvider {
  abstract readonly id: ProviderId
  abstract readonly name: string
  abstract readonly apiKeyRequired: boolean

  abstract get isConfigured(): boolean
  abstract get isEnabled(): boolean

  abstract setApiKey(apiKey: string): void
  abstract clearApiKey(): void

  abstract validateCredentials(apiKey: string, baseUrl?: string): Promise<ValidationResult>
  abstract listModels(): Promise<Model[]>
  abstract createCompletion(request: CompletionRequest): AsyncIterable<CompletionChunk>

  createEmbedding?(text: string): Promise<number[]>

  getConfig(): ProviderConfig {
    return {
      id: this.id,
      name: this.name,
      apiKeyRequired: this.apiKeyRequired,
      isConfigured: this.isConfigured,
      isEnabled: this.isEnabled,
    }
  }

  protected async withRetry<T>(
    fn: () => Promise<T>,
    options: {maxRetries?: number; baseDelayMs?: number; maxDelayMs?: number} = {},
  ): Promise<T> {
    const {maxRetries = 3, baseDelayMs = 500, maxDelayMs = 10000} = options

    let retries = 0
    let delay = baseDelayMs

    while (true) {
      try {
        return await fn()
      } catch (error_) {
        const shouldRetry = retries < maxRetries && this.isRetryableError(error_)

        if (!shouldRetry) throw error_

        retries++
        await new Promise(resolve => setTimeout(resolve, delay))
        delay = Math.min(delay * (1.5 + Math.random() * 0.5), maxDelayMs)
      }
    }
  }

  protected isRetryableError(err: unknown): boolean {
    if (err instanceof Error) {
      const statusMatch = err.message.match(/status[:\s]+(\d+)/i)
      if (statusMatch?.[1]) {
        const status = Number.parseInt(statusMatch[1], 10)
        return status === 429 || status === 500 || status === 503
      }
    }
    return false
  }
}
