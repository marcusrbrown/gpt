import {z} from 'zod'

export const ExportVersionSchema = z.enum(['1.0', '1.1'])
export type ExportVersion = z.infer<typeof ExportVersionSchema>

export const ExportMetadataSchema = z.object({
  version: ExportVersionSchema,
  exportedAt: z.string().datetime(),
  source: z.literal('gpt-platform'),
  sourceVersion: z.string(),
})
export type ExportMetadata = z.infer<typeof ExportMetadataSchema>

export const KnowledgeFileExportSchema = z.object({
  name: z.string(),
  mimeType: z.string(),
  size: z.number(),
  base64Content: z.string(),
  extractedText: z.string().optional(),
  category: z.enum(['document', 'code', 'data', 'other']).optional(),
  extractionStatus: z.enum(['pending', 'processing', 'completed', 'failed', 'unsupported']).optional(),
  checksumSHA256: z.string().optional(),
  uploadedAt: z.string().optional(),
  updatedAt: z.string().optional(),
})
export type KnowledgeFileExport = z.infer<typeof KnowledgeFileExportSchema>

export const CachedURLExportSchema = z.object({
  url: z.string().url({message: 'Invalid URL'}),
  title: z.string().optional(),
  content: z.string().optional(),
  mimeType: z.string().optional(),
  fetchedAt: z.string().optional(),
  status: z.enum(['pending', 'fetching', 'ready', 'failed']),
})
export type CachedURLExport = z.infer<typeof CachedURLExportSchema>

export const KnowledgeSnippetSchema = z.object({
  title: z.string(),
  content: z.string(),
  tags: z.array(z.string()).default([]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})
export type KnowledgeSnippet = z.infer<typeof KnowledgeSnippetSchema>

export const CapabilitiesExportSchema = z.object({
  webBrowsing: z.boolean(),
  codeInterpreter: z.boolean(),
  imageGeneration: z.boolean(),
  fileSearch: z
    .object({
      enabled: z.boolean(),
      maxChunkSizeTokens: z.number().optional(),
      chunkOverlapTokens: z.number().optional(),
      maxNumResults: z.number().optional(),
    })
    .optional(),
})
export type CapabilitiesExport = z.infer<typeof CapabilitiesExportSchema>

export const ToolExportSchema = z.object({
  name: z.string(),
  description: z.string(),
  schema: z.record(z.string(), z.unknown()),
  endpoint: z.string(),
})
export type ToolExport = z.infer<typeof ToolExportSchema>

export const ModelSettingsExportSchema = z.object({
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().optional(),
  topP: z.number().optional(),
  frequencyPenalty: z.number().optional(),
  presencePenalty: z.number().optional(),
})
export type ModelSettingsExport = z.infer<typeof ModelSettingsExportSchema>

export const GPTDataExportSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  systemPrompt: z.string(),
  instructions: z.string().optional(),
  conversationStarters: z.array(z.string()).optional(),
  modelProvider: z.string().optional(),
  modelName: z.string().optional(),
  modelSettings: ModelSettingsExportSchema.optional(),
  tools: z.array(ToolExportSchema).optional(),
  capabilities: CapabilitiesExportSchema.optional(),
  tags: z.array(z.string()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type GPTDataExport = z.infer<typeof GPTDataExportSchema>

export const KnowledgeExportSchema = z.object({
  files: z.array(KnowledgeFileExportSchema),
  urls: z.array(CachedURLExportSchema),
  snippets: z.array(KnowledgeSnippetSchema),
})
export type KnowledgeExport = z.infer<typeof KnowledgeExportSchema>

export const VersionHistoryEntrySchema = z.object({
  version: z.number(),
  timestamp: z.string().datetime(),
  snapshot: z.unknown(),
  changeDescription: z.string().optional(),
})
export type VersionHistoryEntry = z.infer<typeof VersionHistoryEntrySchema>

export const GPTExportSchema = z.object({
  metadata: ExportMetadataSchema,
  gpt: GPTDataExportSchema,
  knowledge: KnowledgeExportSchema.optional(),
  versionHistory: z.array(VersionHistoryEntrySchema).optional(),
})
export type GPTExport = z.infer<typeof GPTExportSchema>

export const MessageExportSchema = z.object({
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string(),
  timestamp: z.string().datetime(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})
export type MessageExport = z.infer<typeof MessageExportSchema>

export const ConversationDataExportSchema = z.object({
  id: z.string().uuid(),
  gptId: z.string().uuid(),
  gptName: z.string(),
  title: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  messages: z.array(MessageExportSchema),
  tags: z.array(z.string()).optional(),
  isPinned: z.boolean().optional(),
})
export type ConversationDataExport = z.infer<typeof ConversationDataExportSchema>

export const ConversationExportSchema = z.object({
  metadata: ExportMetadataSchema,
  conversation: ConversationDataExportSchema,
})
export type ConversationExport = z.infer<typeof ConversationExportSchema>

export const FolderExportSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  parentId: z.string().uuid().nullable(),
  gptIds: z.array(z.string().uuid()).optional(),
})
export type FolderExport = z.infer<typeof FolderExportSchema>

export const BulkExportManifestSchema = z.object({
  metadata: ExportMetadataSchema,
  contents: z.object({
    gpts: z.array(
      z.object({
        id: z.string().uuid(),
        name: z.string(),
        filename: z.string(),
      }),
    ),
    folders: z.array(FolderExportSchema),
    totalFiles: z.number(),
    totalSizeBytes: z.number(),
  }),
})
export type BulkExportManifest = z.infer<typeof BulkExportManifestSchema>

export const FullBackupSchema = z.object({
  metadata: ExportMetadataSchema.extend({
    backupType: z.literal('full'),
  }),
  contents: z.object({
    gpts: z.array(GPTDataExportSchema),
    conversations: z.array(ConversationDataExportSchema),
    folders: z.array(
      z.object({
        id: z.string().uuid(),
        name: z.string(),
        parentId: z.string().uuid().nullable(),
        order: z.number(),
      }),
    ),
    settings: z.record(z.string(), z.unknown()),
    knowledge: z.record(z.string().uuid(), KnowledgeExportSchema),
  }),
})
export type FullBackup = z.infer<typeof FullBackupSchema>

export const ConflictResolutionSchema = z.enum(['skip', 'overwrite', 'rename'])
export type ConflictResolution = z.infer<typeof ConflictResolutionSchema>

export const ImportResultSchema = z.object({
  success: z.boolean(),
  imported: z.number(),
  skipped: z.number(),
  errors: z.array(
    z.object({
      item: z.string(),
      error: z.string(),
    }),
  ),
  conflicts: z.array(
    z.object({
      existingId: z.string(),
      importedName: z.string(),
      resolution: ConflictResolutionSchema,
    }),
  ),
})
export type ImportResult = z.infer<typeof ImportResultSchema>

export const ImportValidationSchema = z.object({
  valid: z.boolean(),
  version: ExportVersionSchema,
  type: z.enum(['gpt', 'bulk', 'backup', 'conversation']),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
})
export type ImportValidation = z.infer<typeof ImportValidationSchema>

export const ImportPreviewItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['gpt', 'conversation', 'folder']),
  hasConflict: z.boolean(),
  existingId: z.string().optional(),
})
export type ImportPreviewItem = z.infer<typeof ImportPreviewItemSchema>

export const ImportPreviewSchema = z.object({
  type: z.enum(['gpt', 'bulk', 'backup', 'conversation']),
  items: z.array(ImportPreviewItemSchema),
  totalSize: z.number(),
  estimatedTimeSeconds: z.number(),
})
export type ImportPreview = z.infer<typeof ImportPreviewSchema>

export interface GPTExportOptions {
  includeKnowledge?: boolean
  includeVersionHistory?: boolean
  includeConversations?: boolean
}

export interface BulkExportOptions extends GPTExportOptions {
  preserveFolderStructure?: boolean
}

export type ExportFormat = 'json' | 'markdown' | 'pdf'

export interface RestoreOptions {
  clearExisting?: boolean
  conflictResolution?: ConflictResolution
}

export type ExportProgressCallback = (progress: {
  phase: 'preparing' | 'exporting' | 'compressing' | 'complete'
  current: number
  total: number
  currentItem?: string
}) => void

export type ImportProgressCallback = (progress: {
  phase: 'validating' | 'importing' | 'complete'
  current: number
  total: number
  currentItem?: string
}) => void

export const APP_VERSION = '1.0.0'
export const CURRENT_EXPORT_VERSION: ExportVersion = '1.0'
