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

  /** Read only the provider's human error field, never the raw response body. */
  protected async readErrorMessage(response: Response): Promise<string> {
    const body: unknown = await response.json().catch(() => undefined)
    if (body && typeof body === 'object' && 'error' in body) {
      const error = body.error
      if (typeof error === 'string' && error.trim()) return error.trim()
      if (
        error &&
        typeof error === 'object' &&
        'message' in error &&
        typeof error.message === 'string' &&
        error.message.trim()
      ) {
        return error.message.trim()
      }
    }
    return response.statusText || `HTTP ${response.status}`
  }

  /**
   * Returns an `AbortError` when the caller's signal aborted or `err` already is one, otherwise `null`.
   * Providers rethrow it as-is so callers can tell a deliberate stop from a failure; a fetch that rejects
   * after an abort (any message) is treated as that abort rather than a provider error.
   */
  protected toAbortError(err: unknown, signal?: AbortSignal): Error | null {
    if (signal?.aborted) {
      const {reason} = signal
      return reason instanceof Error && reason.name === 'AbortError'
        ? reason
        : new DOMException('The operation was aborted.', 'AbortError')
    }
    return err instanceof Error && err.name === 'AbortError' ? err : null
  }

  /**
   * Cancels `reader` as soon as `signal` aborts so a pending `read()` settles instead of hanging.
   * Callers check `signal.aborted` after the read loop. Returns a cleanup function.
   */
  protected cancelReaderOnAbort(reader: ReadableStreamDefaultReader<Uint8Array>, signal?: AbortSignal): () => void {
    if (!signal) return () => {}

    const handleAbort = () => {
      reader.cancel().catch(() => {})
    }
    if (signal.aborted) {
      handleAbort()
      return () => {}
    }
    signal.addEventListener('abort', handleAbort, {once: true})
    return () => signal.removeEventListener('abort', handleAbort)
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
