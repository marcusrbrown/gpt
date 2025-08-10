import {accessibilityTest, expect, test} from '.'
import {getAccessibilityConfig} from './utils/accessibility-config'

/**
 * HeroUI Form Components Accessibility Tests
 * Tests HeroUI form components for WCAG 2.1 AA compliance
 * Validates proper ARIA usage, error handling, and keyboard navigation
 */
test.describe('HeroUI Form Components Accessibility', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/gpt/editor')
    await page.waitForLoadState('networkidle')
  })

  test('should have accessible HeroUI Input components', async ({page}) => {
    await test.step('Test HeroUI Input accessibility', async () => {
      // Run accessibility scan on form components
      await accessibilityTest.expectAccessible(
        page,
        getAccessibilityConfig('form'),
        0, // No critical violations
        0, // No serious violations
      )

      // Test HeroUI Input component (Name field)
      const nameInput = page.locator('input[name="name"]')
      if ((await nameInput.count()) > 0) {
        // Should have proper label association
        const labelId = await nameInput.getAttribute('aria-labelledby')
        const ariaLabel = await nameInput.getAttribute('aria-label')

        expect(labelId || ariaLabel).toBeTruthy()

        // Should be keyboard accessible
        await nameInput.focus()
        await expect(nameInput).toBeFocused()

        // Should have proper input type
        const inputType = await nameInput.getAttribute('type')
        expect(inputType).toBe('text')
      }
    })
  })

  test('should have accessible HeroUI Textarea components', async ({page}) => {
    await test.step('Test HeroUI Textarea accessibility', async () => {
      // Test Description textarea
      const descriptionTextarea = page.locator('textarea[name="description"]')
      if ((await descriptionTextarea.count()) > 0) {
        // Should have proper label association
        const labelId = await descriptionTextarea.getAttribute('aria-labelledby')
        const ariaLabel = await descriptionTextarea.getAttribute('aria-label')

        expect(labelId || ariaLabel).toBeTruthy()

        // Should be keyboard accessible
        await descriptionTextarea.focus()
        await expect(descriptionTextarea).toBeFocused()

        // Should support multiline input
        await descriptionTextarea.fill(String.raw`Test\nMultiline\nContent`)
        const content = await descriptionTextarea.inputValue()
        expect(content).toContain(String.raw`\n`)
      }

      // Test System Prompt textarea
      const systemPromptTextarea = page.locator('textarea[name="systemPrompt"]')
      if ((await systemPromptTextarea.count()) > 0) {
        await systemPromptTextarea.focus()
        await expect(systemPromptTextarea).toBeFocused()
      }
    })
  })

  test('should have accessible HeroUI Checkbox components', async ({page}) => {
    await test.step('Test HeroUI Checkbox accessibility', async () => {
      // Test capability checkboxes
      const checkboxes = page.locator('input[type="checkbox"], [role="checkbox"]')
      const checkboxCount = await checkboxes.count()

      if (checkboxCount > 0) {
        for (let i = 0; i < Math.min(checkboxCount, 5); i++) {
          const checkbox = checkboxes.nth(i)

          // Should have proper label association
          const labelId = await checkbox.getAttribute('aria-labelledby')
          const ariaLabel = await checkbox.getAttribute('aria-label')

          // Check if there's a nearby label element
          const nearbyLabel = page.locator(`label[for="${await checkbox.getAttribute('id')}"]`)
          const hasNearbyLabel = (await nearbyLabel.count()) > 0

          expect(labelId || ariaLabel || hasNearbyLabel).toBeTruthy()

          // Should be keyboard accessible
          await checkbox.focus()
          await expect(checkbox).toBeFocused()

          // Should respond to space key
          const initialState = await checkbox.isChecked()
          await checkbox.press('Space')
          await page.waitForTimeout(100)
          const newState = await checkbox.isChecked()
          expect(newState).toBe(!initialState)

          // Reset state
          await checkbox.press('Space')
        }
      }
    })
  })

  test('should handle HeroUI error states accessibly', async ({page}) => {
    await test.step('Test HeroUI error display accessibility', async () => {
      // Clear form fields to trigger validation
      const nameInput = page.locator('input[name="name"]')
      if ((await nameInput.count()) > 0) {
        await nameInput.clear()
      }

      const descriptionTextarea = page.locator('textarea[name="description"]')
      if ((await descriptionTextarea.count()) > 0) {
        await descriptionTextarea.clear()
      }

      // Try to submit form to trigger validation
      const submitButton = page.locator('button[type="submit"], button:has-text("Save")')
      if ((await submitButton.count()) > 0) {
        await submitButton.click()
        await page.waitForTimeout(500)

        // Check for HeroUI error patterns
        const invalidInputs = page.locator('[aria-invalid="true"]')
        const errorMessages = page.locator('[role="alert"], .error-message, [class*="error"]')

        const invalidCount = await invalidInputs.count()
        const errorCount = await errorMessages.count()

        if (invalidCount > 0) {
          for (let i = 0; i < invalidCount; i++) {
            const input = invalidInputs.nth(i)

            // Should have aria-invalid="true"
            const ariaInvalid = await input.getAttribute('aria-invalid')
            expect(ariaInvalid).toBe('true')

            // Should have associated error message
            const describedBy = await input.getAttribute('aria-describedby')
            if (describedBy) {
              const errorElement = page.locator(`#${describedBy}`)
              if ((await errorElement.count()) > 0) {
                await expect(errorElement).toBeVisible()
              }
            }
          }
        }

        if (errorCount > 0) {
          for (let i = 0; i < errorCount; i++) {
            const error = errorMessages.nth(i)

            // Error should be visible
            await expect(error).toBeVisible()

            // Should have meaningful text
            const errorText = await error.textContent()
            expect(errorText?.trim().length).toBeGreaterThan(0)

            // Should have proper ARIA attributes for screen readers
            const role = await error.getAttribute('role')
            const ariaLive = await error.getAttribute('aria-live')
            expect(role === 'alert' || ariaLive).toBeTruthy()
          }
        }
      }
    })
  })

  test('should support proper focus management', async ({page}) => {
    await test.step('Test HeroUI focus management', async () => {
      // Test tab order through form fields
      const focusableElements = page.locator('input, textarea, button, [tabindex="0"]')
      const focusableCount = await focusableElements.count()

      if (focusableCount > 0) {
        // Start from first focusable element
        await page.keyboard.press('Tab')

        // Test first few elements in tab order
        for (let i = 0; i < Math.min(focusableCount, 5); i++) {
          const focused = page.locator(':focus')
          const focusedCount = await focused.count()

          if (focusedCount > 0) {
            // Element should have visible focus indicator
            const outline = await focused.evaluate(el => getComputedStyle(el).getPropertyValue('outline-width'))
            const boxShadow = await focused.evaluate(el => getComputedStyle(el).getPropertyValue('box-shadow'))

            // Should have some form of focus indicator
            expect(outline !== '0px' || boxShadow !== 'none').toBeTruthy()
          }

          await page.keyboard.press('Tab')
        }
      }
    })
  })

  test('should provide proper ARIA descriptions and help text', async ({page}) => {
    await test.step('Test ARIA descriptions and help text', async () => {
      // Check for proper ARIA descriptions on form fields
      const describedElements = page.locator('[aria-describedby]')
      const describedCount = await describedElements.count()

      if (describedCount > 0) {
        for (let i = 0; i < describedCount; i++) {
          const element = describedElements.nth(i)
          const describedBy = await element.getAttribute('aria-describedby')

          if (describedBy) {
            // Split by space to handle multiple IDs
            const ids = describedBy.split(' ')

            for (const id of ids) {
              const descriptionElement = page.locator(`#${id}`)
              if ((await descriptionElement.count()) > 0) {
                // Description should be visible or screen reader accessible
                const isVisible = await descriptionElement.isVisible()
                const ariaHidden = await descriptionElement.getAttribute('aria-hidden')

                // Either visible or accessible to screen readers
                expect(isVisible || ariaHidden !== 'true').toBeTruthy()

                // Should have meaningful content
                const content = await descriptionElement.textContent()
                expect(content?.trim().length).toBeGreaterThan(0)
              }
            }
          }
        }
      }
    })
  })

  test('should meet WCAG color contrast requirements', async ({page}) => {
    await test.step('Test color contrast in HeroUI components', async () => {
      // Test color contrast specifically for form components
      await accessibilityTest.expectProperColorContrast(page)
    })
  })
})
