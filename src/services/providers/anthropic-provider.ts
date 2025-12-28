import type {CompletionChunk, CompletionRequest, Model, ValidationResult} from '@/types/provider'
import {
  ANTHROPIC_MODEL_ALIASES,
  ANTHROPIC_MODEL_CAPABILITIES,
  AnthropicResponseSchema,
  type AnthropicMessage,
  type AnthropicModelDated,
  type AnthropicRequest,
  type AnthropicStreamEvent,
} from '@/types/anthropic'
import {ProviderError} from '@/types/provider'
import {BaseLLMProvider} from './base-provider'

const ANTHROPIC_MODELS: Model[] = [
  {
    id: 'claude-opus-4-5-20250514',
    name: 'Claude Opus 4.5',
    provider: 'anthropic',
    capabilities: {
      supportsVision: true,
      supportsTools: true,
      supportsStreaming: true,
      contextWindow: 200000,
      maxOutputTokens: 32000,
    },
    pricingTier: 'premium',
  },
  {
    id: 'claude-sonnet-4-5-20250514',
    name: 'Claude Sonnet 4.5',
    provider: 'anthropic',
    capabilities: {
      supportsVision: true,
      supportsTools: true,
      supportsStreaming: true,
      contextWindow: 200000,
      maxOutputTokens: 16000,
    },
    pricingTier: 'standard',
  },
  {
    id: 'claude-haiku-4-5-20250514',
    name: 'Claude Haiku 4.5',
    provider: 'anthropic',
    capabilities: {
      supportsVision: true,
      supportsTools: true,
      supportsStreaming: true,
      contextWindow: 200000,
      maxOutputTokens: 8192,
    },
    pricingTier: 'standard',
  },
]

const BASE_URL = 'https://api.anthropic.com/v1'
const API_VERSION = '2023-06-01'

const RATE_LIMITS: Record<string, {requestsPerMinute: number; tokensPerMinute: number}> = {
  'claude-opus-4-5-20250514': {requestsPerMinute: 50, tokensPerMinute: 80000},
  'claude-sonnet-4-5-20250514': {requestsPerMinute: 100, tokensPerMinute: 160000},
  'claude-haiku-4-5-20250514': {requestsPerMinute: 200, tokensPerMinute: 200000},
}

class RateLimiter {
  private readonly requestCounts: Map<string, {count: number; resetAt: number}> = new Map()

  canMakeRequest(model: string): boolean {
    const limit = RATE_LIMITS[model]
    if (!limit) return true

    const now = Date.now()
    const entry = this.requestCounts.get(model)

    if (!entry || now > entry.resetAt) {
      return true
    }

    return entry.count < limit.requestsPerMinute
  }

  recordRequest(model: string): void {
    const now = Date.now()
    const entry = this.requestCounts.get(model)

    if (!entry || now > entry.resetAt) {
      this.requestCounts.set(model, {count: 1, resetAt: now + 60000})
      return
    }

    entry.count++
  }

  getWaitTime(model: string): number {
    const entry = this.requestCounts.get(model)
    if (!entry) return 0
    return Math.max(0, entry.resetAt - Date.now())
  }

  getRemainingRequests(model: string): number {
    const limit = RATE_LIMITS[model]
    if (!limit) return Infinity

    const entry = this.requestCounts.get(model)
    if (!entry || Date.now() > entry.resetAt) {
      return limit.requestsPerMinute
    }

    return Math.max(0, limit.requestsPerMinute - entry.count)
  }
}

const rateLimiter = new RateLimiter()

export class AnthropicProvider extends BaseLLMProvider {
  readonly id = 'anthropic' as const
  readonly name = 'Anthropic'
  readonly apiKeyRequired = true

  private apiKey: string | null = null
  private _isEnabled = true

  get isConfigured(): boolean {
    return this.apiKey !== null
  }

  get isEnabled(): boolean {
    return this._isEnabled
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey
  }

  clearApiKey(): void {
    this.apiKey = null
  }

  setEnabled(enabled: boolean): void {
    this._isEnabled = enabled
  }

  async validateCredentials(apiKey: string): Promise<ValidationResult> {
    try {
      const response = await fetch(`${BASE_URL}/messages`, {
        method: 'POST',
        headers: this.buildHeaders(apiKey),
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20250514',
          max_tokens: 1,
          messages: [{role: 'user', content: 'hi'}],
        }),
      })

      if (response.status === 401) {
        return {valid: false, error: 'Invalid API key'}
      }

      if (response.status === 403) {
        return {valid: false, error: 'Access denied. Check your API key permissions.'}
      }

      if (response.status === 429) {
        return {valid: false, error: 'Rate limit exceeded. Please try again later.'}
      }

      if (!response.ok && response.status !== 400) {
        const errorBody = await response.json().catch(() => ({}))
        const errorMessage = (errorBody as {error?: {message?: string}})?.error?.message || `HTTP ${response.status}`
        return {valid: false, error: errorMessage}
      }

      return {valid: true, models: ANTHROPIC_MODELS}
    } catch (error_) {
      const message = error_ instanceof Error ? error_.message : 'Unknown error'
      if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
        return {valid: false, error: 'Unable to connect to Anthropic API'}
      }
      return {valid: false, error: message}
    }
  }

  async listModels(): Promise<Model[]> {
    return ANTHROPIC_MODELS
  }

  async *createCompletion(request: CompletionRequest): AsyncIterable<CompletionChunk> {
    if (!this.apiKey) {
      throw new ProviderError('API key not set', 'authentication', 'anthropic')
    }

    const resolvedModel = this.resolveModel(request.model)

    if (!rateLimiter.canMakeRequest(resolvedModel)) {
      const waitTime = rateLimiter.getWaitTime(resolvedModel)
      throw new ProviderError(
        `Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`,
        'rate_limit',
        'anthropic',
        429,
      )
    }

    rateLimiter.recordRequest(resolvedModel)
    const anthropicRequest = this.mapToAnthropicRequest(request)
    const use1MContext = request.providerOptions?.anthropic?.use1MContext

    try {
      if (request.stream) {
        yield* this.createStreamingCompletion(anthropicRequest, {use1MContext})
      } else {
        yield* this.createNonStreamingCompletion(anthropicRequest, {use1MContext})
      }
    } catch (error_) {
      throw this.mapError(error_)
    }
  }

  private async *createStreamingCompletion(
    anthropicRequest: AnthropicRequest,
    options?: {use1MContext?: boolean},
  ): AsyncIterable<CompletionChunk> {
    const apiKey = this.apiKey
    if (!apiKey) {
      throw new ProviderError('API key not configured', 'authentication', 'anthropic')
    }

    const response = await this.withRetry(async () =>
      fetch(`${BASE_URL}/messages`, {
        method: 'POST',
        headers: this.buildHeaders(apiKey, options),
        body: JSON.stringify({...anthropicRequest, stream: true}),
      }),
    )

    if (!response.ok) {
      await this.handleErrorResponse(response)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new ProviderError('No response body', 'server', 'anthropic')
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let messageId = ''
    let totalInputTokens = 0
    let totalOutputTokens = 0

    try {
      while (true) {
        const {done, value} = await reader.read()
        if (done) break

        buffer += decoder.decode(value, {stream: true})
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue

          const data = line.slice(6).trim()
          if (!data || data === '[DONE]') continue

          let event: AnthropicStreamEvent
          try {
            event = JSON.parse(data) as AnthropicStreamEvent
          } catch {
            continue
          }

          const chunk = this.processStreamEvent(event, messageId)
          if (chunk) {
            if (chunk.id) messageId = chunk.id
            if (event.type === 'message_start') {
              const usage = (event.message as {usage?: {input_tokens?: number}})?.usage
              if (usage?.input_tokens) totalInputTokens = usage.input_tokens
            }
            if (event.type === 'message_delta') {
              totalOutputTokens = event.usage?.output_tokens || 0
            }
            yield chunk
          }
        }
      }

      yield {
        id: messageId,
        finishReason: 'stop',
        usage: {promptTokens: totalInputTokens, completionTokens: totalOutputTokens},
      }
    } finally {
      reader.releaseLock()
    }
  }

  private async *createNonStreamingCompletion(
    anthropicRequest: AnthropicRequest,
    options?: {use1MContext?: boolean},
  ): AsyncIterable<CompletionChunk> {
    const apiKey = this.apiKey
    if (!apiKey) {
      throw new ProviderError('API key not configured', 'authentication', 'anthropic')
    }

    const response = await this.withRetry(async () =>
      fetch(`${BASE_URL}/messages`, {
        method: 'POST',
        headers: this.buildHeaders(apiKey, options),
        body: JSON.stringify(anthropicRequest),
      }),
    )

    if (!response.ok) {
      await this.handleErrorResponse(response)
    }

    const data = AnthropicResponseSchema.parse(await response.json())
    const textContent = data.content.find(c => c.type === 'text')
    const toolUseBlocks = data.content.filter(c => c.type === 'tool_use')

    const chunk: CompletionChunk = {
      id: data.id,
      content: textContent && 'text' in textContent ? textContent.text : undefined,
      finishReason: this.mapFinishReason(data.stop_reason),
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
      },
    }

    if (toolUseBlocks.length > 0) {
      chunk.toolCalls = toolUseBlocks
        .filter(block => 'id' in block && 'name' in block && 'input' in block)
        .map(block => ({
          id: (block as {id: string}).id,
          name: (block as {name: string}).name,
          arguments: JSON.stringify((block as {input: unknown}).input),
        }))
    }

    yield chunk
  }

  private currentToolCall: {id: string; name: string; arguments: string} | null = null

  private processStreamEvent(event: AnthropicStreamEvent, currentId: string): CompletionChunk | null {
    switch (event.type) {
      case 'message_start':
        return {id: event.message?.id || currentId}

      case 'content_block_start':
        if (event.content_block?.type === 'tool_use') {
          this.currentToolCall = {
            id: event.content_block.id || '',
            name: event.content_block.name || '',
            arguments: '',
          }
        }
        return null

      case 'content_block_delta':
        if (event.delta.type === 'text_delta') {
          return {id: currentId, content: event.delta.text}
        }
        if (event.delta.type === 'thinking_delta') {
          return {id: currentId, content: `[thinking] ${event.delta.thinking}`}
        }
        if (event.delta.type === 'input_json_delta' && this.currentToolCall) {
          this.currentToolCall.arguments += event.delta.partial_json || ''
        }
        return null

      case 'content_block_stop':
        if (this.currentToolCall) {
          const chunk: CompletionChunk = {
            id: currentId,
            toolCalls: [{...this.currentToolCall}],
          }
          this.currentToolCall = null
          return chunk
        }
        return null

      case 'message_delta':
        return {
          id: currentId,
          finishReason: this.mapFinishReason(event.delta?.stop_reason),
        }

      case 'error':
        throw new ProviderError(event.error.message, 'server', 'anthropic')

      default:
        return null
    }
  }

  private mapToAnthropicRequest(request: CompletionRequest): AnthropicRequest {
    const resolvedModel = this.resolveModel(request.model)
    const capabilities = ANTHROPIC_MODEL_CAPABILITIES[resolvedModel]
    const maxTokens = request.maxTokens || capabilities?.maxOutputTokens || 4096
    const anthropicOptions = request.providerOptions?.anthropic

    const systemMessage = request.messages.find(m => m.role === 'system')
    const messages: AnthropicMessage[] = request.messages
      .filter(m => m.role !== 'system')
      .map(m => {
        if (m.role === 'tool' && m.toolCallId) {
          return {
            role: 'user' as const,
            content: [{type: 'tool_result' as const, tool_use_id: m.toolCallId, content: m.content}],
          }
        }
        return {
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }
      })

    const anthropicRequest: AnthropicRequest = {
      model: resolvedModel,
      messages,
      max_tokens: maxTokens,
    }

    if (systemMessage) {
      anthropicRequest.system = systemMessage.content
    }

    if (anthropicOptions?.extendedThinking?.enabled) {
      anthropicRequest.thinking = {
        type: 'enabled',
        budget_tokens: anthropicOptions.extendedThinking.budgetTokens || 10000,
      }
    } else if (request.temperature !== undefined) {
      anthropicRequest.temperature = request.temperature
    }

    if (request.tools && request.tools.length > 0) {
      anthropicRequest.tools = request.tools.map(tool => ({
        name: String(tool.name ?? ''),
        description: String(tool.description ?? ''),
        input_schema: {
          type: 'object' as const,
          properties: (tool.parameters as {properties?: Record<string, unknown>})?.properties || {},
          required: (tool.parameters as {required?: string[]})?.required,
        },
      }))
    }

    return anthropicRequest
  }

  private resolveModel(model: string): AnthropicModelDated {
    const alias = model as keyof typeof ANTHROPIC_MODEL_ALIASES
    if (alias in ANTHROPIC_MODEL_ALIASES) {
      return ANTHROPIC_MODEL_ALIASES[alias]
    }
    return model as AnthropicModelDated
  }

  private buildHeaders(apiKey: string, options?: {use1MContext?: boolean}): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': API_VERSION,
    }

    if (options?.use1MContext) {
      headers['anthropic-beta'] = 'max-tokens-3-5-sonnet-2024-07-15'
    }

    return headers
  }

  private mapFinishReason(reason: string | null | undefined): 'stop' | 'length' | 'tool_calls' | undefined {
    if (!reason) return undefined
    switch (reason) {
      case 'end_turn':
      case 'stop_sequence':
        return 'stop'
      case 'max_tokens':
        return 'length'
      case 'tool_use':
        return 'tool_calls'
      default:
        return undefined
    }
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    const body = await response.json().catch(() => ({}))
    const errorMessage = (body as {error?: {message?: string}})?.error?.message || `HTTP ${response.status}`

    switch (response.status) {
      case 400:
        throw new ProviderError(errorMessage, 'validation', 'anthropic', 400)
      case 401:
        throw new ProviderError('Invalid API key', 'authentication', 'anthropic', 401)
      case 403:
        throw new ProviderError('Access denied', 'permission', 'anthropic', 403)
      case 404:
        throw new ProviderError('Resource not found', 'not_found', 'anthropic', 404)
      case 429:
        throw new ProviderError('Rate limit exceeded', 'rate_limit', 'anthropic', 429)
      case 500:
      case 529:
        throw new ProviderError('Anthropic API error', 'server', 'anthropic', response.status)
      default:
        throw new ProviderError(errorMessage, 'unknown', 'anthropic', response.status)
    }
  }

  private mapError(err: unknown): ProviderError {
    if (err instanceof ProviderError) return err

    const message = err instanceof Error ? err.message : 'Unknown error'
    let errorType: 'authentication' | 'rate_limit' | 'server' | 'validation' | 'connection' | 'unknown' = 'unknown'

    if (message.includes('401') || message.toLowerCase().includes('invalid api key')) {
      errorType = 'authentication'
    } else if (message.includes('429')) {
      errorType = 'rate_limit'
    } else if (message.includes('500') || message.includes('503') || message.includes('529')) {
      errorType = 'server'
    } else if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
      errorType = 'connection'
    }

    return new ProviderError(message, errorType, 'anthropic')
  }

  getModelCapabilities(modelId: string) {
    const resolved = this.resolveModel(modelId)
    return ANTHROPIC_MODEL_CAPABILITIES[resolved]
  }
}

let anthropicProviderInstance: AnthropicProvider | null = null

export function getAnthropicProvider(): AnthropicProvider {
  if (!anthropicProviderInstance) {
    anthropicProviderInstance = new AnthropicProvider()
  }
  return anthropicProviderInstance
}

export function resetAnthropicProviderForTesting(): void {
  anthropicProviderInstance = null
}
