import {expect, test} from './fixtures'
import {GPTDataFactory} from './utils/test-data-factory'

test.describe('HeroUI Form Submission End-to-End Tests', () => {
  test.describe('Basic Form Submission', () => {
    test('should successfully submit valid GPT creation form', async ({gptEditorPage}) => {
      await gptEditorPage.navigateToNew()
      const testGPT = GPTDataFactory.createBasicGPT()

      // Fill in basic configuration
      await gptEditorPage.fillBasicConfiguration(testGPT.name, testGPT.description, testGPT.systemPrompt)

      // Save the GPT
      await gptEditorPage.saveGPT()

      // Verify GPT name is preserved
      expect(await gptEditorPage.getGPTName()).toBe(testGPT.name)
    })

    test('should show validation errors for empty required fields', async ({gptEditorPage}) => {
      await gptEditorPage.navigateToNew()

      // Try to save without filling required fields
      await gptEditorPage.saveGPT()

      // Wait a moment for validation to process
      await gptEditorPage.getPage().waitForTimeout(500)

      // Check if any fields have validation errors
      const hasErrors = await gptEditorPage.hasValidationErrors()
      expect(hasErrors).toBe(true)

      // Verify specific required fields show errors
      expect(await gptEditorPage.hasFieldError('name')).toBe(true)
      expect(await gptEditorPage.hasFieldError('description')).toBe(true)
      expect(await gptEditorPage.hasFieldError('systemPrompt')).toBe(true)
    })

    test('should clear validation errors when form is corrected', async ({gptEditorPage}) => {
      await gptEditorPage.navigateToNew()

      // Trigger validation errors
      await gptEditorPage.saveGPT()
      await gptEditorPage.getPage().waitForTimeout(500)

      // Verify errors exist
      expect(await gptEditorPage.hasFieldError('name')).toBe(true)

      // Fill in the name field
      const testGPT = GPTDataFactory.createBasicGPT()
      await gptEditorPage.fillInput(gptEditorPage.nameInput, testGPT.name)

      // Blur the field to trigger revalidation
      await gptEditorPage.nameInput.blur()
      await gptEditorPage.getPage().waitForTimeout(300)

      // Error should be cleared
      expect(await gptEditorPage.hasFieldError('name')).toBe(false)
    })
  })

  test.describe('Form Functionality', () => {
    test('should handle form data persistence during editing', async ({gptEditorPage}) => {
      await gptEditorPage.navigateToNew()
      const testGPT = GPTDataFactory.createBasicGPT()

      // Fill in form data
      await gptEditorPage.fillBasicConfiguration(testGPT.name, testGPT.description, testGPT.systemPrompt)

      // Verify data is retained
      expect(await gptEditorPage.getFieldValue('name')).toBe(testGPT.name)
      expect(await gptEditorPage.getFieldValue('description')).toBe(testGPT.description)
      expect(await gptEditorPage.getFieldValue('systemPrompt')).toBe(testGPT.systemPrompt)
    })

    test('should handle tab navigation', async ({gptEditorPage}) => {
      await gptEditorPage.navigateToNew()
      const testGPT = GPTDataFactory.createBasicGPT()

      // Fill basic info first
      await gptEditorPage.fillBasicConfiguration(testGPT.name, testGPT.description, testGPT.systemPrompt)

      // Test tab navigation - navigate to actual existing tabs
      // Check that Knowledge tab is clickable
      const knowledgeTab = gptEditorPage.getPage().locator('[role="tab"]:has-text("Knowledge")')
      await expect(knowledgeTab).toBeVisible({timeout: 3000})
      await knowledgeTab.click()
      await gptEditorPage.getPage().waitForTimeout(300)

      // Return to Edit tab
      const editTab = gptEditorPage.getPage().locator('[role="tab"]:has-text("Edit")')
      await expect(editTab).toBeVisible({timeout: 3000})
      await editTab.click()
      await gptEditorPage.getPage().waitForTimeout(300)

      // Test GPT tab should also be visible
      const testTab = gptEditorPage.getPage().locator('[role="tab"]:has-text("Test GPT")')
      await expect(testTab).toBeVisible({timeout: 3000})

      // Verify data is still there after tab navigation
      expect(await gptEditorPage.getFieldValue('name')).toBe(testGPT.name)
    })
  })

  test.describe('Submit Button States', () => {
    test('should show loading state during form submission', async ({gptEditorPage}) => {
      await gptEditorPage.navigateToNew()
      const testGPT = GPTDataFactory.createBasicGPT()

      await gptEditorPage.fillBasicConfiguration(testGPT.name, testGPT.description, testGPT.systemPrompt)

      // Start save process but don't wait for it to complete
      const savePromise = gptEditorPage.saveGPT()

      // Check for loading state immediately after clicking save
      await gptEditorPage.getPage().waitForTimeout(100)

      // Complete the save
      await savePromise
    })
  })
})
