import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {expect, test} from './fixtures'
import {GPTDataFactory} from './utils/test-data-factory'

const testDir = path.dirname(fileURLToPath(import.meta.url))

test.describe('Knowledge Base Management', () => {
  test.beforeEach(async ({gptEditorPage}) => {
    await gptEditorPage.navigateToNew()
    const testGPT = GPTDataFactory.createBasicGPT()
    await gptEditorPage.fillBasicConfiguration(testGPT.name, testGPT.description, testGPT.systemPrompt)
    await gptEditorPage.saveGPT()
    await gptEditorPage.knowledgeTab.click()
    await gptEditorPage.getPage().waitForSelector('text=Files', {state: 'visible'})
  })

  test.describe('File Management', () => {
    test('should upload a text file successfully', async ({page}) => {
      const fileInput = page.locator('input[type="file"]')
      await expect(fileInput).toBeAttached()

      const testFilePath = path.join(testDir, 'fixtures', 'test-document.txt')
      await fileInput.setInputFiles(testFilePath)

      await expect(page.locator('table').getByText('test-document.txt').first()).toBeVisible({timeout: 5000})
    })

    test('should display extraction status after upload', async ({page}) => {
      const fileInput = page.locator('input[type="file"]')
      const testFilePath = path.join(testDir, 'fixtures', 'test-document.txt')
      await fileInput.setInputFiles(testFilePath)

      const fileNameInTable = page.locator('table').getByText('test-document.txt')
      await expect(fileNameInTable).toBeVisible({timeout: 5000})

      const tableRow = page.locator('table tbody tr').filter({hasText: 'test-document.txt'})
      await expect(tableRow).toContainText(/Pending|Ready|Processing/)
    })

    test('should toggle extraction mode', async ({page}) => {
      const manualRadio = page.getByRole('radio', {name: /Manual/})
      const autoRadio = page.getByRole('radio', {name: /Auto-extract/})

      await expect(manualRadio).toBeChecked()

      await autoRadio.click({force: true})
      await page.waitForTimeout(500)
      await expect(autoRadio).toBeChecked()

      await manualRadio.click({force: true})
      await page.waitForTimeout(500)
      await expect(manualRadio).toBeChecked()
    })

    test('should show Extract All Pending button in manual mode', async ({page}) => {
      await expect(page.getByRole('radio', {name: /Manual/})).toBeChecked()

      const fileInput = page.locator('input[type="file"]')
      const testFilePath = path.join(testDir, 'fixtures', 'test-document.txt')
      await fileInput.setInputFiles(testFilePath)

      const fileNameInTable = page.locator('table').getByText('test-document.txt')
      await expect(fileNameInTable).toBeVisible({timeout: 5000})

      await page.waitForFunction(
        () => {
          const row = document.querySelector('table tbody tr')
          return row?.textContent?.includes('Pending')
        },
        {timeout: 5000},
      )

      const extractAllButton = page.getByRole('button', {name: /Extract All Pending \(\d+\)/})
      await expect(extractAllButton).toBeVisible({timeout: 5000})
    })

    test('should remove uploaded file', async ({page}) => {
      const fileInput = page.locator('input[type="file"]')
      const testFilePath = path.join(testDir, 'fixtures', 'test-document.txt')
      await fileInput.setInputFiles(testFilePath)

      await expect(page.locator('table').getByText('test-document.txt').first()).toBeVisible()

      const removeButton = page.locator('button[aria-label="Remove file"]').first()
      await removeButton.click()

      await expect(page.locator('table').getByText('test-document.txt')).not.toBeVisible()
    })
  })

  test.describe('URL Caching', () => {
    test('should navigate to URLs tab', async ({page}) => {
      const urlsTab = page.locator('button[role="tab"]', {hasText: 'URLs'})
      await urlsTab.click()

      await expect(page.locator('text=Add URL to cache')).toBeVisible()
    })

    test('should add a URL to cache', async ({page}) => {
      const urlsTab = page.locator('button[role="tab"]', {hasText: 'URLs'})
      await urlsTab.click()

      const urlInput = page.getByLabel('Add URL to cache')
      await urlInput.fill('https://example.com')

      const cacheButton = page.locator('button', {hasText: 'Cache URL'})
      await cacheButton.click()

      await expect(page.locator('text=https://example.com').first()).toBeVisible({timeout: 5000})
    })

    test('should display cached URLs table', async ({page}) => {
      const urlsTab = page.locator('button[role="tab"]', {hasText: 'URLs'})
      await urlsTab.click()

      // Only appears when URLs exist, so add one first
      const urlInput = page.getByLabel('Add URL to cache')
      await urlInput.fill('https://example.com')
      const cacheButton = page.locator('button', {hasText: 'Cache URL'})
      await cacheButton.click()

      await expect(page.locator('h4', {hasText: 'Cached URLs'})).toBeVisible({timeout: 5000})
    })
  })

  test.describe('Text Snippets', () => {
    test('should navigate to Snippets tab', async ({page}) => {
      const snippetsTab = page.locator('button[role="tab"]', {hasText: 'Snippets'})
      await snippetsTab.click()

      await expect(page.getByLabel('Title')).toBeVisible({timeout: 5000})
    })

    test('should create a text snippet', async ({page}) => {
      const snippetsTab = page.locator('button[role="tab"]', {hasText: 'Snippets'})
      await snippetsTab.click()

      const titleInput = page.getByLabel('Title')
      await titleInput.fill('Test Snippet')

      const contentTextarea = page.getByLabel('Content')
      await contentTextarea.fill('This is a test snippet content.')

      const tagsInput = page.getByLabel(/Tags/i)
      await tagsInput.fill('test, snippet, example')

      const saveButton = page.locator('button', {hasText: 'Save Snippet'})
      await saveButton.click()

      await expect(page.getByRole('heading', {name: 'Test Snippet'})).toBeVisible({timeout: 5000})
    })

    test('should display snippet with tags', async ({page}) => {
      const snippetsTab = page.locator('button[role="tab"]', {hasText: 'Snippets'})
      await snippetsTab.click()

      const titleInput = page.getByLabel('Title')
      await titleInput.fill('Tagged Snippet')

      const contentTextarea = page.getByLabel('Content')
      await contentTextarea.fill('Content with tags')

      const tagsInput = page.getByLabel(/Tags/i)
      await tagsInput.fill('react, typescript')

      const saveButton = page.locator('button', {hasText: 'Save Snippet'})
      await saveButton.click()

      await expect(page.locator('text=react')).toBeVisible()
      await expect(page.locator('text=typescript')).toBeVisible()
    })

    test('should edit existing snippet', async ({page}) => {
      const snippetsTab = page.locator('button[role="tab"]', {hasText: 'Snippets'})
      await snippetsTab.click()
      await page.waitForTimeout(500)

      await page.getByLabel('Title').fill('Original Title')
      await page.getByLabel('Content').fill('Original content')

      const saveButton = page.locator('button', {hasText: 'Save Snippet'})
      await saveButton.click()
      await page.waitForTimeout(1500)

      const originalHeading = page.getByRole('heading', {name: 'Original Title'})
      await expect(originalHeading).toBeVisible({timeout: 5000})

      const editButton = page.getByRole('button', {name: 'Edit'}).first()
      await editButton.click()
      await page.waitForTimeout(500)

      const updateButton = page.locator('button', {hasText: 'Update Snippet'})
      await expect(updateButton).toBeVisible({timeout: 5000})

      const titleInput = page.getByLabel('Title')
      await expect(titleInput).toBeVisible({timeout: 5000})
      await expect(titleInput).toHaveValue('Original Title')

      await titleInput.fill('Updated Title')
      await updateButton.click()
      await page.waitForTimeout(1000)

      const updatedHeading = page.getByRole('heading', {name: 'Updated Title'})
      await expect(updatedHeading).toBeVisible({timeout: 5000})
    })

    test('should delete snippet', async ({page}) => {
      const snippetsTab = page.locator('button[role="tab"]', {hasText: 'Snippets'})
      await snippetsTab.click()

      const titleInput = page.getByLabel('Title')
      await titleInput.fill('Snippet to Delete')

      const contentTextarea = page.getByLabel('Content')
      await contentTextarea.fill('This will be deleted')

      const saveButton = page.locator('button', {hasText: 'Save Snippet'})
      await saveButton.click()

      await page.waitForTimeout(1000)
      await expect(page.getByRole('heading', {name: 'Snippet to Delete'})).toBeVisible({timeout: 5000})

      const deleteButton = page.locator('button', {hasText: 'Delete'}).first()
      await deleteButton.click()

      await page.waitForTimeout(500)
      await expect(page.getByRole('heading', {name: 'Snippet to Delete'})).not.toBeVisible({timeout: 5000})
    })
  })

  test.describe('Summary Statistics', () => {
    test('should navigate to Summary tab', async ({page}) => {
      const summaryTab = page.locator('button[role="tab"]', {hasText: 'Summary'})
      await summaryTab.click()

      await expect(page.locator('text=Total Files')).toBeVisible()
    })

    test('should display storage statistics', async ({page}) => {
      const summaryTab = page.locator('button[role="tab"]', {hasText: 'Summary'})
      await summaryTab.click()

      await expect(page.locator('text=Total Files')).toBeVisible()
      await expect(page.locator('text=Cached URLs')).toBeVisible()
      await expect(page.locator('text=Text Snippets')).toBeVisible()
      await expect(page.locator('text=Total Storage')).toBeVisible()
    })

    test('should update statistics after adding content', async ({page}) => {
      const summaryTab = page.locator('button[role="tab"]', {hasText: 'Summary'})
      await summaryTab.click()
      await page.waitForTimeout(500)

      const totalFilesCard = page.locator('text=Total Files').locator('..')
      const initialFilesText = await totalFilesCard.textContent()
      const initialFilesCount = Number.parseInt(initialFilesText?.match(/\d+/)?.[0] || '0')

      await page.locator('button[role="tab"]', {hasText: 'Files'}).click()
      await page.waitForTimeout(500)

      const fileInput = page.locator('input[type="file"]')
      const testFilePath = path.join(testDir, 'fixtures', 'test-document.txt')
      await fileInput.setInputFiles(testFilePath)

      await expect(page.locator('table').getByText('test-document.txt')).toBeVisible({timeout: 5000})

      await summaryTab.click()
      await page.waitForTimeout(2000)

      const updatedFilesText = await totalFilesCard.textContent()
      const updatedFilesCount = Number.parseInt(updatedFilesText?.match(/\d+/)?.[0] || '0')

      expect(updatedFilesCount).toBeGreaterThan(initialFilesCount)
    })
  })

  test.describe('Search Functionality', () => {
    test('should display global search bar', async ({page}) => {
      const searchInput = page.locator('input[placeholder*="Search knowledge base"]')
      await expect(searchInput).toBeVisible()
    })

    test('should allow typing in search field', async ({page}) => {
      const searchInput = page.locator('input[placeholder*="Search knowledge base"]')
      await searchInput.fill('test query')

      await expect(searchInput).toHaveValue('test query')
    })
  })

  test.describe('Tab Navigation', () => {
    test('should switch between all tabs', async ({page}) => {
      const filesTab = page.locator('button[role="tab"]', {hasText: 'Files'})
      const urlsTab = page.locator('button[role="tab"]', {hasText: 'URLs'})
      const snippetsTab = page.locator('button[role="tab"]', {hasText: 'Snippets'})
      const summaryTab = page.locator('button[role="tab"]', {hasText: 'Summary'})

      await expect(filesTab).toBeVisible()

      await urlsTab.click()
      await page.waitForTimeout(500)
      await expect(page.getByLabel('Add URL to cache')).toBeVisible()

      await snippetsTab.click()
      await page.waitForTimeout(500)
      await expect(page.getByLabel('Title')).toBeVisible()

      await summaryTab.click()
      await page.waitForTimeout(500)
      await expect(page.locator('text=Total Files')).toBeVisible()

      await filesTab.click()
      await page.waitForTimeout(500)
      await expect(page.locator('input[type="file"]')).toBeAttached()
    })

    test('should maintain form state when switching tabs', async ({page}) => {
      const snippetsTab = page.locator('button[role="tab"]', {hasText: 'Snippets'})
      await snippetsTab.click()
      await page.waitForTimeout(500)

      const titleInput = page.getByLabel('Title')
      await titleInput.fill('Test State Persistence')
      await page.waitForTimeout(500)

      const summaryTab = page.locator('button[role="tab"]', {hasText: 'Summary'})
      await summaryTab.click()
      await page.waitForTimeout(500)

      await snippetsTab.click()
      await page.waitForTimeout(500)

      await expect(titleInput).toHaveValue('Test State Persistence')
    })
  })
})
