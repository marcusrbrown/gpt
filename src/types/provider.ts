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

export const MessageRoleSchema = z.enum(['system', 'user', 'assistant', 'tool'])
export type MessageRole = z.infer<typeof MessageRoleSchema>

export const CompletionMessageSchema = z.object({
  role: MessageRoleSchema,
  content: z.string(),
  toolCallId: z.string().optional(),
})

export type CompletionMessage = z.infer<typeof CompletionMessageSchema>

export const CompletionRequestSchema = z.object({
  model: z.string(),
  messages: z.array(CompletionMessageSchema),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  tools: z.array(z.record(z.string(), z.unknown())).optional(),
  stream: z.boolean().default(true),
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
