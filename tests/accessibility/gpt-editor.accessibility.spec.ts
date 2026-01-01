import {accessibilityTest, expect, test} from '.'
import {getAccessibilityConfig} from './utils/accessibility-config'

/**
 * GPT Editor page accessibility tests
 * Tests the GPT creation and editing interface for WCAG 2.1 AA compliance
 */
test.describe('GPT Editor Page Accessibility', () => {
  test.beforeEach(async ({page}) => {
    // Navigate to GPT editor page (create new GPT)
    await page.goto('/gpt/new')
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

    console.warn(`GPT Editor accessibility scan: ${summary.total} violations found`)
  })

  test('should have accessible form controls', async ({page}) => {
    await test.step('Test form accessibility', async () => {
      // Run form-specific accessibility scan
      await accessibilityTest.expectAccessible(
        page,
        getAccessibilityConfig('form'),
        0, // No critical form violations
        0, // No serious form violations
      )

      // Test specific form elements
      const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]')
      if ((await nameInput.count()) > 0) {
        await accessibilityTest.expectKeyboardAccessible(page, 'input[name="name"], input[placeholder*="name" i]')
      }

      const descriptionInput = page.locator('textarea[name="description"], textarea[placeholder*="description" i]')
      if ((await descriptionInput.count()) > 0) {
        await accessibilityTest.expectKeyboardAccessible(
          page,
          'textarea[name="description"], textarea[placeholder*="description" i]',
        )
      }

      // Test system prompt input
      const systemPromptInput = page.locator('textarea[name="systemPrompt"], textarea[placeholder*="system" i]')
      if ((await systemPromptInput.count()) > 0) {
        await accessibilityTest.expectKeyboardAccessible(
          page,
          'textarea[name="systemPrompt"], textarea[placeholder*="system" i]',
        )
      }
    })
  })

  test('should have accessible navigation and buttons', async ({page}) => {
    await test.step('Test navigation accessibility', async () => {
      // Run navigation-specific scan
      await accessibilityTest.expectAccessible(page, getAccessibilityConfig('navigation'), 0, 0)

      // Test save button
      const saveButton = page.locator('button:has-text("Save"), button[type="submit"]')
      if ((await saveButton.count()) > 0) {
        await accessibilityTest.expectKeyboardAccessible(page, 'button:has-text("Save"), button[type="submit"]')
      }

      // Test cancel/back button
      const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("Back")')
      if ((await cancelButton.count()) > 0) {
        await accessibilityTest.expectKeyboardAccessible(page, 'button:has-text("Cancel"), button:has-text("Back")')
      }

      // Test any toggle switches or checkboxes
      const toggles = page.locator('input[type="checkbox"], [role="switch"]')
      const toggleCount = await toggles.count()

      for (let i = 0; i < Math.min(toggleCount, 5); i++) {
        const toggle = toggles.nth(i)
        await toggle.focus()
        await expect(toggle).toBeFocused()
      }
    })
  })

  test('should handle form validation accessibly', async ({page}) => {
    await test.step('Test form validation accessibility', async () => {
      // Try to trigger validation by submitting empty form
      const submitButton = page.locator('button[type="submit"], button:has-text("Save")')
      if ((await submitButton.count()) > 0) {
        await submitButton.click()

        // Wait for potential validation messages
        await page.waitForTimeout(500)

        // Check for accessible error messages
        const errorMessages = page.locator('[role="alert"], .error, [aria-invalid="true"]')
        const errorCount = await errorMessages.count()

        if (errorCount > 0) {
          for (let i = 0; i < errorCount; i++) {
            const error = errorMessages.nth(i)

            // Error should be visible
            await expect(error).toBeVisible()

            // Should have proper ARIA attributes
            const role = await error.getAttribute('role')
            const ariaInvalid = await error.getAttribute('aria-invalid')
            const ariaLive = await error.getAttribute('aria-live')

            // Should have proper accessibility attributes
            expect(role === 'alert' || ariaInvalid === 'true' || ariaLive).toBeTruthy()
          }
        }
      }
    })
  })

  test('should support screen readers for dynamic content', async ({page}) => {
    await test.step('Test dynamic content accessibility', async () => {
      // Test Monaco Editor accessibility if present
      const monacoEditor = page.locator('.monaco-editor, [data-testid="monaco-editor"]')
      if ((await monacoEditor.count()) > 0) {
        // Monaco editor should be focusable
        await monacoEditor.focus()

        // Should have proper role or aria-label
        const role = await monacoEditor.getAttribute('role')
        const ariaLabel = await monacoEditor.getAttribute('aria-label')

        expect(role || ariaLabel).toBeTruthy()
      }

      // Test configuration panels
      const configPanels = page.locator('[data-testid*="config"], .config-panel')
      const panelCount = await configPanels.count()

      if (panelCount > 0) {
        for (let i = 0; i < Math.min(panelCount, 3); i++) {
          const panel = configPanels.nth(i)

          // Panel should have proper labeling
          const ariaLabel = await panel.getAttribute('aria-label')
          const ariaLabelledBy = await panel.getAttribute('aria-labelledby')
          const heading = panel.locator('h1, h2, h3, h4, h5, h6')
          const hasHeading = (await heading.count()) > 0

          expect(ariaLabel || ariaLabelledBy || hasHeading).toBeTruthy()
        }
      }
    })
  })

  test('should have proper color contrast in editor interface', async ({page}) => {
    // Test color contrast for editor interface
    await accessibilityTest.expectProperColorContrast(page)
  })

  test('should support keyboard shortcuts accessibly', async ({page}) => {
    await test.step('Test keyboard shortcuts', async () => {
      // Check for keyboard shortcut documentation or hints
      const shortcutElements = page.locator('[title*="Ctrl"], [title*="Cmd"], [aria-keyshortcuts]')
      const shortcutCount = await shortcutElements.count()

      if (shortcutCount > 0) {
        for (let i = 0; i < Math.min(shortcutCount, 3); i++) {
          const element = shortcutElements.nth(i)

          // Should have proper documentation
          const title = await element.getAttribute('title')
          const ariaKeyshortcuts = await element.getAttribute('aria-keyshortcuts')

          expect(title || ariaKeyshortcuts).toBeTruthy()
        }
      }
    })
  })
})
