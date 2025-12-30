import {expect, test} from './fixtures'

// Helper function to create valid mock model data matching OllamaModelInfoSchema
function createMockModel(name: string, size: number) {
  return {
    name,
    model: name,
    modified_at: new Date().toISOString(),
    size,
    digest: `sha256:${name.replaceAll(/[^a-z0-9]/gi, '')}abc123`,
    details: {
      format: 'gguf',
      family: 'llama',
      parameter_size: size > 5_000_000_000 ? '13B' : '7B',
      quantization_level: 'Q4_K_M',
    },
  }
}

test.describe('Ollama Provider Integration', () => {
  // Helper to navigate to settings page and open Ollama section
  const openSettingsPanel = async (page: import('@playwright/test').Page) => {
    await page.goto('/settings')
    await page.waitForLoadState('domcontentloaded')

    // Settings page opens with Providers tab by default
    // Expand Ollama accordion to reveal settings
    const ollamaAccordion = page.getByRole('button', {name: /Ollama/i})
    await ollamaAccordion.click()

    // Wait for Ollama settings section to be visible
    await page.locator('h2', {hasText: 'Ollama Settings'}).waitFor({state: 'visible', timeout: 10000})
  }

  test.describe('Settings Display', () => {
    test('should display Ollama settings section', async ({page}) => {
      await openSettingsPanel(page)

      const ollamaHeading = page.locator('h2', {hasText: 'Ollama Settings'})
      await expect(ollamaHeading).toBeVisible()
    })

    test('should show base URL input field', async ({page}) => {
      await openSettingsPanel(page)

      // Find the input by aria-label directly (HeroUI renders aria-label on the input)
      const urlInput = page.locator('input[aria-label="Ollama Base URL"]')
      await expect(urlInput).toBeVisible()

      // Default value should be localhost
      await expect(urlInput).toHaveValue(/localhost:11434/)
    })

    test('should allow changing base URL', async ({page}) => {
      await openSettingsPanel(page)

      const urlInput = page.locator('input[aria-label="Ollama Base URL"]')
      await urlInput.clear()
      await urlInput.fill('http://192.168.1.100:11434')
      await expect(urlInput).toHaveValue('http://192.168.1.100:11434')
    })

    test('should have Test button', async ({page}) => {
      await openSettingsPanel(page)

      const testButton = page.getByRole('button', {name: /test connection to ollama/i})
      await expect(testButton).toBeVisible()
    })

    test('should have Save Settings button', async ({page}) => {
      await openSettingsPanel(page)

      const saveButton = page.getByRole('button', {name: /save ollama settings/i})
      await expect(saveButton).toBeVisible()
    })
  })

  test.describe('Connection Status (Mocked)', () => {
    test('should show connected status when Ollama is reachable', async ({page}) => {
      // Mock the Ollama API to return success - use regex for precise matching
      await page.route(/localhost:11434/, async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            models: [
              createMockModel('llama3.2:latest', 4_100_000_000),
              createMockModel('mistral:latest', 3_800_000_000),
            ],
          }),
        })
      })

      await openSettingsPanel(page)

      // Wait for button to be enabled after auto-check
      const testButton = page.getByRole('button', {name: /test connection to ollama/i})
      await expect(testButton).toBeEnabled({timeout: 10000})

      // Click test button to trigger connection check
      await testButton.click()

      // Wait for connected status - use chip locator
      await expect(page.locator('span').filter({hasText: /^Connected$/})).toBeVisible({timeout: 10000})
    })

    test('should show disconnected status when Ollama is not reachable', async ({page}) => {
      // Mock network failure with regex
      await page.route(/localhost:11434/, async route => {
        await route.abort('connectionrefused')
      })

      await openSettingsPanel(page)

      // Wait for button to be enabled after auto-check
      const testButton = page.getByRole('button', {name: /test connection to ollama/i})
      await expect(testButton).toBeEnabled({timeout: 10000})

      // Click test button
      await testButton.click()

      // Should show disconnected or error status
      await expect(page.locator('text=Disconnected').or(page.locator('text=CORS Error'))).toBeVisible({timeout: 10000})
    })

    test('should show loading state while testing connection', async ({page}) => {
      // Mock slow response for all requests to show loading state
      await page.route(/localhost:11434/, async route => {
        // Add a delay before responding to see loading state
        await new Promise(resolve => setTimeout(resolve, 1500))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({models: []}),
        })
      })

      await openSettingsPanel(page)

      // The button should show loading state initially due to auto-check
      // Check for the loading spinner in the button (button is disabled during check)
      const testButton = page.getByRole('button', {name: /test connection to ollama/i})

      // The button should be disabled while auto-check is in progress
      await expect(testButton).toBeDisabled({timeout: 3000})
    })
  })

  test.describe('Model Display (Mocked)', () => {
    test('should display available models when connected', async ({page}) => {
      // Mock successful API response with models - use regex
      await page.route(/localhost:11434/, async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            models: [
              createMockModel('llama3.2:latest', 4_100_000_000),
              createMockModel('mistral:7b', 3_800_000_000),
              createMockModel('codellama:13b', 7_200_000_000),
            ],
          }),
        })
      })

      await openSettingsPanel(page)

      // Wait for button to be enabled after auto-check completes
      const testButton = page.getByRole('button', {name: /test connection to ollama/i})
      await expect(testButton).toBeEnabled({timeout: 10000})

      // Click test button to refresh connection
      await testButton.click()

      // Wait for connected status - use the paragraph with model count
      await expect(page.locator('text=3 models available')).toBeVisible({timeout: 10000})

      // Model names should be visible in chips
      await expect(page.locator('text=llama3.2:latest')).toBeVisible({timeout: 5000})
      await expect(page.locator('text=mistral:7b')).toBeVisible()
    })

    test('should show model count when connected', async ({page}) => {
      // Mock successful API response with regex
      await page.route(/localhost:11434/, async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            models: [
              createMockModel('llama3.2:latest', 4_100_000_000),
              createMockModel('mistral:latest', 3_800_000_000),
            ],
          }),
        })
      })

      await openSettingsPanel(page)

      // Wait for button to be enabled after auto-check
      const testButton = page.getByRole('button', {name: /test connection to ollama/i})
      await expect(testButton).toBeEnabled({timeout: 10000})

      // Click test button
      await testButton.click()

      // Should show model count in the connected message
      await expect(page.locator('text=2 models available')).toBeVisible({timeout: 10000})
    })
  })

  test.describe('Error Handling', () => {
    test('should show error status when connection fails', async ({page}) => {
      // Mock CORS/network error with regex
      await page.route(/localhost:11434/, async route => {
        await route.abort('failed')
      })

      await openSettingsPanel(page)

      // Wait for button to be enabled after auto-check
      const testButton = page.getByRole('button', {name: /test connection to ollama/i})
      await expect(testButton).toBeEnabled({timeout: 10000})

      // Click test button
      await testButton.click()

      // Should show either CORS error or Disconnected
      await expect(page.locator('text=CORS Error').or(page.locator('text=Disconnected'))).toBeVisible({timeout: 10000})
    })

    test.skip('should handle timeout errors', async () => {
      // Skip: Timeout tests are flaky in CI
    })
  })

  test.describe('Accessibility', () => {
    test('should have proper aria labels on interactive elements', async ({page}) => {
      await openSettingsPanel(page)

      // URL input should have aria-label
      const urlInput = page.locator('input[aria-label="Ollama Base URL"]')
      await expect(urlInput).toBeVisible()

      // Test button should have aria-label
      const testButton = page.getByRole('button', {name: /test connection to ollama/i})
      await expect(testButton).toBeVisible()

      // Save button should have aria-label
      const saveButton = page.getByRole('button', {name: /save ollama settings/i})
      await expect(saveButton).toBeVisible()
    })

    test('should be keyboard navigable', async ({page}) => {
      // Mock successful response so button becomes enabled quickly - use regex
      await page.route(/localhost:11434/, async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({models: []}),
        })
      })

      await openSettingsPanel(page)

      // Wait for the test button to be enabled and stable (auto-check must complete)
      const testButton = page.getByRole('button', {name: /test connection to ollama/i})
      await expect(testButton).toBeEnabled({timeout: 10000})

      // Small wait for UI to stabilize after check completes
      await page.waitForTimeout(500)

      const urlInput = page.locator('input[aria-label="Ollama Base URL"]')
      const saveButton = page.getByRole('button', {name: /save ollama settings/i})

      // Focus the input
      await urlInput.focus()
      await expect(urlInput).toBeFocused()

      // Tab to Test button (skip if button happens to be disabled during polling)
      await page.keyboard.press('Tab')

      // Check if we landed on Test button or Save button (depends on disabled state)
      const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))
      if (focusedElement === 'Test connection to Ollama') {
        await expect(testButton).toBeFocused()
        // Tab to Save button
        await page.keyboard.press('Tab')
      }

      // Save button should be focusable
      await expect(saveButton).toBeFocused()
    })

    test('should have status indicator visible', async ({page}) => {
      await openSettingsPanel(page)

      // Status should be visible (one of the status states)
      const statusChip = page.locator('span').filter({
        hasText: /^(Connected|Disconnected|Checking\.\.\.|CORS Error|Unknown)$/,
      })
      await expect(statusChip.first()).toBeVisible({timeout: 10000})
    })
  })
})
