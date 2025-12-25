import {expect, test} from './fixtures'
import {GPTDataFactory} from './utils/test-data-factory'

test.describe('GPT CRUD Operations', () => {
  test('should create a new GPT successfully', async ({gptEditorPage, homePage}) => {
    await gptEditorPage.navigateToNew()
    expect(await gptEditorPage.isLoaded()).toBe(true)

    const testGPT = GPTDataFactory.createBasicGPT()
    await gptEditorPage.fillBasicConfiguration(testGPT.name, testGPT.description, testGPT.systemPrompt)
    await gptEditorPage.saveGPT()

    await homePage.navigate()
    await homePage.waitForGPTCards()

    const userGPTNames = await homePage.getUserGPTNames()
    expect(userGPTNames).toContain(testGPT.name)
  })

  test('should edit an existing GPT via edit link', async ({gptEditorPage, homePage, page}) => {
    const testGPT = GPTDataFactory.createBasicGPT()

    await gptEditorPage.navigateToNew()
    await gptEditorPage.fillBasicConfiguration(testGPT.name, testGPT.description, testGPT.systemPrompt)
    await gptEditorPage.saveGPT()

    await homePage.navigate()
    await homePage.waitForGPTCards()

    const gptCard = page.locator('[data-testid="user-gpt-card"]').filter({hasText: testGPT.name})
    const menuButton = gptCard.locator('[aria-label="GPT actions"]')
    await menuButton.click()

    const editOption = page.locator('[data-testid="edit-gpt"]')
    await expect(editOption).toBeVisible()
    await editOption.click()

    await page.waitForURL(/\/gpt\/edit\//)
    expect(await gptEditorPage.isLoaded()).toBe(true)

    const updatedName = 'Updated Test GPT'
    await gptEditorPage.fillBasicConfiguration(updatedName, testGPT.description, testGPT.systemPrompt)
    await gptEditorPage.saveGPT()

    const currentName = await gptEditorPage.getGPTName()
    expect(currentName).toBe(updatedName)
  })

  test('should handle GPT creation with invalid data', async ({gptEditorPage}) => {
    await gptEditorPage.navigateToNew()
    await gptEditorPage.saveGPT()
    expect(await gptEditorPage.isLoaded()).toBe(true)
  })

  test('should delete a GPT by clearing localStorage', async ({gptEditorPage, homePage}) => {
    const testGPT = GPTDataFactory.createBasicGPT({name: 'GPT to Delete'})

    await gptEditorPage.navigateToNew()
    await gptEditorPage.fillBasicConfiguration(testGPT.name, testGPT.description, testGPT.systemPrompt)
    await gptEditorPage.saveGPT()

    await homePage.navigate()
    await homePage.waitForGPTCards()

    const userGPTNames = await homePage.getUserGPTNames()
    expect(userGPTNames).toContain(testGPT.name)

    await homePage.clearAppStorage()

    await homePage.reload()
    await homePage.waitForGPTCards()

    expect(await homePage.hasEmptyState()).toBe(true)
  })
})
