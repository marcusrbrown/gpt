import type {CompletionChunk, CompletionRequest, Model, ValidationResult} from '@/types/provider'
import {ProviderError} from '@/types/provider'
import OpenAI, {type ClientOptions} from 'openai'
import {BaseLLMProvider} from './base-provider'

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

  async *createCompletion(request: CompletionRequest): AsyncIterable<CompletionChunk> {
    const client = this.ensureClient()

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = request.messages.map(msg => {
      if (msg.role === 'tool' && msg.toolCallId) {
        return {
          role: 'tool' as const,
          content: msg.content,
          tool_call_id: msg.toolCallId,
        }
      }
      return {
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content,
      }
    })

    const tools: OpenAI.Chat.ChatCompletionTool[] | undefined = request.tools?.map(tool => ({
      type: 'function' as const,
      function: {
        name: String(tool.name ?? ''),
        description: String(tool.description ?? ''),
        parameters: (tool.parameters ?? {}) as Record<string, unknown>,
      },
    }))

    try {
      if (request.stream) {
        const stream = await this.withRetry(async () =>
          client.chat.completions.create({
            model: request.model,
            messages,
            temperature: request.temperature,
            max_tokens: request.maxTokens,
            tools: tools && tools.length > 0 ? tools : undefined,
            stream: true,
          }),
        )

        let chunkId = ''
        for await (const chunk of stream) {
          chunkId = chunk.id
          const delta = chunk.choices[0]?.delta
          const finishReason = chunk.choices[0]?.finish_reason

          const completionChunk: CompletionChunk = {
            id: chunk.id,
            content: delta?.content ?? undefined,
            finishReason: this.mapFinishReason(finishReason),
          }

          if (delta?.tool_calls) {
            completionChunk.toolCalls = delta.tool_calls
              .filter(tc => tc.function?.name)
              .map(tc => ({
                id: tc.id ?? '',
                name: tc.function?.name ?? '',
                arguments: tc.function?.arguments ?? '',
              }))
          }

          yield completionChunk
        }

        yield {id: chunkId, finishReason: 'stop'}
      } else {
        const response = await this.withRetry(async () =>
          client.chat.completions.create({
            model: request.model,
            messages,
            temperature: request.temperature,
            max_tokens: request.maxTokens,
            tools: tools && tools.length > 0 ? tools : undefined,
            stream: false,
          }),
        )

        const choice = response.choices[0]
        const completionChunk: CompletionChunk = {
          id: response.id,
          content: choice?.message?.content ?? undefined,
          finishReason: this.mapFinishReason(choice?.finish_reason),
          usage: response.usage
            ? {
                promptTokens: response.usage.prompt_tokens,
                completionTokens: response.usage.completion_tokens,
              }
            : undefined,
        }

        if (choice?.message?.tool_calls) {
          completionChunk.toolCalls = choice.message.tool_calls
            .filter(
              (tc): tc is OpenAI.Chat.ChatCompletionMessageToolCall & {type: 'function'} => tc.type === 'function',
            )
            .map(tc => ({
              id: tc.id,
              name: tc.function.name,
              arguments: tc.function.arguments,
            }))
        }

        yield completionChunk
      }
    } catch (error_) {
      throw this.mapError(error_)
    }
  }

  private mapFinishReason(reason: string | null | undefined): 'stop' | 'length' | 'tool_calls' | 'error' | undefined {
    if (!reason) return undefined
    switch (reason) {
      case 'stop':
        return 'stop'
      case 'length':
        return 'length'
      case 'tool_calls':
        return 'tool_calls'
      default:
        return undefined
    }
  }

  private mapError(err: unknown): ProviderError {
    if (err instanceof ProviderError) {
      return err
    }

    const message = err instanceof Error ? err.message : 'Unknown error'
    let errorType: 'authentication' | 'rate_limit' | 'server' | 'validation' | 'connection' | 'unknown' = 'unknown'

    if (message.includes('401') || message.toLowerCase().includes('invalid api key')) {
      errorType = 'authentication'
    } else if (message.includes('429')) {
      errorType = 'rate_limit'
    } else if (message.includes('500') || message.includes('503')) {
      errorType = 'server'
    } else if (message.includes('ECONNREFUSED') || message.includes('ENOTFOUND')) {
      errorType = 'connection'
    }

    return new ProviderError(message, errorType, 'openai')
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
