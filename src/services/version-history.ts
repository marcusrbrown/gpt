import type {GPTConfiguration} from '@/types/gpt'
import type {GPTVersion, GPTVersionDB} from '@/types/gpt-extensions'
import {db, nowISO} from '@/lib/database'
import {MAX_VERSIONS_PER_GPT} from '@/types/gpt-extensions'

export class VersionHistoryError extends Error {
  constructor(
    message: string,
    public cause?: unknown,
  ) {
    super(message)
    this.name = 'VersionHistoryError'
  }
}

export class VersionHistoryService {
  async createVersion(gptId: string, changeDescription?: string): Promise<GPTVersion> {
    try {
      const gpt = await db.gpts.get(gptId)
      if (!gpt) {
        throw new VersionHistoryError(`GPT ${gptId} not found`)
      }

      const latestVersion = await db.gptVersions.where('gptId').equals(gptId).reverse().sortBy('version')

      const newVersionNumber = latestVersion.length > 0 ? (latestVersion[0]?.version ?? 0) + 1 : 1

      const versionRecord: GPTVersionDB = {
        id: crypto.randomUUID(),
        gptId,
        version: newVersionNumber,
        snapshot: JSON.stringify(gpt),
        createdAtISO: nowISO(),
        changeDescription,
      }

      await db.gptVersions.add(versionRecord)

      await this.pruneOldVersions(gptId)

      return this.dbToVersion(versionRecord)
    } catch (error_) {
      if (error_ instanceof VersionHistoryError) throw error_
      throw new VersionHistoryError(`Failed to create version for GPT ${gptId}`, error_)
    }
  }

  async getVersions(gptId: string): Promise<GPTVersion[]> {
    try {
      const records = await db.gptVersions.where('gptId').equals(gptId).reverse().sortBy('version')

      return records.map(record => this.dbToVersion(record))
    } catch (error_) {
      throw new VersionHistoryError(`Failed to get versions for GPT ${gptId}`, error_)
    }
  }

  async getVersion(versionId: string): Promise<GPTVersion | null> {
    try {
      const record = await db.gptVersions.get(versionId)
      return record ? this.dbToVersion(record) : null
    } catch (error_) {
      throw new VersionHistoryError(`Failed to get version ${versionId}`, error_)
    }
  }

  async restoreVersion(versionId: string): Promise<GPTConfiguration> {
    try {
      const versionRecord = await db.gptVersions.get(versionId)
      if (!versionRecord) {
        throw new VersionHistoryError(`Version ${versionId} not found`)
      }

      const snapshot = JSON.parse(versionRecord.snapshot) as GPTConfiguration

      await db.gpts.update(versionRecord.gptId, {
        ...snapshot,
        updatedAtISO: nowISO(),
      })

      return snapshot
    } catch (error_) {
      if (error_ instanceof VersionHistoryError) throw error_
      throw new VersionHistoryError(`Failed to restore version ${versionId}`, error_)
    }
  }

  async deleteVersion(versionId: string): Promise<void> {
    try {
      await db.gptVersions.delete(versionId)
    } catch (error_) {
      throw new VersionHistoryError(`Failed to delete version ${versionId}`, error_)
    }
  }

  async deleteAllVersions(gptId: string): Promise<number> {
    try {
      return await db.gptVersions.where('gptId').equals(gptId).delete()
    } catch (error_) {
      throw new VersionHistoryError(`Failed to delete versions for GPT ${gptId}`, error_)
    }
  }

  private async pruneOldVersions(gptId: string): Promise<void> {
    const versions = await db.gptVersions.where('gptId').equals(gptId).reverse().sortBy('version')

    if (versions.length > MAX_VERSIONS_PER_GPT) {
      const toDelete = versions.slice(MAX_VERSIONS_PER_GPT)
      await db.gptVersions.bulkDelete(toDelete.map(v => v.id))
    }
  }

  private dbToVersion(record: GPTVersionDB): GPTVersion {
    return {
      id: record.id,
      gptId: record.gptId,
      version: record.version,
      snapshot: record.snapshot,
      createdAt: record.createdAtISO,
      changeDescription: record.changeDescription,
    }
  }
}
