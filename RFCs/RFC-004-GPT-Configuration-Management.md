# RFC-004: GPT Configuration Management Completion

**Status:** Draft
**Priority:** MUST HAVE (Phase 1)
**Complexity:** Medium
**Estimated Effort:** 1-2 weeks

---

## Summary

Complete the GPT configuration management features including archive/restore functionality, version history tracking, cross-tab synchronization, and organization features (folders, tags). This RFC builds on the IndexedDB storage from RFC-001 to add missing CRUD operations and data management features.

---

## Prerequisites

| RFC     | Requirement                              |
| ------- | ---------------------------------------- |
| RFC-001 | IndexedDB storage layer                  |
| RFC-003 | Provider abstraction for model selection |

---

## Features Addressed

| Feature ID | Description                                         | Priority |
| ---------- | --------------------------------------------------- | -------- |
| FR-2       | Edit GPT Configuration (auto-save, version history) | MUST     |
| FR-3       | Duplicate GPT                                       | SHOULD   |
| FR-4       | Organize GPTs (folders, tags)                       | SHOULD   |
| FR-5       | Archive/Delete GPT                                  | MUST     |
| F-105      | Version History                                     | SHOULD   |
| F-106      | Cross-tab Sync                                      | SHOULD   |

---

## Technical Specification

### 1. Extended GPT Schema

```typescript
// src/types/gpt.ts - Extensions
export const GPTVersionSchema = z.object({
  id: z.string().uuid(),
  gptId: z.string().uuid(),
  version: z.number().int().positive(),
  snapshot: z.any(), // Full GPT config at this version
  createdAt: z.string().datetime(),
  changeDescription: z.string().optional(),
})

export const GPTFolderSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50),
  parentId: z.string().uuid().nullable(),
  order: z.number().int(),
  createdAt: z.string().datetime(),
})

// Add to GPTConfigurationSchema
export const GPTConfigurationSchema = z.object({
  // ... existing fields ...
  folderId: z.string().uuid().nullable().default(null),
  isArchived: z.boolean().default(false),
  archivedAt: z.string().datetime().nullable().default(null),
})
```

### 2. IndexedDB Schema Updates

```typescript
// src/services/database.ts - Additional tables
this.version(2).stores({
  // ... existing stores ...
  gptVersions: "id, gptId, version, createdAt",
  folders: "id, parentId, name, order",
})
```

### 3. Auto-Save Implementation

```typescript
// src/hooks/use-auto-save.ts
export function useAutoSave<T>(
  value: T,
  onSave: (value: T) => Promise<void>,
  options: {
    debounceMs?: number // Default: 2000
    onError?: (error: Error) => void
  },
): {
  isSaving: boolean
  lastSaved: Date | null
  saveNow: () => Promise<void>
}
```

### 4. Version History Service

```typescript
// src/services/version-history.ts
export class VersionHistoryService {
  async createVersion(gptId: string, changeDescription?: string): Promise<GPTVersion>
  async getVersions(gptId: string, limit?: number): Promise<GPTVersion[]>
  async restoreVersion(versionId: string): Promise<GPTConfiguration>
  async deleteOldVersions(gptId: string, keepCount: number): Promise<void>
}
```

### 5. Cross-Tab Synchronization

```typescript
// src/services/cross-tab-sync.ts
// Uses BroadcastChannel API for same-device sync

export class CrossTabSync {
  private channel: BroadcastChannel

  constructor(channelName: string = "gpt-platform-sync")

  broadcast(event: SyncEvent): void
  subscribe(handler: (event: SyncEvent) => void): () => void
}

export type SyncEvent =
  | {type: "gpt-updated"; gptId: string; timestamp: number}
  | {type: "gpt-deleted"; gptId: string}
  | {type: "gpt-created"; gptId: string}
  | {type: "settings-updated"; key: string}
```

### 6. Folder Management

```typescript
// src/services/folder-service.ts
export class FolderService {
  async createFolder(name: string, parentId?: string): Promise<GPTFolder>
  async renameFolder(folderId: string, name: string): Promise<void>
  async moveFolder(folderId: string, newParentId: string | null): Promise<void>
  async deleteFolder(folderId: string, moveContentsTo?: string): Promise<void>
  async getFolderTree(): Promise<FolderTreeNode[]>
}

// Max nesting depth: 3 levels
```

### 7. Archive/Restore Operations

```typescript
// src/services/storage.ts - Extended
export class StorageService {
  // ... existing methods ...

  async archiveGPT(gptId: string): Promise<void>
  async restoreGPT(gptId: string): Promise<void>
  async deleteGPTPermanently(gptId: string): Promise<{
    deletedConversations: number
    deletedKnowledge: number
  }>
  async getArchivedGPTs(): Promise<GPTConfiguration[]>
}
```

### 8. Duplicate GPT

```typescript
// src/services/storage.ts - Extended
async duplicateGPT(gptId: string, newName?: string): Promise<GPTConfiguration> {
  const original = await this.getGPT(gptId)
  const duplicate: GPTConfiguration = {
    ...original,
    id: crypto.randomUUID(),
    name: newName || `${original.name} (Copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
    // Knowledge references copied, not files
  }
  return this.saveGPT(duplicate)
}
```

---

## UI Components

### 1. GPT Library Updates

```tsx
// Updates to src/components/gpt-library.tsx
- Add folder tree sidebar
- Add archive filter toggle
- Add tag filter chips
- Add bulk selection mode
- Add context menu (right-click) for GPT cards
```

### 2. Version History Panel

```tsx
// src/components/version-history-panel.tsx
interface VersionHistoryPanelProps {
  gptId: string
  onRestore: (version: GPTVersion) => void
}
```

### 3. Archive Confirmation Dialog

```tsx
// src/components/archive-dialog.tsx
- Shows conversation count
- Explains archive vs delete
- Provides restore path information
```

---

## Acceptance Criteria

```gherkin
# Auto-save
Given a user is editing a GPT
When they stop typing for 2 seconds
Then changes are automatically saved to IndexedDB
And a "Saved" indicator appears

# Version History
Given a user explicitly saves a GPT
When they view version history
Then they see timestamped snapshots
And can restore any previous version

# Cross-tab Sync
Given a user has the same GPT open in two tabs
When they edit in Tab A
Then Tab B updates within 500ms
And shows a "Updated externally" notification

# Archive/Restore
Given a user archives a GPT
When they view the GPT library
Then the archived GPT is hidden
And appears under "Archived" filter
And can be restored with all data intact

# Folders
Given a user creates a folder
When they drag a GPT into it
Then the GPT appears under that folder
And folder structure persists across sessions
```

---

## Testing Requirements

| Test Type   | Coverage                                 |
| ----------- | ---------------------------------------- |
| Unit        | Auto-save debouncing logic               |
| Unit        | Version history CRUD operations          |
| Unit        | Folder nesting validation (max 3 levels) |
| Integration | Cross-tab sync with BroadcastChannel     |
| E2E         | Full archive → filter → restore flow     |
| E2E         | Folder drag-and-drop organization        |

---

## Future RFCs Building on This

- RFC-007: Export/Import System (exports folder structure)
