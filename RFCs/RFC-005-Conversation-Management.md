# RFC-005: Conversation Management

**Status:** Draft
**Priority:** MUST HAVE (Phase 1)
**Complexity:** Medium
**Estimated Effort:** 1-2 weeks

---

## Summary

Implement comprehensive conversation management features including conversation persistence, full-text search, conversation export, and improved conversation list UI. This RFC completes the chat functionality required for Phase 1.

---

## Prerequisites

| RFC     | Requirement                                        |
| ------- | -------------------------------------------------- |
| RFC-001 | IndexedDB storage for conversations and messages   |
| RFC-003 | Provider abstraction for multi-model conversations |

---

## Features Addressed

| Feature ID | Description                  | Priority |
| ---------- | ---------------------------- | -------- |
| FR-12      | Conversation Flow (enhanced) | MUST     |
| FR-14      | Conversation Management      | MUST     |
| FR-15      | Export Conversation          | SHOULD   |
| F-401      | Message persistence          | MUST     |
| F-402      | Conversation search          | SHOULD   |

---

## Technical Specification

### 1. Conversation Schema

```typescript
// src/types/conversation.ts
import {z} from "zod"

export const MessageRoleSchema = z.enum(["system", "user", "assistant", "tool"])

export const MessageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  role: MessageRoleSchema,
  content: z.string(),
  timestamp: z.string().datetime(),

  // Tool-related
  toolCallId: z.string().optional(),
  toolCalls: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        arguments: z.string(),
        result: z.string().optional(),
        status: z.enum(["pending", "running", "success", "error"]),
      }),
    )
    .optional(),

  // Attachments
  attachments: z
    .array(
      z.object({
        id: z.string(),
        type: z.enum(["image", "document"]),
        name: z.string(),
        mimeType: z.string(),
        size: z.number(),
        // Stored as blob in IndexedDB
      }),
    )
    .optional(),

  // Metadata
  model: z.string().optional(),
  tokenCount: z.number().optional(),
  isStreaming: z.boolean().default(false),
})

export type Message = z.infer<typeof MessageSchema>

export const ConversationSchema = z.object({
  id: z.string().uuid(),
  gptId: z.string().uuid(),
  title: z.string().max(100),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),

  // Computed/cached for list display
  messageCount: z.number().int().nonnegative(),
  lastMessagePreview: z.string().max(200).optional(),

  // Organization
  tags: z.array(z.string()).default([]),
  isPinned: z.boolean().default(false),
  isArchived: z.boolean().default(false),
})

export type Conversation = z.infer<typeof ConversationSchema>
```

### 2. Conversation Service

```typescript
// src/services/conversation-service.ts
export class ConversationService {
  // CRUD
  async createConversation(gptId: string, title?: string): Promise<Conversation>
  async getConversation(id: string): Promise<Conversation | null>
  async updateConversation(id: string, updates: Partial<Conversation>): Promise<void>
  async deleteConversation(id: string): Promise<void>

  // Listing
  async listConversations(
    gptId: string,
    options?: {
      includeArchived?: boolean
      limit?: number
      offset?: number
    },
  ): Promise<Conversation[]>

  // Messages
  async addMessage(conversationId: string, message: Omit<Message, "id" | "conversationId">): Promise<Message>
  async getMessages(conversationId: string): Promise<Message[]>
  async updateMessage(messageId: string, updates: Partial<Message>): Promise<void>
  async deleteMessage(messageId: string): Promise<void>

  // Search
  async searchConversations(
    query: string,
    options?: {
      gptId?: string
      limit?: number
    },
  ): Promise<SearchResult[]>

  // Auto-title generation
  async generateTitle(conversationId: string): Promise<string>
}

interface SearchResult {
  conversation: Conversation
  matchingMessages: Array<{
    message: Message
    highlights: string[] // Matched text with context
  }>
}
```

### 3. Full-Text Search Implementation

```typescript
// src/services/search-service.ts
// Uses IndexedDB with manual tokenization for offline search

export class SearchService {
  // Build search index for a conversation
  async indexConversation(conversationId: string): Promise<void>

  // Search across all indexed content
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]>

  // Highlight matching terms in text
  highlightMatches(text: string, query: string): string[]
}

// Search index stored in IndexedDB
// Table: searchIndex { id, conversationId, messageId, tokens: string[] }
```

### 4. Export Service

```typescript
// src/services/export-service.ts
export class ConversationExportService {
  async exportToMarkdown(conversationId: string): Promise<string>
  async exportToJSON(conversationId: string): Promise<object>
  async downloadExport(conversationId: string, format: "markdown" | "json"): Promise<void>
}

// Markdown format:
// # Conversation Title
//
// **User** (2025-12-20 10:30):
// Message content here
//
// **Assistant** (2025-12-20 10:31):
// Response content here
```

### 5. Conversation Context Updates

```typescript
// src/contexts/conversation-context.tsx
interface ConversationContextValue {
  // Current conversation
  activeConversation: Conversation | null
  messages: Message[]
  isLoading: boolean

  // Actions
  createConversation: (gptId: string) => Promise<Conversation>
  loadConversation: (id: string) => Promise<void>
  sendMessage: (content: string, attachments?: File[]) => Promise<void>
  regenerateResponse: (messageId: string) => Promise<void>

  // Search
  searchResults: SearchResult[]
  searchQuery: string
  setSearchQuery: (query: string) => void

  // Export
  exportConversation: (format: "markdown" | "json") => Promise<void>
}
```

---

## UI Components

### 1. Conversation List

```tsx
// src/components/conversation-list.tsx
interface ConversationListProps {
  gptId: string
  onSelect: (conversationId: string) => void
  selectedId?: string
}

// Features:
// - Sorted by last activity
// - Shows title, message count, last message preview
// - Pin/unpin conversations
// - Search filter
// - Context menu (rename, delete, export)
```

### 2. Search Interface

```tsx
// src/components/conversation-search.tsx
interface ConversationSearchProps {
  onResultClick: (conversationId: string, messageId: string) => void
}

// Features:
// - Search input with debounce
// - Results grouped by conversation
// - Highlighted matching text
// - Click to navigate to message
```

### 3. Export Dialog

```tsx
// src/components/export-dialog.tsx
interface ExportDialogProps {
  conversationId: string
  onClose: () => void
}

// Features:
// - Format selection (Markdown, JSON)
// - Preview of export
// - Download button
```

---

## Acceptance Criteria

```gherkin
# Conversation Persistence
Given a user sends a message
When they close and reopen the browser
Then the conversation and all messages are preserved
And the conversation appears in the list

# Auto-Title
Given a new conversation starts
When the first exchange completes
Then a title is auto-generated from the content
And can be edited by the user

# Search
Given a user searches for a term
When results are found
Then matching conversations are listed
And matching text is highlighted
And clicking navigates to the message

# Export
Given a user exports a conversation
When they select Markdown format
Then a .md file downloads
And contains all messages with timestamps
```

---

## Testing Requirements

| Test Type   | Coverage                              |
| ----------- | ------------------------------------- |
| Unit        | Message persistence and retrieval     |
| Unit        | Search tokenization and matching      |
| Unit        | Export format generation              |
| Integration | Full conversation flow with streaming |
| E2E         | Search → navigate → view message      |
| E2E         | Export download verification          |

---

## Future RFCs Building on This

- RFC-006: Knowledge Base Enhancement (chat attachments)
- RFC-009: MCP Tool Integration (tool call visualization)
