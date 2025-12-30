import {accessibilityTest, expect, test} from '.'
import {getAccessibilityConfig} from './utils/accessibility-config'

/**
 * Settings page accessibility tests
 * Tests the global settings interface for WCAG 2.1 AA compliance
 */
test.describe('Settings Page Accessibility', () => {
  test.beforeEach(async ({page}) => {
    // Navigate to settings page
    await page.goto('/settings')
    // Wait for page to load completely
    await page.waitForLoadState('networkidle')
  })

  test('should meet WCAG 2.1 AA standards', async ({page}) => {
    // Run comprehensive accessibility scan
    const summary = await accessibilityTest.expectAccessible(
      page,
      getAccessibilityConfig('standard'),
      0, // No critical violations allowed
      0, // No serious violations allowed
    )

    console.warn(`Settings page accessibility scan: ${summary.total} violations found`)
  })

  test('should have proper main landmark', async ({page}) => {
    // Verify main landmark is present
    const mainLandmark = page.locator('main')
    await expect(mainLandmark).toBeVisible()
    await expect(mainLandmark).toHaveCount(1)
  })

  test('should have accessible tabs navigation', async ({page}) => {
    await test.step('Test tab keyboard navigation', async () => {
      // Verify tablist role is present
      const tablist = page.locator('[role="tablist"]')
      await expect(tablist).toBeVisible()

      // Get all tabs
      const tabs = page.locator('[role="tab"]')
      const tabCount = await tabs.count()

      expect(tabCount).toBeGreaterThanOrEqual(4) // Providers, Integrations, Appearance, Data

      // Each tab should have proper attributes
      for (let i = 0; i < tabCount; i++) {
        const tab = tabs.nth(i)

        // Tab should have aria-selected attribute
        const ariaSelected = await tab.getAttribute('aria-selected')
        expect(ariaSelected === 'true' || ariaSelected === 'false').toBeTruthy()

        // Tab should have aria-controls pointing to panel
        const ariaControls = await tab.getAttribute('aria-controls')
        expect(ariaControls).toBeTruthy()
      }
    })

    await test.step('Test keyboard navigation between tabs', async () => {
      const tabs = page.locator('[role="tab"]')
      const firstTab = tabs.first()

      // Focus first tab
      await firstTab.focus()
      await expect(firstTab).toBeFocused()

      // Press right arrow to move to next tab
      await page.keyboard.press('ArrowRight')

      // Second tab should be focused
      const secondTab = tabs.nth(1)
      await expect(secondTab).toBeFocused()

      // Press left arrow to move back
      await page.keyboard.press('ArrowLeft')
      await expect(firstTab).toBeFocused()

      // Press Enter to select
      await page.keyboard.press('Enter')
      await expect(firstTab).toHaveAttribute('aria-selected', 'true')
    })
  })

  test('should have accessible settings icon in navbar', async ({page}) => {
    // Navigate to home page first to test navbar
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Find settings link in navbar
    const settingsLink = page.locator('a[href="/settings"]').first()

    if (await settingsLink.isVisible()) {
      // Should have accessible name
      const ariaLabel = await settingsLink.getAttribute('aria-label')
      const title = await settingsLink.getAttribute('title')
      const textContent = await settingsLink.textContent()

      // Should have some accessible label
      expect(ariaLabel || title || (textContent && textContent.trim())).toBeTruthy()

      // Should be keyboard accessible
      await accessibilityTest.expectKeyboardAccessible(page, 'a[href="/settings"]')
    }
  })

  test('should have accessible provider settings form', async ({page}) => {
    // Providers tab should be default
    const providersTab = page.locator('[role="tab"]', {hasText: 'Providers'})
    await expect(providersTab).toHaveAttribute('aria-selected', 'true')

    await test.step('Test form accessibility', async () => {
      // Run form-specific accessibility scan
      await accessibilityTest.expectAccessible(
        page,
        getAccessibilityConfig('form'),
        0, // No critical form violations
        0, // No serious form violations
      )

      // Test API key inputs if present
      const apiKeyInputs = page.locator('input[type="password"], input[name*="apiKey"]')
      const inputCount = await apiKeyInputs.count()

      for (let i = 0; i < inputCount; i++) {
        const input = apiKeyInputs.nth(i)

        // Should have associated label
        const ariaLabel = await input.getAttribute('aria-label')
        const ariaLabelledBy = await input.getAttribute('aria-labelledby')
        const id = await input.getAttribute('id')
        const hasLabel = id ? (await page.locator(`label[for="${id}"]`).count()) > 0 : false

        expect(ariaLabel || ariaLabelledBy || hasLabel).toBeTruthy()
      }
    })
  })

  test('should have accessible appearance settings', async ({page}) => {
    // Switch to Appearance tab
    const appearanceTab = page.locator('[role="tab"]', {hasText: 'Appearance'})
    await appearanceTab.click()
    await expect(appearanceTab).toHaveAttribute('aria-selected', 'true')

    await test.step('Test theme selector accessibility', async () => {
      // Theme selector should be accessible
      const themeSelector = page.locator('[data-testid="theme-selector"], [role="radiogroup"]')

      if (await themeSelector.isVisible()) {
        // Run accessibility scan on theme section
        await accessibilityTest.expectAccessible(page, getAccessibilityConfig('form'), 0, 0)
      }
    })

    await test.step('Test reduced motion toggle accessibility', async () => {
      const reducedMotionSwitch = page.locator('[data-testid="reduced-motion-switch"], input[type="checkbox"]')

      if (await reducedMotionSwitch.first().isVisible()) {
        const toggle = reducedMotionSwitch.first()

        // Should have accessible label
        const ariaLabel = await toggle.getAttribute('aria-label')
        const ariaLabelledBy = await toggle.getAttribute('aria-labelledby')

        expect(ariaLabel || ariaLabelledBy).toBeTruthy()

        // Should be keyboard accessible
        await toggle.focus()
        await expect(toggle).toBeFocused()
      }
    })
  })

  test('should have accessible data settings', async ({page}) => {
    // Switch to Data tab
    const dataTab = page.locator('[role="tab"]', {hasText: 'Data'})
    await dataTab.click()
    await expect(dataTab).toHaveAttribute('aria-selected', 'true')

    await test.step('Test storage usage accessibility', async () => {
      const storageBar = page.locator('[role="progressbar"], [data-testid="storage-usage-bar"]')

      if (await storageBar.isVisible()) {
        // Progress bar should have proper ARIA attributes
        const ariaLabel = await storageBar.getAttribute('aria-label')
        const ariaValueNow = await storageBar.getAttribute('aria-valuenow')

        // Should have label or be properly described
        expect(ariaLabel || ariaValueNow).toBeTruthy()
      }
    })

    await test.step('Test manage backups link accessibility', async () => {
      const backupsLink = page.locator('a[href="/backup"]')

      if (await backupsLink.isVisible()) {
        // Should be keyboard accessible
        await accessibilityTest.expectKeyboardAccessible(page, 'a[href="/backup"]')
      }
    })

    await test.step('Test clear data button accessibility', async () => {
      const clearDataButton = page.locator('button', {hasText: 'Clear'})

      if (await clearDataButton.first().isVisible()) {
        // Destructive action should have clear indication
        const button = clearDataButton.first()

        // Should be focusable
        await button.focus()
        await expect(button).toBeFocused()

        // Should have visible text or aria-label
        const text = await button.textContent()
        const ariaLabel = await button.getAttribute('aria-label')

        expect(text || ariaLabel).toBeTruthy()
      }
    })
  })

  test('should have proper color contrast', async ({page}) => {
    // Test color contrast for settings interface
    await accessibilityTest.expectProperColorContrast(page)
  })

  test('should have proper focus management between tabs', async ({page}) => {
    await test.step('Test focus moves to panel on tab selection', async () => {
      const tabs = page.locator('[role="tab"]')
      const panels = page.locator('[role="tabpanel"]')

      // Click on Data tab
      const dataTab = tabs.filter({hasText: 'Data'})
      await dataTab.click()

      // Wait for panel to be visible
      await page.waitForTimeout(100)

      // Focus should be manageable within the panel
      const activePanel = panels.filter({has: page.locator(':visible')}).first()

      if (await activePanel.isVisible()) {
        // Panel should be focusable or have focusable content
        const focusableElements = activePanel.locator('a, button, input, select, textarea, [tabindex="0"]')
        const focusableCount = await focusableElements.count()

        expect(focusableCount).toBeGreaterThan(0)
      }
    })
  })

  test('should support screen readers', async ({page}) => {
    // Run screen reader specific accessibility scan
    await accessibilityTest.expectAccessible(page, getAccessibilityConfig('screen-reader'), 0, 0)

    // Verify page has proper heading structure
    const h1 = page.locator('h1')
    await expect(h1).toHaveCount(1)
    await expect(h1).toContainText('Settings')
  })
})
