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
    const menuButton = gptCard.locator('[aria-label="GPT actions"]')
    await menuButton.click()

    const archiveOption = page.locator('[data-testid="archive-gpt"]')
    await archiveOption.click()

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
    const menuButton = gptCard.locator('[aria-label="GPT actions"]')
    await menuButton.click()

    const archiveOption = page.locator('[data-testid="archive-gpt"]')
    await archiveOption.click()

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
      const restoreMenuButton = archivedCard.locator('[aria-label="GPT actions"]')
      await restoreMenuButton.click()

      const restoreOption = page.locator('[data-testid="restore-gpt"]')
      await restoreOption.click()

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
    const menuButton = gptCard.locator('[aria-label="GPT actions"]')
    await menuButton.click()

    const archiveOption = page.locator('[data-testid="archive-gpt"]')
    await archiveOption.click()

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
      const deleteMenuButton = archivedCard.locator('[aria-label="GPT actions"]')
      await deleteMenuButton.click()

      const deleteOption = page.locator('[data-testid="delete-gpt"]')
      await deleteOption.click()

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
