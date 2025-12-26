import {db, toISOString, type GPTConfigurationDB} from '@/lib/database'
import {
  BulkExportManifestSchema,
  ConversationExportSchema,
  CURRENT_EXPORT_VERSION,
  FullBackupSchema,
  GPTExportSchema,
  type BulkExportManifest,
  type ConflictResolution,
  type ConversationExport,
  type ExportVersion,
  type FullBackup,
  type GPTExport,
  type ImportPreview,
  type ImportPreviewItem,
  type ImportResult,
  type ImportValidation,
} from '@/types/export-import'
import JSZip from 'jszip'

export type ImportFileType = 'gpt' | 'conversation' | 'bulk' | 'backup' | 'unknown'

export interface DetectedImport {
  type: ImportFileType
  version: ExportVersion | null
  data: GPTExport | ConversationExport | BulkExportManifest | FullBackup | null
  errors: string[]
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64)
  const byteArray = Uint8Array.from(byteCharacters, char => char.charCodeAt(0))
  return new Blob([byteArray], {type: mimeType})
}

function generateNewId(): string {
  return crypto.randomUUID()
}

export async function detectImportType(file: File): Promise<DetectedImport> {
  const errors: string[] = []

  try {
    if (file.name.endsWith('.zip')) {
      const zip = await JSZip.loadAsync(file)
      const manifestFile = zip.file('manifest.json')

      if (manifestFile) {
        const manifestContent = await manifestFile.async('string')
        const manifestData = JSON.parse(manifestContent)

        if (manifestData.metadata?.backupType === 'full') {
          const result = FullBackupSchema.safeParse(manifestData)
          if (result.success) {
            return {type: 'backup', version: result.data.metadata.version, data: result.data, errors: []}
          }
          const zodErrors = result.error?.issues?.map(e => e.message) ?? ['Invalid backup format']
          errors.push(...zodErrors)
        } else {
          const result = BulkExportManifestSchema.safeParse(manifestData)
          if (result.success) {
            return {type: 'bulk', version: result.data.metadata.version, data: result.data, errors: []}
          }
          const zodErrors = result.error?.issues?.map(e => e.message) ?? ['Invalid bulk export format']
          errors.push(...zodErrors)
        }
      }

      return {type: 'unknown', version: null, data: null, errors: ['ZIP file missing manifest.json']}
    }

    const content = await file.text()
    const data = JSON.parse(content)

    if (data.gpt && data.metadata) {
      const result = GPTExportSchema.safeParse(data)
      if (result.success) {
        return {type: 'gpt', version: result.data.metadata.version, data: result.data, errors: []}
      }
      const zodErrors = result.error?.issues?.map(e => e.message) ?? ['Invalid GPT export format']
      errors.push(...zodErrors)
    }

    if (data.conversation && data.metadata) {
      const result = ConversationExportSchema.safeParse(data)
      if (result.success) {
        return {type: 'conversation', version: result.data.metadata.version, data: result.data, errors: []}
      }
      const zodErrors = result.error?.issues?.map(e => e.message) ?? ['Invalid conversation export format']
      errors.push(...zodErrors)
    }

    return {type: 'unknown', version: null, data: null, errors: errors.length > 0 ? errors : ['Unknown format']}
  } catch (error_) {
    const message = error_ instanceof Error ? error_.message : 'Failed to parse import file'
    return {type: 'unknown', version: null, data: null, errors: [message]}
  }
}

export async function validateImport(file: File): Promise<ImportValidation> {
  const detected = await detectImportType(file)

  if (detected.type === 'unknown' || !detected.data || !detected.version) {
    return {
      valid: false,
      version: CURRENT_EXPORT_VERSION,
      type: 'gpt',
      errors: detected.errors,
      warnings: [],
    }
  }

  const warnings: string[] = []

  if (detected.version !== CURRENT_EXPORT_VERSION) {
    warnings.push(`Export version ${detected.version} differs from current ${CURRENT_EXPORT_VERSION}`)
  }

  return {
    valid: true,
    version: detected.version,
    type: detected.type,
    errors: [],
    warnings,
  }
}

export async function previewImport(file: File): Promise<ImportPreview> {
  const detected = await detectImportType(file)

  if (detected.type === 'unknown' || !detected.data) {
    return {
      type: 'gpt',
      items: [],
      totalSize: file.size,
      estimatedTimeSeconds: 0,
    }
  }

  const items: ImportPreviewItem[] = []

  if (detected.type === 'gpt') {
    const gptExport = detected.data as GPTExport
    const existingGPT = await db.gpts.get(gptExport.gpt.id)
    const existingByName = await db.gpts.where('name').equals(gptExport.gpt.name).first()

    items.push({
      type: 'gpt',
      id: gptExport.gpt.id,
      name: gptExport.gpt.name,
      hasConflict: !!existingGPT || !!existingByName,
      existingId: existingGPT?.id ?? existingByName?.id,
    })
  }

  if (detected.type === 'conversation') {
    const convExport = detected.data as ConversationExport
    const existingConv = await db.conversations.get(convExport.conversation.id)

    items.push({
      type: 'conversation',
      id: convExport.conversation.id,
      name: convExport.conversation.title ?? 'Untitled Conversation',
      hasConflict: !!existingConv,
      existingId: existingConv?.id,
    })
  }

  if (detected.type === 'bulk') {
    const manifest = detected.data as BulkExportManifest

    for (const gptRef of manifest.contents.gpts) {
      const existingGPT = await db.gpts.get(gptRef.id)
      const existingByName = await db.gpts.where('name').equals(gptRef.name).first()

      items.push({
        type: 'gpt',
        id: gptRef.id,
        name: gptRef.name,
        hasConflict: !!existingGPT || !!existingByName,
        existingId: existingGPT?.id ?? existingByName?.id,
      })
    }
  }

  if (detected.type === 'backup') {
    const backup = detected.data as FullBackup

    for (const gpt of backup.contents.gpts) {
      items.push({
        type: 'gpt',
        id: gpt.id,
        name: gpt.name,
        hasConflict: true,
        existingId: gpt.id,
      })
    }

    for (const conv of backup.contents.conversations) {
      items.push({
        type: 'conversation',
        id: conv.id,
        name: conv.title ?? 'Untitled',
        hasConflict: true,
        existingId: conv.id,
      })
    }
  }

  const estimatedTimeSeconds = Math.ceil(items.length * 0.1)

  return {
    type: detected.type,
    items,
    totalSize: file.size,
    estimatedTimeSeconds,
  }
}

interface ImportResultInternal {
  success: boolean
  imported: {type: 'gpt' | 'conversation'; id: string; name: string}[]
  skipped: {type: 'gpt' | 'conversation'; id: string; name: string; reason: string}[]
  errors: {type: 'gpt' | 'conversation'; id: string; name: string; error: string}[]
  duration: number
}

function toExternalResult(internal: ImportResultInternal): ImportResult {
  return {
    success: internal.success,
    imported: internal.imported.length,
    skipped: internal.skipped.length,
    errors: internal.errors.map(e => ({item: `${e.type}:${e.id}`, error: e.error})),
    conflicts: [],
  }
}

export async function importGPT(gptExport: GPTExport, resolution: ConflictResolution = 'skip'): Promise<ImportResult> {
  const startTime = Date.now()
  const imported: {type: 'gpt' | 'conversation'; id: string; name: string}[] = []
  const skipped: {type: 'gpt' | 'conversation'; id: string; name: string; reason: string}[] = []
  const errors: {type: 'gpt' | 'conversation'; id: string; name: string; error: string}[] = []

  try {
    const existingById = await db.gpts.get(gptExport.gpt.id)
    const existingByName = await db.gpts.where('name').equals(gptExport.gpt.name).first()
    const hasConflict = !!existingById || !!existingByName

    if (hasConflict && resolution === 'skip') {
      skipped.push({
        type: 'gpt',
        id: gptExport.gpt.id,
        name: gptExport.gpt.name,
        reason: 'Conflict detected, skipped by user choice',
      })
    } else {
      let finalId = gptExport.gpt.id
      let finalName = gptExport.gpt.name

      if (hasConflict && resolution === 'rename') {
        finalId = generateNewId()
        finalName = `${gptExport.gpt.name} (Imported)`
      }

      if (hasConflict && resolution === 'overwrite' && existingById) {
        await db.gpts.delete(existingById.id)
        await db.knowledgeFiles.where('gptId').equals(existingById.id).delete()
        await db.gptVersions.where('gptId').equals(existingById.id).delete()
      }

      const gptData = gptExport.gpt
      const now = toISOString(new Date())

      const validProviders = ['openai', 'anthropic', 'ollama', 'azure'] as const
      type ValidProvider = (typeof validProviders)[number]
      const modelProvider: ValidProvider | undefined =
        gptData.modelProvider && validProviders.includes(gptData.modelProvider as ValidProvider)
          ? (gptData.modelProvider as ValidProvider)
          : undefined

      const capabilities = {
        webBrowsing: gptData.capabilities?.webBrowsing ?? false,
        imageGeneration: gptData.capabilities?.imageGeneration ?? false,
        codeInterpreter: gptData.capabilities?.codeInterpreter ?? false,
        fileSearch: gptData.capabilities?.fileSearch ?? {enabled: false},
      }

      const gptRecord: GPTConfigurationDB = {
        id: finalId,
        name: finalName,
        description: gptData.description ?? '',
        systemPrompt: gptData.systemPrompt,
        instructions: gptData.instructions,
        conversationStarters: gptData.conversationStarters,
        modelProvider,
        modelName: gptData.modelName,
        modelSettings: gptData.modelSettings,
        tools: [],
        knowledge: {
          files: [],
          urls: [],
        },
        capabilities,
        createdAtISO: gptData.createdAt,
        updatedAtISO: now,
        version: 1,
        tags: gptData.tags ?? [],
        isArchived: false,
        folderId: null,
        archivedAtISO: null,
      }

      await db.gpts.put(gptRecord)

      if (gptExport.knowledge?.files) {
        for (const fileData of gptExport.knowledge.files) {
          const blob = base64ToBlob(fileData.base64Content, fileData.mimeType)
          await db.knowledgeFiles.put({
            id: generateNewId(),
            gptId: finalId,
            name: fileData.name,
            mimeType: fileData.mimeType,
            size: fileData.size,
            content: blob,
            extractedText: fileData.extractedText,
            uploadedAtISO: now,
          })
        }
      }

      if (gptExport.versionHistory) {
        for (const version of gptExport.versionHistory) {
          await db.gptVersions.put({
            id: generateNewId(),
            gptId: finalId,
            version: version.version,
            snapshot: JSON.stringify(version.snapshot),
            createdAtISO: version.timestamp,
            changeDescription: version.changeDescription,
          })
        }
      }

      imported.push({type: 'gpt', id: finalId, name: finalName})
    }
  } catch (error_) {
    const message = error_ instanceof Error ? error_.message : 'Unknown error'
    errors.push({
      type: 'gpt',
      id: gptExport.gpt.id,
      name: gptExport.gpt.name,
      error: message,
    })
  }

  return toExternalResult({
    success: errors.length === 0,
    imported,
    skipped,
    errors,
    duration: Date.now() - startTime,
  })
}

export async function importConversation(
  convExport: ConversationExport,
  resolution: ConflictResolution = 'skip',
  targetGptId?: string,
): Promise<ImportResult> {
  const startTime = Date.now()
  const imported: {type: 'gpt' | 'conversation'; id: string; name: string}[] = []
  const skipped: {type: 'gpt' | 'conversation'; id: string; name: string; reason: string}[] = []
  const errors: {type: 'gpt' | 'conversation'; id: string; name: string; error: string}[] = []

  try {
    const convData = convExport.conversation
    const existingConv = await db.conversations.get(convData.id)

    if (existingConv && resolution === 'skip') {
      skipped.push({
        type: 'conversation',
        id: convData.id,
        name: convData.title ?? 'Untitled',
        reason: 'Conflict detected, skipped by user choice',
      })
    } else {
      let finalId = convData.id

      if (existingConv && resolution === 'rename') {
        finalId = generateNewId()
      }

      if (existingConv && resolution === 'overwrite') {
        await db.conversations.delete(existingConv.id)
        await db.messages.where('conversationId').equals(existingConv.id).delete()
      }

      const gptId = targetGptId ?? convData.gptId
      const now = toISOString(new Date())
      const lastMessage = convData.messages.at(-1)

      await db.conversations.put({
        id: finalId,
        gptId,
        title: convData.title,
        createdAtISO: convData.createdAt,
        updatedAtISO: now,
        messageCount: convData.messages.length,
        lastMessagePreview: lastMessage?.content?.slice(0, 100),
        tags: convData.tags ?? [],
        isPinned: convData.isPinned ?? false,
        isArchived: false,
        pinnedAtISO: null,
        archivedAtISO: null,
      })

      for (const msg of convData.messages) {
        await db.messages.put({
          id: `${finalId}-${generateNewId()}`,
          conversationId: finalId,
          role: msg.role,
          content: msg.content,
          timestampISO: msg.timestamp,
          metadata: msg.metadata,
        })
      }

      imported.push({type: 'conversation', id: finalId, name: convData.title ?? 'Untitled'})
    }
  } catch (error_) {
    const message = error_ instanceof Error ? error_.message : 'Unknown error'
    errors.push({
      type: 'conversation',
      id: convExport.conversation.id,
      name: convExport.conversation.title ?? 'Untitled',
      error: message,
    })
  }

  return toExternalResult({
    success: errors.length === 0,
    imported,
    skipped,
    errors,
    duration: Date.now() - startTime,
  })
}

export async function importBulk(
  file: File,
  resolutions: Map<string, ConflictResolution> = new Map(),
  defaultResolution: ConflictResolution = 'skip',
  onProgress?: (progress: number, message: string) => void,
): Promise<ImportResult> {
  const startTime = Date.now()
  const imported: {type: 'gpt' | 'conversation'; id: string; name: string}[] = []
  const skipped: {type: 'gpt' | 'conversation'; id: string; name: string; reason: string}[] = []
  const errors: {type: 'gpt' | 'conversation'; id: string; name: string; error: string}[] = []

  try {
    const zip = await JSZip.loadAsync(file)
    const manifestFile = zip.file('manifest.json')

    if (!manifestFile) {
      throw new Error('Missing manifest.json in ZIP archive')
    }

    const manifestContent = await manifestFile.async('string')
    const manifest = BulkExportManifestSchema.parse(JSON.parse(manifestContent))

    const totalItems = manifest.contents.gpts.length
    let processedItems = 0

    for (const gptRef of manifest.contents.gpts) {
      onProgress?.(Math.round((processedItems / totalItems) * 100), `Importing ${gptRef.name}...`)

      const gptFile = zip.file(gptRef.filename)
      if (!gptFile) {
        errors.push({type: 'gpt', id: gptRef.id, name: gptRef.name, error: 'File not found in ZIP'})
        processedItems++
        continue
      }

      const gptContent = await gptFile.async('string')
      const gptExport = GPTExportSchema.parse(JSON.parse(gptContent))

      if (gptExport.knowledge?.files) {
        for (const fileData of gptExport.knowledge.files) {
          const knowledgeFile = zip.file(`knowledge/${gptRef.id}/${fileData.name}`)
          if (knowledgeFile) {
            const content = await knowledgeFile.async('base64')
            fileData.base64Content = content
          }
        }
      }

      const resolution = resolutions.get(gptRef.id) ?? defaultResolution
      const result = await importGPT(gptExport, resolution)

      if (result.imported > 0) {
        imported.push({type: 'gpt', id: gptRef.id, name: gptRef.name})
      }
      if (result.skipped > 0) {
        skipped.push({type: 'gpt', id: gptRef.id, name: gptRef.name, reason: 'Skipped'})
      }
      errors.push(...result.errors.map(e => ({type: 'gpt' as const, id: gptRef.id, name: gptRef.name, error: e.error})))

      processedItems++
    }

    onProgress?.(100, 'Import complete')
  } catch (error_) {
    const message = error_ instanceof Error ? error_.message : 'Unknown error'
    errors.push({type: 'gpt', id: 'bulk', name: 'Bulk Import', error: message})
  }

  return toExternalResult({
    success: errors.length === 0,
    imported,
    skipped,
    errors,
    duration: Date.now() - startTime,
  })
}

export async function restoreBackup(
  file: File,
  options: {
    wipeExisting?: boolean
    onProgress?: (progress: number, message: string) => void
  } = {},
): Promise<ImportResult> {
  const {wipeExisting = false, onProgress} = options
  const startTime = Date.now()
  const imported: {type: 'gpt' | 'conversation'; id: string; name: string}[] = []
  const skipped: {type: 'gpt' | 'conversation'; id: string; name: string; reason: string}[] = []
  const errors: {type: 'gpt' | 'conversation'; id: string; name: string; error: string}[] = []

  try {
    const zip = await JSZip.loadAsync(file)
    const manifestFile = zip.file('manifest.json')

    if (!manifestFile) {
      throw new Error('Missing manifest.json in backup archive')
    }

    const manifestContent = await manifestFile.async('string')
    const backup = FullBackupSchema.parse(JSON.parse(manifestContent))

    if (wipeExisting) {
      onProgress?.(5, 'Clearing existing data...')
      await db.gpts.clear()
      await db.conversations.clear()
      await db.messages.clear()
      await db.knowledgeFiles.clear()
      await db.gptVersions.clear()
      await db.folders.clear()
    }

    const totalItems =
      backup.contents.gpts.length + backup.contents.conversations.length + backup.contents.folders.length

    let processedItems = 0
    const now = toISOString(new Date())

    onProgress?.(10, 'Restoring folders...')
    for (const folder of backup.contents.folders) {
      await db.folders.put({
        id: folder.id,
        name: folder.name,
        parentId: folder.parentId,
        order: folder.order,
        createdAtISO: now,
      })
    }

    for (const gptData of backup.contents.gpts) {
      onProgress?.(10 + Math.round((processedItems / totalItems) * 80), `Restoring ${gptData.name}...`)

      try {
        const validProviders = ['openai', 'anthropic', 'ollama', 'azure'] as const
        type ValidProvider = (typeof validProviders)[number]
        const modelProvider: ValidProvider | undefined =
          gptData.modelProvider && validProviders.includes(gptData.modelProvider as ValidProvider)
            ? (gptData.modelProvider as ValidProvider)
            : undefined

        const capabilities = {
          webBrowsing: gptData.capabilities?.webBrowsing ?? false,
          imageGeneration: gptData.capabilities?.imageGeneration ?? false,
          codeInterpreter: gptData.capabilities?.codeInterpreter ?? false,
          fileSearch: gptData.capabilities?.fileSearch ?? {enabled: false},
        }

        await db.gpts.put({
          id: gptData.id,
          name: gptData.name,
          description: gptData.description ?? '',
          systemPrompt: gptData.systemPrompt,
          instructions: gptData.instructions,
          conversationStarters: gptData.conversationStarters,
          modelProvider,
          modelName: gptData.modelName,
          modelSettings: gptData.modelSettings,
          tools: [],
          knowledge: {
            files: [],
            urls: [],
          },
          capabilities,
          createdAtISO: gptData.createdAt,
          updatedAtISO: gptData.updatedAt,
          version: 1,
          tags: gptData.tags ?? [],
          isArchived: false,
          folderId: null,
          archivedAtISO: null,
        })

        const knowledge = backup.contents.knowledge[gptData.id]
        if (knowledge?.files) {
          for (const fileData of knowledge.files) {
            const blob = base64ToBlob(fileData.base64Content, fileData.mimeType)
            await db.knowledgeFiles.put({
              id: generateNewId(),
              gptId: gptData.id,
              name: fileData.name,
              mimeType: fileData.mimeType,
              size: fileData.size,
              content: blob,
              extractedText: fileData.extractedText,
              uploadedAtISO: now,
            })
          }
        }

        imported.push({type: 'gpt', id: gptData.id, name: gptData.name})
      } catch (error_) {
        const message = error_ instanceof Error ? error_.message : 'Unknown error'
        errors.push({type: 'gpt', id: gptData.id, name: gptData.name, error: message})
      }

      processedItems++
    }

    for (const convData of backup.contents.conversations) {
      onProgress?.(10 + Math.round((processedItems / totalItems) * 80), `Restoring conversation...`)

      try {
        const lastMessage = convData.messages.at(-1)

        await db.conversations.put({
          id: convData.id,
          gptId: convData.gptId,
          title: convData.title,
          createdAtISO: convData.createdAt,
          updatedAtISO: convData.updatedAt,
          messageCount: convData.messages.length,
          lastMessagePreview: lastMessage?.content?.slice(0, 100),
          tags: convData.tags ?? [],
          isPinned: convData.isPinned ?? false,
          isArchived: false,
          pinnedAtISO: null,
          archivedAtISO: null,
        })

        for (const msg of convData.messages) {
          await db.messages.put({
            id: `${convData.id}-${generateNewId()}`,
            conversationId: convData.id,
            role: msg.role,
            content: msg.content,
            timestampISO: msg.timestamp,
            metadata: msg.metadata,
          })
        }

        imported.push({
          type: 'conversation',
          id: convData.id,
          name: convData.title ?? 'Untitled',
        })
      } catch (error_) {
        const message = error_ instanceof Error ? error_.message : 'Unknown error'
        errors.push({
          type: 'conversation',
          id: convData.id,
          name: convData.title ?? 'Untitled',
          error: message,
        })
      }

      processedItems++
    }

    if (backup.contents.settings) {
      onProgress?.(95, 'Restoring settings...')
      for (const [key, value] of Object.entries(backup.contents.settings)) {
        await db.settings.put({key, value: JSON.stringify(value)})
      }
    }

    onProgress?.(100, 'Restore complete')
  } catch (error_) {
    const message = error_ instanceof Error ? error_.message : 'Unknown error'
    errors.push({type: 'gpt', id: 'backup', name: 'Backup Restore', error: message})
  }

  return toExternalResult({
    success: errors.length === 0,
    imported,
    skipped,
    errors,
    duration: Date.now() - startTime,
  })
}
