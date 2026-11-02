import {z} from 'zod'

export const ProviderIdSchema = z.enum(['openai', 'anthropic', 'ollama', 'azure'])
export type ProviderId = z.infer<typeof ProviderIdSchema>

export const ModelCapabilitiesSchema = z.object({
  supportsVision: z.boolean(),
  supportsTools: z.boolean(),
  supportsStreaming: z.boolean(),
  contextWindow: z.number().positive(),
  maxOutputTokens: z.number().positive().optional(),
})

export type ModelCapabilities = z.infer<typeof ModelCapabilitiesSchema>

export const ModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: ProviderIdSchema,
  capabilities: ModelCapabilitiesSchema,
  pricingTier: z.enum(['free', 'standard', 'premium']).optional(),
})

export type Model = z.infer<typeof ModelSchema>

export const ProviderConfigSchema = z.object({
  id: ProviderIdSchema,
  name: z.string(),
  apiKeyRequired: z.boolean(),
  baseUrl: z.url().optional(),
  isConfigured: z.boolean(),
  isEnabled: z.boolean(),
})

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>

/** Providers that can talk to a compatible gateway instead of the vendor's own endpoint. */
export const BaseUrlProviderIdSchema = z.enum(['openai', 'anthropic'])
export type BaseUrlProviderId = z.infer<typeof BaseUrlProviderIdSchema>

function parseUrl(value: string): URL | undefined {
  try {
    return new URL(value)
  } catch {
    return undefined
  }
}

/**
 * An optional endpoint override, entered with its API version segment (for example `https://host/v1`), the same shape
 * as the vendor defaults. Trimmed, http(s) only, trailing slashes dropped. Credentials, a query string or a fragment
 * are refused: the URL is stored unencrypted and requests append paths to it.
 */
export const ProviderBaseUrlSchema = z
  .string()
  .trim()
  .pipe(z.url({protocol: /^https?$/, error: 'Enter an http:// or https:// URL, for example http://localhost:8317/v1'}))
  // These run even when the URL check above failed, so they must tolerate a value that does not parse.
  .refine(value => {
    const url = parseUrl(value)
    return !url?.username && !url?.password
  }, 'Remove the username and password from the URL')
  // Check the raw text: `URL.search` and `URL.hash` are empty for a bare trailing `?` or `#`, but the stored string
  // would still break the request paths appended to it.
  .refine(value => !value.includes('?') && !value.includes('#'), 'Remove the query string and fragment from the URL')
  .transform(value => value.replace(/\/+$/, ''))

export const ProviderEndpointConfigSchema = z.object({
  baseUrl: ProviderBaseUrlSchema.optional(),
})

export type ProviderEndpointConfig = z.input<typeof ProviderEndpointConfigSchema>

export const ProviderBaseUrlsSchema = z.partialRecord(BaseUrlProviderIdSchema, ProviderBaseUrlSchema)
export type ProviderBaseUrls = z.infer<typeof ProviderBaseUrlsSchema>

export const MessageRoleSchema = z.enum(['system', 'user', 'assistant', 'tool'])
export type MessageRole = z.infer<typeof MessageRoleSchema>

/**
 * Opaque per-provider replay data, keyed by the provider that produced it (for example OpenAI's encrypted reasoning
 * items). Only the owning provider interprets its entry; every other provider ignores it. JSON-only so it can be
 * persisted with a message and exported.
 */
export const ReplayDataSchema = z.partialRecord(ProviderIdSchema, z.json())
export type ReplayData = z.infer<typeof ReplayDataSchema>

export const CompletionMessageSchema = z.object({
  role: MessageRoleSchema,
  content: z.string(),
  toolCallId: z.string().optional(),
  replay: ReplayDataSchema.optional(),
})

export type CompletionMessage = z.infer<typeof CompletionMessageSchema>

export const AnthropicOptionsSchema = z.object({
  extendedThinking: z
    .object({
      enabled: z.boolean(),
      budgetTokens: z.number().min(1024).max(128000).optional(),
    })
    .optional(),
  use1MContext: z.boolean().optional(),
})

export type AnthropicOptions = z.infer<typeof AnthropicOptionsSchema>

/** Runtime-only: an `AbortSignal` can't be serialized, so it must never be persisted or sent over the wire. */
const AbortSignalSchema = z.custom<AbortSignal>(
  value => typeof AbortSignal !== 'undefined' && value instanceof AbortSignal,
  'Expected an AbortSignal',
)

export const CompletionRequestSchema = z.object({
  model: z.string(),
  /** Top-level system-level guidance. Providers map it to their native instructions or system message. */
  instructions: z.string().optional(),
  messages: z.array(CompletionMessageSchema),
  /** Aborting ends the completion with an `AbortError`. */
  signal: AbortSignalSchema.optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  tools: z.array(z.record(z.string(), z.unknown())).optional(),
  stream: z.boolean().default(true),
  providerOptions: z
    .object({
      anthropic: AnthropicOptionsSchema.optional(),
    })
    .optional(),
})

export type CompletionRequest = z.infer<typeof CompletionRequestSchema>

export const ToolCallSchema = z.object({
  id: z.string(),
  name: z.string(),
  arguments: z.string(),
})

export type ToolCall = z.infer<typeof ToolCallSchema>

export const CompletionChunkSchema = z.object({
  id: z.string(),
  content: z.string().optional(),
  toolCalls: z.array(ToolCallSchema).optional(),
  finishReason: z.enum(['stop', 'length', 'tool_calls', 'error']).optional(),
  /** Replay data for the message this chunk completes; send it back on that message in later requests. */
  replay: ReplayDataSchema.optional(),
  usage: z
    .object({
      promptTokens: z.number(),
      completionTokens: z.number(),
    })
    .optional(),
})

export type CompletionChunk = z.infer<typeof CompletionChunkSchema>

export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  error: z.string().optional(),
  models: z.array(ModelSchema).optional(),
})

export type ValidationResult = z.infer<typeof ValidationResultSchema>

export const ProviderErrorTypeSchema = z.enum([
  'authentication',
  'permission',
  'not_found',
  'rate_limit',
  'server',
  'timeout',
  'validation',
  'connection',
  'not_implemented',
  'unknown',
])

export type ProviderErrorType = z.infer<typeof ProviderErrorTypeSchema>

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly type: ProviderErrorType,
    readonly provider: ProviderId,
    readonly statusCode?: number,
  ) {
    super(message)
    this.name = 'ProviderError'
  }
}
