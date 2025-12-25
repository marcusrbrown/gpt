# RFC-005: Conversation Management

| Field            | Value                                                       |
| ---------------- | ----------------------------------------------------------- |
| **Status**       | Draft (Revised)                                             |
| **Priority**     | MUST HAVE (Phase 1)                                         |
| **Complexity**   | Medium                                                      |
| **Effort**       | 1-2 weeks                                                   |
| **Dependencies** | RFC-001 (IndexedDB Storage), RFC-003 (Provider Abstraction) |

## Summary

Implement comprehensive conversation management features including conversation persistence, search, export, and organization (pin/archive). This RFC completes the chat functionality required for Phase 1 while establishing schema foundations for RFC-006 (Knowledge Base) and RFC-009 (MCP Tools).

**Architecture Principle**: Provider orchestrates, Services implement. The `ConversationProvider` manages UI state and coordinates operations, while thin service modules encapsulate complex logic (export, search).

## Prerequisites

| Prerequisite                 | RFC     | Status       |
| ---------------------------- | ------- | ------------ |
| IndexedDB Storage Foundation | RFC-001 | ✅ Completed |
| Provider Abstraction Layer   | RFC-003 | ✅ Completed |

## Forward Compatibility

This RFC includes optional schema fields to support future RFCs without requiring additional migrations:

| Field                           | Future RFC | Purpose                      |
| ------------------------------- | ---------- | ---------------------------- |
| `attachments[].knowledgeFileId` | RFC-006    | Link to Knowledge Base files |
| `toolCalls[].status`            | RFC-009    | MCP tool execution lifecycle |

## Features Addressed

| Feature ID | Feature Name                 | Coverage |
| ---------- | ---------------------------- | -------- |
| FR-12      | Conversation Flow (enhanced) | Full     |
| FR-14      | Conversation Management      | Full     |
| FR-15      | Export Conversation          | Full     |
| F-401      | Message persistence          | Full     |
| F-402      | Conversation search          | Partial  |

## Technical Specification

### Zod Schemas

> **Note**: These schemas extend existing types in `src/types/gpt.ts`. The canonical domain types remain in that file; database types are in `src/lib/database.ts`.

```typescript
// src/types/conversation.ts
import {z} from "zod"

// Message roles (matches existing ConversationMessageSchema)
export const MessageRoleSchema = z.enum(["system", "user", "assistant", "tool"])

// Tool call with status lifecycle (RFC-009 compatible)
export const ToolCallSchema = z.object({
  id: z.string(),
  name: z.string(),
  arguments: z.string(), // JSON string for provider compatibility
  result: z.string().optional(),
  error: z.string().optional(),
  status: z.enum(["pending", "running", "success", "error"]),
})

export type ToolCall = z.infer<typeof ToolCallSchema>

// Attachment with optional knowledge file link (RFC-006 compatible)
export const AttachmentSchema = z.object({
  id: z.string(),
  kind: z.enum(["image", "document", "file"]),
  name: z.string(),
  mimeType: z.string().optional(),
  size: z.number().optional(),
  knowledgeFileId: z.string().uuid().optional(), // RFC-006 bridge
})

export type Attachment = z.infer<typeof AttachmentSchema>

// Token usage tracking
export const TokenUsageSchema = z.object({
  prompt: z.number(),
  completion: z.number(),
  total: z.number(),
})

export type TokenUsage = z.infer<typeof TokenUsageSchema>

// Message metadata (extends existing MessageMetadata in database.ts)
export const MessageMetadataSchema = z.object({
  toolCallId: z.string().optional(), // For tool role messages
  toolName: z.string().optional(),
  toolCalls: z.array(ToolCallSchema).optional(), // For assistant messages with tool calls
  attachments: z.array(AttachmentSchema).optional(),
  model: z.string().optional(),
  tokenUsage: TokenUsageSchema.optional(),
  isStreaming: z.boolean().default(false),
})

export type MessageMetadata = z.infer<typeof MessageMetadataSchema>

// Full message schema (domain type)
export const MessageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  role: MessageRoleSchema,
  content: z.string(),
  timestamp: z.date(),
  metadata: MessageMetadataSchema.optional(),
})

export type Message = z.infer<typeof MessageSchema>

// Conversation schema with organization fields
export const ConversationSchema = z.object({
  id: z.string().uuid(),
  gptId: z.string().uuid(),
  title: z.string().max(100).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),

  // Computed/cached for list display
  messageCount: z.number().int().nonnegative().default(0),
  lastMessagePreview: z.string().max(200).optional(),

  // Organization
  tags: z.array(z.string()).default([]),
  isPinned: z.boolean().default(false),
  isArchived: z.boolean().default(false),
})

export type Conversation = z.infer<typeof ConversationSchema>
```

### Database Schema Updates (v3)

```typescript
// src/lib/database.ts - Dexie v3 upgrade

// Updated interfaces
export interface ConversationDB {
  id: string
  gptId: string
  title?: string
  createdAtISO: string
  updatedAtISO: string
  messageCount: number
  lastMessagePreview?: string
  tags: string[]
  isPinned: boolean // NEW
  isArchived: boolean // NEW
}

export interface MessageMetadata {
  toolCallId?: string
  toolName?: string
  toolCalls?: Array<{
    id: string
    name: string
    arguments: string
    result?: string
    error?: string
    status: "pending" | "running" | "success" | "error"
  }>
  attachments?: Array<{
    id: string
    kind: "image" | "document" | "file"
    name: string
    mimeType?: string
    size?: number
    knowledgeFileId?: string
  }>
  model?: string
  tokenUsage?: {
    prompt: number
    completion: number
    total: number
  }
  isStreaming?: boolean
}

export interface MessageDB {
  id: string
  conversationId: string
  role: "user" | "assistant" | "system" | "tool"
  content: string
  timestampISO: string
  metadata?: MessageMetadata
}

// Schema upgrade
this.version(3)
  .stores({
    gpts: "id, name, createdAtISO, updatedAtISO, *tags, isArchived, folderId, archivedAtISO",
    conversations: "id, gptId, updatedAtISO, *tags, isPinned, isArchived",
    messages: "id, conversationId, timestampISO",
    knowledgeFiles: "id, gptId, name, mimeType",
    secrets: "id, provider",
    settings: "key",
    gptVersions: "id, gptId, version, createdAtISO",
    folders: "id, parentId, name, order",
  })
  .upgrade(async tx => {
    // Backfill conversations with new fields
    await tx
      .table("conversations")
      .toCollection()
      .modify(conv => {
        if (conv.isPinned === undefined) conv.isPinned = false
        if (conv.isArchived === undefined) conv.isArchived = false
      })
  })
```

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      UI Components                               │
│  ConversationList │ ConversationSearch │ ExportDialog           │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                   ConversationProvider                           │
│  State: currentConversation, conversations, isLoading, error    │
│  Actions: create, load, send, delete, export, import            │
│  Coordinates services, manages React state                       │
└─────────────────────────────┬───────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌─────────────────┐   ┌────────────────┐
│ StorageContext│   │ ExportService   │   │ SearchService  │
│ (persistence) │   │ (formatting)    │   │ (querying)     │
└───────────────┘   └─────────────────┘   └────────────────┘
```

### Conversation Context

> **Note**: Uses `currentConversation` to match existing implementation. The alias `activeConversation` is provided for RFC compatibility.

```typescript
// src/contexts/conversation-context.tsx
export interface ConversationContextType {
  // State
  conversations: Conversation[]
  currentConversation: Conversation | null
  /** @alias currentConversation - RFC-005 naming convention */
  activeConversation: Conversation | null
  isLoading: boolean
  error: Error | null

  // Core Actions
  createConversation: (gptId: string, initialMessage?: string) => Promise<Conversation>
  loadConversation: (id: string) => Promise<void>
  sendMessage: (content: string) => Promise<ConversationMessage | null>
  deleteConversation: (id: string) => Promise<boolean>

  // Organization
  pinConversation: (id: string, pinned: boolean) => Promise<void>
  archiveConversation: (id: string, archived: boolean) => Promise<void>
  updateConversationTitle: (id: string, title: string) => Promise<void>

  // Export/Import
  exportConversation: (id: string, format: ExportFormat) => Promise<string>
  importConversation: (data: string, format: ExportFormat) => Promise<Conversation>

  // Search (Phase 1: basic substring)
  searchConversations: (query: string, options?: SearchOptions) => Promise<SearchResult[]>
}

export type ExportFormat = "json" | "markdown"

export interface SearchOptions {
  gptId?: string
  includeArchived?: boolean
  limit?: number
}

export interface SearchResult {
  conversation: Conversation
  matchingMessages: Array<{
    message: ConversationMessage
    matchedText: string
  }>
}
```

### Export Service

```typescript
// src/services/conversation-export-service.ts
export type ExportFormat = "json" | "markdown"

export class ConversationExportService {
  /**
   * Export conversation to specified format
   */
  async export(conversation: Conversation, format: ExportFormat): Promise<string> {
    switch (format) {
      case "json":
        return this.toJSON(conversation)
      case "markdown":
        return this.toMarkdown(conversation)
    }
  }

  /**
   * Parse imported data into a Conversation
   */
  async parse(data: string, format: ExportFormat): Promise<Partial<Conversation>> {
    switch (format) {
      case "json":
        return this.fromJSON(data)
      case "markdown":
        throw new Error("Markdown import not supported")
    }
  }

  /**
   * Trigger browser download
   */
  download(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], {type: mimeType})
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  private toJSON(conversation: Conversation): string {
    return JSON.stringify(conversation, null, 2)
  }

  private toMarkdown(conversation: Conversation): string {
    const lines: string[] = []
    const title = conversation.title || "Untitled Conversation"

    lines.push(`# ${title}`)
    lines.push("")
    lines.push(`*Exported on ${new Date().toISOString()}*`)
    lines.push("")
    lines.push("---")
    lines.push("")

    for (const message of conversation.messages) {
      const role = message.role.charAt(0).toUpperCase() + message.role.slice(1)
      const timestamp = message.timestamp.toLocaleString()

      lines.push(`**${role}** _(${timestamp})_:`)
      lines.push("")
      lines.push(message.content)
      lines.push("")
    }

    return lines.join("\n")
  }

  private fromJSON(data: string): Partial<Conversation> {
    const parsed = JSON.parse(data)
    // Validate essential fields
    if (!parsed.gptId || !Array.isArray(parsed.messages)) {
      throw new Error("Invalid conversation data: missing gptId or messages")
    }
    return parsed
  }
}

export const conversationExportService = new ConversationExportService()
```

### Search Implementation

#### Phase 1: Basic Substring Search (No Dependencies)

```typescript
// src/services/conversation-search-service.ts
import {db} from "@/lib/database"

export interface SearchOptions {
  gptId?: string
  includeArchived?: boolean
  limit?: number
}

export interface SearchResult {
  conversationId: string
  conversationTitle?: string
  messageId: string
  matchedText: string
  role: string
  timestamp: string
}

export class ConversationSearchService {
  /**
   * Phase 1: Simple substring search across titles and message content
   * Searches in-memory after fetching from IndexedDB
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const {gptId, includeArchived = false, limit = 50} = options
    const normalizedQuery = query.toLowerCase().trim()

    if (!normalizedQuery) return []

    // Get conversations
    let conversationsQuery = db.conversations.toCollection()

    if (gptId) {
      conversationsQuery = db.conversations.where("gptId").equals(gptId)
    }

    const conversations = await conversationsQuery.toArray()
    const results: SearchResult[] = []

    for (const conv of conversations) {
      // Skip archived unless requested
      if (conv.isArchived && !includeArchived) continue

      // Search title
      if (conv.title?.toLowerCase().includes(normalizedQuery)) {
        results.push({
          conversationId: conv.id,
          conversationTitle: conv.title,
          messageId: "",
          matchedText: conv.title,
          role: "title",
          timestamp: conv.updatedAtISO,
        })
      }

      // Search messages
      const messages = await db.messages.where("conversationId").equals(conv.id).toArray()

      for (const msg of messages) {
        if (msg.content.toLowerCase().includes(normalizedQuery)) {
          // Extract snippet around match
          const matchedText = this.extractSnippet(msg.content, normalizedQuery)
          results.push({
            conversationId: conv.id,
            conversationTitle: conv.title,
            messageId: msg.id,
            matchedText,
            role: msg.role,
            timestamp: msg.timestampISO,
          })
        }
      }

      if (results.length >= limit) break
    }

    return results.slice(0, limit)
  }

  /**
   * Extract a snippet around the matched text
   */
  private extractSnippet(content: string, query: string, contextChars = 50): string {
    const lowerContent = content.toLowerCase()
    const index = lowerContent.indexOf(query.toLowerCase())

    if (index === -1) return content.slice(0, contextChars * 2)

    const start = Math.max(0, index - contextChars)
    const end = Math.min(content.length, index + query.length + contextChars)

    let snippet = content.slice(start, end)
    if (start > 0) snippet = "..." + snippet
    if (end < content.length) snippet = snippet + "..."

    return snippet
  }
}

export const conversationSearchService = new ConversationSearchService()
```

#### Phase 2: Upgrade Path (MiniSearch)

When search performance becomes a concern (>5,000 messages), upgrade to MiniSearch:

```typescript
// Future: src/services/conversation-search-service-minisearch.ts
import MiniSearch from "minisearch"

// MiniSearch provides:
// - Fuzzy matching
// - Relevance ranking
// - Prefix search
// - Configurable tokenization
//
// Bundle size: ~827KB (gzipped)
// Recommended when: >5,000 messages or fuzzy search required
```

## UI Components

### Conversation List

```typescript
// src/components/conversation-list.tsx
interface ConversationListProps {
  gptId: string
  onSelect: (conversationId: string) => void
  selectedId?: string
}

// Features:
// - Sorted by last activity (pinned first)
// - Shows title, message count, last message preview
// - Pin/unpin toggle
// - Archive/unarchive toggle
// - Search filter input
// - Context menu: rename, export, delete
```

### Conversation Search

```typescript
// src/components/conversation-search.tsx
interface ConversationSearchProps {
  gptId?: string
  onResultClick: (conversationId: string, messageId?: string) => void
}

// Features:
// - Debounced search input (300ms)
// - Results grouped by conversation
// - Message snippet with highlighted match
// - Click navigates to conversation/message
```

### Export Dialog

```typescript
// src/components/export-dialog.tsx
interface ExportDialogProps {
  conversationId: string
  isOpen: boolean
  onClose: () => void
}

// Features:
// - Format selection: Markdown, JSON
// - Preview pane (truncated)
// - Download button
// - Copy to clipboard option
```

## Acceptance Criteria

### Conversation Persistence

```gherkin
Feature: Conversation Persistence

Scenario: Messages persist across sessions
  Given a user sends a message in a conversation
  When they close and reopen the browser
  Then the conversation and all messages are preserved
  And the conversation appears in the list sorted by last activity

Scenario: Conversation metadata updates
  Given a conversation with messages
  When a new message is added
  Then updatedAt is updated
  And messageCount is incremented
  And lastMessagePreview reflects the new message
```

### Organization

```gherkin
Feature: Conversation Organization

Scenario: Pin a conversation
  Given a list of conversations
  When the user pins a conversation
  Then isPinned is set to true
  And the conversation appears at the top of the list

Scenario: Archive a conversation
  Given a conversation in the list
  When the user archives it
  Then isArchived is set to true
  And the conversation is hidden from the default list
  And the conversation appears when "Show Archived" is enabled
```

### Search

```gherkin
Feature: Conversation Search

Scenario: Search by message content
  Given conversations with various messages
  When the user searches for a term
  Then matching conversations are listed
  And matching message snippets are shown
  And clicking a result navigates to that conversation

Scenario: Search with no results
  Given conversations exist
  When the user searches for a non-existent term
  Then an empty state is shown with helpful message
```

### Export

```gherkin
Feature: Conversation Export

Scenario: Export to Markdown
  Given a conversation with messages
  When the user exports as Markdown
  Then a .md file downloads
  And it contains the title, all messages with roles and timestamps

Scenario: Export to JSON
  Given a conversation with messages
  When the user exports as JSON
  Then a .json file downloads
  And it contains the full conversation structure
```

## Testing Requirements

| Test Type   | Coverage | Focus Areas                           |
| ----------- | -------- | ------------------------------------- |
| Unit        | 80%      | Schema validation, export formatting  |
| Unit        | 80%      | Search snippet extraction, matching   |
| Unit        | 80%      | Database migration (v2 → v3)          |
| Integration | 80%      | ConversationProvider + StorageContext |
| Integration | 80%      | Search across multiple conversations  |
| E2E         | Flows    | Create → send → search → export       |
| E2E         | Flows    | Pin/archive → filter → restore        |

### Key Test Cases

1. **Schema migration**: v2 conversations get `isPinned: false`, `isArchived: false`
2. **Export round-trip**: JSON export can be re-imported without data loss
3. **Search performance**: <500ms for 1,000 messages
4. **Concurrent operations**: Multiple tabs don't corrupt conversation state

## Implementation Notes

### Current Limitations

1. **Message persistence strategy**: `saveConversation` currently rewrites all messages (`delete() + bulkPut()`). This works for typical conversation sizes but may need optimization for streaming or frequent tool call updates.

2. **Search indexing**: Phase 1 search loads messages into memory for filtering. For datasets >5,000 messages, consider MiniSearch upgrade.

3. **Cross-tab sync**: Existing `BroadcastChannel` invalidates caches but doesn't sync in-progress edits. Simultaneous edits in multiple tabs may conflict.

### Migration from Existing Code

The `ConversationProvider` in `src/contexts/conversation-provider.tsx` already implements:

- ✅ `createConversation`, `loadConversation`, `sendMessage`, `deleteConversation`
- ✅ Basic JSON export (`exportConversation`)
- ✅ JSON import (`importConversation`)

New implementations required:

- ⬜ `pinConversation`, `archiveConversation`, `updateConversationTitle`
- ⬜ `searchConversations`
- ⬜ Markdown export format
- ⬜ UI components (ConversationList, ConversationSearch, ExportDialog)

## Future RFCs Building on This

| RFC     | Integration Point                                     |
| ------- | ----------------------------------------------------- |
| RFC-006 | `attachments[].knowledgeFileId` links to KB files     |
| RFC-009 | `toolCalls[].status` supports MCP execution lifecycle |
| RFC-007 | Export service extended for bulk export/import        |

## Dependencies

### No New npm Packages (Phase 1)

Phase 1 search uses native IndexedDB queries + in-memory filtering.

### Future Dependencies (Phase 2)

```json
{
  "minisearch": "^7.0.0"
}
```

| Package    | Gzipped Size | Load Strategy | When to Add                 |
| ---------- | ------------ | ------------- | --------------------------- |
| minisearch | ~25KB        | Static import | >5,000 messages or fuzzy UX |
