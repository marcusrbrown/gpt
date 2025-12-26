import type {ConversationDB, GPTConfigurationDB, MessageDB} from '@/lib/database'
import {db, nowISO, toISOString} from '@/lib/database'

const STORAGE_KEYS = {
  GPTS: 'gpts',
  CONVERSATIONS: 'conversations',
  MIGRATION_COMPLETE: 'indexeddb-migration-complete',
} as const

export interface MigrationResult {
  success: boolean
  migratedGPTs: number
  migratedConversations: number
  migratedMessages: number
  errors: string[]
}

interface RawGPTData {
  id: string
  name: string
  description: string
  systemPrompt: string
  instructions?: string
  conversationStarters?: string[]
  modelProvider?: string
  modelName?: string
  modelSettings?: Record<string, unknown>
  tools: unknown[]
  knowledge: {
    files: unknown[]
    urls: string[]
  }
  capabilities: {
    codeInterpreter: boolean
    webBrowsing: boolean
    imageGeneration: boolean
    fileSearch?: {
      enabled: boolean
      maxChunkSizeTokens?: number
      chunkOverlapTokens?: number
      maxNumResults?: number
    }
  }
  createdAt: string | number | Date
  updatedAt: string | number | Date
  version: number
  tags?: string[]
  isArchived?: boolean
}

interface RawMessageData {
  id: string
  role: string
  content: string
  timestamp: string | number | Date
  metadata?: Record<string, unknown>
}

interface RawConversationData {
  id: string
  gptId: string
  title?: string
  messages: RawMessageData[]
  createdAt: string | number | Date
  updatedAt: string | number | Date
  tags?: string[]
}

function toISOStringFromRaw(value: string | number | Date): string {
  if (typeof value === 'string') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? nowISO() : parsed.toISOString()
  }
  if (typeof value === 'number') {
    return new Date(value).toISOString()
  }
  return toISOString(value)
}

function transformGPTForDB(raw: RawGPTData): GPTConfigurationDB {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description ?? '',
    systemPrompt: raw.systemPrompt ?? '',
    instructions: raw.instructions,
    conversationStarters: raw.conversationStarters,
    modelProvider: (raw.modelProvider as GPTConfigurationDB['modelProvider']) ?? 'openai',
    modelName: raw.modelName ?? 'gpt-4',
    modelSettings: {
      temperature: (raw.modelSettings?.temperature as number) ?? 0.7,
      maxTokens: raw.modelSettings?.maxTokens as number | undefined,
      topP: raw.modelSettings?.topP as number | undefined,
      frequencyPenalty: raw.modelSettings?.frequencyPenalty as number | undefined,
      presencePenalty: raw.modelSettings?.presencePenalty as number | undefined,
    },
    tools: (raw.tools ?? []).map(tool => {
      const t = tool as Record<string, unknown>
      return {
        name: (t.name as string) ?? 'unknown',
        description: (t.description as string) ?? '',
        schema: (t.schema as Record<string, unknown>) ?? (t.inputSchema as Record<string, unknown>) ?? {},
        endpoint: (t.endpoint as string) ?? (t.serverUri as string) ?? '',
        authentication: t.authentication as {type: 'bearer' | 'api_key'; value: string} | undefined,
      }
    }),
    knowledge: {
      files: (raw.knowledge?.files ?? []).map(file => {
        const f = file as Record<string, unknown>
        return {
          name: (f.name as string) ?? 'unknown',
          content: (f.content as string) ?? '',
          type: (f.type as string) ?? (f.mimeType as string) ?? 'application/octet-stream',
          size: (f.size as number) ?? 0,
          lastModified: (f.lastModified as number) ?? Date.now(),
        }
      }),
      urls: raw.knowledge?.urls ?? [],
    },
    capabilities: {
      codeInterpreter: raw.capabilities?.codeInterpreter ?? false,
      webBrowsing: raw.capabilities?.webBrowsing ?? false,
      imageGeneration: raw.capabilities?.imageGeneration ?? false,
      fileSearch: raw.capabilities?.fileSearch ?? {enabled: false},
    },
    createdAtISO: toISOStringFromRaw(raw.createdAt),
    updatedAtISO: toISOStringFromRaw(raw.updatedAt),
    version: raw.version ?? 1,
    tags: raw.tags ?? [],
    isArchived: raw.isArchived ?? false,
    folderId: null,
    archivedAtISO: null,
  }
}

function transformConversationForDB(raw: RawConversationData): {
  conversation: ConversationDB
  messages: MessageDB[]
} {
  const messages: MessageDB[] = raw.messages.map(msg => ({
    id: msg.id ?? crypto.randomUUID(),
    conversationId: raw.id,
    role: msg.role as MessageDB['role'],
    content: msg.content ?? '',
    timestampISO: toISOStringFromRaw(msg.timestamp),
    metadata: msg.metadata,
  }))

  // eslint-disable-next-line unicorn/prefer-at -- ES2021 target doesn't support .at()
  const lastMessage = messages[messages.length - 1]

  return {
    conversation: {
      id: raw.id,
      gptId: raw.gptId,
      title: raw.title,
      createdAtISO: toISOStringFromRaw(raw.createdAt),
      updatedAtISO: toISOStringFromRaw(raw.updatedAt),
      messageCount: messages.length,
      lastMessagePreview: lastMessage?.content?.slice(0, 100),
      tags: raw.tags ?? [],
      isPinned: false,
      isArchived: false,
      pinnedAtISO: null,
      archivedAtISO: null,
    },
    messages,
  }
}

export function needsMigration(): boolean {
  if (typeof localStorage === 'undefined') return false

  const migrationComplete = localStorage.getItem(STORAGE_KEYS.MIGRATION_COMPLETE)
  if (migrationComplete === 'true') return false

  const hasGPTs = localStorage.getItem(STORAGE_KEYS.GPTS)
  const hasConversations = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS)

  return !!(hasGPTs || hasConversations)
}

export async function migrateFromLocalStorage(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migratedGPTs: 0,
    migratedConversations: 0,
    migratedMessages: 0,
    errors: [],
  }

  if (!needsMigration()) {
    result.success = true
    return result
  }

  try {
    const gptsToInsert: GPTConfigurationDB[] = []
    const conversationsToInsert: ConversationDB[] = []
    const messagesToInsert: MessageDB[] = []

    const rawGPTs = localStorage.getItem(STORAGE_KEYS.GPTS)
    if (rawGPTs && rawGPTs.trim() !== '') {
      try {
        const gpts = JSON.parse(rawGPTs) as Record<string, RawGPTData>
        for (const [id, gpt] of Object.entries(gpts)) {
          try {
            gptsToInsert.push(transformGPTForDB({...gpt, id}))
          } catch (error_) {
            result.errors.push(`Failed to transform GPT ${id}: ${String(error_)}`)
          }
        }
      } catch (error_) {
        result.errors.push(`Failed to parse GPTs: ${String(error_)}`)
      }
    }

    const rawConversations = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS)
    if (rawConversations && rawConversations.trim() !== '') {
      try {
        const conversations = JSON.parse(rawConversations) as Record<string, RawConversationData>
        for (const [id, conversation] of Object.entries(conversations)) {
          try {
            const {conversation: conv, messages} = transformConversationForDB({...conversation, id})
            conversationsToInsert.push(conv)
            messagesToInsert.push(...messages)
          } catch (error_) {
            result.errors.push(`Failed to transform conversation ${id}: ${String(error_)}`)
          }
        }
      } catch (error_) {
        result.errors.push(`Failed to parse conversations: ${String(error_)}`)
      }
    }

    await db.transaction('rw', [db.gpts, db.conversations, db.messages], async () => {
      if (gptsToInsert.length > 0) {
        await db.gpts.bulkPut(gptsToInsert)
      }
      if (conversationsToInsert.length > 0) {
        await db.conversations.bulkPut(conversationsToInsert)
      }
      if (messagesToInsert.length > 0) {
        await db.messages.bulkPut(messagesToInsert)
      }
    })

    result.migratedGPTs = gptsToInsert.length
    result.migratedConversations = conversationsToInsert.length
    result.migratedMessages = messagesToInsert.length

    localStorage.removeItem(STORAGE_KEYS.GPTS)
    localStorage.removeItem(STORAGE_KEYS.CONVERSATIONS)
    localStorage.setItem(STORAGE_KEYS.MIGRATION_COMPLETE, 'true')

    result.success = true
    console.info(
      `Migration complete: ${result.migratedGPTs} GPTs, ${result.migratedConversations} conversations, ${result.migratedMessages} messages`,
    )
  } catch (error_) {
    result.errors.push(`Migration failed: ${String(error_)}`)
    console.error('Migration failed:', error_)
  }

  return result
}

export function clearMigrationFlag(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.MIGRATION_COMPLETE)
  }
}
