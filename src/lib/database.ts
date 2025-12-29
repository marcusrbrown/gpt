import type {MCPOAuthTokensDB, MCPServerConfigDB, MCPTaskDB, MCPToolCallDB} from '@/types/mcp'
import Dexie, {type Table} from 'dexie'

export interface ModelSettings {
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
}

export interface MCPToolDB {
  name: string
  description: string
  schema: Record<string, unknown>
  endpoint: string
  authentication?: {
    type: 'bearer' | 'api_key'
    value: string
  }
}

export interface GPTKnowledgeDB {
  files: {
    name: string
    content: string
    type: string
    size: number
    lastModified: number
  }[]
  urls: string[]
  extractionMode: 'manual' | 'auto'
  vectorStores?: {
    id: string
    name: string
    fileIds: string[]
    expiresAfter?: {
      anchor: 'last_active_at'
      days: number
    }
  }[]
}

export interface CapabilitiesDB {
  codeInterpreter: boolean
  webBrowsing: boolean
  imageGeneration: boolean
  fileSearch: {
    enabled: boolean
    maxChunkSizeTokens?: number
    chunkOverlapTokens?: number
    maxNumResults?: number
    ranking?: {
      ranker: 'auto' | 'default_2024_08_21'
      scoreThreshold: number
    }
  }
}

export interface GPTConfigurationDB {
  id: string
  name: string
  description: string
  systemPrompt: string
  instructions?: string
  conversationStarters?: string[]
  modelProvider?: 'openai' | 'anthropic' | 'ollama' | 'azure'
  modelName?: string
  modelSettings?: ModelSettings
  tools: MCPToolDB[]
  knowledge: GPTKnowledgeDB
  capabilities: CapabilitiesDB
  createdAtISO: string
  updatedAtISO: string
  version: number
  tags: string[]
  isArchived: boolean
  folderId: string | null
  archivedAtISO: string | null
}

export interface ConversationDB {
  id: string
  gptId: string
  title?: string
  createdAtISO: string
  updatedAtISO: string
  messageCount: number
  lastMessagePreview?: string
  tags: string[]
  isPinned: boolean
  isArchived: boolean
  pinnedAtISO: string | null
  archivedAtISO: string | null
}

export interface MessageMetadata {
  toolCallId?: string
  toolName?: string
  toolCalls?: {
    id: string
    name: string
    arguments: string
    status: 'pending' | 'success' | 'error'
    result?: string
  }[]
  isStreaming?: boolean
  attachments?: {
    fileId: string
    name: string
  }[]
  model?: string
  tokenUsage?: {
    prompt: number
    completion: number
    total: number
  }
}

export interface MessageDB {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  timestampISO: string
  metadata?: MessageMetadata
}

export interface KnowledgeFileDB {
  id: string
  gptId: string
  name: string
  mimeType: string
  size: number
  content: Blob
  category?: 'document' | 'code' | 'data' | 'other'
  extractedText?: string
  extractionStatus?: 'pending' | 'processing' | 'completed' | 'failed' | 'unsupported'
  extractionError?: string
  checksumSHA256?: string
  uploadedAtISO: string
  updatedAtISO?: string
}

export interface EncryptedSecretDB {
  id: string
  provider: string
  encryptedKey: ArrayBuffer
  iv: Uint8Array
  createdAtISO: string
}

export interface UserSettingDB {
  key: string
  value: unknown
}

export interface GPTVersionDB {
  id: string
  gptId: string
  version: number
  snapshot: string
  createdAtISO: string
  changeDescription?: string
}

export interface GPTFolderDB {
  id: string
  name: string
  parentId: string | null
  order: number
  createdAtISO: string
}

export interface CachedURLDB {
  id: string
  gptId: string
  url: string
  title?: string
  content?: string
  mimeType?: string
  status: 'pending' | 'fetching' | 'ready' | 'failed'
  error?: string
  fetchedAtISO?: string
  expiresAtISO?: string
  size?: number
}

export interface TextSnippetDB {
  id: string
  gptId: string
  title: string
  content: string
  tags?: string[]
  createdAtISO: string
  updatedAtISO: string
}

/**
 * GPT Platform database. Schema v5 (RFC-009).
 * Tables: gpts, conversations, messages, knowledgeFiles, secrets, settings,
 *         gptVersions, folders, cachedURLs, textSnippets, mcpServers, mcpToolCalls, mcpTasks, mcpOAuthTokens
 */
export class GPTDatabase extends Dexie {
  gpts!: Table<GPTConfigurationDB>
  conversations!: Table<ConversationDB>
  messages!: Table<MessageDB>
  knowledgeFiles!: Table<KnowledgeFileDB>
  cachedURLs!: Table<CachedURLDB>
  textSnippets!: Table<TextSnippetDB>
  secrets!: Table<EncryptedSecretDB>
  settings!: Table<UserSettingDB>
  gptVersions!: Table<GPTVersionDB>
  folders!: Table<GPTFolderDB>
  mcpServers!: Table<MCPServerConfigDB>
  mcpToolCalls!: Table<MCPToolCallDB>
  mcpTasks!: Table<MCPTaskDB>
  mcpOAuthTokens!: Table<MCPOAuthTokensDB>

  constructor() {
    super('gpt-platform')

    this.version(1).stores({
      gpts: 'id, name, createdAtISO, updatedAtISO, *tags, isArchived',
      conversations: 'id, gptId, updatedAtISO, *tags',
      messages: 'id, conversationId, timestampISO',
      knowledgeFiles: 'id, gptId, name, mimeType',
      secrets: 'id, provider',
      settings: 'key',
    })

    this.version(2)
      .stores({
        gpts: 'id, name, createdAtISO, updatedAtISO, *tags, isArchived, folderId, archivedAtISO',
        conversations: 'id, gptId, updatedAtISO, *tags',
        messages: 'id, conversationId, timestampISO',
        knowledgeFiles: 'id, gptId, name, mimeType',
        secrets: 'id, provider',
        settings: 'key',
        gptVersions: 'id, gptId, version, createdAtISO',
        folders: 'id, parentId, name, order',
      })
      .upgrade(async tx => {
        return tx
          .table('gpts')
          .toCollection()
          .modify(gpt => {
            if (gpt.folderId === undefined) gpt.folderId = null
            if (gpt.archivedAtISO === undefined) gpt.archivedAtISO = null
          })
      })

    // RFC-005: Conversation Management - add pin/archive support
    this.version(3)
      .stores({
        gpts: 'id, name, createdAtISO, updatedAtISO, *tags, isArchived, folderId, archivedAtISO',
        conversations: 'id, gptId, updatedAtISO, *tags, isPinned, isArchived',
        messages: 'id, conversationId, timestampISO',
        knowledgeFiles: 'id, gptId, name, mimeType',
        secrets: 'id, provider',
        settings: 'key',
        gptVersions: 'id, gptId, version, createdAtISO',
        folders: 'id, parentId, name, order',
      })
      .upgrade(async tx => {
        return tx
          .table('conversations')
          .toCollection()
          .modify(conv => {
            if (conv.isPinned === undefined) conv.isPinned = false
            if (conv.isArchived === undefined) conv.isArchived = false
            if (conv.pinnedAtISO === undefined) conv.pinnedAtISO = null
            if (conv.archivedAtISO === undefined) conv.archivedAtISO = null
          })
      })

    // RFC-006: Knowledge Base Enhancement - add cachedURLs, textSnippets, extend knowledgeFiles
    this.version(4)
      .stores({
        gpts: 'id, name, createdAtISO, updatedAtISO, *tags, isArchived, folderId, archivedAtISO',
        conversations: 'id, gptId, updatedAtISO, *tags, isPinned, isArchived',
        messages: 'id, conversationId, timestampISO',
        knowledgeFiles: 'id, gptId, name, mimeType, extractionStatus, updatedAtISO',
        cachedURLs: 'id, gptId, [gptId+url], status, expiresAtISO',
        textSnippets: 'id, gptId, updatedAtISO',
        secrets: 'id, provider',
        settings: 'key',
        gptVersions: 'id, gptId, version, createdAtISO',
        folders: 'id, parentId, name, order',
      })
      .upgrade(async tx => {
        return tx
          .table('knowledgeFiles')
          .toCollection()
          .modify(file => {
            if (file.extractionStatus === undefined) {
              file.extractionStatus = file.extractedText ? 'completed' : 'pending'
            }
            if (file.updatedAtISO === undefined) {
              file.updatedAtISO = file.uploadedAtISO
            }
          })
      })

    // RFC-009: MCP Tool Integration - add mcpServers, mcpToolCalls, mcpTasks, mcpOAuthTokens
    this.version(5).stores({
      gpts: 'id, name, createdAtISO, updatedAtISO, *tags, isArchived, folderId, archivedAtISO',
      conversations: 'id, gptId, updatedAtISO, *tags, isPinned, isArchived',
      messages: 'id, conversationId, timestampISO',
      knowledgeFiles: 'id, gptId, name, mimeType, extractionStatus, updatedAtISO',
      cachedURLs: 'id, gptId, [gptId+url], status, expiresAtISO',
      textSnippets: 'id, gptId, updatedAtISO',
      secrets: 'id, provider',
      settings: 'key',
      gptVersions: 'id, gptId, version, createdAtISO',
      folders: 'id, parentId, name, order',
      mcpServers: 'id, name, transport, enabled, updatedAt',
      mcpToolCalls: 'id, serverId, toolName, status, startedAt, [serverId+status], taskId',
      mcpTasks: 'id, serverId, toolCallId, status, createdAt, [serverId+status]',
      mcpOAuthTokens: 'serverId',
    })
  }
}

export const db = new GPTDatabase()

export function toISOString(date: Date): string {
  return date.toISOString()
}

export function fromISOString(isoString: string): Date {
  return new Date(isoString)
}

export function nowISO(): string {
  return new Date().toISOString()
}

export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null
  } catch {
    return false
  }
}

/** WARNING: Permanently deletes all data. Use only for testing or user-initiated reset. */
export async function deleteDatabase(): Promise<void> {
  await db.delete()
  await db.open()
}

export function closeDatabase(): void {
  db.close()
}
