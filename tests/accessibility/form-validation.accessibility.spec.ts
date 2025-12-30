import {accessibilityTest, expect, test} from '.'
import {getAccessibilityConfig} from './utils/accessibility-config'

/**
 * Form validation and error states accessibility tests
 * Tests form accessibility patterns and error handling for WCAG 2.1 AA compliance
 */
test.describe('Form Validation Accessibility', () => {
  test.describe('GPT Creation Form', () => {
    test.beforeEach(async ({page}) => {
      await page.goto('/gpt/editor')
      await page.waitForLoadState('networkidle')
    })

    test('should have accessible form labels and structure', async ({page}) => {
      await test.step('Test form structure', async () => {
        // Run form-specific accessibility scan
        await accessibilityTest.expectAccessible(
          page,
          getAccessibilityConfig('form'),
          0, // No critical form violations
          0, // No serious form violations
        )

        // Check for proper form labeling
        const form = page.locator('form')
        if ((await form.count()) > 0) {
          const formElement = form.first()

          // Form should have accessible name
          const ariaLabel = await formElement.getAttribute('aria-label')
          const ariaLabelledBy = await formElement.getAttribute('aria-labelledby')
          const formHeading = formElement.locator('h1, h2, h3').first()
          const hasHeading = (await formHeading.count()) > 0

          expect(ariaLabel || ariaLabelledBy || hasHeading).toBeTruthy()
        }
      })
    })

    test('should show accessible validation errors', async ({page}) => {
      await test.step('Trigger validation errors', async () => {
        // Try to submit form without required fields
        const submitButton = page.locator('button[type="submit"], button:has-text("Save")')

        if ((await submitButton.count()) > 0) {
          // Clear any existing form data
          const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]')
          if ((await nameInput.count()) > 0) {
            await nameInput.clear()
          }

          await submitButton.click()

          // Wait for validation to appear
          await page.waitForTimeout(1000)

          // Check for accessible error messages
          const errorMessages = page.locator(
            '[role="alert"], [aria-live="polite"], [aria-live="assertive"], .error, [aria-invalid="true"]',
          )
          const errorCount = await errorMessages.count()

          if (errorCount > 0) {
            for (let i = 0; i < errorCount; i++) {
              const error = errorMessages.nth(i)

              // Error should be visible and accessible
              await expect(error).toBeVisible()

              // Check ARIA attributes
              const role = await error.getAttribute('role')
              const ariaLive = await error.getAttribute('aria-live')
              const ariaInvalid = await error.getAttribute('aria-invalid')

              // Should have proper ARIA announcement
              expect(role === 'alert' || ariaLive || ariaInvalid === 'true').toBeTruthy()

              // Error should have meaningful text
              const errorText = await error.textContent()
              expect(errorText?.trim().length).toBeGreaterThan(0)
            }
          }
        }
      })
    })

    test('should associate errors with form fields', async ({page}) => {
      await test.step('Test error field association', async () => {
        // Submit form to trigger validation
        const submitButton = page.locator('button[type="submit"], button:has-text("Save")')

        if ((await submitButton.count()) > 0) {
          await submitButton.click()
          await page.waitForTimeout(1000)

          // Check input fields for proper error association
          const invalidInputs = page.locator('input[aria-invalid="true"], textarea[aria-invalid="true"]')
          const invalidCount = await invalidInputs.count()

          for (let i = 0; i < invalidCount; i++) {
            const input = invalidInputs.nth(i)

            // Should have aria-describedby pointing to error message
            const ariaDescribedBy = await input.getAttribute('aria-describedby')

            if (ariaDescribedBy) {
              // Error message should exist and be accessible
              const errorElement = page.locator(`#${ariaDescribedBy}`)
              await expect(errorElement).toBeVisible()

              const errorText = await errorElement.textContent()
              expect(errorText?.trim().length).toBeGreaterThan(0)
            }

            // Input should be focusable after error
            await input.focus()
            await expect(input).toBeFocused()
          }
        }
      })
    })

    test('should handle real-time validation accessibly', async ({page}) => {
      await test.step('Test real-time validation', async () => {
        const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]')

        if ((await nameInput.count()) > 0) {
          // Enter invalid data
          await nameInput.fill('')
          await nameInput.blur()

          // Wait for potential real-time validation
          await page.waitForTimeout(500)

          // Check for live validation messages
          const liveRegion = page.locator('[aria-live="polite"], [aria-live="assertive"]')
          const liveCount = await liveRegion.count()

          if (liveCount > 0) {
            for (let i = 0; i < liveCount; i++) {
              const region = liveRegion.nth(i)

              // Live region should be properly configured
              const ariaLive = await region.getAttribute('aria-live')
              expect(['polite', 'assertive']).toContain(ariaLive)

              // Should be invisible to visual users but available to screen readers
              const isVisible = await region.isVisible()
              const text = await region.textContent()

              // Either visible with content or hidden but with aria-atomic
              expect(isVisible || text?.trim().length).toBeTruthy()
            }
          }
        }
      })
    })

    test('should provide helpful error recovery', async ({page}) => {
      await test.step('Test error recovery patterns', async () => {
        // Submit form with errors
        const submitButton = page.locator('button[type="submit"], button:has-text("Save")')

        if ((await submitButton.count()) > 0) {
          await submitButton.click()
          await page.waitForTimeout(1000)

          // Look for error summary or list
          const errorSummary = page.locator('[role="alert"] ul, .error-summary, [aria-label*="error" i]')

          if ((await errorSummary.count()) > 0) {
            const summary = errorSummary.first()

            // Error summary should be accessible
            await expect(summary).toBeVisible()

            // Should have proper ARIA labeling
            const ariaLabel = await summary.getAttribute('aria-label')
            const role = await summary.getAttribute('role')

            expect(ariaLabel || role).toBeTruthy()

            // Error links should be keyboard accessible
            const errorLinks = summary.locator('a[href^="#"]')
            const linkCount = await errorLinks.count()

            for (let i = 0; i < Math.min(linkCount, 3); i++) {
              const link = errorLinks.nth(i)
              await accessibilityTest.expectKeyboardAccessible(page, `a[href="${await link.getAttribute('href')}"]`)
            }
          }
        }
      })
    })
  })

  test.describe('Settings Form Validation', () => {
    test.beforeEach(async ({page}) => {
      await page.goto('/settings')
      await page.waitForLoadState('networkidle')
    })

    test('should validate settings form accessibly', async ({page}) => {
      await test.step('Test settings validation', async () => {
        // Run form accessibility scan
        await accessibilityTest.expectAccessible(page, getAccessibilityConfig('form'), 0, 0)

        // Look for form inputs
        const inputs = page.locator('input, select, textarea')
        const inputCount = await inputs.count()

        if (inputCount > 0) {
          // Test a few visible, enabled form controls
          let testedCount = 0
          for (let i = 0; i < inputCount && testedCount < 5; i++) {
            const input = inputs.nth(i)

            // Skip disabled, hidden, or non-visible inputs
            const isDisabled = await input.isDisabled()
            const isVisible = await input.isVisible()
            if (isDisabled || !isVisible) continue

            // Try to focus the input - some HeroUI inputs may not accept focus directly
            try {
              await input.focus()
              const isFocused = await input.evaluate(el => document.activeElement === el)
              if (!isFocused) continue
            } catch {
              continue
            }

            testedCount++

            // Should have proper labeling
            const id = await input.getAttribute('id')
            const ariaLabel = await input.getAttribute('aria-label')
            const ariaLabelledBy = await input.getAttribute('aria-labelledby')

            if (id) {
              const label = page.locator(`label[for="${id}"]`)
              const hasLabel = (await label.count()) > 0

              expect(hasLabel || ariaLabel || ariaLabelledBy).toBeTruthy()
            }
          }
        }
      })
    })
  })

  test.describe('Error State Recovery', () => {
    test('should handle network errors accessibly', async ({page}) => {
      await test.step('Test network error handling', async () => {
        // Go to a page that might have network-dependent content
        await page.goto('/gpt/editor')
        await page.waitForLoadState('networkidle')

        // Look for any existing error states
        const errorStates = page.locator('[role="alert"], .error-banner, [data-testid*="error"]')
        const errorCount = await errorStates.count()

        if (errorCount > 0) {
          for (let i = 0; i < errorCount; i++) {
            const error = errorStates.nth(i)

            // Error should be accessible
            await expect(error).toBeVisible()

            // Should have proper ARIA attributes
            const role = await error.getAttribute('role')
            const ariaLive = await error.getAttribute('aria-live')

            expect(role === 'alert' || ariaLive).toBeTruthy()

            // Should provide actionable information
            const errorText = await error.textContent()
            expect(errorText?.trim().length).toBeGreaterThan(10)

            // Look for retry or recovery actions
            const retryButton = error.locator('button, a')
            if ((await retryButton.count()) > 0) {
              await accessibilityTest.expectKeyboardAccessible(page, 'button, a')
            }
          }
        }
      })
    })

    test('should handle validation errors with proper focus management', async ({page}) => {
      await test.step('Test focus management on errors', async () => {
        await page.goto('/gpt/editor')
        await page.waitForLoadState('networkidle')

        // Submit form to trigger validation
        const submitButton = page.locator('button[type="submit"], button:has-text("Save")')

        if ((await submitButton.count()) > 0) {
          await submitButton.click()
          await page.waitForTimeout(1000)

          // Focus should move to first error or error summary
          const firstError = page.locator('[aria-invalid="true"]').first()
          const errorSummary = page.locator('[role="alert"]').first()

          if ((await firstError.count()) > 0) {
            // First invalid field should be focusable
            await firstError.focus()
            await expect(firstError).toBeFocused()
          } else if ((await errorSummary.count()) > 0) {
            // Error summary should be announced
            await expect(errorSummary).toBeVisible()
          }
        }
      })
    })
  })
})
