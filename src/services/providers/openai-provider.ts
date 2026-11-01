import type {CompletionChunk, CompletionRequest, Model, ProviderErrorType, ValidationResult} from '@/types/provider'
import {ProviderError, ReplayDataSchema} from '@/types/provider'
import OpenAI, {type ClientOptions} from 'openai'
import {BaseLLMProvider} from './base-provider'

type ResponseParams = Omit<OpenAI.Responses.ResponseCreateParamsNonStreaming, 'stream'>
type ResponseInput = OpenAI.Responses.ResponseInputItem[]

/**
 * o-series (`o1`, `o3-mini`, `o4-mini`, ...) and the gpt-5 family reason before answering. They need encrypted
 * reasoning requested to carry reasoning across stateless turns, and they reject `temperature`.
 * `gpt-5-chat*` is the non-reasoning chat variant.
 */
export function isReasoningModel(model: string): boolean {
  const id = model.toLowerCase()
  return /^(?:o\d|gpt-5)/.test(id) && !id.startsWith('gpt-5-chat')
}

/** Replay data is opaque JSON from storage, so check the shape before sending it back to the API. */
function isReasoningReplayItem(item: unknown): item is OpenAI.Responses.ResponseReasoningItem {
  return (
    typeof item === 'object' &&
    item !== null &&
    'type' in item &&
    item.type === 'reasoning' &&
    'encrypted_content' in item &&
    typeof item.encrypted_content === 'string'
  )
}

const OPENAI_MODELS: Model[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    capabilities: {
      supportsVision: true,
      supportsTools: true,
      supportsStreaming: true,
      contextWindow: 128000,
      maxOutputTokens: 16384,
    },
    pricingTier: 'premium',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    capabilities: {
      supportsVision: true,
      supportsTools: true,
      supportsStreaming: true,
      contextWindow: 128000,
      maxOutputTokens: 16384,
    },
    pricingTier: 'standard',
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    capabilities: {
      supportsVision: true,
      supportsTools: true,
      supportsStreaming: true,
      contextWindow: 128000,
      maxOutputTokens: 4096,
    },
    pricingTier: 'premium',
  },
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    capabilities: {
      supportsVision: false,
      supportsTools: true,
      supportsStreaming: true,
      contextWindow: 8192,
      maxOutputTokens: 8192,
    },
    pricingTier: 'premium',
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    capabilities: {
      supportsVision: false,
      supportsTools: true,
      supportsStreaming: true,
      contextWindow: 16385,
      maxOutputTokens: 4096,
    },
    pricingTier: 'standard',
  },
]

export class OpenAIProvider extends BaseLLMProvider {
  readonly id = 'openai' as const
  readonly name = 'OpenAI'
  readonly apiKeyRequired = true

  private client: OpenAI | null = null
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
    this.client = null
  }

  clearApiKey(): void {
    this.apiKey = null
    this.client = null
  }

  setEnabled(enabled: boolean): void {
    this._isEnabled = enabled
  }

  private ensureClient(): OpenAI {
    if (!this.apiKey) {
      throw new ProviderError('API key not set', 'authentication', 'openai')
    }

    if (!this.client) {
      const options: ClientOptions = {
        apiKey: this.apiKey,
        dangerouslyAllowBrowser: true,
      }
      this.client = new OpenAI(options)
    }

    return this.client
  }

  async validateCredentials(apiKey: string): Promise<ValidationResult> {
    try {
      const tempClient = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true,
      })

      await tempClient.models.list()

      return {
        valid: true,
        models: OPENAI_MODELS,
      }
    } catch (error_) {
      const message = error_ instanceof Error ? error_.message : 'Unknown error'

      if (message.includes('401') || message.toLowerCase().includes('invalid api key')) {
        return {valid: false, error: 'Invalid API key'}
      }

      if (message.includes('429')) {
        return {valid: false, error: 'Rate limit exceeded. Please try again later.'}
      }

      return {valid: false, error: message}
    }
  }

  async listModels(): Promise<Model[]> {
    this.ensureClient()
    return OPENAI_MODELS
  }

  /**
   * Streams (or, with `stream: false`, fetches) one reply on the Responses API. Stateless: the full history goes in
   * every call and `store: false` keeps nothing at OpenAI. Chat is text-only for now, so `request.tools` is ignored.
   * Aborts throw an `AbortError` and emit no final chunk.
   */
  async *createCompletion(request: CompletionRequest): AsyncIterable<CompletionChunk> {
    const client = this.ensureClient()
    const {signal} = request

    try {
      signal?.throwIfAborted()
      const params = this.buildParams(request)

      if (request.stream === false) {
        const response = await client.responses.create({...params, stream: false}, {signal})
        if (response.status === 'failed') throw this.mapResponseError(response.error)
        yield {...this.buildFinalChunk(response), content: response.output_text}
        return
      }

      let responseId = ''
      for await (const event of client.responses.stream(params, {signal})) {
        // The SDK may still hold events it buffered before the abort; don't deliver them.
        signal?.throwIfAborted()

        switch (event.type) {
          case 'response.output_text.delta':
          case 'response.refusal.delta':
            yield {id: responseId, content: event.delta}
            break
          case 'response.created':
            responseId = event.response.id
            break
          case 'response.completed':
          case 'response.incomplete':
            yield this.buildFinalChunk(event.response)
            return
          case 'response.failed':
            throw this.mapResponseError(event.response.error)
          case 'error':
            throw this.mapResponseError({code: event.code, message: event.message})
          default:
            break
        }
      }

      throw new ProviderError('Response stream ended before completion', 'connection', 'openai')
    } catch (error_) {
      throw this.mapError(error_, signal)
    }
  }

  private buildParams(request: CompletionRequest): ResponseParams {
    if (request.messages.length === 0) {
      throw new ProviderError('A completion needs at least one message', 'validation', 'openai')
    }

    const reasoning = isReasoningModel(request.model)

    return {
      model: request.model,
      input: this.buildInput(request.messages, reasoning),
      instructions: request.instructions || undefined,
      store: false,
      max_output_tokens: request.maxTokens,
      // Reasoning models reject `temperature`.
      temperature: reasoning ? undefined : request.temperature,
      include: reasoning ? ['reasoning.encrypted_content'] : undefined,
    }
  }

  /**
   * History order is preserved. System-role messages stay in place as `system` input items (the API treats them
   * as developer messages); `instructions` is a separate field and never merged with them. For reasoning models, an
   * assistant message's stored reasoning items go in directly before it, as the API requires for stateless replay.
   */
  private buildInput(messages: CompletionRequest['messages'], replayReasoning: boolean): ResponseInput {
    const input: ResponseInput = []

    for (const message of messages) {
      if (message.role === 'tool') {
        throw new ProviderError('Tool messages are not supported yet', 'validation', 'openai')
      }

      if (message.role === 'assistant' && replayReasoning) {
        const stored: unknown = message.replay?.openai
        if (Array.isArray(stored)) input.push(...stored.filter(isReasoningReplayItem))
      }

      input.push({role: message.role, content: message.content})
    }

    return input
  }

  private buildFinalChunk(response: OpenAI.Responses.Response): CompletionChunk {
    const chunk: CompletionChunk = {id: response.id, finishReason: this.mapFinishReason(response)}

    if (response.usage) {
      chunk.usage = {promptTokens: response.usage.input_tokens, completionTokens: response.usage.output_tokens}
    }

    // Reasoning items from an incomplete response aren't followed by their message, so they can't be replayed.
    if (response.status === 'completed') {
      const reasoningItems = response.output.filter(isReasoningReplayItem)
      if (reasoningItems.length > 0) {
        chunk.replay = ReplayDataSchema.parse({openai: reasoningItems})
      }
    }

    return chunk
  }

  private mapFinishReason(response: OpenAI.Responses.Response): 'stop' | 'length' | 'error' {
    if (response.status !== 'incomplete') return 'stop'
    return response.incomplete_details?.reason === 'max_output_tokens' ? 'length' : 'error'
  }

  private mapResponseError(error: {code?: string | null; message: string} | null): ProviderError {
    return new ProviderError(error?.message ?? 'The response failed', this.errorTypeFromCode(error?.code), 'openai')
  }

  private errorTypeFromCode(code: string | null | undefined): ProviderErrorType {
    switch (code) {
      case 'rate_limit_exceeded':
      case 'insufficient_quota':
        return 'rate_limit'
      case 'server_error':
        return 'server'
      case 'invalid_api_key':
        return 'authentication'
      default:
        return 'unknown'
    }
  }

  private errorTypeFromStatus(status: number | undefined): ProviderErrorType | undefined {
    switch (status) {
      case 400:
      case 422:
        return 'validation'
      case 401:
        return 'authentication'
      case 403:
        return 'permission'
      case 404:
        return 'not_found'
      case 429:
        return 'rate_limit'
      default:
        return status !== undefined && status >= 500 ? 'server' : undefined
    }
  }

  private mapError(err: unknown, signal?: AbortSignal): Error {
    const abortError = this.toAbortError(err, signal)
    if (abortError) return abortError
    if (err instanceof ProviderError) return err

    if (err instanceof OpenAI.APIConnectionTimeoutError) {
      return new ProviderError(err.message, 'timeout', 'openai')
    }
    if (err instanceof OpenAI.APIConnectionError) {
      return new ProviderError(err.message, 'connection', 'openai')
    }
    if (err instanceof OpenAI.APIError) {
      const status = typeof err.status === 'number' ? err.status : undefined
      const code = typeof err.code === 'string' ? err.code : undefined
      const type = this.errorTypeFromStatus(status) ?? this.errorTypeFromCode(code)
      return new ProviderError(err.message, type, 'openai', status)
    }

    return new ProviderError(err instanceof Error ? err.message : 'Unknown error', 'unknown', 'openai')
  }
}

let openaiProviderInstance: OpenAIProvider | null = null

export function getOpenAIProvider(): OpenAIProvider {
  if (!openaiProviderInstance) {
    openaiProviderInstance = new OpenAIProvider()
  }
  return openaiProviderInstance
}

export function resetOpenAIProviderForTesting(): void {
  openaiProviderInstance = null
}
