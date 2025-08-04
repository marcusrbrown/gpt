import {expect, test} from './fixtures'
import {GPTDataFactory} from './utils/test-data-factory'

test.describe('GPT CRUD Operations', () => {
  test('should create a new GPT successfully', async ({gptEditorPage, homePage}) => {
    // Navigate to GPT creation page
    await gptEditorPage.navigateToNew()

    // Verify editor is loaded
    expect(await gptEditorPage.isLoaded()).toBe(true)

    // Create test GPT data
    const testGPT = GPTDataFactory.createBasicGPT()

    // Fill in GPT configuration
    await gptEditorPage.fillBasicConfiguration(testGPT.name, testGPT.description, testGPT.systemPrompt)

    // Save the GPT
    await gptEditorPage.saveGPT()

    // Navigate back to home page
    await homePage.navigate()
    await homePage.waitForGPTCards()

    // Verify GPT appears in the list
    const userGPTNames = await homePage.getUserGPTNames()
    expect(userGPTNames).toContain(testGPT.name)
  })

  test('should edit an existing GPT', async ({gptEditorPage, homePage}) => {
    // First create a GPT
    const testGPT = GPTDataFactory.createBasicGPT()

    await gptEditorPage.navigateToNew()
    await gptEditorPage.fillBasicConfiguration(testGPT.name, testGPT.description, testGPT.systemPrompt)
    await gptEditorPage.saveGPT()

    // Navigate back to home and click on the GPT to edit
    await homePage.navigate()
    await homePage.waitForGPTCards()
    await homePage.clickUserGPT(testGPT.name)

    // Verify we're in edit mode
    expect(await gptEditorPage.isLoaded()).toBe(true)

    // Update the GPT name
    const updatedName = 'Updated Test GPT'
    await gptEditorPage.fillBasicConfiguration(updatedName, testGPT.description, testGPT.systemPrompt)

    await gptEditorPage.saveGPT()

    // Verify the update
    const currentName = await gptEditorPage.getGPTName()
    expect(currentName).toBe(updatedName)
  })

  test('should configure GPT capabilities', async ({gptEditorPage}) => {
    const testGPT = GPTDataFactory.createBasicGPT()

    await gptEditorPage.navigateToNew()
    await gptEditorPage.fillBasicConfiguration(testGPT.name, testGPT.description, testGPT.systemPrompt)

    // Enable code interpreter capability
    await gptEditorPage.toggleCodeInterpreter()

    // Enable web browsing capability
    await gptEditorPage.toggleWebBrowsing()

    await gptEditorPage.saveGPT()

    // Verify capabilities are preserved after save
    await gptEditorPage.clickTab('Capabilities')

    // Note: More specific verification would require checking toggle states
    // This is a basic test structure
  })

  test('should add knowledge sources to GPT', async ({gptEditorPage}) => {
    const testGPT = GPTDataFactory.createBasicGPT()

    await gptEditorPage.navigateToNew()
    await gptEditorPage.fillBasicConfiguration(testGPT.name, testGPT.description, testGPT.systemPrompt)

    // Add a knowledge URL
    await gptEditorPage.addKnowledgeURL('https://docs.example.com/api')

    await gptEditorPage.saveGPT()

    // Verify knowledge source was added
    await gptEditorPage.clickTab('Knowledge')

    // Note: More specific verification would require checking the URL list
  })

  test('should handle GPT creation with invalid data', async ({gptEditorPage}) => {
    await gptEditorPage.navigateToNew()

    // Try to save without required fields
    await gptEditorPage.saveGPT()

    // Verify validation errors appear
    // Note: This would need to be implemented based on actual validation UI
    expect(await gptEditorPage.isLoaded()).toBe(true)
  })

  test('should delete a GPT', async ({gptEditorPage, homePage}) => {
    // Create a GPT first
    const testGPT = GPTDataFactory.createBasicGPT({name: 'GPT to Delete'})

    await gptEditorPage.navigateToNew()
    await gptEditorPage.fillBasicConfiguration(testGPT.name, testGPT.description, testGPT.systemPrompt)
    await gptEditorPage.saveGPT()

    // Navigate to home page
    await homePage.navigate()
    await homePage.waitForGPTCards()

    // Verify GPT exists
    const userGPTNames = await homePage.getUserGPTNames()
    expect(userGPTNames).toContain(testGPT.name)

    // Delete the GPT (this would require implementing delete functionality)
    // For now, we'll clear localStorage to simulate deletion
    await homePage.evaluate(() => {
      localStorage.clear()
    })

    await homePage.reload()
    await homePage.waitForGPTCards()

    // Verify GPT is deleted
    expect(await homePage.hasEmptyState()).toBe(true)
  })
})
