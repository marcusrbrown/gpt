import {z} from 'zod'

// Knowledge File Category
export const KnowledgeFileCategorySchema = z.enum(['document', 'code', 'data', 'other'])
export type KnowledgeFileCategory = z.infer<typeof KnowledgeFileCategorySchema>

// Extraction Status
export const ExtractionStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed', 'unsupported'])
export type ExtractionStatus = z.infer<typeof ExtractionStatusSchema>

// Extended Knowledge File (Database Schema)
export const KnowledgeFileDBSchema = z.object({
  id: z.string(),
  gptId: z.string(),
  name: z.string(),
  mimeType: z.string(),
  size: z.number(),
  content: z.instanceof(Blob),
  category: KnowledgeFileCategorySchema.optional(),
  extractedText: z.string().optional(),
  extractionStatus: ExtractionStatusSchema.optional(),
  extractionError: z.string().optional(),
  checksumSHA256: z.string().optional(),
  uploadedAtISO: z.string(),
  updatedAtISO: z.string().optional(),
})
export type KnowledgeFileDB = z.infer<typeof KnowledgeFileDBSchema>

// Cached URL Status
export const CachedURLStatusSchema = z.enum(['pending', 'fetching', 'ready', 'failed'])
export type CachedURLStatus = z.infer<typeof CachedURLStatusSchema>

// Cached URL (Database Schema)
export const CachedURLDBSchema = z.object({
  id: z.string(),
  gptId: z.string(),
  url: z.string().url({message: 'Invalid URL format'}),
  title: z.string().optional(),
  content: z.string().optional(), // text-only content
  mimeType: z.string().optional(),
  status: CachedURLStatusSchema,
  error: z.string().optional(),
  fetchedAtISO: z.string().optional(),
  expiresAtISO: z.string().optional(),
  size: z.number().optional(),
})
export type CachedURLDB = z.infer<typeof CachedURLDBSchema>

// Text Snippet (Database Schema)
export const TextSnippetDBSchema = z.object({
  id: z.string(),
  gptId: z.string(),
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required').max(100000, 'Content too large (max 100KB)'),
  tags: z.array(z.string()).optional(),
  createdAtISO: z.string(),
  updatedAtISO: z.string(),
})
export type TextSnippetDB = z.infer<typeof TextSnippetDBSchema>

// Input Schemas for Service Methods
export const CreateSnippetInputSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required').max(100000, 'Content too large (max 100KB)'),
  tags: z.array(z.string()).optional(),
})
export type CreateSnippetInput = z.infer<typeof CreateSnippetInputSchema>

export const UpdateSnippetInputSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  content: z.string().min(1, 'Content is required').max(100000, 'Content too large (max 100KB)').optional(),
  tags: z.array(z.string()).optional(),
})
export type UpdateSnippetInput = z.infer<typeof UpdateSnippetInputSchema>

// Search Result
export const SearchResultSchema = z.object({
  type: z.enum(['file', 'url', 'snippet']),
  id: z.string(),
  title: z.string(),
  snippet: z.string(), // excerpt of matched content
  score: z.number(), // relevance score (for future ranking)
  source: z.string(), // original source identifier
})
export type SearchResult = z.infer<typeof SearchResultSchema>

// Knowledge Summary
export const KnowledgeSummarySchema = z.object({
  filesCount: z.number(),
  extractedFilesCount: z.number(),
  pendingExtractionCount: z.number(),
  urlsCount: z.number(),
  snippetsCount: z.number(),
  totalSize: z.number(), // in bytes
  extractedTextLength: z.number(), // total characters extracted
})
export type KnowledgeSummary = z.infer<typeof KnowledgeSummarySchema>

// Extraction Options
export const ExtractionOptionsSchema = z.object({
  maxTextLength: z.number().optional(), // max characters to extract
  timeout: z.number().optional(), // extraction timeout in ms
})
export type ExtractionOptions = z.infer<typeof ExtractionOptionsSchema>

// Constants
export const KNOWLEDGE_CONSTANTS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_SNIPPET_SIZE: 100 * 1024, // 100KB
  MAX_URL_CONTENT_SIZE: 500 * 1024, // 500KB text content
  URL_CACHE_TTL_HOURS: 24,
  EXTRACTION_TIMEOUT_MS: 30000, // 30 seconds
  MAX_EXTRACTED_TEXT_LENGTH: 1000000, // 1M characters
} as const
