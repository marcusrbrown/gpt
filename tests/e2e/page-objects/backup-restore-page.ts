import type {Locator, Page} from '@playwright/test'
import {BasePage} from './base-page'

export class BackupRestorePage extends BasePage {
  readonly pageHeading: Locator
  readonly storageOverviewCard: Locator
  readonly gptCount: Locator
  readonly conversationCount: Locator
  readonly folderCount: Locator
  readonly storageUsed: Locator

  readonly includeConversationsCheckbox: Locator
  readonly includeKnowledgeCheckbox: Locator
  readonly includeSettingsCheckbox: Locator
  readonly createBackupButton: Locator

  readonly restoreFileInput: Locator
  readonly restoreButton: Locator
  readonly wipeExistingCheckbox: Locator

  readonly confirmRestoreButton: Locator
  readonly cancelRestoreButton: Locator

  constructor(page: Page) {
    super(page)

    this.pageHeading = page.getByRole('heading', {name: /backup & restore/i})
    this.storageOverviewCard = page.locator('[data-testid="storage-overview"]')
    this.gptCount = page.getByTestId('gpt-count')
    this.conversationCount = page.getByTestId('conversation-count')
    this.folderCount = page.getByTestId('folder-count')
    this.storageUsed = page.getByTestId('storage-used')

    this.includeConversationsCheckbox = page.getByText(/include conversations/i)
    this.includeKnowledgeCheckbox = page.getByText(/include knowledge/i)
    this.includeSettingsCheckbox = page.getByText(/include settings/i)
    this.createBackupButton = page.getByRole('button', {name: /create backup/i})

    this.restoreFileInput = page.locator('input[type="file"]')
    this.restoreButton = page.getByRole('button', {name: /restore/i})
    this.wipeExistingCheckbox = page.getByRole('checkbox', {name: /wipe.*existing/i})

    this.confirmRestoreButton = page.getByRole('button', {name: /confirm/i})
    this.cancelRestoreButton = page.getByRole('button', {name: /cancel/i})
  }

  async navigate(): Promise<void> {
    await this.goto('/backup')
    await this.waitForLoad()
  }

  async waitForPageReady(): Promise<void> {
    await this.pageHeading.waitFor({state: 'visible'})
  }

  async getStorageStats(): Promise<{gpts: number; conversations: number; folders: number}> {
    const gptText = await this.gptCount.textContent()
    const convText = await this.conversationCount.textContent()
    const folderText = await this.folderCount.textContent()

    return {
      gpts: Number.parseInt(gptText || '0', 10),
      conversations: Number.parseInt(convText || '0', 10),
      folders: Number.parseInt(folderText || '0', 10),
    }
  }

  async setBackupOptions(options: {
    includeConversations?: boolean
    includeKnowledge?: boolean
    includeSettings?: boolean
  }): Promise<void> {
    if (options.includeConversations !== undefined) {
      const isChecked = await this.includeConversationsCheckbox.isChecked()
      if (isChecked !== options.includeConversations) {
        await this.includeConversationsCheckbox.click()
      }
    }
    if (options.includeKnowledge !== undefined) {
      const isChecked = await this.includeKnowledgeCheckbox.isChecked()
      if (isChecked !== options.includeKnowledge) {
        await this.includeKnowledgeCheckbox.click()
      }
    }
    if (options.includeSettings !== undefined) {
      const isChecked = await this.includeSettingsCheckbox.isChecked()
      if (isChecked !== options.includeSettings) {
        await this.includeSettingsCheckbox.click()
      }
    }
  }

  async clickCreateBackup(): Promise<void> {
    await this.clickElement(this.createBackupButton)
  }

  async uploadRestoreFile(filePath: string): Promise<void> {
    await this.restoreFileInput.setInputFiles(filePath)
  }

  async clickRestore(): Promise<void> {
    await this.clickElement(this.restoreButton)
  }

  async confirmRestore(): Promise<void> {
    await this.clickElement(this.confirmRestoreButton)
  }

  async cancelRestore(): Promise<void> {
    await this.clickElement(this.cancelRestoreButton)
  }
}
