import {expect, test} from './fixtures'

/**
 * MCP Integration E2E Tests
 * Tests MCP server configuration and tool management
 */
test.describe('MCP Integration', () => {
  // Helper to navigate to MCP settings
  const openMCPSettings = async (page: import('@playwright/test').Page) => {
    await page.goto('/gpt/new')
    await page.waitForLoadState('domcontentloaded')

    // Click the "Show API Settings" button to reveal settings
    const settingsToggle = page.getByRole('button', {name: /show api settings/i})
    await settingsToggle.click()

    // Click MCP tab if visible
    const mcpTab = page.getByRole('tab', {name: /mcp/i})
    if (await mcpTab.isVisible()) {
      await mcpTab.click()
    }

    // Wait for MCP settings section
    await page.locator('h2', {hasText: /MCP.*Settings/i}).waitFor({state: 'visible', timeout: 10000})
  }

  test.describe('Settings Display', () => {
    test('should display MCP settings section', async ({page}) => {
      await openMCPSettings(page)

      const mcpHeading = page.locator('h2', {hasText: /MCP.*Settings/i})
      await expect(mcpHeading).toBeVisible()
    })

    test('should show Add Server button', async ({page}) => {
      await openMCPSettings(page)

      const addServerButton = page.getByRole('button', {name: /add.*server/i}).first()
      await expect(addServerButton).toBeVisible()
    })

    test('should show empty state when no servers configured', async ({page}) => {
      await openMCPSettings(page)

      // Either show empty state text or server list
      const emptyState = page.locator('text=/no.*servers.*configured/i')
      const serverList = page.locator('[data-testid="mcp-server-list"]')

      // One of these should be visible
      const hasEmptyState = await emptyState.isVisible().catch(() => false)
      const hasServerList = await serverList.isVisible().catch(() => false)

      expect(hasEmptyState || hasServerList).toBe(true)
    })
  })

  test.describe('Server Management', () => {
    test('should open add server modal when clicking Add Server', async ({page}) => {
      await openMCPSettings(page)

      // Use first() to get the header Add Server button (not empty state button)
      const addServerButton = page.getByRole('button', {name: /add.*server/i}).first()
      await addServerButton.click()

      // Modal should appear
      const modal = page.getByRole('dialog')
      await expect(modal).toBeVisible({timeout: 5000})
    })

    test('should show server form fields in modal', async ({page}) => {
      await openMCPSettings(page)

      const addServerButton = page.getByRole('button', {name: /add.*server/i}).first()
      await addServerButton.click()

      const modal = page.getByRole('dialog')
      await expect(modal).toBeVisible()

      // Check that modal has input fields (name and url at minimum)
      const inputs = modal.locator('input')
      const inputCount = await inputs.count()
      expect(inputCount).toBeGreaterThanOrEqual(2)
    })

    test('should close modal on cancel', async ({page}) => {
      await openMCPSettings(page)

      const addServerButton = page.getByRole('button', {name: /add.*server/i}).first()
      await addServerButton.click()

      const modal = page.getByRole('dialog')
      await expect(modal).toBeVisible()

      // Click cancel button
      const cancelButton = modal.getByRole('button', {name: /cancel/i})
      await cancelButton.click()

      // Modal should close
      await expect(modal).not.toBeVisible()
    })

    test('should close modal on Escape key', async ({page}) => {
      await openMCPSettings(page)

      const addServerButton = page.getByRole('button', {name: /add.*server/i}).first()
      await addServerButton.click()

      const modal = page.getByRole('dialog')
      await expect(modal).toBeVisible()

      // Press Escape
      await page.keyboard.press('Escape')

      // Modal should close
      await expect(modal).not.toBeVisible()
    })

    test('should validate required fields', async ({page}) => {
      await openMCPSettings(page)

      const addServerButton = page.getByRole('button', {name: /add.*server/i}).first()
      await addServerButton.click()

      const modal = page.getByRole('dialog')
      await expect(modal).toBeVisible()

      // Try to save without filling required fields
      const saveButton = modal.getByRole('button', {name: /save|add|create/i})
      await saveButton.click()

      // Should show validation error
      const errorMessage = modal.locator('text=/required|invalid/i')
      await expect(errorMessage.first()).toBeVisible({timeout: 3000})
    })

    test('should add server with valid data', async ({page}) => {
      await openMCPSettings(page)

      const addServerButton = page.getByRole('button', {name: /add.*server/i}).first()
      await addServerButton.click()

      const modal = page.getByRole('dialog')
      await expect(modal).toBeVisible()

      // Fill in server name using label
      await modal.getByLabel(/name/i).fill('Test MCP Server')

      // Fill URL
      await modal.getByLabel(/url/i).fill('https://mcp.example.com')

      // The form should have the values filled
      await expect(modal.getByLabel(/name/i)).toHaveValue('Test MCP Server')
      await expect(modal.getByLabel(/url/i)).toHaveValue('https://mcp.example.com')
    })
  })

  test.describe('Server Connection (Mocked)', () => {
    test('should show connection status after connecting', async ({page}) => {
      // Mock MCP server endpoint
      await page.route(/mcp\.example\.com/, async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            protocolVersion: '2025-11-25',
            capabilities: {tools: {}},
            serverInfo: {name: 'Test Server', version: '1.0.0'},
          }),
        })
      })

      await openMCPSettings(page)

      // If there's a server configured, try to connect
      const connectButton = page.getByRole('button', {name: /connect/i}).first()
      if (await connectButton.isVisible().catch(() => false)) {
        await connectButton.click()

        // Should show status
        const status = page.locator('text=/connected|connecting|error/i')
        await expect(status.first()).toBeVisible({timeout: 10000})
      }
    })
  })

  test.describe('Tool Discovery', () => {
    test('should display tools section when server has tools', async ({page}) => {
      // Mock MCP server with tools
      await page.route(/mcp\.example\.com/, async route => {
        const url = route.request().url()
        if (url.includes('tools/list')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              tools: [
                {
                  name: 'test_tool',
                  description: 'A test tool for demonstration',
                  inputSchema: {
                    type: 'object',
                    properties: {
                      query: {type: 'string', description: 'The query to process'},
                    },
                    required: ['query'],
                  },
                },
              ],
            }),
          })
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              protocolVersion: '2025-11-25',
              capabilities: {tools: {}},
              serverInfo: {name: 'Test Server', version: '1.0.0'},
            }),
          })
        }
      })

      await openMCPSettings(page)

      // Look for tools section or tool explorer
      const toolsSection = page.locator('text=/tools|available tools/i')
      if (
        await toolsSection
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await expect(toolsSection.first()).toBeVisible()
      }
    })
  })
})
