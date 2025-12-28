import {z} from 'zod'
import {ProviderIdSchema} from './provider'

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
  schema: z.record(z.any(), z.any()),
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
  extractionMode: z.enum(['manual', 'auto']).default('manual'),
})

export const GPTConfigurationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  systemPrompt: z.string(),
  instructions: z.string().optional(),
  conversationStarters: z.array(z.string()).optional(),
  modelProvider: ProviderIdSchema.optional(),
  modelName: z.string().optional(),
  modelSettings: z
    .object({
      temperature: z.number().optional(),
      maxTokens: z.number().optional(),
      topP: z.number().optional(),
      frequencyPenalty: z.number().optional(),
      presencePenalty: z.number().optional(),
    })
    .optional(),
  tools: z.array(MCPToolSchema),
  knowledge: GPTKnowledgeSchema,
  capabilities: GPTCapabilitiesSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  version: z.number().default(1),
  tags: z.array(z.string()).default([]),
  isArchived: z.boolean().default(false),
  folderId: z.string().uuid().nullable().default(null),
  archivedAt: z.string().datetime().nullable().default(null),
})

export type GPTConfiguration = z.infer<typeof GPTConfigurationSchema>

export const ConversationMessageMetadataSchema = z.object({
  toolCallId: z.string().optional(),
  toolName: z.string().optional(),
  toolCalls: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        arguments: z.string(),
        status: z.enum(['pending', 'success', 'error']),
        result: z.string().optional(),
      }),
    )
    .optional(),
  isStreaming: z.boolean().optional(),
  attachments: z
    .array(
      z.object({
        fileId: z.string(),
        name: z.string(),
      }),
    )
    .optional(),
  model: z.string().optional(),
  tokenUsage: z
    .object({
      prompt: z.number(),
      completion: z.number(),
      total: z.number(),
    })
    .optional(),
})

export type ConversationMessageMetadata = z.infer<typeof ConversationMessageMetadataSchema>

export const ConversationMessageSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string(),
  timestamp: z.date(),
  metadata: ConversationMessageMetadataSchema.optional(),
})

export type ConversationMessage = z.infer<typeof ConversationMessageSchema>

export const ConversationSchema = z.object({
  id: z.string().uuid(),
  gptId: z.string().uuid(),
  title: z.string().optional(),
  messages: z.array(ConversationMessageSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
  messageCount: z.number().default(0),
  lastMessagePreview: z.string().optional(),
  tags: z.array(z.string()).default([]),
  isPinned: z.boolean().default(false),
  isArchived: z.boolean().default(false),
  pinnedAt: z.date().nullable().default(null),
  archivedAt: z.date().nullable().default(null),
})

export type Conversation = z.infer<typeof ConversationSchema>
