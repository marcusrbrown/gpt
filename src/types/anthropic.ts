import {z} from 'zod'

export const AnthropicModelDatedSchema = z.enum([
  'claude-opus-4-5-20250514',
  'claude-sonnet-4-5-20250514',
  'claude-haiku-4-5-20250514',
])

export const AnthropicModelAliasSchema = z.enum(['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-4-5'])

export const AnthropicModelSchema = z.union([AnthropicModelDatedSchema, AnthropicModelAliasSchema])

export const AnthropicModelCapabilitiesSchema = z.object({
  model: AnthropicModelDatedSchema,
  alias: AnthropicModelAliasSchema,
  contextWindow: z.number(),
  maxContextWindow: z.number().optional(),
  maxOutputTokens: z.number(),
  supportsVision: z.boolean(),
  supportsTools: z.boolean(),
  supportsExtendedThinking: z.boolean(),
  supports1MContext: z.boolean(),
  inputPricePerMillion: z.number(),
  outputPricePerMillion: z.number(),
})

export const AnthropicTextContentSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
})

export const AnthropicImageContentSchema = z.object({
  type: z.literal('image'),
  source: z.object({
    type: z.literal('base64'),
    media_type: z.enum(['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
    data: z.string(),
  }),
})

export const AnthropicToolUseContentSchema = z.object({
  type: z.literal('tool_use'),
  id: z.string(),
  name: z.string(),
  input: z.record(z.string(), z.any()),
})

export const AnthropicToolResultContentSchema = z.object({
  type: z.literal('tool_result'),
  tool_use_id: z.string(),
  content: z.union([z.string(), z.array(z.object({type: z.literal('text'), text: z.string()}))]),
  is_error: z.boolean().optional(),
})

export const AnthropicThinkingContentSchema = z.object({
  type: z.literal('thinking'),
  thinking: z.string(),
})

export const AnthropicRedactedThinkingContentSchema = z.object({
  type: z.literal('redacted_thinking'),
  data: z.string(),
})

export const AnthropicContentBlockSchema = z.union([
  AnthropicTextContentSchema,
  AnthropicImageContentSchema,
  AnthropicToolUseContentSchema,
  AnthropicToolResultContentSchema,
  AnthropicThinkingContentSchema,
  AnthropicRedactedThinkingContentSchema,
])

export const AnthropicMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.union([z.string(), z.array(AnthropicContentBlockSchema)]),
})

export const AnthropicToolSchema = z.object({
  name: z.string().max(64),
  description: z.string().optional(),
  input_schema: z.object({
    type: z.literal('object'),
    properties: z.record(z.string(), z.any()),
    required: z.array(z.string()).optional(),
  }),
})

export const AnthropicToolChoiceSchema = z.union([
  z.object({type: z.literal('auto')}),
  z.object({type: z.literal('any')}),
  z.object({type: z.literal('tool'), name: z.string()}),
  z.object({type: z.literal('none')}),
])

export const AnthropicExtendedThinkingConfigSchema = z.object({
  type: z.literal('enabled'),
  budget_tokens: z.number().min(1024).max(128000),
})

export const AnthropicRequestSchema = z.object({
  model: AnthropicModelSchema,
  messages: z.array(AnthropicMessageSchema),
  system: z.string().optional(),
  max_tokens: z.number().min(1).max(64000),
  temperature: z.number().min(0).max(1).optional(),
  top_p: z.number().min(0).max(1).optional(),
  top_k: z.number().min(0).optional(),
  stop_sequences: z.array(z.string()).optional(),
  stream: z.boolean().optional(),
  tools: z.array(AnthropicToolSchema).optional(),
  tool_choice: AnthropicToolChoiceSchema.optional(),
  thinking: AnthropicExtendedThinkingConfigSchema.optional(),
})

export const AnthropicUsageSchema = z.object({
  input_tokens: z.number(),
  output_tokens: z.number(),
  cache_creation_input_tokens: z.number().optional(),
  cache_read_input_tokens: z.number().optional(),
})

export const AnthropicStopReasonSchema = z.enum(['end_turn', 'max_tokens', 'stop_sequence', 'tool_use'])

export const AnthropicResponseSchema = z.object({
  id: z.string(),
  type: z.literal('message'),
  role: z.literal('assistant'),
  content: z.array(AnthropicContentBlockSchema),
  model: z.string(),
  stop_reason: AnthropicStopReasonSchema.nullable(),
  stop_sequence: z.string().nullable(),
  usage: AnthropicUsageSchema,
})

export const AnthropicMessageStartEventSchema = z.object({
  type: z.literal('message_start'),
  message: AnthropicResponseSchema.partial(),
})

const ContentBlockStartTextSchema = z.object({type: z.literal('text'), text: z.string()})
const ContentBlockStartToolUseSchema = z.object({
  type: z.literal('tool_use'),
  id: z.string(),
  name: z.string(),
  input: z.record(z.string(), z.any()).optional(),
})
const ContentBlockStartThinkingSchema = z.object({type: z.literal('thinking'), thinking: z.string()})

export const AnthropicContentBlockStartEventSchema = z.object({
  type: z.literal('content_block_start'),
  index: z.number(),
  content_block: z.union([
    ContentBlockStartTextSchema,
    ContentBlockStartToolUseSchema,
    ContentBlockStartThinkingSchema,
  ]),
})

export const AnthropicTextDeltaSchema = z.object({
  type: z.literal('text_delta'),
  text: z.string(),
})

export const AnthropicThinkingDeltaSchema = z.object({
  type: z.literal('thinking_delta'),
  thinking: z.string(),
})

export const AnthropicInputJsonDeltaSchema = z.object({
  type: z.literal('input_json_delta'),
  partial_json: z.string(),
})

export const AnthropicContentBlockDeltaEventSchema = z.object({
  type: z.literal('content_block_delta'),
  index: z.number(),
  delta: z.union([AnthropicTextDeltaSchema, AnthropicThinkingDeltaSchema, AnthropicInputJsonDeltaSchema]),
})

export const AnthropicContentBlockStopEventSchema = z.object({
  type: z.literal('content_block_stop'),
  index: z.number(),
})

export const AnthropicMessageDeltaEventSchema = z.object({
  type: z.literal('message_delta'),
  delta: z.object({
    stop_reason: AnthropicStopReasonSchema.nullable(),
    stop_sequence: z.string().nullable().optional(),
  }),
  usage: z.object({output_tokens: z.number()}),
})

export const AnthropicMessageStopEventSchema = z.object({
  type: z.literal('message_stop'),
})

export const AnthropicPingEventSchema = z.object({
  type: z.literal('ping'),
})

export const AnthropicErrorEventSchema = z.object({
  type: z.literal('error'),
  error: z.object({
    type: z.string(),
    message: z.string(),
  }),
})

export const AnthropicStreamEventSchema = z.discriminatedUnion('type', [
  AnthropicMessageStartEventSchema,
  AnthropicContentBlockStartEventSchema,
  AnthropicContentBlockDeltaEventSchema,
  AnthropicContentBlockStopEventSchema,
  AnthropicMessageDeltaEventSchema,
  AnthropicMessageStopEventSchema,
  AnthropicPingEventSchema,
  AnthropicErrorEventSchema,
])

export const AnthropicAPIErrorSchema = z.object({
  type: z.literal('error'),
  error: z.object({
    type: z.string(),
    message: z.string(),
  }),
})

export const AnthropicRateLimitInfoSchema = z.object({
  requestsLimit: z.number().optional(),
  requestsRemaining: z.number().optional(),
  requestsReset: z.date().optional(),
  tokensLimit: z.number().optional(),
  tokensRemaining: z.number().optional(),
  tokensReset: z.date().optional(),
  retryAfter: z.number().optional(),
})

export type AnthropicModel = z.infer<typeof AnthropicModelSchema>
export type AnthropicModelDated = z.infer<typeof AnthropicModelDatedSchema>
export type AnthropicModelAlias = z.infer<typeof AnthropicModelAliasSchema>
export type AnthropicModelCapabilities = z.infer<typeof AnthropicModelCapabilitiesSchema>
export type AnthropicContentBlock = z.infer<typeof AnthropicContentBlockSchema>
export type AnthropicTextContent = z.infer<typeof AnthropicTextContentSchema>
export type AnthropicImageContent = z.infer<typeof AnthropicImageContentSchema>
export type AnthropicToolUseContent = z.infer<typeof AnthropicToolUseContentSchema>
export type AnthropicToolResultContent = z.infer<typeof AnthropicToolResultContentSchema>
export type AnthropicThinkingContent = z.infer<typeof AnthropicThinkingContentSchema>
export type AnthropicMessage = z.infer<typeof AnthropicMessageSchema>
export type AnthropicTool = z.infer<typeof AnthropicToolSchema>
export type AnthropicToolChoice = z.infer<typeof AnthropicToolChoiceSchema>
export type AnthropicExtendedThinkingConfig = z.infer<typeof AnthropicExtendedThinkingConfigSchema>
export type AnthropicRequest = z.infer<typeof AnthropicRequestSchema>
export type AnthropicResponse = z.infer<typeof AnthropicResponseSchema>
export type AnthropicUsage = z.infer<typeof AnthropicUsageSchema>
export type AnthropicStopReason = z.infer<typeof AnthropicStopReasonSchema>
export type AnthropicStreamEvent = z.infer<typeof AnthropicStreamEventSchema>
export type AnthropicAPIError = z.infer<typeof AnthropicAPIErrorSchema>
export type AnthropicRateLimitInfo = z.infer<typeof AnthropicRateLimitInfoSchema>

export const ANTHROPIC_MODEL_ALIASES: Record<AnthropicModelAlias, AnthropicModelDated> = {
  'claude-opus-4-5': 'claude-opus-4-5-20250514',
  'claude-sonnet-4-5': 'claude-sonnet-4-5-20250514',
  'claude-haiku-4-5': 'claude-haiku-4-5-20250514',
}

export const ANTHROPIC_MODEL_CAPABILITIES: Record<AnthropicModelDated, AnthropicModelCapabilities> = {
  'claude-opus-4-5-20250514': {
    model: 'claude-opus-4-5-20250514',
    alias: 'claude-opus-4-5',
    contextWindow: 200_000,
    maxOutputTokens: 32_000,
    supportsVision: true,
    supportsTools: true,
    supportsExtendedThinking: true,
    supports1MContext: false,
    inputPricePerMillion: 15,
    outputPricePerMillion: 75,
  },
  'claude-sonnet-4-5-20250514': {
    model: 'claude-sonnet-4-5-20250514',
    alias: 'claude-sonnet-4-5',
    contextWindow: 200_000,
    maxContextWindow: 1_000_000,
    maxOutputTokens: 16_000,
    supportsVision: true,
    supportsTools: true,
    supportsExtendedThinking: true,
    supports1MContext: true,
    inputPricePerMillion: 3,
    outputPricePerMillion: 15,
  },
  'claude-haiku-4-5-20250514': {
    model: 'claude-haiku-4-5-20250514',
    alias: 'claude-haiku-4-5',
    contextWindow: 200_000,
    maxOutputTokens: 8_192,
    supportsVision: true,
    supportsTools: true,
    supportsExtendedThinking: true,
    supports1MContext: false,
    inputPricePerMillion: 0.8,
    outputPricePerMillion: 4,
  },
}

export function resolveAnthropicModel(model: AnthropicModel): AnthropicModelDated {
  if (model in ANTHROPIC_MODEL_ALIASES) {
    return ANTHROPIC_MODEL_ALIASES[model as AnthropicModelAlias]
  }
  return model as AnthropicModelDated
}

export function getAnthropicModelCapabilities(model: AnthropicModel): AnthropicModelCapabilities | undefined {
  const resolvedModel = resolveAnthropicModel(model)
  return ANTHROPIC_MODEL_CAPABILITIES[resolvedModel]
}
