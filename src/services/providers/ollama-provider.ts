import type {OllamaChatMessage, OllamaChatRequest, OllamaConfig, OllamaModelInfo} from '@/types/ollama'
import type {CompletionChunk, CompletionRequest, Model, ValidationResult} from '@/types/provider'

import {
  formatModelSize,
  OllamaChatResponseSchema,
  OllamaConfigSchema,
  OllamaModelsResponseSchema,
  OllamaStreamChunkSchema,
  parseThinkingContent,
  supportsThinking,
  supportsVision,
} from '@/types/ollama'
import {ProviderError} from '@/types/provider'
import {BaseLLMProvider} from './base-provider'

const DEFAULT_BASE_URL = 'http://localhost:11434'
const MODEL_CACHE_TTL = 60000

export class OllamaProvider extends BaseLLMProvider {
  readonly id = 'ollama' as const
  readonly name = 'Ollama'
  readonly apiKeyRequired = false

  private _isEnabled = true
  private config: OllamaConfig = OllamaConfigSchema.parse({})
  private cachedModels: OllamaModelInfo[] = []
  private lastModelFetch = 0

  get isConfigured(): boolean {
    return true
  }

  get isEnabled(): boolean {
    return this._isEnabled
  }

  get baseUrl(): string {
    return this.config.baseUrl
  }

  setApiKey(_apiKey: string): void {
    // Ollama doesn't require an API key
  }

  clearApiKey(): void {
    // Ollama doesn't require an API key
  }

  setEnabled(enabled: boolean): void {
    this._isEnabled = enabled
  }

  configure(config: Partial<OllamaConfig>): void {
    this.config = OllamaConfigSchema.parse({...this.config, ...config})
    this.lastModelFetch = 0
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      })
      return response.ok
    } catch {
      return false
    }
  }

  async validateCredentials(_apiKey: string, baseUrl?: string): Promise<ValidationResult> {
    const url = baseUrl || this.config.baseUrl

    try {
      const response = await fetch(`${url}/api/tags`, {
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        return {valid: false, error: `Ollama server returned ${response.status}`}
      }

      const data = await response.json()
      const parsed = OllamaModelsResponseSchema.safeParse(data)

      if (!parsed.success) {
        return {valid: false, error: 'Invalid response from Ollama server'}
      }

      const models = this.mapToProviderModels(parsed.data.models)
      return {valid: true, models}
    } catch (error_) {
      const message = error_ instanceof Error ? error_.message : 'Unknown error'
      if (message.includes('Failed to fetch') || message.includes('NetworkError') || message.includes('timeout')) {
        return {valid: false, error: 'Cannot connect to Ollama. Is it running?'}
      }
      return {valid: false, error: message}
    }
  }

  async listModels(): Promise<Model[]> {
    const now = Date.now()

    if (this.cachedModels.length > 0 && now - this.lastModelFetch < MODEL_CACHE_TTL) {
      return this.mapToProviderModels(this.cachedModels)
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        throw new ProviderError(`Ollama returned ${response.status}`, 'server', 'ollama', response.status)
      }

      const data = await response.json()
      const parsed = OllamaModelsResponseSchema.parse(data)
      this.cachedModels = parsed.models
      this.lastModelFetch = now

      return this.mapToProviderModels(this.cachedModels)
    } catch (error_) {
      if (error_ instanceof ProviderError) throw error_
      throw new ProviderError('Failed to connect to Ollama. Is it running?', 'connection', 'ollama')
    }
  }

  async *createCompletion(request: CompletionRequest): AsyncIterable<CompletionChunk> {
    const ollamaRequest = this.mapToOllamaRequest(request)

    try {
      if (request.stream) {
        yield* this.createStreamingCompletion(ollamaRequest)
      } else {
        yield* this.createNonStreamingCompletion(ollamaRequest)
      }
    } catch (error_) {
      throw this.mapError(error_)
    }
  }

  private async *createStreamingCompletion(ollamaRequest: OllamaChatRequest): AsyncIterable<CompletionChunk> {
    const response = await this.withRetry(async () =>
      fetch(`${this.config.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({...ollamaRequest, stream: true}),
        signal: AbortSignal.timeout(this.config.timeout),
      }),
    )

    if (!response.ok) {
      throw await this.handleErrorResponse(response)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new ProviderError('No response body', 'server', 'ollama')
    }

    const decoder = new TextDecoder()
    let buffer = ''
    const messageId = `ollama-${Date.now()}`
    let totalContent = ''
    let promptTokens = 0
    let completionTokens = 0

    try {
      while (true) {
        const {done, value} = await reader.read()
        if (done) break

        buffer += decoder.decode(value, {stream: true})
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim()) continue

          let chunk
          try {
            chunk = OllamaStreamChunkSchema.parse(JSON.parse(line))
          } catch {
            continue
          }

          if (chunk.message.content) {
            totalContent += chunk.message.content
            yield {id: messageId, content: chunk.message.content}
          }

          if (chunk.done) {
            promptTokens = chunk.prompt_eval_count || 0
            completionTokens = chunk.eval_count || 0
          }
        }
      }

      // Handle thinking content for reasoning models
      const thinkingResult = parseThinkingContent(totalContent)
      if (thinkingResult.hasThinking) {
        yield {
          id: messageId,
          content: `[thinking] ${thinkingResult.thinking}\n\n${thinkingResult.response}`,
        }
      }

      yield {
        id: messageId,
        finishReason: 'stop',
        usage: {promptTokens, completionTokens},
      }
    } finally {
      reader.releaseLock()
    }
  }

  private async *createNonStreamingCompletion(ollamaRequest: OllamaChatRequest): AsyncIterable<CompletionChunk> {
    const response = await this.withRetry(async () =>
      fetch(`${this.config.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({...ollamaRequest, stream: false}),
        signal: AbortSignal.timeout(this.config.timeout),
      }),
    )

    if (!response.ok) {
      throw await this.handleErrorResponse(response)
    }

    const data = OllamaChatResponseSchema.parse(await response.json())
    const messageId = `ollama-${Date.now()}`

    // Handle thinking content for reasoning models
    let content = data.message.content
    const thinkingResult = parseThinkingContent(content)
    if (thinkingResult.hasThinking) {
      content = `[thinking] ${thinkingResult.thinking}\n\n${thinkingResult.response}`
    }

    yield {
      id: messageId,
      content,
      finishReason: data.done ? 'stop' : 'length',
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
      },
    }
  }

  // Ollama-specific methods

  async pullModel(model: string, onProgress?: (progress: number) => void): Promise<void> {
    const response = await fetch(`${this.config.baseUrl}/api/pull`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({name: model, stream: true}),
    })

    if (!response.ok) {
      throw new ProviderError(`Failed to pull model: ${response.status}`, 'server', 'ollama', response.status)
    }

    const reader = response.body?.getReader()
    if (!reader) return

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const {done, value} = await reader.read()
        if (done) break

        buffer += decoder.decode(value, {stream: true})
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const data = JSON.parse(line) as {total?: number; completed?: number}
            if (data.total && data.completed && onProgress) {
              onProgress(data.completed / data.total)
            }
          } catch {
            // Skip malformed chunks
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    this.lastModelFetch = 0
  }

  async deleteModel(model: string): Promise<void> {
    const response = await fetch(`${this.config.baseUrl}/api/delete`, {
      method: 'DELETE',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({name: model}),
    })

    if (!response.ok) {
      throw new ProviderError(`Failed to delete model: ${response.status}`, 'server', 'ollama', response.status)
    }

    this.lastModelFetch = 0
  }

  async getModelDetails(model: string): Promise<OllamaModelInfo | undefined> {
    await this.listModels()
    return this.cachedModels.find(m => m.name === model || m.model === model)
  }

  getCachedModels(): OllamaModelInfo[] {
    return this.cachedModels
  }

  invalidateModelCache(): void {
    this.lastModelFetch = 0
    this.cachedModels = []
  }

  private mapToOllamaRequest(request: CompletionRequest): OllamaChatRequest {
    const messages: OllamaChatMessage[] = request.messages.map(m => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content,
    }))

    // Check if model supports thinking and modify system prompt for qwen3
    const modelName = request.model.toLowerCase()
    if (supportsThinking(modelName) && modelName.startsWith('qwen3')) {
      const systemIndex = messages.findIndex(m => m.role === 'system')
      if (systemIndex === -1) {
        // No system message, add one with /think
        messages.unshift({
          role: 'system',
          content: '/think',
        })
      } else {
        const existingMessage = messages[systemIndex]
        if (existingMessage) {
          messages[systemIndex] = {
            role: 'system',
            content: `${existingMessage.content}\n\n/think`,
          }
        }
      }
    }

    return {
      model: request.model,
      messages,
      stream: request.stream ?? true,
      options: {
        temperature: request.temperature,
        num_predict: request.maxTokens,
      },
      keep_alive: this.config.keepAlive,
    }
  }

  private mapToProviderModels(ollamaModels: OllamaModelInfo[]): Model[] {
    return ollamaModels.map(m => {
      const hasVision = supportsVision(m.name)
      const contextWindow = this.inferContextWindow(m)

      return {
        id: m.name,
        name: `${m.name} (${formatModelSize(m.size)})`,
        provider: 'ollama' as const,
        capabilities: {
          supportsVision: hasVision,
          supportsTools: false,
          supportsStreaming: true,
          contextWindow,
        },
        pricingTier: 'free' as const,
      }
    })
  }

  private inferContextWindow(model: OllamaModelInfo): number {
    const family = model.details.family.toLowerCase()
    const name = model.name.toLowerCase()

    if (name.includes('deepseek-r1') || name.includes('llama3.3') || name.includes('llama3.2-vision')) {
      return 128000
    }
    if (name.includes('qwen3') || family.includes('qwen')) {
      return 40000
    }
    if (name.includes('gemma3')) {
      return 32000
    }
    if (family.includes('llama')) {
      return 8192
    }
    return 4096
  }

  private async handleErrorResponse(response: Response): Promise<ProviderError> {
    const body = await response.text()

    switch (response.status) {
      case 404:
        return new ProviderError('Model not found. Try: ollama pull <model>', 'not_found', 'ollama', 404)
      case 500:
        return new ProviderError(body || 'Ollama server error', 'server', 'ollama', 500)
      default:
        return new ProviderError(`Ollama error: ${response.status}`, 'unknown', 'ollama', response.status)
    }
  }

  private mapError(err: unknown): ProviderError {
    if (err instanceof ProviderError) return err

    const message = err instanceof Error ? err.message : 'Unknown error'

    if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
      return new ProviderError('Cannot connect to Ollama. Is it running?', 'connection', 'ollama')
    }
    if (message.includes('timeout') || message.includes('AbortError')) {
      return new ProviderError('Request timed out. Model may still be loading.', 'timeout', 'ollama')
    }

    return new ProviderError(message, 'unknown', 'ollama')
  }
}

let ollamaProviderInstance: OllamaProvider | null = null

export function getOllamaProvider(): OllamaProvider {
  if (!ollamaProviderInstance) {
    ollamaProviderInstance = new OllamaProvider()
  }
  return ollamaProviderInstance
}

export function resetOllamaProviderForTesting(): void {
  ollamaProviderInstance = null
}

/** Clear the model cache - useful for testing */
export function clearOllamaModelCacheForTesting(provider: OllamaProvider): void {
  // Access private members for testing
  ;(provider as unknown as {cachedModels: OllamaModelInfo[]; lastModelFetch: number}).cachedModels = []
  ;(provider as unknown as {lastModelFetch: number}).lastModelFetch = 0
}

export {DEFAULT_BASE_URL}
