import {z} from 'zod'

/**
 * Core types for GPT configurations and related entities
 */

export const GPTCapabilitiesSchema = z.object({
  codeInterpreter: z.boolean().default(false),
  webBrowsing: z.boolean().default(false),
  imageGeneration: z.boolean().default(false),
  fileSearch: z.object({
    enabled: z.boolean().default(false),
    maxChunkSizeTokens: z.number().optional(),
    chunkOverlapTokens: z.number().optional(),
    maxNumResults: z.number().optional(),
    ranking: z
      .object({
        ranker: z.enum(['auto', 'default_2024_08_21']),
        scoreThreshold: z.number(),
      })
      .optional(),
  }),
})

export type GPTCapabilities = z.infer<typeof GPTCapabilitiesSchema>

export const LocalFileSchema = z.object({
  name: z.string(),
  content: z.string(),
  type: z.string(),
  size: z.number(),
  lastModified: z.number(),
})

export type LocalFile = z.infer<typeof LocalFileSchema>

export const MCPToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  schema: z.record(z.any()),
  endpoint: z.string(),
  authentication: z
    .object({
      type: z.enum(['bearer', 'api_key']),
      value: z.string(),
    })
    .optional(),
})

export type MCPTool = z.infer<typeof MCPToolSchema>

export const VectorStoreSchema = z.object({
  id: z.string(),
  name: z.string(),
  fileIds: z.array(z.string()),
  expiresAfter: z
    .object({
      anchor: z.literal('last_active_at'),
      days: z.number(),
    })
    .optional(),
})

export type VectorStore = z.infer<typeof VectorStoreSchema>

export const GPTKnowledgeSchema = z.object({
  files: z.array(LocalFileSchema),
  urls: z.array(z.string()),
  vectorStores: z.array(VectorStoreSchema).optional(),
})

export const GPTConfigurationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  systemPrompt: z.string(),
  tools: z.array(MCPToolSchema),
  knowledge: GPTKnowledgeSchema,
  capabilities: GPTCapabilitiesSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  version: z.number().default(1),
})

export type GPTConfiguration = z.infer<typeof GPTConfigurationSchema>

export const ConversationMessageSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.date(),
})

export type ConversationMessage = z.infer<typeof ConversationMessageSchema>

export const ConversationSchema = z.object({
  id: z.string().uuid(),
  gptId: z.string().uuid(),
  messages: z.array(ConversationMessageSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type Conversation = z.infer<typeof ConversationSchema>
