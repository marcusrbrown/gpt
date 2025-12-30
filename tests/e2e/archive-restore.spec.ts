import {expect, test} from './fixtures'
import {GPTDataFactory} from './utils/test-data-factory'

test.describe('GPT Archive and Restore Flow', () => {
  test.beforeEach(async ({homePage}) => {
    await homePage.navigate()
    await homePage.clearAppStorage()
    await homePage.reload()
  })

  test('should archive a GPT and filter by archived status', async ({gptEditorPage, homePage, page}) => {
    const testGPT = GPTDataFactory.createBasicGPT({name: 'GPT to Archive'})

    await gptEditorPage.navigateToNew()
    await gptEditorPage.fillBasicConfiguration(testGPT.name, testGPT.description, testGPT.systemPrompt)
    await gptEditorPage.saveGPT()

    await homePage.navigate()
    await homePage.waitForGPTCards()

    const userGPTNames = await homePage.getUserGPTNames()
    expect(userGPTNames).toContain(testGPT.name)

    const gptCard = page.locator('[data-testid="user-gpt-card"]').filter({hasText: testGPT.name})
    const menuButton = gptCard.getByRole('button', {name: 'GPT actions'})
    await expect(menuButton).toBeVisible()

    // HeroUI Dropdown requires pointer events - use dispatchEvent
    await menuButton.dispatchEvent('click')

    // Wait for dropdown item to be visible and click it quickly
    const archiveOption = page.locator('[data-testid="archive-gpt"]')
    await expect(archiveOption).toBeVisible({timeout: 10000})
    await archiveOption.click({force: true})

    const confirmButton = page.locator('[data-testid="confirm-archive"]')
    if (await confirmButton.isVisible()) {
      await confirmButton.click()
    }

    await page.waitForTimeout(500)

    const activeGPTNames = await homePage.getUserGPTNames()
    expect(activeGPTNames).not.toContain(testGPT.name)

    const archivedTab = page.locator('[data-testid="archived-tab"]')
    if (await archivedTab.isVisible()) {
      await archivedTab.click()
      await page.waitForTimeout(300)

      const archivedCards = page.locator('[data-testid="user-gpt-card"]')
      const archivedCount = await archivedCards.count()
      expect(archivedCount).toBeGreaterThan(0)
    }
  })

  test('should restore an archived GPT', async ({gptEditorPage, homePage, page}) => {
    const testGPT = GPTDataFactory.createBasicGPT({name: 'GPT to Restore'})

    await gptEditorPage.navigateToNew()
    await gptEditorPage.fillBasicConfiguration(testGPT.name, testGPT.description, testGPT.systemPrompt)
    await gptEditorPage.saveGPT()

    await homePage.navigate()
    await homePage.waitForGPTCards()

    const gptCard = page.locator('[data-testid="user-gpt-card"]').filter({hasText: testGPT.name})
    const menuButton = gptCard.getByRole('button', {name: 'GPT actions'})
    await expect(menuButton).toBeVisible()
    await menuButton.dispatchEvent('click')

    const archiveOption = page.locator('[data-testid="archive-gpt"]')
    await expect(archiveOption).toBeVisible({timeout: 10000})
    await archiveOption.click({force: true})

    const confirmArchive = page.locator('[data-testid="confirm-archive"]')
    if (await confirmArchive.isVisible()) {
      await confirmArchive.click()
    }

    await page.waitForTimeout(500)

    const archivedTab = page.locator('[data-testid="archived-tab"]')
    if (await archivedTab.isVisible()) {
      await archivedTab.click()
      await page.waitForTimeout(300)

      const archivedCard = page.locator('[data-testid="user-gpt-card"]').filter({hasText: testGPT.name})
      const restoreMenuButton = archivedCard.getByRole('button', {name: 'GPT actions'})
      await expect(restoreMenuButton).toBeVisible()
      await restoreMenuButton.dispatchEvent('click')

      const restoreOption = page.locator('[data-testid="restore-gpt"]')
      await expect(restoreOption).toBeVisible({timeout: 10000})
      await restoreOption.click({force: true})

      await page.waitForTimeout(500)

      const activeTab = page.locator('[data-testid="active-tab"]')
      if (await activeTab.isVisible()) {
        await activeTab.click()
        await page.waitForTimeout(300)
      }

      const restoredNames = await homePage.getUserGPTNames()
      expect(restoredNames).toContain(testGPT.name)
    }
  })

  test('should permanently delete an archived GPT', async ({gptEditorPage, homePage, page}) => {
    const testGPT = GPTDataFactory.createBasicGPT({name: 'GPT to Delete Permanently'})

    await gptEditorPage.navigateToNew()
    await gptEditorPage.fillBasicConfiguration(testGPT.name, testGPT.description, testGPT.systemPrompt)
    await gptEditorPage.saveGPT()

    await homePage.navigate()
    await homePage.waitForGPTCards()

    const gptCard = page.locator('[data-testid="user-gpt-card"]').filter({hasText: testGPT.name})
    const menuButton = gptCard.getByRole('button', {name: 'GPT actions'})
    await expect(menuButton).toBeVisible()
    await menuButton.dispatchEvent('click')

    const archiveOption = page.locator('[data-testid="archive-gpt"]')
    await expect(archiveOption).toBeVisible({timeout: 10000})
    await archiveOption.click({force: true})

    const confirmArchive = page.locator('[data-testid="confirm-archive"]')
    if (await confirmArchive.isVisible()) {
      await confirmArchive.click()
    }

    await page.waitForTimeout(500)

    const archivedTab = page.locator('[data-testid="archived-tab"]')
    if (await archivedTab.isVisible()) {
      await archivedTab.click()
      await page.waitForTimeout(300)

      const archivedCard = page.locator('[data-testid="user-gpt-card"]').filter({hasText: testGPT.name})
      const deleteMenuButton = archivedCard.getByRole('button', {name: 'GPT actions'})
      await expect(deleteMenuButton).toBeVisible()
      await deleteMenuButton.dispatchEvent('click')

      const deleteOption = page.locator('[data-testid="delete-gpt"]')
      await expect(deleteOption).toBeVisible({timeout: 10000})
      await deleteOption.click({force: true})

      const confirmDelete = page.locator('[data-testid="confirm-delete"]')
      if (await confirmDelete.isVisible()) {
        await confirmDelete.click()
      }

      await page.waitForTimeout(500)

      const remainingCards = page.locator('[data-testid="user-gpt-card"]').filter({hasText: testGPT.name})
      expect(await remainingCards.count()).toBe(0)
    }
  })
})
