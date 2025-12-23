# RFC-001: IndexedDB Storage Foundation

**Status:** Pending **Priority:** MUST HAVE **Complexity:** High **Phase:** 1 **Created:** December 20, 2025

---

## Summary

Migrate the application's data persistence layer from localStorage to IndexedDB using Dexie.js wrapper. This foundational RFC establishes the storage architecture that all other features depend upon.

## Features Addressed

| Feature ID | Feature Name            | Priority  |
| ---------- | ----------------------- | --------- |
| F-701      | IndexedDB Storage Layer | MUST HAVE |
| F-801      | Offline Capability      | MUST HAVE |
| F-802      | Auto-Save               | MUST HAVE |

## Dependencies

- **Builds Upon:** None (foundation RFC)
- **Required By:** All other RFCs (RFC-002 through RFC-012)

---

## Technical Architecture

### Database Schema (Dexie.js)

```typescript
// src/lib/database.ts
import Dexie, {Table} from "dexie"

interface GPTConfiguration {
  id: string
  name: string
  description?: string
  systemPrompt: string
  instructions?: string
  conversationStarters?: string[]
  modelProvider: "openai" | "anthropic" | "ollama" | "azure"
  modelName: string
  modelSettings: ModelSettings
  tools: MCPTool[]
  knowledge?: GPTKnowledge
  capabilities: Capabilities
  createdAt: string
  updatedAt: string
  version: number
  tags: string[]
  isArchived: boolean
}

interface Conversation {
  id: string
  gptId: string
  title: string
  createdAt: string
  updatedAt: string
  messageCount: number
  lastMessagePreview?: string
  tags: string[]
}

interface Message {
  id: string
  conversationId: string
  role: "user" | "assistant" | "system" | "tool"
  content: string
  timestamp: string
  metadata?: MessageMetadata
}

interface KnowledgeFile {
  id: string
  gptId: string
  name: string
  mimeType: string
  size: number
  content: Blob
  extractedText?: string
  uploadedAt: string
}

interface EncryptedSecret {
  id: string
  provider: string
  encryptedKey: ArrayBuffer
  iv: Uint8Array
  createdAt: string
}

interface UserSetting {
  key: string
  value: unknown
}

class GPTDatabase extends Dexie {
  gpts!: Table<GPTConfiguration>
  conversations!: Table<Conversation>
  messages!: Table<Message>
  knowledgeFiles!: Table<KnowledgeFile>
  secrets!: Table<EncryptedSecret>
  settings!: Table<UserSetting>

  constructor() {
    super("gpt-platform")
    this.version(1).stores({
      gpts: "id, name, createdAt, updatedAt, *tags, isArchived",
      conversations: "id, gptId, updatedAt, *tags",
      messages: "id, conversationId, timestamp",
      knowledgeFiles: "id, gptId, name, mimeType",
      secrets: "id, provider",
      settings: "key",
    })
  }
}

export const db = new GPTDatabase()
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Components                          │
│                              │                                   │
│                              ▼                                   │
│                    useStorage() Hook                             │
│                              │                                   │
│                              ▼                                   │
│                  StorageContext Provider                         │
│                              │                                   │
│          ┌───────────────────┼───────────────────┐              │
│          ▼                   ▼                   ▼              │
│    LRU Cache         Storage Service      BroadcastChannel     │
│    (memory)          (persistence)         (cross-tab sync)    │
│          │                   │                   │              │
│          └───────────────────┼───────────────────┘              │
│                              ▼                                   │
│                    Dexie.js Wrapper                              │
│                              │                                   │
│                              ▼                                   │
│                        IndexedDB                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Acceptance Criteria

### AC-1: Database Initialization

```gherkin
Given the application loads for the first time
When IndexedDB is initialized
Then the database "gpt-platform" is created
And all tables are created with correct schemas
And version 1 migration completes successfully
```

### AC-2: Data Migration from localStorage

```gherkin
Given existing data exists in localStorage
When the application starts
Then data is migrated to IndexedDB
And localStorage data is cleared after successful migration
And a migration status is logged
```

### AC-3: GPT CRUD Operations

```gherkin
Given a user creates a new GPT
When they save the configuration
Then the GPT is persisted to IndexedDB "gpts" table
And the GPT can be retrieved by ID
And the GPT appears in list queries

Given a user updates a GPT
When changes are saved
Then the updatedAt timestamp is updated
And the version is incremented
And previous data is overwritten
```

### AC-4: Auto-Save with Debouncing

```gherkin
Given a user is editing a GPT
When they pause typing for 2 seconds
Then changes are automatically persisted
And a save indicator shows "Saved" status
And no data is lost on unexpected close

Given rapid edits are made
When changes occur within 2 seconds
Then only one save operation is triggered
```

### AC-5: Offline Capability

```gherkin
Given the application has been loaded once
When network is disconnected
Then GPT management (CRUD) works
And local conversations are accessible
And settings can be modified
And only API calls to LLM providers fail (expected)
```

### AC-6: Storage Quota Handling

```gherkin
Given storage quota is approaching limit (>80%)
When a write operation is attempted
Then user is warned before quota exceeded
And storage usage breakdown is available in settings

Given storage quota is exceeded
When a write operation fails
Then a clear error message is displayed
And suggestions to free space are provided
```

### AC-7: Cross-Tab Synchronization

```gherkin
Given a user has multiple tabs open
When data is modified in one tab
Then changes appear in other tabs within 500ms
And no conflicts occur (single source of truth)
```

---

## Implementation Details

### File Structure

```
src/
├── lib/
│   └── database.ts          # Dexie database definition
├── services/
│   ├── storage.ts           # Refactored storage service
│   └── migration.ts         # localStorage → IndexedDB migration
├── contexts/
│   └── storage-context.tsx  # Updated context with IndexedDB
└── hooks/
    └── use-storage.ts       # Updated hook
```

### Key Implementation Steps

1. **Install Dependencies**

   ```bash
   pnpm add dexie
   ```

2. **Create Database Module** (`src/lib/database.ts`)
   - Define all table interfaces with Zod schema alignment
   - Create Dexie database class with versioned schema
   - Export singleton database instance

3. **Create Migration Service** (`src/services/migration.ts`)
   - Detect existing localStorage data
   - Transform data to IndexedDB format
   - Batch insert to IndexedDB
   - Clear localStorage after success
   - Handle migration errors gracefully

4. **Refactor Storage Service** (`src/services/storage.ts`)
   - Replace localStorage calls with Dexie operations
   - Maintain LRU cache for performance
   - Add debounced auto-save
   - Implement storage quota monitoring

5. **Update Storage Context** (`src/contexts/storage-context.tsx`)
   - Initialize database on mount
   - Run migration if needed
   - Set up BroadcastChannel for cross-tab sync
   - Provide storage status (quota, sync state)

6. **Update Hook** (`src/hooks/use-storage.ts`)
   - Expose new methods (getStorageUsage, etc.)
   - Maintain backward compatibility

### Cross-Tab Synchronization

```typescript
// BroadcastChannel setup
const channel = new BroadcastChannel("gpt-storage-sync")

// On data change
channel.postMessage({
  type: "DATA_CHANGED",
  table: "gpts",
  id: gptId,
  timestamp: Date.now(),
})

// On message received
channel.onmessage = event => {
  if (event.data.type === "DATA_CHANGED") {
    // Invalidate cache and refetch
    cache.delete(event.data.id)
    // Trigger React state update
  }
}
```

### Storage Quota Monitoring

```typescript
async function getStorageEstimate(): Promise<StorageEstimate> {
  if ("storage" in navigator && "estimate" in navigator.storage) {
    const estimate = await navigator.storage.estimate()
    return {
      used: estimate.usage ?? 0,
      quota: estimate.quota ?? 0,
      percentUsed: ((estimate.usage ?? 0) / (estimate.quota ?? 1)) * 100,
    }
  }
  return {used: 0, quota: 0, percentUsed: 0}
}
```

---

## Testing Strategy

### Unit Tests

- Database initialization and schema creation
- CRUD operations for each table
- Migration logic with various data shapes
- Auto-save debouncing behavior
- Cache invalidation

### Integration Tests

- Full storage flow (create → update → delete)
- Cross-tab synchronization
- Offline mode data persistence
- Storage quota warnings

### E2E Tests

- Create GPT, close tab, reopen - data persists
- Edit GPT in Tab A, verify update in Tab B
- Exceed storage quota and verify warning

---

## Performance Considerations

| Metric        | Target | Approach                            |
| ------------- | ------ | ----------------------------------- |
| Write latency | <50ms  | Async operations, batching          |
| Read latency  | <10ms  | LRU cache first, IndexedDB fallback |
| List query    | <50ms  | Proper indexing on query fields     |
| Initial load  | <100ms | Lazy loading, pagination            |

---

## Error Handling

| Error               | Handling                                   |
| ------------------- | ------------------------------------------ |
| IndexedDB blocked   | Show modal asking user to close other tabs |
| Quota exceeded      | Display usage breakdown, suggest cleanup   |
| Migration failed    | Keep localStorage, show retry option       |
| Database corruption | Offer export of raw data, recreate DB      |

---

## Rollback Plan

If critical issues are discovered:

1. Feature flag to disable IndexedDB
2. Fallback to localStorage with deprecation warning
3. Data export tool always available

---

## Related Documents

- [PRD Section 5.1](../docs/prd.md#51-storage-architecture) - Storage Architecture
- [Features F-701](../docs/features.md#f-701-indexeddb-storage-layer) - Feature Details
- [RULES.md Section 7](../docs/RULES.md#7-state-management) - State Management Guidelines
