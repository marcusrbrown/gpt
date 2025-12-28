import {z} from 'zod'

// Ollama connection configuration
export const OllamaConfigSchema = z.object({
  baseUrl: z.string().url().default('http://localhost:11434'),
  timeout: z.number().min(5000).max(600000).default(120000),
  keepAlive: z.string().default('5m'),
})

// Model information from /api/tags
export const OllamaModelInfoSchema = z.object({
  name: z.string(),
  model: z.string(),
  modified_at: z.string(),
  size: z.number(),
  digest: z.string(),
  details: z.object({
    parent_model: z.string().optional(),
    format: z.string(),
    family: z.string(),
    families: z.array(z.string()).optional(),
    parameter_size: z.string(),
    quantization_level: z.string(),
  }),
})

// Model details from /api/show
export const OllamaModelDetailsSchema = z.object({
  modelfile: z.string(),
  parameters: z.string().optional(),
  template: z.string().optional(),
  details: z.object({
    parent_model: z.string().optional(),
    format: z.string(),
    family: z.string(),
    families: z.array(z.string()).optional(),
    parameter_size: z.string(),
    quantization_level: z.string(),
  }),
  model_info: z.record(z.string(), z.unknown()).optional(),
})

// Chat message
export const OllamaChatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
  images: z.array(z.string()).optional(),
})

// Thinking mode configuration for reasoning models (deepseek-r1, qwen3, qwq)
export const OllamaThinkingConfigSchema = z.object({
  enabled: z.boolean().default(false),
  parseThinkingBlocks: z.boolean().default(true),
  streamThinking: z.boolean().default(true),
})

// Chat request
export const OllamaChatRequestSchema = z.object({
  model: z.string(),
  messages: z.array(OllamaChatMessageSchema),
  stream: z.boolean().default(true),
  format: z.enum(['json']).optional(),
  options: z
    .object({
      temperature: z.number().min(0).max(2).optional(),
      top_p: z.number().min(0).max(1).optional(),
      top_k: z.number().min(0).optional(),
      num_predict: z.number().optional(),
      stop: z.array(z.string()).optional(),
      seed: z.number().optional(),
      num_ctx: z.number().optional(),
    })
    .optional(),
  keep_alive: z.string().optional(),
  thinking: OllamaThinkingConfigSchema.optional(),
})

// Chat response (non-streaming)
export const OllamaChatResponseSchema = z.object({
  model: z.string(),
  created_at: z.string(),
  message: OllamaChatMessageSchema,
  done: z.boolean(),
  total_duration: z.number().optional(),
  load_duration: z.number().optional(),
  prompt_eval_count: z.number().optional(),
  prompt_eval_duration: z.number().optional(),
  eval_count: z.number().optional(),
  eval_duration: z.number().optional(),
})

// Streaming response chunk
export const OllamaStreamChunkSchema = z.object({
  model: z.string(),
  created_at: z.string(),
  message: z.object({
    role: z.literal('assistant'),
    content: z.string(),
  }),
  done: z.boolean(),
  total_duration: z.number().optional(),
  load_duration: z.number().optional(),
  prompt_eval_count: z.number().optional(),
  prompt_eval_duration: z.number().optional(),
  eval_count: z.number().optional(),
  eval_duration: z.number().optional(),
})

// Pull progress response
export const OllamaPullProgressSchema = z.object({
  status: z.string(),
  digest: z.string().optional(),
  total: z.number().optional(),
  completed: z.number().optional(),
})

// Models list response from /api/tags
export const OllamaModelsResponseSchema = z.object({
  models: z.array(OllamaModelInfoSchema),
})

// Error response from Ollama
export const OllamaErrorResponseSchema = z.object({
  error: z.string(),
})

// Type exports
export type OllamaConfig = z.infer<typeof OllamaConfigSchema>
export type OllamaModelInfo = z.infer<typeof OllamaModelInfoSchema>
export type OllamaModelDetails = z.infer<typeof OllamaModelDetailsSchema>
export type OllamaChatMessage = z.infer<typeof OllamaChatMessageSchema>
export type OllamaChatRequest = z.infer<typeof OllamaChatRequestSchema>
export type OllamaChatResponse = z.infer<typeof OllamaChatResponseSchema>
export type OllamaStreamChunk = z.infer<typeof OllamaStreamChunkSchema>
export type OllamaThinkingConfig = z.infer<typeof OllamaThinkingConfigSchema>
export type OllamaPullProgress = z.infer<typeof OllamaPullProgressSchema>
export type OllamaModelsResponse = z.infer<typeof OllamaModelsResponseSchema>
export type OllamaErrorResponse = z.infer<typeof OllamaErrorResponseSchema>

// Parsed thinking response (for reasoning models)
export interface OllamaThinkingResponse {
  thinking: string
  response: string
  hasThinking: boolean
}

// Connection status enum for UI state
export const OllamaConnectionStatusSchema = z.enum(['unknown', 'checking', 'connected', 'disconnected', 'cors_error'])
export type OllamaConnectionStatus = z.infer<typeof OllamaConnectionStatusSchema>

// Full connection status info for UI display
export interface OllamaConnectionInfo {
  status: OllamaConnectionStatus
  modelCount: number
  version?: string
  error?: string
}

// Vision-capable model prefixes
export const VISION_MODEL_PREFIXES = [
  'gemma3',
  'qwen3-vl',
  'qwen2.5vl',
  'llava',
  'llama3.2-vision',
  'minicpm-v',
] as const

// Reasoning model prefixes (models with thinking output)
export const REASONING_MODEL_PREFIXES = ['deepseek-r1', 'qwen3', 'qwq'] as const

// Model capability detection utilities
export function supportsVision(modelName: string): boolean {
  const lowerName = modelName.toLowerCase()
  return VISION_MODEL_PREFIXES.some(prefix => lowerName.startsWith(prefix))
}

export function supportsThinking(modelName: string): boolean {
  const lowerName = modelName.toLowerCase()
  return REASONING_MODEL_PREFIXES.some(prefix => lowerName.startsWith(prefix))
}

// Parse thinking content from reasoning model output
export function parseThinkingContent(content: string): OllamaThinkingResponse {
  const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/)
  if (thinkMatch && thinkMatch[1] != null) {
    return {
      thinking: thinkMatch[1].trim(),
      response: content.replace(/<think>[\s\S]*?<\/think>/, '').trim(),
      hasThinking: true,
    }
  }
  return {thinking: '', response: content, hasThinking: false}
}

// Format model size for display
export function formatModelSize(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024)
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(gb * 1024).toFixed(0)} MB`
}

// Estimate VRAM required for a model
export function estimateVRAMRequired(parameterBillions: number, quantization: string): number {
  const bitsPerParam: Record<string, number> = {
    Q4_0: 4.5,
    Q4_K_M: 4.8,
    Q5_K_M: 5.5,
    Q8_0: 8.5,
    FP16: 16,
  }
  const bits = bitsPerParam[quantization] || 4.8
  return Math.ceil(((parameterBillions * bits) / 8) * 1.2)
}
