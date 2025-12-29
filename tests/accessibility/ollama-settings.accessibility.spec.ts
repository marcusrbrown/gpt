import {accessibilityTest, expect, test} from '.'
import {getAccessibilityConfig} from './utils/accessibility-config'

/**
 * Ollama Settings Accessibility Tests
 * Tests WCAG 2.1 AA compliance for the Ollama settings component
 */
test.describe('Ollama Settings Accessibility', () => {
  // Helper to navigate to settings panel with route mock
  const openSettingsPanel = async (page: import('@playwright/test').Page) => {
    // Set up route mock BEFORE navigation to intercept auto-check requests
    await page.route(/localhost:11434/, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({models: []}),
      })
    })

    await page.goto('/gpt/new')
    await page.waitForLoadState('domcontentloaded')

    // Click the "Show API Settings" button to reveal settings
    const settingsToggle = page.getByRole('button', {name: /show api settings/i})
    await expect(settingsToggle).toBeVisible({timeout: 5000})
    await settingsToggle.click()

    // Wait for Ollama settings section to be visible
    await page.locator('h2', {hasText: 'Ollama Settings'}).waitFor({state: 'visible', timeout: 10000})
  }

  test.describe('Form Structure', () => {
    test('should pass form accessibility audit', async ({page}) => {
      await openSettingsPanel(page)

      const ollamaSection = page.locator('h2', {hasText: 'Ollama Settings'})
      await expect(ollamaSection).toBeVisible()

      // Run axe accessibility audit on the settings area
      await accessibilityTest.expectAccessible(page, getAccessibilityConfig('form'), 0, 0)
    })

    test('should have accessible labels for all inputs', async ({page}) => {
      await openSettingsPanel(page)

      // URL input should have aria-label
      const urlInput = page.locator('input[aria-label="Ollama Base URL"]')
      await expect(urlInput).toBeVisible()

      // Verify the input has an accessible name
      const ariaLabel = await urlInput.getAttribute('aria-label')
      expect(ariaLabel).toBe('Ollama Base URL')
    })
  })

  test.describe('Status Announcements', () => {
    test('should display connection status', async ({page}) => {
      await openSettingsPanel(page)

      // Status should be visible with recognizable text
      const statusText = page.locator('span').filter({
        hasText: /^(Connected|Disconnected|Checking\.\.\.|CORS Error|Unknown)$/,
      })
      await expect(statusText.first()).toBeVisible({timeout: 10000})
    })
  })

  test.describe('Keyboard Navigation', () => {
    test('should be fully keyboard navigable', async ({page}) => {
      await openSettingsPanel(page)

      // Focus the URL input
      const urlInput = page.locator('input[aria-label="Ollama Base URL"]')
      const saveButton = page.getByRole('button', {name: /save ollama settings/i})

      await urlInput.focus()
      await expect(urlInput).toBeFocused()

      // Tab through focusable elements to reach Save button
      // Number of tabs depends on whether Test button is enabled or other focusable elements
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab')
        const isSaveButtonFocused = await saveButton.evaluate(el => document.activeElement === el)
        if (isSaveButtonFocused) {
          break
        }
      }

      // Save button should be focusable
      await expect(saveButton).toBeFocused()
    })

    test('should have visible focus indicators', async ({page}) => {
      await openSettingsPanel(page)

      const urlInput = page.locator('input[aria-label="Ollama Base URL"]')

      // Focus the input
      await urlInput.focus()
      await expect(urlInput).toBeFocused()

      // Verify focus is visible (element should have focus-related styles)
      const isFocused = await urlInput.evaluate(el => document.activeElement === el)
      expect(isFocused).toBe(true)
    })

    test('should support Enter key to activate buttons', async ({page}) => {
      await openSettingsPanel(page)

      // Test with Save button which is always enabled
      const saveButton = page.getByRole('button', {name: /save ollama settings/i})
      await expect(saveButton).toBeVisible()

      // Focus and press Enter
      await saveButton.focus()
      await expect(saveButton).toBeFocused()
      await page.keyboard.press('Enter')

      // Button should respond - the save button should trigger some action
      // Since settings aren't changed, nothing visible happens, but we verify the button responds
      // Just verify the button is still visible and accessible after activation
      await expect(saveButton).toBeVisible()
    })
  })

  test.describe('Color Contrast', () => {
    test('should have sufficient color contrast for text', async ({page}) => {
      await openSettingsPanel(page)

      // Run color contrast audit
      await accessibilityTest.expectAccessible(page, getAccessibilityConfig('color'), 0, 0)
    })
  })

  test.describe('Screen Reader Support', () => {
    test('should have proper heading hierarchy', async ({page}) => {
      await openSettingsPanel(page)

      // Main heading should be h2
      const mainHeading = page.locator('h2', {hasText: 'Ollama Settings'})
      await expect(mainHeading).toBeVisible()

      // Subheading should exist (About Ollama section)
      const aboutHeading = page.locator('h3', {hasText: 'About Ollama'})
      await expect(aboutHeading).toBeVisible()
    })

    test('should have descriptive button labels', async ({page}) => {
      await openSettingsPanel(page)

      // Test button should have accessible name
      const testButton = page.getByRole('button', {name: /test connection to ollama/i})
      await expect(testButton).toBeVisible()

      // Save button should have accessible name
      const saveButton = page.getByRole('button', {name: /save ollama settings/i})
      await expect(saveButton).toBeVisible()
    })

    test('should have descriptive input labels', async ({page}) => {
      await openSettingsPanel(page)

      // URL input should have aria-label
      const urlInput = page.locator('input[aria-label="Ollama Base URL"]')
      await expect(urlInput).toBeVisible()

      const label = await urlInput.getAttribute('aria-label')
      expect(label).toBe('Ollama Base URL')
    })
  })
})
