import type {Conversation, GPTConfiguration} from '@/types/gpt'
import type {GPTFolder} from '@/types/gpt-extensions'
import {db, toISOString} from '@/lib/database'
import {
  APP_VERSION,
  CURRENT_EXPORT_VERSION,
  type BulkExportManifest,
  type BulkExportOptions,
  type ConversationDataExport,
  type ConversationExport,
  type ExportMetadata,
  type ExportProgressCallback,
  type FullBackup,
  type GPTDataExport,
  type GPTExport,
  type GPTExportOptions,
  type KnowledgeExport,
  type MessageExport,
  type VersionHistoryEntry,
} from '@/types/export-import'
import {saveAs} from 'file-saver'
import JSZip from 'jszip'

function sanitizeFilename(name: string): string {
  const withoutControlChars = name
    .split('')
    .filter(char => char.charCodeAt(0) > 31)
    .join('')

  return withoutControlChars
    .replaceAll(/[<>:"/\\|?*]/g, '_')
    .replaceAll(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 100)
}

function createExportMetadata(): ExportMetadata {
  return {
    version: CURRENT_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    source: 'gpt-platform',
    sourceVersion: APP_VERSION,
  }
}

function gptToExportData(gpt: GPTConfiguration): GPTDataExport {
  return {
    id: gpt.id,
    name: gpt.name,
    description: gpt.description,
    systemPrompt: gpt.systemPrompt,
    instructions: gpt.instructions,
    conversationStarters: gpt.conversationStarters,
    modelProvider: gpt.modelProvider,
    modelName: gpt.modelName,
    modelSettings: gpt.modelSettings
      ? {
          temperature: gpt.modelSettings.temperature,
          maxTokens: gpt.modelSettings.maxTokens,
          topP: gpt.modelSettings.topP,
          frequencyPenalty: gpt.modelSettings.frequencyPenalty,
          presencePenalty: gpt.modelSettings.presencePenalty,
        }
      : undefined,
    tools: gpt.tools?.map(tool => ({
      name: tool.name,
      description: tool.description,
      schema: tool.schema as Record<string, unknown>,
      endpoint: tool.endpoint,
    })),
    capabilities: gpt.capabilities
      ? {
          webBrowsing: gpt.capabilities.webBrowsing,
          codeInterpreter: gpt.capabilities.codeInterpreter,
          imageGeneration: gpt.capabilities.imageGeneration,
          fileSearch: gpt.capabilities.fileSearch,
        }
      : undefined,
    tags: gpt.tags,
    createdAt: toISOString(gpt.createdAt),
    updatedAt: toISOString(gpt.updatedAt),
  }
}

function conversationToExportData(conv: Conversation, gptName: string): ConversationDataExport {
  return {
    id: conv.id,
    gptId: conv.gptId,
    gptName,
    title: conv.title,
    createdAt: toISOString(conv.createdAt),
    updatedAt: toISOString(conv.updatedAt),
    messages: conv.messages.map(
      (msg): MessageExport => ({
        role: msg.role,
        content: msg.content,
        timestamp: toISOString(msg.timestamp),
        metadata: undefined,
      }),
    ),
    tags: conv.tags,
    isPinned: conv.isPinned,
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      resolve(base64.split(',')[1] || '')
    }
    reader.addEventListener('error', () => reject(new Error('Failed to read blob')))
    reader.readAsDataURL(blob)
  })
}

async function getKnowledgeForGPT(gptId: string): Promise<KnowledgeExport> {
  const knowledgeFiles = await db.knowledgeFiles.where('gptId').equals(gptId).toArray()

  const files = await Promise.all(
    knowledgeFiles.map(async file => ({
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
      base64Content: await blobToBase64(file.content),
      extractedText: file.extractedText,
    })),
  )

  return {
    files,
    urls: [],
    snippets: [],
  }
}

async function getVersionHistoryForGPT(gptId: string): Promise<VersionHistoryEntry[]> {
  const versions = await db.gptVersions.where('gptId').equals(gptId).sortBy('version')

  return versions.map(v => ({
    version: v.version,
    timestamp: v.createdAtISO,
    snapshot: JSON.parse(v.snapshot),
    changeDescription: v.changeDescription,
  }))
}

export async function exportGPT(gpt: GPTConfiguration, options: GPTExportOptions = {}): Promise<GPTExport> {
  const exportData: GPTExport = {
    metadata: createExportMetadata(),
    gpt: gptToExportData(gpt),
  }

  if (options.includeKnowledge) {
    exportData.knowledge = await getKnowledgeForGPT(gpt.id)
  }

  if (options.includeVersionHistory) {
    exportData.versionHistory = await getVersionHistoryForGPT(gpt.id)
  }

  return exportData
}

export async function downloadGPTExport(gpt: GPTConfiguration, options: GPTExportOptions = {}): Promise<void> {
  const exportData = await exportGPT(gpt, options)
  const json = JSON.stringify(exportData, null, 2)
  const blob = new Blob([json], {type: 'application/json'})
  const filename = `${sanitizeFilename(gpt.name)}-export.json`
  saveAs(blob, filename)
}

export async function exportConversation(conv: Conversation, gptName: string): Promise<ConversationExport> {
  return {
    metadata: createExportMetadata(),
    conversation: conversationToExportData(conv, gptName),
  }
}

export async function downloadConversationExport(conv: Conversation, gptName: string): Promise<void> {
  const exportData = await exportConversation(conv, gptName)
  const json = JSON.stringify(exportData, null, 2)
  const blob = new Blob([json], {type: 'application/json'})
  const filename = `${sanitizeFilename(conv.title || 'conversation')}-export.json`
  saveAs(blob, filename)
}

export async function exportBulkGPTs(
  gpts: GPTConfiguration[],
  options: BulkExportOptions = {},
  onProgress?: ExportProgressCallback,
): Promise<Blob> {
  const zip = new JSZip()
  const gptsFolder = zip.folder('gpts')
  if (!gptsFolder) throw new Error('Failed to create gpts folder')

  const manifest: BulkExportManifest = {
    metadata: createExportMetadata(),
    contents: {
      gpts: [],
      folders: [],
      totalFiles: gpts.length,
      totalSizeBytes: 0,
    },
  }

  let processedCount = 0
  const total = gpts.length

  for (const gpt of gpts) {
    onProgress?.({
      phase: 'exporting',
      current: processedCount,
      total,
      currentItem: gpt.name,
    })

    const exportData = await exportGPT(gpt, options)
    const filename = `${sanitizeFilename(gpt.name)}.json`
    const json = JSON.stringify(exportData, null, 2)

    gptsFolder.file(filename, json)
    manifest.contents.gpts.push({
      id: gpt.id,
      name: gpt.name,
      filename: `gpts/${filename}`,
    })
    manifest.contents.totalSizeBytes += json.length

    processedCount++
  }

  if (options.preserveFolderStructure) {
    const folders = await db.folders.toArray()
    const relevantFolderIds = new Set(gpts.map(g => g.folderId).filter(Boolean))
    const relevantFolders = folders.filter(f => relevantFolderIds.has(f.id))

    manifest.contents.folders = relevantFolders.map(f => ({
      id: f.id,
      name: f.name,
      parentId: f.parentId,
      gptIds: gpts.filter(g => g.folderId === f.id).map(g => g.id),
    }))
  }

  zip.file('manifest.json', JSON.stringify(manifest, null, 2))

  onProgress?.({
    phase: 'compressing',
    current: total,
    total,
  })

  const blob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {level: 6},
    },
    metadata => {
      if (metadata.percent === 100) {
        onProgress?.({
          phase: 'complete',
          current: total,
          total,
        })
      }
    },
  )

  return blob
}

export async function downloadBulkExport(
  gpts: GPTConfiguration[],
  options: BulkExportOptions = {},
  onProgress?: ExportProgressCallback,
): Promise<void> {
  onProgress?.({
    phase: 'preparing',
    current: 0,
    total: gpts.length,
  })

  const blob = await exportBulkGPTs(gpts, options, onProgress)
  const timestamp = new Date().toISOString().split('T')[0]
  saveAs(blob, `gpt-export-${timestamp}.zip`)
}

export async function createFullBackup(onProgress?: ExportProgressCallback): Promise<Blob> {
  const zip = new JSZip()

  onProgress?.({
    phase: 'preparing',
    current: 0,
    total: 5,
  })

  const allGPTs = await db.gpts.toArray()
  const allConversations = await db.conversations.toArray()
  const allMessages = await db.messages.toArray()
  const allFolders = await db.folders.toArray()
  const allSettings = await db.settings.toArray()
  const allKnowledge = await db.knowledgeFiles.toArray()

  onProgress?.({
    phase: 'exporting',
    current: 1,
    total: 5,
    currentItem: 'GPT configurations',
  })

  const gptExports: GPTDataExport[] = allGPTs.map(gpt => ({
    id: gpt.id,
    name: gpt.name,
    description: gpt.description,
    systemPrompt: gpt.systemPrompt,
    instructions: gpt.instructions,
    conversationStarters: gpt.conversationStarters,
    modelProvider: gpt.modelProvider,
    modelName: gpt.modelName,
    modelSettings: gpt.modelSettings
      ? {
          temperature: gpt.modelSettings.temperature,
          maxTokens: gpt.modelSettings.maxTokens,
          topP: gpt.modelSettings.topP,
          frequencyPenalty: gpt.modelSettings.frequencyPenalty,
          presencePenalty: gpt.modelSettings.presencePenalty,
        }
      : undefined,
    tools: gpt.tools?.map(t => ({
      name: t.name,
      description: t.description,
      schema: t.schema,
      endpoint: t.endpoint,
    })),
    capabilities: gpt.capabilities
      ? {
          webBrowsing: gpt.capabilities.webBrowsing,
          codeInterpreter: gpt.capabilities.codeInterpreter,
          imageGeneration: gpt.capabilities.imageGeneration,
          fileSearch: gpt.capabilities.fileSearch,
        }
      : undefined,
    tags: gpt.tags,
    createdAt: gpt.createdAtISO,
    updatedAt: gpt.updatedAtISO,
  }))

  onProgress?.({
    phase: 'exporting',
    current: 2,
    total: 5,
    currentItem: 'Conversations',
  })

  const messagesByConversation = new Map<string, typeof allMessages>()
  for (const msg of allMessages) {
    const existing = messagesByConversation.get(msg.conversationId) || []
    existing.push(msg)
    messagesByConversation.set(msg.conversationId, existing)
  }

  const conversationExports: ConversationDataExport[] = allConversations.map(conv => {
    const messages = messagesByConversation.get(conv.id) || []
    const gpt = allGPTs.find(g => g.id === conv.gptId)

    return {
      id: conv.id,
      gptId: conv.gptId,
      gptName: gpt?.name || 'Unknown GPT',
      title: conv.title,
      createdAt: conv.createdAtISO,
      updatedAt: conv.updatedAtISO,
      messages: messages
        .sort((a, b) => a.timestampISO.localeCompare(b.timestampISO))
        .map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestampISO,
        })),
      tags: conv.tags,
      isPinned: conv.isPinned,
    }
  })

  onProgress?.({
    phase: 'exporting',
    current: 3,
    total: 5,
    currentItem: 'Knowledge files',
  })

  const knowledgeByGPT: Record<string, KnowledgeExport> = {}
  for (const file of allKnowledge) {
    const existing = knowledgeByGPT[file.gptId]
    if (existing) {
      existing.files.push({
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
        base64Content: await blobToBase64(file.content),
        extractedText: file.extractedText,
      })
    } else {
      knowledgeByGPT[file.gptId] = {
        files: [
          {
            name: file.name,
            mimeType: file.mimeType,
            size: file.size,
            base64Content: await blobToBase64(file.content),
            extractedText: file.extractedText,
          },
        ],
        urls: [],
        snippets: [],
      }
    }
  }

  onProgress?.({
    phase: 'exporting',
    current: 4,
    total: 5,
    currentItem: 'Settings and folders',
  })

  const settingsMap: Record<string, unknown> = {}
  for (const setting of allSettings) {
    settingsMap[setting.key] = setting.value
  }

  const backup: FullBackup = {
    metadata: {
      ...createExportMetadata(),
      backupType: 'full',
    },
    contents: {
      gpts: gptExports,
      conversations: conversationExports,
      folders: allFolders.map(f => ({
        id: f.id,
        name: f.name,
        parentId: f.parentId,
        order: f.order,
      })),
      settings: settingsMap,
      knowledge: knowledgeByGPT,
    },
  }

  zip.file('backup.json', JSON.stringify(backup, null, 2))

  onProgress?.({
    phase: 'compressing',
    current: 5,
    total: 5,
  })

  const blob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {level: 6},
    },
    metadata => {
      if (metadata.percent === 100) {
        onProgress?.({
          phase: 'complete',
          current: 5,
          total: 5,
        })
      }
    },
  )

  return blob
}

export async function downloadFullBackup(onProgress?: ExportProgressCallback): Promise<void> {
  const blob = await createFullBackup(onProgress)
  const timestamp = new Date().toISOString().replaceAll(/[:.]/g, '-')
  saveAs(blob, `gpt-platform-backup-${timestamp}.zip`)
}

export async function exportFolderWithContents(
  folder: GPTFolder,
  allGPTs: GPTConfiguration[],
  options: BulkExportOptions = {},
  onProgress?: ExportProgressCallback,
): Promise<Blob> {
  const gptsInFolder = allGPTs.filter(g => g.folderId === folder.id)
  return exportBulkGPTs(gptsInFolder, {...options, preserveFolderStructure: true}, onProgress)
}

export {conversationToExportData, createExportMetadata, gptToExportData, sanitizeFilename}
