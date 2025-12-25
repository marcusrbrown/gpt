import type {GPTConfiguration} from '@/types/gpt'
import {db, deleteDatabase} from '@/lib/database'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {FolderService, FolderServiceError} from '../folder-service'
import 'fake-indexeddb/auto'

function createTestGPT(overrides: Partial<GPTConfiguration> = {}): GPTConfiguration {
  return {
    id: crypto.randomUUID(),
    name: 'Test GPT',
    description: 'A test GPT configuration',
    systemPrompt: 'You are a helpful assistant.',
    tools: [],
    knowledge: {
      files: [],
      urls: [],
    },
    capabilities: {
      codeInterpreter: false,
      webBrowsing: false,
      imageGeneration: false,
      fileSearch: {
        enabled: false,
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    tags: [],
    isArchived: false,
    folderId: null,
    archivedAt: null,
    ...overrides,
  }
}

describe('FolderService', () => {
  let service: FolderService

  beforeEach(async () => {
    await deleteDatabase()
    service = new FolderService()
  })

  afterEach(async () => {
    await deleteDatabase()
  })

  describe('createFolder', () => {
    it('should create a folder at root level', async () => {
      const folder = await service.createFolder('My Folder')

      expect(folder).toBeDefined()
      expect(folder.name).toBe('My Folder')
      expect(folder.parentId).toBeNull()
      expect(folder.order).toBe(0)
    })

    it('should create a nested folder', async () => {
      const parent = await service.createFolder('Parent')
      const child = await service.createFolder('Child', parent.id)

      expect(child.parentId).toBe(parent.id)
    })

    it('should increment order for sibling folders', async () => {
      const f1 = await service.createFolder('Folder 1')
      const f2 = await service.createFolder('Folder 2')
      const f3 = await service.createFolder('Folder 3')

      expect(f1.order).toBe(0)
      expect(f2.order).toBe(1)
      expect(f3.order).toBe(2)
    })

    it('should truncate folder name to 50 characters', async () => {
      const longName = 'A'.repeat(100)
      const folder = await service.createFolder(longName)

      expect(folder.name).toHaveLength(50)
    })

    it('should enforce maximum folder depth of 3', async () => {
      const level1 = await service.createFolder('Level 1')
      const level2 = await service.createFolder('Level 2', level1.id)
      const level3 = await service.createFolder('Level 3', level2.id)

      await expect(service.createFolder('Level 4', level3.id)).rejects.toThrow(FolderServiceError)
    })
  })

  describe('renameFolder', () => {
    it('should rename an existing folder', async () => {
      const folder = await service.createFolder('Original')
      await service.renameFolder(folder.id, 'Renamed')

      const updated = await service.getFolder(folder.id)
      expect(updated?.name).toBe('Renamed')
    })

    it('should throw error for non-existent folder', async () => {
      await expect(service.renameFolder('non-existent-id', 'New Name')).rejects.toThrow(FolderServiceError)
    })
  })

  describe('moveFolder', () => {
    it('should move folder to a new parent', async () => {
      const parent1 = await service.createFolder('Parent 1')
      const parent2 = await service.createFolder('Parent 2')
      const child = await service.createFolder('Child', parent1.id)

      await service.moveFolder(child.id, parent2.id)

      const updated = await service.getFolder(child.id)
      expect(updated?.parentId).toBe(parent2.id)
    })

    it('should move folder to root', async () => {
      const parent = await service.createFolder('Parent')
      const child = await service.createFolder('Child', parent.id)

      await service.moveFolder(child.id, null)

      const updated = await service.getFolder(child.id)
      expect(updated?.parentId).toBeNull()
    })

    it('should prevent moving folder into itself', async () => {
      const folder = await service.createFolder('Folder')

      await expect(service.moveFolder(folder.id, folder.id)).rejects.toThrow('Cannot move folder into itself')
    })

    it('should prevent moving folder into its descendant', async () => {
      const parent = await service.createFolder('Parent')
      const child = await service.createFolder('Child', parent.id)

      await expect(service.moveFolder(parent.id, child.id)).rejects.toThrow(
        'Cannot move folder into its own descendant',
      )
    })

    it('should enforce maximum depth when moving', async () => {
      const level1 = await service.createFolder('Level 1')
      const level2 = await service.createFolder('Level 2', level1.id)
      const level3 = await service.createFolder('Level 3', level2.id)
      const standalone = await service.createFolder('Standalone')

      await expect(service.moveFolder(standalone.id, level3.id)).rejects.toThrow(FolderServiceError)
    })
  })

  describe('deleteFolder', () => {
    it('should delete a folder', async () => {
      const folder = await service.createFolder('To Delete')
      await service.deleteFolder(folder.id)

      const deleted = await service.getFolder(folder.id)
      expect(deleted).toBeNull()
    })

    it('should delete folder and all descendants', async () => {
      const parent = await service.createFolder('Parent')
      const child = await service.createFolder('Child', parent.id)
      const grandchild = await service.createFolder('Grandchild', child.id)

      await service.deleteFolder(parent.id)

      expect(await service.getFolder(parent.id)).toBeNull()
      expect(await service.getFolder(child.id)).toBeNull()
      expect(await service.getFolder(grandchild.id)).toBeNull()
    })

    it('should move GPTs to root when folder is deleted', async () => {
      const folder = await service.createFolder('Folder')
      const gpt = createTestGPT({folderId: folder.id})
      await db.gpts.add({
        ...gpt,
        createdAtISO: gpt.createdAt.toISOString(),
        updatedAtISO: gpt.updatedAt.toISOString(),
        archivedAtISO: gpt.archivedAt ?? null,
      })

      await service.deleteFolder(folder.id, true)

      const updatedGpt = await db.gpts.get(gpt.id)
      expect(updatedGpt?.folderId).toBeNull()
    })
  })

  describe('getFolder', () => {
    it('should return folder by ID', async () => {
      const created = await service.createFolder('Test')
      const retrieved = await service.getFolder(created.id)

      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe(created.id)
    })

    it('should return null for non-existent folder', async () => {
      const folder = await service.getFolder('non-existent-id')
      expect(folder).toBeNull()
    })
  })

  describe('getAllFolders', () => {
    it('should return all folders', async () => {
      await service.createFolder('Folder 1')
      await service.createFolder('Folder 2')
      await service.createFolder('Folder 3')

      const folders = await service.getAllFolders()
      expect(folders).toHaveLength(3)
    })

    it('should return empty array when no folders exist', async () => {
      const folders = await service.getAllFolders()
      expect(folders).toEqual([])
    })
  })

  describe('getFolderTree', () => {
    it('should build hierarchical folder tree', async () => {
      const parent = await service.createFolder('Parent')
      await service.createFolder('Child 1', parent.id)
      await service.createFolder('Child 2', parent.id)

      const tree = await service.getFolderTree()

      expect(tree).toHaveLength(1)
      expect(tree[0]?.folder.name).toBe('Parent')
      expect(tree[0]?.children).toHaveLength(2)
      expect(tree[0]?.depth).toBe(0)
      expect(tree[0]?.children[0]?.depth).toBe(1)
    })

    it('should include GPT counts per folder', async () => {
      const folder = await service.createFolder('With GPTs')
      const gpt1 = createTestGPT({folderId: folder.id})
      const gpt2 = createTestGPT({folderId: folder.id})

      await db.gpts.add({
        ...gpt1,
        createdAtISO: gpt1.createdAt.toISOString(),
        updatedAtISO: gpt1.updatedAt.toISOString(),
        archivedAtISO: gpt1.archivedAt ?? null,
      })
      await db.gpts.add({
        ...gpt2,
        createdAtISO: gpt2.createdAt.toISOString(),
        updatedAtISO: gpt2.updatedAt.toISOString(),
        archivedAtISO: gpt2.archivedAt ?? null,
      })

      const tree = await service.getFolderTree()

      expect(tree[0]?.gptCount).toBe(2)
    })

    it('should sort siblings by order', async () => {
      await service.createFolder('C')
      await service.createFolder('A')
      await service.createFolder('B')

      const tree = await service.getFolderTree()

      expect(tree[0]?.folder.name).toBe('C')
      expect(tree[1]?.folder.name).toBe('A')
      expect(tree[2]?.folder.name).toBe('B')
    })
  })
})
