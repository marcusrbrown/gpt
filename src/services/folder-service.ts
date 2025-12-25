import type {FolderTreeNode, GPTFolder, GPTFolderDB} from '@/types/gpt-extensions'
import {db, nowISO, type GPTFolderDB as DBFolderType} from '@/lib/database'
import {MAX_FOLDER_DEPTH} from '@/types/gpt-extensions'

export class FolderServiceError extends Error {
  constructor(
    message: string,
    public cause?: unknown,
  ) {
    super(message)
    this.name = 'FolderServiceError'
  }
}

export class FolderService {
  async createFolder(name: string, parentId: string | null = null): Promise<GPTFolder> {
    try {
      if (parentId) {
        const depth = await this.getFolderDepth(parentId)
        if (depth >= MAX_FOLDER_DEPTH) {
          throw new FolderServiceError(`Maximum folder depth of ${MAX_FOLDER_DEPTH} exceeded`)
        }
      }

      const siblings = parentId
        ? await db.folders.where('parentId').equals(parentId).toArray()
        : await db.folders.filter(f => f.parentId === null).toArray()
      const maxOrder = siblings.reduce((max, f) => Math.max(max, f.order), -1)

      const folderRecord: GPTFolderDB = {
        id: crypto.randomUUID(),
        name: name.trim().slice(0, 50),
        parentId,
        order: maxOrder + 1,
        createdAtISO: nowISO(),
      }

      await db.folders.add(folderRecord)
      return this.dbToFolder(folderRecord)
    } catch (error_) {
      if (error_ instanceof FolderServiceError) throw error_
      throw new FolderServiceError('Failed to create folder', error_)
    }
  }

  async renameFolder(folderId: string, newName: string): Promise<void> {
    try {
      const folder = await db.folders.get(folderId)
      if (!folder) {
        throw new FolderServiceError(`Folder ${folderId} not found`)
      }

      await db.folders.update(folderId, {
        name: newName.trim().slice(0, 50),
      })
    } catch (error_) {
      if (error_ instanceof FolderServiceError) throw error_
      throw new FolderServiceError(`Failed to rename folder ${folderId}`, error_)
    }
  }

  async moveFolder(folderId: string, newParentId: string | null): Promise<void> {
    try {
      if (folderId === newParentId) {
        throw new FolderServiceError('Cannot move folder into itself')
      }

      if (newParentId) {
        const isDescendant = await this.isDescendantOf(newParentId, folderId)
        if (isDescendant) {
          throw new FolderServiceError('Cannot move folder into its own descendant')
        }

        const depth = await this.getFolderDepth(newParentId)
        if (depth >= MAX_FOLDER_DEPTH - 1) {
          throw new FolderServiceError(`Maximum folder depth of ${MAX_FOLDER_DEPTH} exceeded`)
        }
      }

      const siblings = newParentId
        ? await db.folders.where('parentId').equals(newParentId).toArray()
        : await db.folders.filter(f => f.parentId === null).toArray()
      const maxOrder = siblings.reduce((max, f) => Math.max(max, f.order), -1)

      await db.folders.update(folderId, {
        parentId: newParentId,
        order: maxOrder + 1,
      })
    } catch (error_) {
      if (error_ instanceof FolderServiceError) throw error_
      throw new FolderServiceError(`Failed to move folder ${folderId}`, error_)
    }
  }

  async deleteFolder(folderId: string, moveGptsToRoot = true): Promise<void> {
    try {
      await db.transaction('rw', [db.folders, db.gpts], async () => {
        const descendants = await this.getDescendantIds(folderId)
        const allFolderIds = [folderId, ...descendants]

        if (moveGptsToRoot) {
          await db.gpts
            .filter(gpt => gpt.folderId !== null && allFolderIds.includes(gpt.folderId))
            .modify({folderId: null})
        }

        await db.folders.bulkDelete(allFolderIds)
      })
    } catch (error_) {
      if (error_ instanceof FolderServiceError) throw error_
      throw new FolderServiceError(`Failed to delete folder ${folderId}`, error_)
    }
  }

  async getFolder(folderId: string): Promise<GPTFolder | null> {
    try {
      const record = await db.folders.get(folderId)
      return record ? this.dbToFolder(record) : null
    } catch (error_) {
      throw new FolderServiceError(`Failed to get folder ${folderId}`, error_)
    }
  }

  async getAllFolders(): Promise<GPTFolder[]> {
    try {
      const records = await db.folders.toArray()
      return records.map(record => this.dbToFolder(record))
    } catch (error_) {
      throw new FolderServiceError('Failed to get all folders', error_)
    }
  }

  async getFolderTree(): Promise<FolderTreeNode[]> {
    try {
      const folders = await this.getAllFolders()
      const gptCounts = await this.getGptCountsByFolder()
      return this.buildTree(folders, null, 0, gptCounts)
    } catch (error_) {
      throw new FolderServiceError('Failed to build folder tree', error_)
    }
  }

  private async getGptCountsByFolder(): Promise<Map<string, number>> {
    const counts = new Map<string, number>()
    const gpts = await db.gpts.toArray()
    for (const gpt of gpts) {
      if (gpt.folderId) {
        counts.set(gpt.folderId, (counts.get(gpt.folderId) ?? 0) + 1)
      }
    }
    return counts
  }

  private buildTree(
    folders: GPTFolder[],
    parentId: string | null,
    depth: number,
    gptCounts: Map<string, number>,
  ): FolderTreeNode[] {
    return folders
      .filter(f => f.parentId === parentId)
      .sort((a, b) => a.order - b.order)
      .map(folder => ({
        folder,
        children: this.buildTree(folders, folder.id, depth + 1, gptCounts),
        gptCount: gptCounts.get(folder.id) ?? 0,
        depth,
      }))
  }

  private async getFolderDepth(folderId: string): Promise<number> {
    let depth = 0
    let currentId: string | null = folderId

    while (currentId) {
      const record: DBFolderType | undefined = await db.folders.get(currentId)
      if (!record) break
      depth++
      currentId = record.parentId
    }

    return depth
  }

  private async isDescendantOf(potentialDescendant: string, ancestorId: string): Promise<boolean> {
    let currentId: string | null = potentialDescendant

    while (currentId) {
      if (currentId === ancestorId) return true
      const record: DBFolderType | undefined = await db.folders.get(currentId)
      if (!record) break
      currentId = record.parentId
    }

    return false
  }

  private async getDescendantIds(folderId: string): Promise<string[]> {
    const children = await db.folders.where('parentId').equals(folderId).toArray()
    const descendants: string[] = children.map(c => c.id)

    for (const child of children) {
      const childDescendants = await this.getDescendantIds(child.id)
      descendants.push(...childDescendants)
    }

    return descendants
  }

  private dbToFolder(record: GPTFolderDB): GPTFolder {
    return {
      id: record.id,
      name: record.name,
      parentId: record.parentId,
      order: record.order,
      createdAt: record.createdAtISO,
    }
  }
}
