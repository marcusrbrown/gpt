import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {expect, test} from '@playwright/test'
import {BackupRestorePage} from './page-objects/backup-restore-page'
import {GPTEditorPage} from './page-objects/gpt-editor-page'
import {HomePage} from './page-objects/home-page'

test.describe('Export/Import System', () => {
  let homePage: HomePage
  let gptEditorPage: GPTEditorPage
  let backupRestorePage: BackupRestorePage
  let downloadDir: string

  test.beforeEach(async ({page}) => {
    homePage = new HomePage(page)
    gptEditorPage = new GPTEditorPage(page)
    backupRestorePage = new BackupRestorePage(page)

    downloadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gpt-export-test-'))

    await homePage.navigate()
    await homePage.clearAppStorage()
    await homePage.reload()
  })

  test.afterEach(async () => {
    if (downloadDir && fs.existsSync(downloadDir)) {
      fs.rmSync(downloadDir, {recursive: true, force: true})
    }
  })

  test.describe('Backup & Restore Page', () => {
    test('should display storage overview with correct counts', async ({page}) => {
      await backupRestorePage.navigate()
      await backupRestorePage.waitForPageReady()

      const heading = page.getByRole('heading', {name: /backup & restore/i})
      await expect(heading).toBeVisible()

      const storageOverview = page.getByText(/storage overview/i)
      await expect(storageOverview).toBeVisible()

      const createBackupSection = page.getByText(/create backup/i).first()
      await expect(createBackupSection).toBeVisible()

      const restoreSection = page.getByText(/restore from backup/i)
      await expect(restoreSection).toBeVisible()
    })

    test('should have backup options checkboxes', async ({page}) => {
      await backupRestorePage.navigate()
      await backupRestorePage.waitForPageReady()

      const conversationsCheckbox = page.getByText(/include conversations/i)
      const knowledgeCheckbox = page.getByText(/include knowledge/i)
      const settingsCheckbox = page.getByText(/include settings/i)

      await expect(conversationsCheckbox).toBeVisible()
      await expect(knowledgeCheckbox).toBeVisible()
      await expect(settingsCheckbox).toBeVisible()
    })

    test('should show create backup button', async ({page}) => {
      await backupRestorePage.navigate()
      await backupRestorePage.waitForPageReady()

      const createBackupButton = page.getByRole('button', {name: /create backup/i})
      await expect(createBackupButton).toBeVisible()
    })
  })

  test.describe('GPT Export Dialog', () => {
    test.beforeEach(async () => {
      await gptEditorPage.navigateToNew()
      await gptEditorPage.fillBasicConfiguration(
        'Export Test GPT',
        'A GPT for testing export functionality',
        'You are a helpful assistant for testing exports.',
      )
      await gptEditorPage.saveGPT()
      await homePage.navigate()
    })

    test('should show export option in GPT card menu', async ({page}) => {
      await homePage.waitForGPTCards()

      const gptCard = page.locator('[data-testid="user-gpt-card"]').first()
      const menuButton = gptCard.getByRole('button', {name: /gpt actions/i})
      await expect(menuButton).toBeVisible()
      await menuButton.dispatchEvent('click')

      const exportOption = page.locator('[data-testid="export-gpt"]')
      await expect(exportOption).toBeVisible({timeout: 10000})
    })

    test('should open export dialog when clicking export option', async ({page}) => {
      await homePage.waitForGPTCards()

      const gptCard = page.locator('[data-testid="user-gpt-card"]').first()
      await expect(gptCard).toBeVisible({timeout: 10000})

      const menuButton = gptCard.getByRole('button', {name: /gpt actions/i})
      await expect(menuButton).toBeVisible()
      await menuButton.dispatchEvent('click')

      const exportOption = page.locator('[data-testid="export-gpt"]')
      await expect(exportOption).toBeVisible({timeout: 10000})
      await exportOption.click({force: true})

      const exportDialog = page.getByRole('dialog')
      await expect(exportDialog).toBeVisible({timeout: 5000})

      const exportHeading = exportDialog.locator('h2', {hasText: /export/i})
      await expect(exportHeading).toBeVisible()
    })
  })

  test.describe('Navigation', () => {
    test('should navigate to backup page from navbar', async ({page}) => {
      await homePage.navigate()

      const backupLink = page
        .getByRole('link', {name: /backup & restore/i})
        .or(page.locator('[aria-label="Backup & Restore"]'))
      await expect(backupLink.first()).toBeVisible()
      await backupLink.first().click()

      await expect(page).toHaveURL(/\/backup/)
    })

    test('should navigate back to home from backup page', async ({page}) => {
      await backupRestorePage.navigate()

      const homeLink = page.getByRole('link', {name: /home/i}).or(page.getByRole('link', {name: /gpt/i}).first())
      await homeLink.click()

      await expect(page).toHaveURL('/')
    })
  })
})
