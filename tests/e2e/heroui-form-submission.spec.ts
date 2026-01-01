import {expect, test} from './fixtures'
import {GPTDataFactory} from './utils/test-data-factory'

test.describe('HeroUI Form Submission', () => {
  test('should successfully submit valid GPT creation form', async ({gptEditorPage}) => {
    await gptEditorPage.navigateToNew()
    const testGPT = GPTDataFactory.createBasicGPT()

    await gptEditorPage.fillBasicConfiguration(testGPT.name, testGPT.description, testGPT.systemPrompt)
    await gptEditorPage.saveGPT()

    expect(await gptEditorPage.getGPTName()).toBe(testGPT.name)
  })

  test('should show validation errors for empty required fields', async ({gptEditorPage}) => {
    await gptEditorPage.navigateToNew()

    // Clear the default values and blur to trigger validation
    await gptEditorPage.nameInput.clear()
    await gptEditorPage.nameInput.blur()
    await gptEditorPage.descriptionInput.clear()
    await gptEditorPage.descriptionInput.blur()
    await gptEditorPage.systemPromptTextarea.clear()
    await gptEditorPage.systemPromptTextarea.blur()

    // Wait for validation to run (validation timing is set to 'blur')
    await gptEditorPage.getPage().waitForTimeout(500)

    await expect(async () => {
      const hasErrors = await gptEditorPage.hasValidationErrors()
      expect(hasErrors).toBe(true)
    }).toPass({timeout: 2000})

    expect(await gptEditorPage.hasFieldError('name')).toBe(true)
    expect(await gptEditorPage.hasFieldError('description')).toBe(true)
    expect(await gptEditorPage.hasFieldError('systemPrompt')).toBe(true)
  })

  test('should clear validation errors when form is corrected', async ({gptEditorPage}) => {
    await gptEditorPage.navigateToNew()

    // Clear the name field and blur to trigger validation error
    await gptEditorPage.nameInput.clear()
    await gptEditorPage.nameInput.blur()

    await expect(async () => {
      expect(await gptEditorPage.hasFieldError('name')).toBe(true)
    }).toPass({timeout: 2000})

    const testGPT = GPTDataFactory.createBasicGPT()
    await gptEditorPage.fillInput(gptEditorPage.nameInput, testGPT.name)
    await gptEditorPage.nameInput.blur()

    await expect(async () => {
      expect(await gptEditorPage.hasFieldError('name')).toBe(false)
    }).toPass({timeout: 2000})
  })

  test('should handle form data persistence during editing', async ({gptEditorPage}) => {
    await gptEditorPage.navigateToNew()
    const testGPT = GPTDataFactory.createBasicGPT()

    await gptEditorPage.fillBasicConfiguration(testGPT.name, testGPT.description, testGPT.systemPrompt)

    expect(await gptEditorPage.getFieldValue('name')).toBe(testGPT.name)
    expect(await gptEditorPage.getFieldValue('description')).toBe(testGPT.description)
    expect(await gptEditorPage.getFieldValue('systemPrompt')).toBe(testGPT.systemPrompt)
  })

  test('should handle tab navigation without data loss', async ({gptEditorPage}) => {
    await gptEditorPage.navigateToNew()
    const testGPT = GPTDataFactory.createBasicGPT()

    await gptEditorPage.fillBasicConfiguration(testGPT.name, testGPT.description, testGPT.systemPrompt)

    const knowledgeTab = gptEditorPage.getPage().locator('[role="tab"]:has-text("Knowledge")')
    await expect(knowledgeTab).toBeVisible()
    await knowledgeTab.click()

    // The new layout uses different tab names - General instead of Edit
    const generalTab = gptEditorPage.getPage().locator('[role="tab"]:has-text("General")')
    await expect(generalTab).toBeVisible()
    await generalTab.click()

    expect(await gptEditorPage.getFieldValue('name')).toBe(testGPT.name)
  })
})
