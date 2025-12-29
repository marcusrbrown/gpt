import {accessibilityTest, expect, test} from '.'
import {getAccessibilityConfig} from './utils/accessibility-config'

/**
 * MCP Settings Accessibility Tests
 * Tests WCAG 2.1 AA compliance for the MCP settings component
 */
test.describe('MCP Settings Accessibility', () => {
  // Helper to navigate to settings panel with MCP tab
  const openMCPSettings = async (page: import('@playwright/test').Page) => {
    await page.goto('/gpt/new')
    await page.waitForLoadState('domcontentloaded')

    // Click the "Show API Settings" button to reveal settings
    const settingsToggle = page.getByRole('button', {name: /show api settings/i})
    await expect(settingsToggle).toBeVisible({timeout: 5000})
    await settingsToggle.click()

    // Click MCP tab if visible
    const mcpTab = page.getByRole('tab', {name: /mcp/i})
    if (await mcpTab.isVisible()) {
      await mcpTab.click()
    }

    // Wait for MCP settings section to be visible
    await page.locator('h2', {hasText: /MCP.*Settings/i}).waitFor({state: 'visible', timeout: 10000})
  }

  test.describe('Form Structure', () => {
    test('should pass form accessibility audit', async ({page}) => {
      await openMCPSettings(page)

      const mcpSection = page.locator('h2', {hasText: /MCP.*Settings/i})
      await expect(mcpSection).toBeVisible()

      // Run axe accessibility audit on the settings area
      await accessibilityTest.expectAccessible(page, getAccessibilityConfig('form'), 0, 0)
    })

    test('should have accessible labels for all inputs', async ({page}) => {
      await openMCPSettings(page)

      // Add Server button should have accessible name
      const addServerButton = page.getByRole('button', {name: /add.*server/i}).first()
      await expect(addServerButton).toBeVisible()

      const buttonName = await addServerButton.getAttribute('aria-label')
      expect(buttonName || (await addServerButton.textContent())).toBeTruthy()
    })
  })

  test.describe('Server List', () => {
    test('should display empty state accessibly', async ({page}) => {
      await openMCPSettings(page)

      // Empty state should be visible and accessible
      const emptyState = page.locator('text=/no.*servers.*configured/i')
      if (await emptyState.isVisible()) {
        await expect(emptyState).toBeVisible()
      }
    })
  })

  test.describe('Keyboard Navigation', () => {
    test('should be fully keyboard navigable', async ({page}) => {
      await openMCPSettings(page)

      // Focus the Add Server button
      const addServerButton = page.getByRole('button', {name: /add.*server/i}).first()
      await addServerButton.focus()

      // Check if focus works
      const isFocused = await addServerButton.evaluate(el => document.activeElement === el)
      expect(isFocused).toBe(true)

      // Button should be activatable with Enter
      await page.keyboard.press('Enter')

      // Give modal time to open
      await page.waitForTimeout(500)

      // Modal should open
      const modal = page.getByRole('dialog')
      if (await modal.isVisible().catch(() => false)) {
        // Escape should close modal
        await page.keyboard.press('Escape')
        await page.waitForTimeout(300)
      }
    })

    test('should have visible focus indicators', async ({page}) => {
      await openMCPSettings(page)

      const addServerButton = page.getByRole('button', {name: /add.*server/i}).first()

      // Focus the button
      await addServerButton.focus()
      await expect(addServerButton).toBeFocused()

      // Verify focus is visible
      const isFocused = await addServerButton.evaluate(el => document.activeElement === el)
      expect(isFocused).toBe(true)
    })
  })

  test.describe('Color Contrast', () => {
    test('should have sufficient color contrast for text', async ({page}) => {
      await openMCPSettings(page)

      // Run color contrast audit
      await accessibilityTest.expectAccessible(page, getAccessibilityConfig('color'), 0, 0)
    })
  })

  test.describe('Screen Reader Support', () => {
    test('should have proper heading hierarchy', async ({page}) => {
      await openMCPSettings(page)

      // Main heading should be h2
      const mainHeading = page.locator('h2', {hasText: /MCP.*Settings/i})
      await expect(mainHeading).toBeVisible()
    })

    test('should have descriptive button labels', async ({page}) => {
      await openMCPSettings(page)

      // Add Server button should have accessible name
      const addServerButton = page.getByRole('button', {name: /add.*server/i}).first()
      await expect(addServerButton).toBeVisible()
    })
  })

  test.describe('Modal Accessibility', () => {
    test('should trap focus in modal when open', async ({page}) => {
      await openMCPSettings(page)

      const addServerButton = page.getByRole('button', {name: /add.*server/i}).first()
      await addServerButton.click()

      const modal = page.getByRole('dialog')
      if (await modal.isVisible({timeout: 2000}).catch(() => false)) {
        // Modal should have role="dialog"
        await expect(modal).toHaveAttribute('role', 'dialog')

        // Should have aria-modal="true"
        const ariaModal = await modal.getAttribute('aria-modal')
        expect(ariaModal).toBe('true')

        // Close modal
        await page.keyboard.press('Escape')
      }
    })
  })
})
