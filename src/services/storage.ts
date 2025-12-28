import type {Conversation, GPTConfiguration} from '@/types/gpt'
import type {DeleteResult} from '@/types/gpt-extensions'
import {
  db,
  fromISOString,
  nowISO,
  toISOString,
  type ConversationDB,
  type GPTConfigurationDB,
  type MessageDB,
} from '@/lib/database'
import {LRUCache} from 'lru-cache'

const STORAGE_KEYS = {
  GPTS: 'gpts',
  CONVERSATIONS: 'conversations',
} as const

const CACHE_CONFIG = {
  max: 500,
  ttl: 1000 * 60 * 60,
} as const

const BROADCAST_CHANNEL_NAME = 'gpt-storage-sync'
const DEBOUNCE_DELAY_MS = 2000
const STORAGE_WARNING_THRESHOLD = 0.8

export class StorageError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'StorageError'
  }
}

export interface StorageEstimate {
  used: number
  quota: number
  percentUsed: number
}

export interface StorageChangeEvent {
  type: 'DATA_CHANGED'
  table: 'gpts' | 'conversations' | 'messages'
  id: string
  action: 'create' | 'update' | 'delete'
  timestamp: number
}

export interface StorageWarning {
  type: 'approaching_limit' | 'critical_limit'
  message: string
  percentUsed: number
}

export interface GetConversationsOptions {
  gptId?: string
  includeArchived?: boolean
  pinnedOnly?: boolean
  limit?: number
  offset?: number
}

type ChangeCallback = () => void

export class IndexedDBStorageService {
  private readonly gptsCache: LRUCache<string, GPTConfiguration>
  private readonly conversationsCache: LRUCache<string, Conversation>
  private broadcastChannel: BroadcastChannel | null = null
  private readonly changeCallbacks: Set<ChangeCallback> = new Set()
  private readonly debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map()

  constructor() {
    this.gptsCache = new LRUCache<string, GPTConfiguration>(CACHE_CONFIG)
    this.conversationsCache = new LRUCache<string, Conversation>(CACHE_CONFIG)
    this.setupBroadcastChannel()
  }

  private setupBroadcastChannel(): void {
    if (typeof BroadcastChannel === 'undefined') return

    try {
      this.broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
      this.broadcastChannel.addEventListener('message', (event: MessageEvent<StorageChangeEvent>) => {
        this.handleExternalChange(event.data)
      })
    } catch {
      // BroadcastChannel not supported, cross-tab sync disabled
    }
  }

  private handleExternalChange(event: StorageChangeEvent): void {
    if (event.table === 'gpts') {
      this.gptsCache.delete(event.id)
    } else if (event.table === 'conversations') {
      this.conversationsCache.delete(event.id)
    }
    this.notifyChangeCallbacks()
  }

  private notifyChange(
    table: 'gpts' | 'conversations' | 'messages',
    id: string,
    action: 'create' | 'update' | 'delete',
  ): void {
    const event: StorageChangeEvent = {
      type: 'DATA_CHANGED',
      table,
      id,
      action,
      timestamp: Date.now(),
    }
    this.broadcastChannel?.postMessage(event)
  }

  private notifyChangeCallbacks(): void {
    for (const callback of this.changeCallbacks) {
      callback()
    }
  }

  onDataChange(callback: ChangeCallback): () => void {
    this.changeCallbacks.add(callback)
    return () => {
      this.changeCallbacks.delete(callback)
    }
  }

  private gptToDB(gpt: GPTConfiguration): GPTConfigurationDB {
    return {
      id: gpt.id,
      name: gpt.name,
      description: gpt.description,
      systemPrompt: gpt.systemPrompt,
      instructions: gpt.instructions,
      conversationStarters: gpt.conversationStarters,
      modelProvider: gpt.modelProvider ?? 'openai',
      modelName: gpt.modelName ?? 'gpt-4',
      modelSettings: gpt.modelSettings ?? {},
      tools: gpt.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        schema: tool.schema,
        endpoint: tool.endpoint,
        authentication: tool.authentication,
      })),
      knowledge: {
        files: gpt.knowledge.files.map(file => ({
          name: file.name,
          content: '',
          type: file.type ?? 'text/plain',
          size: file.size ?? 0,
          lastModified: file.lastModified ?? Date.now(),
        })),
        urls: gpt.knowledge.urls,
        extractionMode: gpt.knowledge.extractionMode ?? ('manual' as const),
      },
      capabilities: {
        codeInterpreter: gpt.capabilities.codeInterpreter,
        webBrowsing: gpt.capabilities.webBrowsing,
        imageGeneration: gpt.capabilities.imageGeneration,
        fileSearch: gpt.capabilities.fileSearch ?? {enabled: false},
      },
      createdAtISO: toISOString(gpt.createdAt),
      updatedAtISO: toISOString(gpt.updatedAt),
      version: gpt.version,
      tags: gpt.tags ?? [],
      isArchived: gpt.isArchived ?? false,
      folderId: gpt.folderId ?? null,
      archivedAtISO: gpt.archivedAt ? toISOString(new Date(gpt.archivedAt)) : null,
    }
  }

  private dbToGPT(record: GPTConfigurationDB): GPTConfiguration {
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      systemPrompt: record.systemPrompt,
      instructions: record.instructions,
      conversationStarters: record.conversationStarters,
      modelProvider: record.modelProvider,
      modelName: record.modelName,
      modelSettings: record.modelSettings,
      tools: record.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        schema: tool.schema,
        endpoint: tool.endpoint,
        authentication: tool.authentication,
      })),
      knowledge: {
        files: record.knowledge.files.map(file => ({
          name: file.name,
          content: file.content,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified,
        })),
        urls: record.knowledge.urls,
        extractionMode: 'manual',
      },
      capabilities: {
        codeInterpreter: record.capabilities.codeInterpreter,
        webBrowsing: record.capabilities.webBrowsing,
        imageGeneration: record.capabilities.imageGeneration,
        fileSearch: record.capabilities.fileSearch,
      },
      createdAt: fromISOString(record.createdAtISO),
      updatedAt: fromISOString(record.updatedAtISO),
      version: record.version,
      tags: record.tags,
      isArchived: record.isArchived,
      folderId: record.folderId ?? null,
      archivedAt: record.archivedAtISO ?? null,
    }
  }

  private conversationToDB(conv: Conversation): {conversation: ConversationDB; messages: MessageDB[]} {
    const messages: MessageDB[] = conv.messages.map(msg => ({
      id: msg.id,
      conversationId: conv.id,
      role: msg.role,
      content: msg.content,
      timestampISO: toISOString(msg.timestamp),
    }))

    const lastMessage = conv.messages.at(-1)
    const conversation: ConversationDB = {
      id: conv.id,
      gptId: conv.gptId,
      title: conv.title,
      createdAtISO: toISOString(conv.createdAt),
      updatedAtISO: toISOString(conv.updatedAt),
      messageCount: conv.messages.length,
      lastMessagePreview: lastMessage?.content.slice(0, 100),
      tags: conv.tags ?? [],
      isPinned: conv.isPinned ?? false,
      isArchived: conv.isArchived ?? false,
      pinnedAtISO: conv.pinnedAt ? toISOString(conv.pinnedAt) : null,
      archivedAtISO: conv.archivedAt ? toISOString(conv.archivedAt) : null,
    }

    return {conversation, messages}
  }

  private async dbToConversation(record: ConversationDB): Promise<Conversation> {
    const messages = await db.messages.where('conversationId').equals(record.id).sortBy('timestampISO')

    return {
      id: record.id,
      gptId: record.gptId,
      title: record.title,
      messages: messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: fromISOString(msg.timestampISO),
      })),
      createdAt: fromISOString(record.createdAtISO),
      updatedAt: fromISOString(record.updatedAtISO),
      messageCount: record.messageCount,
      lastMessagePreview: record.lastMessagePreview,
      tags: record.tags,
      isPinned: record.isPinned ?? false,
      isArchived: record.isArchived ?? false,
      pinnedAt: record.pinnedAtISO ? fromISOString(record.pinnedAtISO) : null,
      archivedAt: record.archivedAtISO ? fromISOString(record.archivedAtISO) : null,
    }
  }

  async getGPT(id: string): Promise<GPTConfiguration | undefined> {
    const cached = this.gptsCache.get(id)
    if (cached) return cached

    try {
      const record = await db.gpts.get(id)
      if (!record) return undefined

      const gpt = this.dbToGPT(record)
      this.gptsCache.set(id, gpt)
      return gpt
    } catch (error_) {
      throw new StorageError(`Failed to get GPT ${id}`, error_)
    }
  }

  async getAllGPTs(): Promise<GPTConfiguration[]> {
    try {
      const records = await db.gpts.filter(gpt => !gpt.isArchived).toArray()
      const gpts = records.map(record => this.dbToGPT(record))

      for (const gpt of gpts) {
        this.gptsCache.set(gpt.id, gpt)
      }

      return gpts
    } catch (error_) {
      throw new StorageError('Failed to get all GPTs', error_)
    }
  }

  async saveGPT(gpt: GPTConfiguration): Promise<void> {
    try {
      const dbRecord = this.gptToDB({
        ...gpt,
        updatedAt: new Date(),
      })

      await db.gpts.put(dbRecord)

      const savedGpt = this.dbToGPT(dbRecord)
      this.gptsCache.set(gpt.id, savedGpt)

      this.notifyChange('gpts', gpt.id, 'update')
      this.notifyChangeCallbacks()
    } catch (error_) {
      if (error_ instanceof Error && error_.name === 'QuotaExceededError') {
        throw error_
      }
      throw new StorageError('Failed to save GPT configuration', error_)
    }
  }

  async deleteGPT(id: string): Promise<void> {
    try {
      await db.gpts.delete(id)
      this.gptsCache.delete(id)

      this.notifyChange('gpts', id, 'delete')
      this.notifyChangeCallbacks()
    } catch (error_) {
      throw new StorageError(`Failed to delete GPT ${id}`, error_)
    }
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const cached = this.conversationsCache.get(id)
    if (cached) return cached

    try {
      const record = await db.conversations.get(id)
      if (!record) return undefined

      const conversation = await this.dbToConversation(record)
      this.conversationsCache.set(id, conversation)
      return conversation
    } catch (error_) {
      throw new StorageError(`Failed to get conversation ${id}`, error_)
    }
  }

  async getConversationsForGPT(gptId: string): Promise<Conversation[]> {
    try {
      const records = await db.conversations.where('gptId').equals(gptId).reverse().sortBy('updatedAtISO')

      const conversations = await Promise.all(records.map(async record => this.dbToConversation(record)))

      for (const conv of conversations) {
        this.conversationsCache.set(conv.id, conv)
      }

      return conversations
    } catch (error_) {
      throw new StorageError(`Failed to get conversations for GPT ${gptId}`, error_)
    }
  }

  async saveConversation(conversation: Conversation): Promise<void> {
    try {
      const {conversation: convRecord, messages} = this.conversationToDB({
        ...conversation,
        updatedAt: new Date(),
      })

      await db.transaction('rw', [db.conversations, db.messages], async () => {
        await db.conversations.put(convRecord)
        await db.messages.where('conversationId').equals(conversation.id).delete()
        await db.messages.bulkPut(messages)
      })

      this.conversationsCache.set(conversation.id, {
        ...conversation,
        updatedAt: new Date(),
      })

      this.notifyChange('conversations', conversation.id, 'update')
      this.notifyChangeCallbacks()
    } catch (error_) {
      if (error_ instanceof Error && error_.name === 'QuotaExceededError') {
        throw error_
      }
      throw new StorageError('Failed to save conversation', error_)
    }
  }

  async deleteConversation(id: string): Promise<void> {
    try {
      await db.transaction('rw', [db.conversations, db.messages], async () => {
        await db.messages.where('conversationId').equals(id).delete()
        await db.conversations.delete(id)
      })

      this.conversationsCache.delete(id)

      this.notifyChange('conversations', id, 'delete')
      this.notifyChangeCallbacks()
    } catch (error_) {
      throw new StorageError(`Failed to delete conversation ${id}`, error_)
    }
  }

  async clearAll(): Promise<void> {
    try {
      await db.transaction('rw', [db.gpts, db.conversations, db.messages, db.settings], async () => {
        await db.gpts.clear()
        await db.conversations.clear()
        await db.messages.clear()
        await db.settings.clear()
      })

      this.gptsCache.clear()
      this.conversationsCache.clear()

      this.notifyChangeCallbacks()
    } catch (error_) {
      throw new StorageError('Failed to clear storage', error_)
    }
  }

  async getStorageEstimate(): Promise<StorageEstimate> {
    if (typeof navigator === 'undefined' || !('storage' in navigator) || !('estimate' in navigator.storage)) {
      return {used: 0, quota: 0, percentUsed: 0}
    }

    try {
      const estimate = await navigator.storage.estimate()
      const used = estimate.usage ?? 0
      const quota = estimate.quota ?? 0
      const percentUsed = quota > 0 ? (used / quota) * 100 : 0

      return {used, quota, percentUsed}
    } catch {
      return {used: 0, quota: 0, percentUsed: 0}
    }
  }

  async isStorageWarning(): Promise<boolean> {
    const estimate = await this.getStorageEstimate()
    return estimate.percentUsed >= STORAGE_WARNING_THRESHOLD * 100
  }

  createDebouncedSave<T>(
    saveFn: (data: T) => Promise<void>,
    key: string,
    delayMs: number = DEBOUNCE_DELAY_MS,
  ): (data: T) => void {
    return (data: T) => {
      const existingTimer = this.debounceTimers.get(key)
      if (existingTimer) {
        clearTimeout(existingTimer)
      }

      const timer = setTimeout(() => {
        saveFn(data).catch(console.error)
        this.debounceTimers.delete(key)
      }, delayMs)

      this.debounceTimers.set(key, timer)
    }
  }

  async getSetting<T>(key: string): Promise<T | undefined> {
    try {
      const record = await db.settings.get(key)
      return record?.value as T | undefined
    } catch {
      return undefined
    }
  }

  async setSetting<T>(key: string, value: T): Promise<void> {
    try {
      await db.settings.put({key, value})
    } catch (error_) {
      throw new StorageError(`Failed to save setting ${key}`, error_)
    }
  }

  hasLocalStorageData(): boolean {
    try {
      const gptsData = localStorage.getItem(STORAGE_KEYS.GPTS)
      const conversationsData = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS)
      return (
        (gptsData !== null && gptsData.trim() !== '') || (conversationsData !== null && conversationsData.trim() !== '')
      )
    } catch {
      return false
    }
  }

  clearLocalStorageData(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.GPTS)
      localStorage.removeItem(STORAGE_KEYS.CONVERSATIONS)
    } catch {}
  }

  destroy(): void {
    this.broadcastChannel?.close()
    this.broadcastChannel = null
    this.changeCallbacks.clear()

    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer)
    }
    this.debounceTimers.clear()
  }

  async archiveGPT(id: string): Promise<void> {
    try {
      const gpt = await this.getGPT(id)
      if (!gpt) {
        throw new StorageError(`GPT ${id} not found`)
      }

      const archivedAt = new Date().toISOString()
      await db.gpts.update(id, {
        isArchived: true,
        archivedAtISO: archivedAt,
        updatedAtISO: nowISO(),
      })

      this.gptsCache.delete(id)
      this.notifyChange('gpts', id, 'update')
      this.notifyChangeCallbacks()
    } catch (error_) {
      if (error_ instanceof StorageError) throw error_
      throw new StorageError(`Failed to archive GPT ${id}`, error_)
    }
  }

  async restoreGPT(id: string): Promise<void> {
    try {
      const record = await db.gpts.get(id)
      if (!record) {
        throw new StorageError(`GPT ${id} not found`)
      }

      await db.gpts.update(id, {
        isArchived: false,
        archivedAtISO: null,
        updatedAtISO: nowISO(),
      })

      this.gptsCache.delete(id)
      this.notifyChange('gpts', id, 'update')
      this.notifyChangeCallbacks()
    } catch (error_) {
      if (error_ instanceof StorageError) throw error_
      throw new StorageError(`Failed to restore GPT ${id}`, error_)
    }
  }

  async getArchivedGPTs(): Promise<GPTConfiguration[]> {
    try {
      const records = await db.gpts.filter(gpt => gpt.isArchived === true).toArray()
      return records.map(record => this.dbToGPT(record))
    } catch (error_) {
      throw new StorageError('Failed to get archived GPTs', error_)
    }
  }

  async duplicateGPT(id: string, newName?: string): Promise<GPTConfiguration> {
    try {
      const original = await this.getGPT(id)
      if (!original) {
        throw new StorageError(`GPT ${id} not found`)
      }

      const now = new Date()
      const duplicate: GPTConfiguration = {
        ...original,
        id: crypto.randomUUID(),
        name: newName ?? `${original.name} (Copy)`,
        createdAt: now,
        updatedAt: now,
        version: 1,
        isArchived: false,
        archivedAt: null,
      }

      await this.saveGPT(duplicate)
      return duplicate
    } catch (error_) {
      if (error_ instanceof StorageError) throw error_
      throw new StorageError(`Failed to duplicate GPT ${id}`, error_)
    }
  }

  async deleteGPTPermanently(id: string): Promise<DeleteResult> {
    try {
      const result: DeleteResult = {
        deletedConversations: 0,
        deletedMessages: 0,
        deletedKnowledge: 0,
        deletedVersions: 0,
      }

      await db.transaction(
        'rw',
        [db.gpts, db.conversations, db.messages, db.gptVersions, db.knowledgeFiles],
        async () => {
          const conversations = await db.conversations.where('gptId').equals(id).toArray()
          result.deletedConversations = conversations.length

          for (const conv of conversations) {
            result.deletedMessages += await db.messages.where('conversationId').equals(conv.id).delete()
          }
          await db.conversations.where('gptId').equals(id).delete()

          result.deletedKnowledge = await db.knowledgeFiles.where('gptId').equals(id).delete()
          result.deletedVersions = await db.gptVersions.where('gptId').equals(id).delete()

          await db.gpts.delete(id)
        },
      )

      this.gptsCache.delete(id)
      this.notifyChange('gpts', id, 'delete')
      this.notifyChangeCallbacks()

      return result
    } catch (error_) {
      throw new StorageError(`Failed to permanently delete GPT ${id}`, error_)
    }
  }

  async pinConversation(id: string, pinned: boolean): Promise<void> {
    try {
      const record = await db.conversations.get(id)
      if (!record) {
        throw new StorageError(`Conversation ${id} not found`)
      }

      await db.conversations.update(id, {
        isPinned: pinned,
        pinnedAtISO: pinned ? nowISO() : null,
        updatedAtISO: nowISO(),
      })

      this.conversationsCache.delete(id)
      this.notifyChange('conversations', id, 'update')
      this.notifyChangeCallbacks()
    } catch (error_) {
      if (error_ instanceof StorageError) throw error_
      throw new StorageError(`Failed to ${pinned ? 'pin' : 'unpin'} conversation ${id}`, error_)
    }
  }

  async archiveConversation(id: string, archived: boolean): Promise<void> {
    try {
      const record = await db.conversations.get(id)
      if (!record) {
        throw new StorageError(`Conversation ${id} not found`)
      }

      await db.conversations.update(id, {
        isArchived: archived,
        archivedAtISO: archived ? nowISO() : null,
        updatedAtISO: nowISO(),
      })

      this.conversationsCache.delete(id)
      this.notifyChange('conversations', id, 'update')
      this.notifyChangeCallbacks()
    } catch (error_) {
      if (error_ instanceof StorageError) throw error_
      throw new StorageError(`Failed to ${archived ? 'archive' : 'unarchive'} conversation ${id}`, error_)
    }
  }

  async updateConversationTitle(id: string, title: string): Promise<void> {
    try {
      const record = await db.conversations.get(id)
      if (!record) {
        throw new StorageError(`Conversation ${id} not found`)
      }

      await db.conversations.update(id, {
        title,
        updatedAtISO: nowISO(),
      })

      this.conversationsCache.delete(id)
      this.notifyChange('conversations', id, 'update')
      this.notifyChangeCallbacks()
    } catch (error_) {
      if (error_ instanceof StorageError) throw error_
      throw new StorageError(`Failed to update conversation title ${id}`, error_)
    }
  }

  async bulkPinConversations(ids: string[], pinned: boolean): Promise<void> {
    try {
      const pinnedAtISO = pinned ? nowISO() : null
      const updatedAtISO = nowISO()

      await db.transaction('rw', db.conversations, async () => {
        for (const id of ids) {
          await db.conversations.update(id, {
            isPinned: pinned,
            pinnedAtISO,
            updatedAtISO,
          })
        }
      })

      for (const id of ids) {
        this.conversationsCache.delete(id)
        this.notifyChange('conversations', id, 'update')
      }
      this.notifyChangeCallbacks()
    } catch (error_) {
      throw new StorageError(`Failed to bulk ${pinned ? 'pin' : 'unpin'} conversations`, error_)
    }
  }

  async bulkArchiveConversations(ids: string[], archived: boolean): Promise<void> {
    try {
      const archivedAtISO = archived ? nowISO() : null
      const updatedAtISO = nowISO()

      await db.transaction('rw', db.conversations, async () => {
        for (const id of ids) {
          await db.conversations.update(id, {
            isArchived: archived,
            archivedAtISO,
            updatedAtISO,
          })
        }
      })

      for (const id of ids) {
        this.conversationsCache.delete(id)
        this.notifyChange('conversations', id, 'update')
      }
      this.notifyChangeCallbacks()
    } catch (error_) {
      throw new StorageError(`Failed to bulk ${archived ? 'archive' : 'unarchive'} conversations`, error_)
    }
  }

  async bulkDeleteConversations(ids: string[]): Promise<void> {
    try {
      await db.transaction('rw', [db.conversations, db.messages], async () => {
        for (const id of ids) {
          await db.messages.where('conversationId').equals(id).delete()
          await db.conversations.delete(id)
        }
      })

      for (const id of ids) {
        this.conversationsCache.delete(id)
        this.notifyChange('conversations', id, 'delete')
      }
      this.notifyChangeCallbacks()
    } catch (error_) {
      throw new StorageError('Failed to bulk delete conversations', error_)
    }
  }

  async getConversations(
    options: {
      gptId?: string
      includeArchived?: boolean
      pinnedOnly?: boolean
      limit?: number
      offset?: number
    } = {},
  ): Promise<Conversation[]> {
    try {
      let collection = db.conversations.orderBy('updatedAtISO').reverse()

      if (options.gptId) {
        collection = db.conversations.where('gptId').equals(options.gptId).reverse()
      }

      let records = await collection.toArray()

      if (!options.includeArchived) {
        records = records.filter(r => !r.isArchived)
      }

      if (options.pinnedOnly) {
        records = records.filter(r => r.isPinned)
      }

      records.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1
        if (!a.isPinned && b.isPinned) return 1
        return b.updatedAtISO.localeCompare(a.updatedAtISO)
      })

      if (options.offset) {
        records = records.slice(options.offset)
      }

      if (options.limit) {
        records = records.slice(0, options.limit)
      }

      const conversations = await Promise.all(records.map(async r => this.dbToConversation(r)))

      for (const conv of conversations) {
        this.conversationsCache.set(conv.id, conv)
      }

      return conversations
    } catch (error_) {
      throw new StorageError('Failed to get conversations', error_)
    }
  }

  async searchConversations(
    query: string,
    options: {gptId?: string; includeArchived?: boolean} = {},
  ): Promise<Conversation[]> {
    try {
      if (!query.trim()) {
        return []
      }

      const normalizedQuery = query.toLowerCase().trim()
      let records = await db.conversations.toArray()

      if (options.gptId) {
        records = records.filter(r => r.gptId === options.gptId)
      }

      if (!options.includeArchived) {
        records = records.filter(r => !r.isArchived)
      }

      const matchingConversations: Conversation[] = []

      for (const record of records) {
        const titleMatch = record.title?.toLowerCase().includes(normalizedQuery)

        if (titleMatch) {
          const conv = await this.dbToConversation(record)
          matchingConversations.push(conv)
          continue
        }

        const messages = await db.messages.where('conversationId').equals(record.id).toArray()
        const messageMatch = messages.some(msg => msg.content.toLowerCase().includes(normalizedQuery))

        if (messageMatch) {
          const conv = await this.dbToConversation(record)
          matchingConversations.push(conv)
        }
      }

      matchingConversations.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1
        if (!a.isPinned && b.isPinned) return 1
        return b.updatedAt.getTime() - a.updatedAt.getTime()
      })

      return matchingConversations
    } catch (error_) {
      throw new StorageError('Failed to search conversations', error_)
    }
  }
}

export {DEBOUNCE_DELAY_MS, nowISO}
