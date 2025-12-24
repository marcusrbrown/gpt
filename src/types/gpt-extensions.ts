import {z} from 'zod'

export const GPTVersionSchema = z.object({
  id: z.string().uuid(),
  gptId: z.string().uuid(),
  version: z.number().int().positive(),
  snapshot: z.string(), // JSON stringified GPT configuration - not obvious from type
  createdAt: z.string().datetime(),
  changeDescription: z.string().optional(),
})

export type GPTVersion = z.infer<typeof GPTVersionSchema>

export interface GPTVersionDB {
  id: string
  gptId: string
  version: number
  snapshot: string
  createdAtISO: string
  changeDescription?: string
}

export const GPTFolderSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(50),
  parentId: z.string().uuid().nullable(),
  order: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
})

export type GPTFolder = z.infer<typeof GPTFolderSchema>

export interface GPTFolderDB {
  id: string
  name: string
  parentId: string | null
  order: number
  createdAtISO: string
}

export interface FolderTreeNode {
  folder: GPTFolder
  children: FolderTreeNode[]
  gptCount: number
  depth: number
}

export const MAX_FOLDER_DEPTH = 3
export const MAX_VERSIONS_PER_GPT = 20
export const AUTO_SAVE_DEBOUNCE_MS = 2000

export const SyncEventType = {
  GPT_CREATED: 'gpt:created',
  GPT_UPDATED: 'gpt:updated',
  GPT_DELETED: 'gpt:deleted',
  GPT_ARCHIVED: 'gpt:archived',
  GPT_RESTORED: 'gpt:restored',
  FOLDER_CREATED: 'folder:created',
  FOLDER_UPDATED: 'folder:updated',
  FOLDER_DELETED: 'folder:deleted',
  VERSION_CREATED: 'version:created',
} as const

// eslint-disable-next-line @typescript-eslint/no-redeclare -- Intentional type merging pattern
export type SyncEventType = (typeof SyncEventType)[keyof typeof SyncEventType]

export interface SyncEvent {
  type: SyncEventType
  entityId: string
  entityType: 'gpt' | 'folder' | 'version'
  timestamp: number
}

export interface DeleteResult {
  deletedConversations: number
  deletedMessages: number
  deletedKnowledge: number
  deletedVersions: number
}
