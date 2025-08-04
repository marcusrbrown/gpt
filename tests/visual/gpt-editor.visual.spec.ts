import type {Page} from '@playwright/test'
import type {VisualTestHelper} from './utils/visual-test-helper'
import {visualTest, VisualTestData} from './fixtures'

visualTest.describe('GPT Editor Visual Tests', () => {
  visualTest.beforeEach(async ({page}: {page: Page}) => {
    // Navigate to GPT editor page for new GPT
    await page.goto('/gpt/new')
    await page.waitForLoadState('networkidle')
  })

  visualTest('GPT editor - empty form state', async ({visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
    await visualHelper.takeFullPageScreenshot('gpt-editor-empty')
  })

  visualTest(
    'GPT editor - filled form state',
    async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
      // Fill out the form with test data
      await page.fill('input[name="name"]', 'Test Assistant')
      await page.fill('input[name="description"]', 'A sample assistant for testing purposes')
      await page.fill('textarea[name="systemPrompt"]', 'You are a helpful test assistant.')

      await visualHelper.takeFullPageScreenshot('gpt-editor-filled')
    },
  )

  visualTest(
    'GPT editor - configuration tabs',
    async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
      // Test each tab
      const tabs = ['Basic', 'Capabilities', 'Knowledge', 'Tools']

      for (const tabName of tabs) {
        await page.click(`[role="tab"]:has-text("${tabName}")`)
        await page.waitForTimeout(300) // Wait for tab transition
        await visualHelper.takeFullPageScreenshot(`gpt-editor-${tabName.toLowerCase()}-tab`)
      }
    },
  )

  visualTest(
    'GPT editor - capabilities configuration',
    async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
      // Navigate to capabilities tab
      await page.click('[role="tab"]:has-text("Capabilities")')

      // Enable some capabilities
      await page.check('input[name="codeInterpreter"]')
      await page.check('input[name="webBrowsing"]')

      await visualHelper.takeFullPageScreenshot('gpt-editor-capabilities-enabled')
    },
  )

  visualTest(
    'GPT editor - responsive layout',
    async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
      // Fill form with data
      await page.fill('input[name="name"]', 'Responsive Test')
      await page.fill('input[name="description"]', 'Testing responsive layout')

      await visualHelper.takeResponsiveScreenshots('gpt-editor-responsive')
    },
  )

  visualTest('GPT editor - dark theme', async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
    // Fill form with data
    await page.fill('input[name="name"]', 'Dark Theme Test')
    await page.fill('input[name="description"]', 'Testing dark theme')

    await visualHelper.setTheme('dark')
    await visualHelper.takeFullPageScreenshot('gpt-editor-dark-theme')
  })

  visualTest(
    'GPT editor - validation errors',
    async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
      // Try to save without required fields
      await page.click('button[type="submit"]')

      // Wait for validation errors to appear
      await page.waitForSelector('[data-testid="error-message"]', {timeout: 5000}).catch(async () => {
        // If no error message selector, wait for any validation styling
        await page.waitForTimeout(1000)
      })

      await visualHelper.takeFullPageScreenshot('gpt-editor-validation-errors')
    },
  )

  visualTest(
    'GPT editor component - form sections',
    async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
      // Screenshot individual form sections
      const formSections = [
        '[data-testid="basic-info-section"]',
        '[data-testid="system-prompt-section"]',
        '.form-section', // Fallback selector
      ]

      for (const [index, selector] of formSections.entries()) {
        const section = page.locator(selector).first()
        if ((await section.count()) > 0) {
          await visualHelper.takeComponentScreenshot(section, `gpt-editor-section-${index + 1}`)
        }
      }
    },
  )
})

visualTest.describe('GPT Editor - Edit Mode Visual Tests', () => {
  visualTest.beforeEach(async ({page}: {page: Page}) => {
    // Create a mock GPT and navigate to edit mode
    const mockGPT = VisualTestData.createMockGPT({
      id: 'edit-test-gpt',
      name: 'Edit Test GPT',
      description: 'GPT for testing edit mode visuals',
      systemPrompt: 'You are an assistant used for testing edit mode.',
    })

    await page.evaluate((gpt: any) => {
      localStorage.setItem('gpt-configurations', JSON.stringify([gpt]))
    }, mockGPT)

    await page.goto('/gpt/edit/edit-test-gpt')
    await page.waitForLoadState('networkidle')
  })

  visualTest(
    'GPT editor - edit mode with existing data',
    async ({visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
      await visualHelper.takeFullPageScreenshot('gpt-editor-edit-mode')
    },
  )

  visualTest(
    'GPT editor - edit mode form modifications',
    async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
      // Modify existing data
      await page.fill('input[name="name"]', 'Modified Test GPT')
      await page.fill('input[name="description"]', 'This GPT has been modified for testing')

      await visualHelper.takeFullPageScreenshot('gpt-editor-edit-modified')
    },
  )
})
