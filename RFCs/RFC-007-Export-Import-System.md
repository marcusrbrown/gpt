# RFC-007: Export/Import System

| Field            | Value                                         |
| ---------------- | --------------------------------------------- |
| **Status**       | Pending                                       |
| **Priority**     | MUST                                          |
| **Complexity**   | Medium                                        |
| **Effort**       | 2 weeks                                       |
| **Dependencies** | RFC-001 (IndexedDB), RFC-004 (GPT Management) |

## Summary

Implement a comprehensive export/import system supporting individual GPT configurations, bulk operations, conversation exports in multiple formats, and full platform backup/restore. The system uses versioned JSON schemas for forward compatibility and ZIP archives for bulk operations.

## Prerequisites

| Prerequisite                 | RFC     | Status       |
| ---------------------------- | ------- | ------------ |
| IndexedDB Storage Foundation | RFC-001 | ✅ Completed |
| GPT Configuration Management | RFC-004 | ✅ Completed |

## Features Addressed

| Feature ID | Feature Name               | Coverage |
| ---------- | -------------------------- | -------- |
| F-601      | GPT Configuration Export   | Full     |
| F-602      | GPT Import with Validation | Full     |
| F-603      | Bulk Export/Import         | Full     |
| F-604      | Full Backup & Restore      | Full     |

## Technical Specification

### Zod Schemas

```typescript
import {z} from "zod"

// Export format version
export const ExportVersionSchema = z.enum(["1.0", "1.1"])

// Base export metadata
export const ExportMetadataSchema = z.object({
  version: ExportVersionSchema,
  exportedAt: z.string().datetime(),
  source: z.literal("gpt-platform"),
  sourceVersion: z.string(), // App version
})

// Knowledge file export (base64 encoded for JSON compatibility)
export const KnowledgeFileExportSchema = z.object({
  name: z.string(),
  mimeType: z.string(),
  size: z.number(),
  base64Content: z.string(),
  extractedText: z.string().optional(),
})

// GPT configuration export
export const GPTExportSchema = z.object({
  metadata: ExportMetadataSchema,
  gpt: z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().optional(),
    instructions: z.string(),
    model: z.string(),
    provider: z.string(),
    temperature: z.number().min(0).max(2),
    maxTokens: z.number().optional(),
    tools: z.array(z.unknown()).optional(),
    capabilities: z
      .object({
        webBrowsing: z.boolean(),
        codeInterpreter: z.boolean(),
        imageGeneration: z.boolean(),
      })
      .optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
  knowledge: z
    .object({
      files: z.array(KnowledgeFileExportSchema),
      urls: z.array(z.string().url()),
      snippets: z.array(
        z.object({
          title: z.string(),
          content: z.string(),
          tags: z.array(z.string()),
        }),
      ),
    })
    .optional(),
  versionHistory: z
    .array(
      z.object({
        version: z.number(),
        timestamp: z.string().datetime(),
        snapshot: z.unknown(),
      }),
    )
    .optional(),
})

// Conversation export
export const ConversationExportSchema = z.object({
  metadata: ExportMetadataSchema,
  conversation: z.object({
    id: z.string().uuid(),
    gptId: z.string().uuid(),
    gptName: z.string(),
    title: z.string().optional(),
    createdAt: z.string().datetime(),
    messages: z.array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
        timestamp: z.string().datetime(),
        metadata: z.record(z.unknown()).optional(),
      }),
    ),
  }),
})

// Bulk export manifest
export const BulkExportManifestSchema = z.object({
  metadata: ExportMetadataSchema,
  contents: z.object({
    gpts: z.array(
      z.object({
        id: z.string().uuid(),
        name: z.string(),
        filename: z.string(), // Path in ZIP
      }),
    ),
    folders: z.array(
      z.object({
        id: z.string().uuid(),
        name: z.string(),
        parentId: z.string().uuid().nullable(),
        gptIds: z.array(z.string().uuid()),
      }),
    ),
    totalFiles: z.number(),
    totalSizeBytes: z.number(),
  }),
})

// Full backup export
export const FullBackupSchema = z.object({
  metadata: ExportMetadataSchema.extend({
    backupType: z.literal("full"),
  }),
  contents: z.object({
    gpts: z.array(GPTExportSchema.shape.gpt),
    conversations: z.array(ConversationExportSchema.shape.conversation),
    folders: z.array(
      z.object({
        id: z.string().uuid(),
        name: z.string(),
        parentId: z.string().uuid().nullable(),
      }),
    ),
    settings: z.record(z.unknown()),
    knowledge: z.record(
      z.string().uuid(),
      z.object({
        files: z.array(KnowledgeFileExportSchema),
        urls: z.array(z.string()),
        snippets: z.array(z.unknown()),
      }),
    ),
  }),
})

// Import conflict resolution
export const ConflictResolutionSchema = z.enum([
  "skip", // Keep existing, ignore import
  "overwrite", // Replace existing with import
  "rename", // Import with new name/ID
  "merge", // Merge settings (for compatible items)
])

// Import result
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

// Type exports
export type ExportVersion = z.infer<typeof ExportVersionSchema>
export type ExportMetadata = z.infer<typeof ExportMetadataSchema>
export type GPTExport = z.infer<typeof GPTExportSchema>
export type ConversationExport = z.infer<typeof ConversationExportSchema>
export type BulkExportManifest = z.infer<typeof BulkExportManifestSchema>
export type FullBackup = z.infer<typeof FullBackupSchema>
export type ConflictResolution = z.infer<typeof ConflictResolutionSchema>
export type ImportResult = z.infer<typeof ImportResultSchema>
```

### Service Interface

```typescript
interface ExportService {
  // Single GPT export
  exportGPT(gptId: string, options?: GPTExportOptions): Promise<Blob>

  // Bulk export
  exportGPTs(gptIds: string[], options?: BulkExportOptions): Promise<Blob>
  exportFolder(folderId: string, options?: BulkExportOptions): Promise<Blob>

  // Conversation export
  exportConversation(conversationId: string, format: ExportFormat): Promise<Blob>
  exportConversations(conversationIds: string[], format: ExportFormat): Promise<Blob>

  // Full backup
  createBackup(): Promise<Blob>
}

interface ImportService {
  // Validation
  validateImport(file: File): Promise<ImportValidation>

  // Import operations
  importGPT(file: File, resolution?: ConflictResolution): Promise<ImportResult>
  importBulk(file: File, resolutions?: Map<string, ConflictResolution>): Promise<ImportResult>
  restoreBackup(file: File, options?: RestoreOptions): Promise<ImportResult>

  // Preview
  previewImport(file: File): Promise<ImportPreview>
}

interface GPTExportOptions {
  includeKnowledge?: boolean
  includeVersionHistory?: boolean
  includeConversations?: boolean
}

interface BulkExportOptions extends GPTExportOptions {
  preserveFolderStructure?: boolean
}

type ExportFormat = "json" | "markdown" | "pdf"

interface ImportValidation {
  valid: boolean
  version: ExportVersion
  type: "gpt" | "bulk" | "backup" | "conversation"
  errors: string[]
  warnings: string[]
}

interface ImportPreview {
  type: "gpt" | "bulk" | "backup"
  items: {id: string; name: string; hasConflict: boolean}[]
  totalSize: number
  estimatedTime: number // seconds
}

interface RestoreOptions {
  clearExisting?: boolean // Wipe before restore
  conflictResolution?: ConflictResolution
}
```

### Export Implementation

```typescript
class ExportServiceImpl implements ExportService {
  private readonly APP_VERSION = "1.0.0"

  async exportGPT(gptId: string, options?: GPTExportOptions): Promise<Blob> {
    const gpt = await db.gpts.get(gptId)
    if (!gpt) throw new ExportError("not_found", `GPT ${gptId} not found`)

    const exportData: GPTExport = {
      metadata: {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        source: "gpt-platform",
        sourceVersion: this.APP_VERSION,
      },
      gpt: {
        id: gpt.id,
        name: gpt.name,
        description: gpt.description,
        instructions: gpt.instructions,
        model: gpt.model,
        provider: gpt.provider,
        temperature: gpt.temperature,
        maxTokens: gpt.maxTokens,
        tools: gpt.tools,
        capabilities: gpt.capabilities,
        createdAt: gpt.createdAt,
        updatedAt: gpt.updatedAt,
      },
    }

    if (options?.includeKnowledge) {
      exportData.knowledge = await this.exportKnowledge(gptId)
    }

    if (options?.includeVersionHistory) {
      exportData.versionHistory = await this.exportVersionHistory(gptId)
    }

    const json = JSON.stringify(exportData, null, 2)
    return new Blob([json], {type: "application/json"})
  }

  async exportGPTs(gptIds: string[], options?: BulkExportOptions): Promise<Blob> {
    const JSZip = (await import("jszip")).default
    const zip = new JSZip()

    const manifest: BulkExportManifest = {
      metadata: {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        source: "gpt-platform",
        sourceVersion: this.APP_VERSION,
      },
      contents: {
        gpts: [],
        folders: [],
        totalFiles: 0,
        totalSizeBytes: 0,
      },
    }

    for (const gptId of gptIds) {
      const gptBlob = await this.exportGPT(gptId, options)
      const gpt = await db.gpts.get(gptId)
      const filename = `gpts/${this.sanitizeFilename(gpt!.name)}.json`

      zip.file(filename, gptBlob)
      manifest.contents.gpts.push({
        id: gptId,
        name: gpt!.name,
        filename,
      })
      manifest.contents.totalSizeBytes += gptBlob.size
    }

    if (options?.preserveFolderStructure) {
      manifest.contents.folders = await this.getFolderStructure(gptIds)
    }

    manifest.contents.totalFiles = gptIds.length
    zip.file("manifest.json", JSON.stringify(manifest, null, 2))

    return zip.generateAsync({type: "blob", compression: "DEFLATE"})
  }

  async exportConversation(conversationId: string, format: ExportFormat): Promise<Blob> {
    const conversation = await db.conversations.get(conversationId)
    if (!conversation) throw new ExportError("not_found", "Conversation not found")

    const messages = await db.messages.where("conversationId").equals(conversationId).sortBy("timestamp")

    const gpt = await db.gpts.get(conversation.gptId)

    switch (format) {
      case "json":
        return this.exportConversationJSON(conversation, messages, gpt)
      case "markdown":
        return this.exportConversationMarkdown(conversation, messages, gpt)
      case "pdf":
        return this.exportConversationPDF(conversation, messages, gpt)
    }
  }

  private async exportConversationMarkdown(conversation: Conversation, messages: Message[], gpt?: GPT): Promise<Blob> {
    const lines: string[] = [
      `# ${conversation.title || "Conversation"}`,
      "",
      `**GPT**: ${gpt?.name || "Unknown"}`,
      `**Date**: ${new Date(conversation.createdAt).toLocaleString()}`,
      "",
      "---",
      "",
    ]

    for (const msg of messages) {
      const role = msg.role === "user" ? "👤 User" : "🤖 Assistant"
      lines.push(`### ${role}`)
      lines.push("")
      lines.push(msg.content)
      lines.push("")
    }

    return new Blob([lines.join("\n")], {type: "text/markdown"})
  }

  async createBackup(): Promise<Blob> {
    const JSZip = (await import("jszip")).default
    const zip = new JSZip()

    // Export all data
    const [gpts, conversations, folders, settings] = await Promise.all([
      db.gpts.toArray(),
      db.conversations.toArray(),
      db.folders.toArray(),
      db.settings.toArray(),
    ])

    const backup: FullBackup = {
      metadata: {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        source: "gpt-platform",
        sourceVersion: this.APP_VERSION,
        backupType: "full",
      },
      contents: {
        gpts: gpts.map(g => this.serializeGPT(g)),
        conversations: await this.serializeConversations(conversations),
        folders: folders.map(f => ({
          id: f.id,
          name: f.name,
          parentId: f.parentId,
        })),
        settings: Object.fromEntries(settings.map(s => [s.key, s.value])),
        knowledge: await this.exportAllKnowledge(gpts),
      },
    }

    zip.file("backup.json", JSON.stringify(backup, null, 2))

    // Add knowledge files as separate entries for large files
    for (const gpt of gpts) {
      const files = await db.knowledgeFiles.where("gptId").equals(gpt.id).toArray()
      for (const file of files) {
        zip.file(`knowledge/${gpt.id}/${file.name}`, file.content)
      }
    }

    return zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: {level: 6},
    })
  }

  private sanitizeFilename(name: string): string {
    return name.replace(/[^a-z0-9-_]/gi, "_").substring(0, 50)
  }
}
```

### Import Implementation

```typescript
class ImportServiceImpl implements ImportService {
  async validateImport(file: File): Promise<ImportValidation> {
    const validation: ImportValidation = {
      valid: false,
      version: "1.0",
      type: "gpt",
      errors: [],
      warnings: [],
    }

    try {
      if (file.name.endsWith(".zip")) {
        return this.validateZipImport(file)
      }

      const text = await file.text()
      const data = JSON.parse(text)

      // Detect type and validate
      if (data.metadata?.backupType === "full") {
        validation.type = "backup"
        const result = FullBackupSchema.safeParse(data)
        if (!result.success) {
          validation.errors = result.error.issues.map(i => i.message)
          return validation
        }
      } else if (data.gpt) {
        validation.type = "gpt"
        const result = GPTExportSchema.safeParse(data)
        if (!result.success) {
          validation.errors = result.error.issues.map(i => i.message)
          return validation
        }
      } else if (data.conversation) {
        validation.type = "conversation"
        const result = ConversationExportSchema.safeParse(data)
        if (!result.success) {
          validation.errors = result.error.issues.map(i => i.message)
          return validation
        }
      } else {
        validation.errors.push("Unknown export format")
        return validation
      }

      validation.version = data.metadata?.version || "1.0"
      validation.valid = true

      // Check for version compatibility warnings
      if (data.metadata?.version !== "1.0") {
        validation.warnings.push(`Export version ${data.metadata?.version} may have compatibility issues`)
      }
    } catch (error_) {
      validation.errors.push(`Parse error: ${error_ instanceof Error ? error_.message : "Unknown"}`)
    }

    return validation
  }

  async importGPT(file: File, resolution: ConflictResolution = "rename"): Promise<ImportResult> {
    const validation = await this.validateImport(file)
    if (!validation.valid) {
      return {
        success: false,
        imported: 0,
        skipped: 0,
        errors: validation.errors.map(e => ({item: "file", error: e})),
        conflicts: [],
      }
    }

    const text = await file.text()
    const data = GPTExportSchema.parse(JSON.parse(text))

    // Check for conflicts
    const existing = await db.gpts.where("name").equals(data.gpt.name).first()

    if (existing) {
      switch (resolution) {
        case "skip":
          return {
            success: true,
            imported: 0,
            skipped: 1,
            errors: [],
            conflicts: [{existingId: existing.id, importedName: data.gpt.name, resolution: "skip"}],
          }
        case "overwrite":
          await this.overwriteGPT(existing.id, data)
          break
        case "rename":
          data.gpt.name = await this.generateUniqueName(data.gpt.name)
          data.gpt.id = crypto.randomUUID()
          await this.createGPT(data)
          break
      }
    } else {
      data.gpt.id = crypto.randomUUID()
      await this.createGPT(data)
    }

    return {
      success: true,
      imported: 1,
      skipped: 0,
      errors: [],
      conflicts: existing ? [{existingId: existing.id, importedName: data.gpt.name, resolution}] : [],
    }
  }

  async previewImport(file: File): Promise<ImportPreview> {
    const validation = await this.validateImport(file)
    if (!validation.valid) {
      throw new ImportError("invalid", validation.errors.join(", "))
    }

    const items: ImportPreview["items"] = []

    if (file.name.endsWith(".zip")) {
      const JSZip = (await import("jszip")).default
      const zip = await JSZip.loadAsync(file)
      const manifestFile = zip.file("manifest.json")

      if (manifestFile) {
        const manifest = JSON.parse(await manifestFile.async("string")) as BulkExportManifest
        for (const gpt of manifest.contents.gpts) {
          const existing = await db.gpts.where("name").equals(gpt.name).first()
          items.push({
            id: gpt.id,
            name: gpt.name,
            hasConflict: !!existing,
          })
        }
      }
    } else {
      const text = await file.text()
      const data = JSON.parse(text)

      if (data.gpt) {
        const existing = await db.gpts.where("name").equals(data.gpt.name).first()
        items.push({
          id: data.gpt.id,
          name: data.gpt.name,
          hasConflict: !!existing,
        })
      }
    }

    return {
      type: validation.type as "gpt" | "bulk" | "backup",
      items,
      totalSize: file.size,
      estimatedTime: Math.ceil(file.size / 1_000_000), // ~1 sec per MB
    }
  }

  private async generateUniqueName(baseName: string): Promise<string> {
    let name = baseName
    let counter = 1

    while ((await db.gpts.where("name").equals(name).count()) > 0) {
      name = `${baseName} (${counter})`
      counter++
    }

    return name
  }
}
```

## UI Components

### ExportDialog

```typescript
interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
  gptIds?: string[] // If provided, export specific GPTs
  conversationIds?: string[] // If provided, export conversations
}

// Modal with options:
// - Include knowledge base
// - Include version history
// - Include conversations
// - Format selection (for conversations)
// - Progress indicator for large exports
```

### ImportDialog

```typescript
interface ImportDialogProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (result: ImportResult) => void
}

// Steps:
// 1. File selection (drag-drop or file picker)
// 2. Validation feedback
// 3. Preview with conflict detection
// 4. Conflict resolution (if any)
// 5. Import progress
// 6. Result summary
```

### ConflictResolutionPanel

```typescript
interface ConflictResolutionPanelProps {
  conflicts: ImportPreview["items"]
  onResolve: (resolutions: Map<string, ConflictResolution>) => void
}

// Shows each conflicting item with resolution options:
// - Skip (keep existing)
// - Overwrite (replace existing)
// - Rename (import as copy)
// - Apply to all checkbox
```

### BackupRestorePanel

```typescript
interface BackupRestorePanelProps {
  // Settings page component
}

// Two sections:
// 1. Create Backup - button to trigger full backup download
// 2. Restore Backup - file picker with warning about data replacement
```

## Acceptance Criteria

### Export

```gherkin
Feature: GPT Export

Scenario: Export single GPT with knowledge
  Given I have a GPT with 3 knowledge files
  When I click "Export" and select "Include knowledge"
  Then a JSON file should download
  And the file should contain the GPT configuration
  And the file should contain base64-encoded knowledge files

Scenario: Bulk export with folder structure
  Given I have 5 GPTs in 2 folders
  When I select all GPTs and click "Export Selected"
  Then a ZIP file should download
  And the ZIP should contain a manifest.json
  And the manifest should include folder relationships

Scenario: Export conversation as Markdown
  Given I have a conversation with 10 messages
  When I export it as Markdown
  Then a .md file should download
  And it should have proper heading formatting
  And messages should be clearly separated
```

### Import

```gherkin
Feature: GPT Import

Scenario: Import GPT with no conflicts
  Given I have a valid GPT export file
  And no GPT with that name exists
  When I import the file
  Then the GPT should be created
  And all settings should match the export

Scenario: Import with name conflict - rename
  Given I import a GPT named "My Assistant"
  And a GPT named "My Assistant" already exists
  When I choose "Rename" resolution
  Then a new GPT named "My Assistant (1)" should be created
  And the original GPT should be unchanged

Scenario: Import invalid file
  Given I have a corrupted export file
  When I try to import it
  Then I should see validation errors
  And no data should be modified
```

### Backup & Restore

```gherkin
Feature: Full Backup

Scenario: Create full backup
  Given I have 10 GPTs, 50 conversations, and 100MB of knowledge
  When I click "Create Backup"
  Then a ZIP file should download
  And it should contain all GPTs, conversations, and settings
  And the file size should be reasonable (compressed)

Scenario: Restore from backup
  Given I have a valid backup file
  When I restore with "Clear existing" option
  Then all current data should be removed
  And all backup data should be imported
  And the app should function normally
```

## Testing Requirements

| Test Type         | Coverage Target | Focus Areas                      |
| ----------------- | --------------- | -------------------------------- |
| Unit Tests        | 90%             | Schema validation, serialization |
| Integration Tests | 85%             | Dexie read/write, ZIP operations |
| E2E Tests         | Key flows       | Export → Import roundtrip        |

### Key Test Cases

1. **Roundtrip integrity**: Export → Import produces identical data
2. **Large file handling**: 100MB backup completes without timeout
3. **Version compatibility**: Import v1.0 files in v1.1 app
4. **Conflict detection**: All conflict scenarios handled correctly
5. **Partial failure**: Import continues after single item failure

## Dependencies

### npm Packages

```json
{
  "jszip": "^3.10.1",
  "file-saver": "^2.0.5"
}
```

## Future Enhancements

| Enhancement         | Description                        | Target RFC |
| ------------------- | ---------------------------------- | ---------- |
| Cloud backup        | Optional encrypted cloud backup    | RFC-015    |
| Scheduled backups   | Automatic periodic backups         | RFC-015    |
| Selective restore   | Restore specific items from backup | RFC-015    |
| Cross-platform sync | Share exports between devices      | RFC-012    |
