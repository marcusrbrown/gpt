# RFC-006: Knowledge Base Enhancement

| Field            | Value                       |
| ---------------- | --------------------------- |
| **Status**       | Pending                     |
| **Priority**     | SHOULD                      |
| **Complexity**   | High                        |
| **Effort**       | 3 weeks                     |
| **Dependencies** | RFC-001 (IndexedDB Storage) |

## Summary

Enhance the knowledge base system to support rich document management, text extraction, URL caching, and text snippets. This RFC extends the existing `knowledgeFiles` table with extraction capabilities and introduces new storage patterns for cached web content and user-defined snippets.

## Prerequisites

| Prerequisite                     | RFC     | Status       |
| -------------------------------- | ------- | ------------ |
| IndexedDB Storage Foundation     | RFC-001 | ✅ Completed |
| Encryption for sensitive content | RFC-002 | ✅ Completed |

## Features Addressed

| Feature ID | Feature Name             | Coverage |
| ---------- | ------------------------ | -------- |
| F-201      | File Upload & Management | Full     |
| F-202      | URL Content Caching      | Full     |
| F-203      | Text Snippets            | Full     |
| F-204      | Knowledge Organization   | Full     |

## Technical Specification

### Zod Schemas

```typescript
import {z} from "zod"

// Knowledge source types
export const KnowledgeSourceTypeSchema = z.enum(["file", "url", "snippet"])

// File categories for organization
export const FileCategorySchema = z.enum([
  "document", // PDF, DOCX, TXT, MD
  "code", // JS, TS, PY, etc.
  "data", // JSON, CSV, XML
  "other",
])

// Extraction status
export const ExtractionStatusSchema = z.enum(["pending", "processing", "completed", "failed", "unsupported"])

// Enhanced knowledge file
export const KnowledgeFileSchema = z.object({
  id: z.string().uuid(),
  gptId: z.string().uuid(),
  name: z.string().min(1).max(255),
  mimeType: z.string(),
  size: z.number().int().positive().max(52_428_800), // 50MB max
  content: z.instanceof(Blob),
  category: FileCategorySchema,
  extractedText: z.string().optional(),
  extractionStatus: ExtractionStatusSchema,
  extractionError: z.string().optional(),
  checksum: z.string(), // SHA-256 for deduplication
  uploadedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

// Cached URL content
export const CachedURLSchema = z.object({
  id: z.string().uuid(),
  gptId: z.string().uuid(),
  url: z.string().url(),
  title: z.string().optional(),
  content: z.string(), // Extracted text content
  mimeType: z.string(),
  fetchedAt: z.string().datetime(),
  expiresAt: z.string().datetime(), // TTL-based expiration
  status: z.enum(["active", "expired", "error"]),
  error: z.string().optional(),
  size: z.number().int(), // Content size in bytes
})

// User-defined text snippet
export const TextSnippetSchema = z.object({
  id: z.string().uuid(),
  gptId: z.string().uuid(),
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(100_000), // 100KB max
  tags: z.array(z.string().max(50)).max(10),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

// Knowledge base summary for a GPT
export const KnowledgeBaseSummarySchema = z.object({
  gptId: z.string().uuid(),
  totalFiles: z.number().int().nonnegative(),
  totalURLs: z.number().int().nonnegative(),
  totalSnippets: z.number().int().nonnegative(),
  totalSizeBytes: z.number().int().nonnegative(),
  quotaUsedPercent: z.number().min(0).max(100),
})

// Type exports
export type KnowledgeSourceType = z.infer<typeof KnowledgeSourceTypeSchema>
export type FileCategory = z.infer<typeof FileCategorySchema>
export type ExtractionStatus = z.infer<typeof ExtractionStatusSchema>
export type KnowledgeFile = z.infer<typeof KnowledgeFileSchema>
export type CachedURL = z.infer<typeof CachedURLSchema>
export type TextSnippet = z.infer<typeof TextSnippetSchema>
export type KnowledgeBaseSummary = z.infer<typeof KnowledgeBaseSummarySchema>
```

### Supported File Types

| Category | MIME Types                                                              | Max Size | Extraction Support |
| -------- | ----------------------------------------------------------------------- | -------- | ------------------ |
| Document | application/pdf                                                         | 50MB     | ✅ PDF.js          |
| Document | application/vnd.openxmlformats-officedocument.wordprocessingml.document | 50MB     | ✅ Mammoth.js      |
| Document | text/plain, text/markdown                                               | 10MB     | ✅ Direct read     |
| Code     | text/javascript, application/typescript, text/x-python, etc.            | 5MB      | ✅ Direct read     |
| Data     | application/json, text/csv, application/xml                             | 10MB     | ✅ Direct read     |
| Image    | image/png, image/jpeg, image/webp                                       | 10MB     | ❌ OCR (future)    |

### Database Schema Updates

```typescript
// Dexie schema v3 (migration from v2)
db.version(3).stores({
  // Existing tables unchanged
  gpts: "++id, name, createdAt, updatedAt, archived",
  conversations: "++id, gptId, createdAt",
  messages: "++id, conversationId, timestamp",
  secrets: "key",
  settings: "key",
  folders: "++id, name, parentId",
  gptVersions: "++id, gptId, timestamp",

  // Enhanced knowledge tables
  knowledgeFiles: "++id, gptId, name, mimeType, category, extractionStatus, checksum, uploadedAt",
  cachedURLs: "++id, gptId, url, status, fetchedAt, expiresAt",
  textSnippets: "++id, gptId, title, *tags, createdAt",
})
```

### Service Interface

```typescript
interface KnowledgeService {
  // File operations
  uploadFile(gptId: string, file: File): Promise<KnowledgeFile>
  uploadFiles(gptId: string, files: File[]): Promise<KnowledgeFile[]>
  deleteFile(fileId: string): Promise<void>
  getFile(fileId: string): Promise<KnowledgeFile | undefined>
  listFiles(gptId: string, options?: ListFilesOptions): Promise<KnowledgeFile[]>

  // Text extraction
  extractText(fileId: string): Promise<string>
  retryExtraction(fileId: string): Promise<void>

  // URL operations
  cacheURL(gptId: string, url: string): Promise<CachedURL>
  refreshURL(urlId: string): Promise<CachedURL>
  deleteURL(urlId: string): Promise<void>
  listURLs(gptId: string): Promise<CachedURL[]>

  // Snippet operations
  createSnippet(gptId: string, data: CreateSnippetInput): Promise<TextSnippet>
  updateSnippet(snippetId: string, data: UpdateSnippetInput): Promise<TextSnippet>
  deleteSnippet(snippetId: string): Promise<void>
  listSnippets(gptId: string): Promise<TextSnippet[]>

  // Search
  searchKnowledge(gptId: string, query: string): Promise<SearchResult[]>

  // Summary & quotas
  getSummary(gptId: string): Promise<KnowledgeBaseSummary>
  checkQuota(gptId: string, additionalBytes: number): Promise<boolean>
}

interface ListFilesOptions {
  category?: FileCategory
  status?: ExtractionStatus
  sortBy?: "name" | "size" | "uploadedAt"
  sortOrder?: "asc" | "desc"
}

interface SearchResult {
  sourceType: KnowledgeSourceType
  sourceId: string
  title: string
  snippet: string // Matching text excerpt
  score: number
}
```

### Text Extraction Implementation

```typescript
// Extraction worker (runs in Web Worker for non-blocking)
class TextExtractor {
  async extract(file: Blob, mimeType: string): Promise<string> {
    switch (mimeType) {
      case "application/pdf":
        return this.extractPDF(file)
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return this.extractDOCX(file)
      case "text/plain":
      case "text/markdown":
      case "text/javascript":
      case "application/typescript":
      case "text/x-python":
      case "application/json":
      case "text/csv":
        return this.extractText(file)
      default:
        throw new ExtractionError("unsupported", `MIME type ${mimeType} not supported`)
    }
  }

  private async extractPDF(file: Blob): Promise<string> {
    const pdfjsLib = await import("pdfjs-dist")
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise

    const textParts: string[] = []
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items.map((item: {str: string}) => item.str).join(" ")
      textParts.push(pageText)
    }

    return textParts.join("\n\n")
  }

  private async extractDOCX(file: Blob): Promise<string> {
    const mammoth = await import("mammoth")
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({arrayBuffer})
    return result.value
  }

  private async extractText(file: Blob): Promise<string> {
    return file.text()
  }
}
```

### URL Caching Implementation

```typescript
interface URLCacheOptions {
  ttlHours?: number // Default: 24
  forceRefresh?: boolean
}

class URLCacheService {
  private readonly DEFAULT_TTL_HOURS = 24

  async cacheURL(gptId: string, url: string, options?: URLCacheOptions): Promise<CachedURL> {
    const ttlHours = options?.ttlHours ?? this.DEFAULT_TTL_HOURS

    // Check if valid cache exists
    if (!options?.forceRefresh) {
      const existing = await this.findByURL(gptId, url)
      if (existing && existing.status === "active" && new Date(existing.expiresAt) > new Date()) {
        return existing
      }
    }

    // Fetch and extract content
    const response = await fetch(url, {
      headers: {Accept: "text/html,text/plain,application/json"},
    })

    if (!response.ok) {
      throw new URLCacheError("fetch_failed", `HTTP ${response.status}`)
    }

    const contentType = response.headers.get("content-type") || "text/plain"
    const html = await response.text()

    // Extract readable content (strip HTML, scripts, styles)
    const content = this.extractReadableContent(html, contentType)
    const title = this.extractTitle(html)

    const now = new Date()
    const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000)

    const cachedURL: CachedURL = {
      id: crypto.randomUUID(),
      gptId,
      url,
      title,
      content,
      mimeType: contentType,
      fetchedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      status: "active",
      size: new Blob([content]).size,
    }

    await db.cachedURLs.put(cachedURL)
    return cachedURL
  }

  private extractReadableContent(html: string, contentType: string): string {
    if (contentType.includes("application/json")) {
      return html // Keep JSON as-is
    }

    if (contentType.includes("text/plain")) {
      return html
    }

    // For HTML, use DOMParser to extract text
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, "text/html")

    // Remove scripts, styles, nav, footer
    const removeSelectors = ["script", "style", "nav", "footer", "header", "aside"]
    removeSelectors.forEach(sel => {
      doc.querySelectorAll(sel).forEach(el => el.remove())
    })

    // Get main content or body
    const main = doc.querySelector("main, article, .content, #content") || doc.body
    return main?.textContent?.trim() || ""
  }

  private extractTitle(html: string): string | undefined {
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    return match?.[1]?.trim()
  }
}
```

## UI Components

### KnowledgeConfiguration (Enhanced)

```typescript
interface KnowledgeConfigurationProps {
  gptId: string
  onUpdate?: () => void
}

// Tabs: Files | URLs | Snippets | Summary
// Each tab shows relevant list with actions
```

### FileUploadZone

```typescript
interface FileUploadZoneProps {
  gptId: string
  onUpload: (files: KnowledgeFile[]) => void
  acceptedTypes?: string[] // MIME types
  maxFiles?: number
  maxSizeBytes?: number
}

// Drag-and-drop zone with progress indicators
// Shows extraction status after upload
```

### URLManager

```typescript
interface URLManagerProps {
  gptId: string
}

// URL input with validation
// List of cached URLs with refresh/delete actions
// Shows cache status and expiration
```

### SnippetEditor

```typescript
interface SnippetEditorProps {
  gptId: string
  snippetId?: string // For editing existing
  onSave: (snippet: TextSnippet) => void
}

// Title input, tag input, rich text editor
// Character count with limit indicator
```

### KnowledgeSearch

```typescript
interface KnowledgeSearchProps {
  gptId: string
  onSelect?: (result: SearchResult) => void
}

// Search input with debounced query
// Results grouped by source type
// Highlight matching text
```

## Acceptance Criteria

### File Management

```gherkin
Feature: Knowledge Base File Management

Scenario: Upload a PDF file
  Given I am editing a GPT's knowledge base
  When I drag a PDF file into the upload zone
  Then the file should be uploaded and stored in IndexedDB
  And text extraction should begin automatically
  And I should see extraction progress
  And the file should appear in the files list with "processing" status

Scenario: View extraction results
  Given a PDF file has been uploaded
  When extraction completes successfully
  Then the file status should change to "completed"
  And I should be able to preview the extracted text
  And the text should be searchable

Scenario: Handle extraction failure
  Given I upload a corrupted PDF file
  When extraction fails
  Then the file status should change to "failed"
  And I should see an error message
  And I should have the option to retry extraction

Scenario: Enforce file size limits
  Given the maximum file size is 50MB
  When I try to upload a 60MB file
  Then the upload should be rejected
  And I should see an error message about the size limit
```

### URL Caching

```gherkin
Feature: URL Content Caching

Scenario: Cache a URL successfully
  Given I am managing URLs for a GPT
  When I add a valid URL
  Then the URL content should be fetched
  And the readable text should be extracted and stored
  And the cache expiration should be set to 24 hours

Scenario: Refresh expired cache
  Given a cached URL has expired
  When I click the refresh button
  Then the content should be re-fetched
  And the cache expiration should be updated

Scenario: Handle unreachable URL
  Given I add a URL that returns a 404
  When the fetch fails
  Then the URL should be marked as "error"
  And I should see the error message
```

### Text Snippets

```gherkin
Feature: Text Snippets

Scenario: Create a text snippet
  Given I am managing snippets for a GPT
  When I click "Add Snippet"
  And I enter a title and content
  And I click "Save"
  Then the snippet should be stored in IndexedDB
  And it should appear in the snippets list

Scenario: Search across knowledge sources
  Given a GPT has files, URLs, and snippets
  When I search for a term that appears in multiple sources
  Then I should see results from all matching sources
  And results should show source type and preview
```

## Testing Requirements

| Test Type         | Coverage Target | Focus Areas                           |
| ----------------- | --------------- | ------------------------------------- |
| Unit Tests        | 90%             | Extraction logic, URL parsing, search |
| Integration Tests | 80%             | Dexie operations, file uploads        |
| E2E Tests         | Key flows       | Upload → extract → search flow        |
| Performance Tests | N/A             | Large file handling, search speed     |

### Key Test Cases

1. **Extraction accuracy**: Verify PDF/DOCX text matches expected content
2. **Concurrent uploads**: Handle multiple simultaneous uploads
3. **Quota enforcement**: Reject uploads exceeding GPT quota
4. **Search relevance**: Results ranked by match quality
5. **Cache expiration**: Expired URLs marked correctly

## Migration Plan

### From Current Schema (v2 → v3)

```typescript
db.version(3)
  .stores({
    // ... new schema
  })
  .upgrade(async tx => {
    // Migrate existing knowledgeFiles
    const files = await tx.table("knowledgeFiles").toArray()

    for (const file of files) {
      // Add new fields with defaults
      await tx.table("knowledgeFiles").update(file.id, {
        category: inferCategory(file.mimeType),
        extractionStatus: file.extractedText ? "completed" : "pending",
        checksum: await computeChecksum(file.content),
        updatedAt: file.uploadedAt,
      })
    }
  })
```

## Future Enhancements

| Enhancement            | Description                           | Target RFC |
| ---------------------- | ------------------------------------- | ---------- |
| Vector embeddings      | Semantic search with local embeddings | RFC-013    |
| OCR support            | Extract text from images              | RFC-013    |
| Chunking strategy      | Smart text chunking for RAG           | RFC-013    |
| External vector stores | Pinecone, Weaviate integration        | RFC-013    |

## Dependencies

### New npm Packages

```json
{
  "pdfjs-dist": "^4.0.0",
  "mammoth": "^1.6.0"
}
```

### Bundle Size Impact

| Package    | Gzipped Size | Load Strategy                |
| ---------- | ------------ | ---------------------------- |
| pdfjs-dist | ~400KB       | Dynamic import on first PDF  |
| mammoth    | ~100KB       | Dynamic import on first DOCX |
