import type {GPTConfiguration} from '@/types/gpt'
import {db, deleteDatabase} from '@/lib/database'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {VersionHistoryError, VersionHistoryService} from '../version-history'
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
      extractionMode: 'manual' as const,
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

describe('VersionHistoryService', () => {
  let service: VersionHistoryService

  beforeEach(async () => {
    await deleteDatabase()
    service = new VersionHistoryService()
  })

  afterEach(async () => {
    await deleteDatabase()
  })

  describe('createVersion', () => {
    it('should create a version snapshot of a GPT', async () => {
      const gpt = createTestGPT()
      await db.gpts.add({
        ...gpt,
        createdAtISO: gpt.createdAt.toISOString(),
        updatedAtISO: gpt.updatedAt.toISOString(),
        archivedAtISO: gpt.archivedAt ?? null,
      })

      const version = await service.createVersion(gpt.id, 'Initial version')

      expect(version).toBeDefined()
      expect(version.gptId).toBe(gpt.id)
      expect(version.version).toBe(1)
      expect(version.changeDescription).toBe('Initial version')
      expect(version.snapshot).toBeDefined()
    })

    it('should increment version number for subsequent versions', async () => {
      const gpt = createTestGPT()
      await db.gpts.add({
        ...gpt,
        createdAtISO: gpt.createdAt.toISOString(),
        updatedAtISO: gpt.updatedAt.toISOString(),
        archivedAtISO: gpt.archivedAt ?? null,
      })

      const v1 = await service.createVersion(gpt.id, 'v1')
      const v2 = await service.createVersion(gpt.id, 'v2')
      const v3 = await service.createVersion(gpt.id, 'v3')

      expect(v1.version).toBe(1)
      expect(v2.version).toBe(2)
      expect(v3.version).toBe(3)
    })

    it('should throw error for non-existent GPT', async () => {
      await expect(service.createVersion('non-existent-id')).rejects.toThrow(VersionHistoryError)
    })
  })

  describe('getVersions', () => {
    it('should return versions sorted by version number descending', async () => {
      const gpt = createTestGPT()
      await db.gpts.add({
        ...gpt,
        createdAtISO: gpt.createdAt.toISOString(),
        updatedAtISO: gpt.updatedAt.toISOString(),
        archivedAtISO: gpt.archivedAt ?? null,
      })

      await service.createVersion(gpt.id, 'v1')
      await service.createVersion(gpt.id, 'v2')
      await service.createVersion(gpt.id, 'v3')

      const versions = await service.getVersions(gpt.id)

      expect(versions).toHaveLength(3)
      expect(versions[0]?.version).toBe(3)
      expect(versions[1]?.version).toBe(2)
      expect(versions[2]?.version).toBe(1)
    })

    it('should return empty array for GPT with no versions', async () => {
      const versions = await service.getVersions('no-versions-id')
      expect(versions).toEqual([])
    })
  })

  describe('getVersion', () => {
    it('should return a specific version by ID', async () => {
      const gpt = createTestGPT()
      await db.gpts.add({
        ...gpt,
        createdAtISO: gpt.createdAt.toISOString(),
        updatedAtISO: gpt.updatedAt.toISOString(),
        archivedAtISO: gpt.archivedAt ?? null,
      })

      const created = await service.createVersion(gpt.id, 'test')
      const retrieved = await service.getVersion(created.id)

      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe(created.id)
      expect(retrieved?.version).toBe(1)
    })

    it('should return null for non-existent version', async () => {
      const version = await service.getVersion('non-existent-id')
      expect(version).toBeNull()
    })
  })

  describe('restoreVersion', () => {
    it('should restore GPT to a previous version state', async () => {
      const gpt = createTestGPT({name: 'Original Name'})
      await db.gpts.add({
        ...gpt,
        createdAtISO: gpt.createdAt.toISOString(),
        updatedAtISO: gpt.updatedAt.toISOString(),
        archivedAtISO: gpt.archivedAt ?? null,
      })

      const v1 = await service.createVersion(gpt.id, 'Original')

      await db.gpts.update(gpt.id, {name: 'Updated Name'})

      const restored = await service.restoreVersion(v1.id)

      expect(restored.name).toBe('Original Name')

      const currentGpt = await db.gpts.get(gpt.id)
      expect(currentGpt?.name).toBe('Original Name')
    })

    it('should throw error for non-existent version', async () => {
      await expect(service.restoreVersion('non-existent-id')).rejects.toThrow(VersionHistoryError)
    })
  })

  describe('deleteVersion', () => {
    it('should delete a specific version', async () => {
      const gpt = createTestGPT()
      await db.gpts.add({
        ...gpt,
        createdAtISO: gpt.createdAt.toISOString(),
        updatedAtISO: gpt.updatedAt.toISOString(),
        archivedAtISO: gpt.archivedAt ?? null,
      })

      const version = await service.createVersion(gpt.id)
      await service.deleteVersion(version.id)

      const retrieved = await service.getVersion(version.id)
      expect(retrieved).toBeNull()
    })
  })

  describe('deleteAllVersions', () => {
    it('should delete all versions for a GPT', async () => {
      const gpt = createTestGPT()
      await db.gpts.add({
        ...gpt,
        createdAtISO: gpt.createdAt.toISOString(),
        updatedAtISO: gpt.updatedAt.toISOString(),
        archivedAtISO: gpt.archivedAt ?? null,
      })

      await service.createVersion(gpt.id, 'v1')
      await service.createVersion(gpt.id, 'v2')
      await service.createVersion(gpt.id, 'v3')

      const deletedCount = await service.deleteAllVersions(gpt.id)

      expect(deletedCount).toBe(3)

      const remaining = await service.getVersions(gpt.id)
      expect(remaining).toHaveLength(0)
    })
  })

  describe('auto-pruning', () => {
    it('should keep only MAX_VERSIONS_PER_GPT versions', async () => {
      const gpt = createTestGPT()
      await db.gpts.add({
        ...gpt,
        createdAtISO: gpt.createdAt.toISOString(),
        updatedAtISO: gpt.updatedAt.toISOString(),
        archivedAtISO: gpt.archivedAt ?? null,
      })

      for (let i = 1; i <= 25; i++) {
        await service.createVersion(gpt.id, `v${i}`)
      }

      const versions = await service.getVersions(gpt.id)

      expect(versions).toHaveLength(20)
      expect(versions[0]?.version).toBe(25)
      expect(versions.at(-1)?.version).toBe(6)
    })
  })
})
