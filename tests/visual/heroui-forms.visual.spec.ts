import type {Page} from '@playwright/test'
import type {VisualTestHelper} from './utils/visual-test-helper'
import {visualTest} from './fixtures'

visualTest.describe('HeroUI Form Visual Regression Tests', () => {
  visualTest.beforeEach(async ({page}: {page: Page}) => {
    // Navigate to GPT editor page which contains HeroUI form components
    await page.goto('/gpt/new')
    await page.waitForLoadState('networkidle')
  })

  visualTest.describe('HeroUI Input Component States', () => {
    visualTest(
      'Input states - default, focused, filled',
      async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
        // Default state
        await visualHelper.takeComponentScreenshot(page.locator('input[name="name"]').first(), 'heroui-input-default')

        // Focused state
        await page.locator('input[name="name"]').first().focus()
        await visualHelper.takeComponentScreenshot(page.locator('input[name="name"]').first(), 'heroui-input-focused')

        // Filled state
        await page.fill('input[name="name"]', 'Sample GPT Name')
        await page.locator('body').click() // Remove focus
        await visualHelper.takeComponentScreenshot(page.locator('input[name="name"]').first(), 'heroui-input-filled')
      },
    )

    visualTest(
      'Input validation error states',
      async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
        // Trigger validation by clicking Save button (which has onPress handler)
        await page.click('button:has-text("Save")')

        // Wait for validation errors to appear
        await page.waitForTimeout(1000)

        // Check for error state on input components
        const nameInput = page.locator('input[name="name"]').first()
        const descriptionTextarea = page.locator('textarea[name="description"]').first()

        // Screenshot error states
        if ((await nameInput.count()) > 0) {
          await visualHelper.takeComponentScreenshot(nameInput, 'heroui-input-error')
        }

        if ((await descriptionTextarea.count()) > 0) {
          await visualHelper.takeComponentScreenshot(descriptionTextarea, 'heroui-textarea-description-error')
        }

        // Full form with validation errors
        await visualHelper.takeFullPageScreenshot('heroui-form-validation-errors')
      },
    )

    visualTest(
      'Input required field indicators',
      async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
        // Take screenshots of required field indicators
        const requiredInputs = page.locator('input[required], input[aria-required="true"]')
        const count = await requiredInputs.count()

        for (let i = 0; i < Math.min(count, 3); i++) {
          const input = requiredInputs.nth(i)
          await visualHelper.takeComponentScreenshot(input, `heroui-input-required-${i + 1}`)
        }
      },
    )
  })

  visualTest.describe('HeroUI Textarea Component States', () => {
    visualTest(
      'Textarea states - default, focused, filled',
      async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
        const textarea = page.locator('textarea[name="systemPrompt"]').first()

        if ((await textarea.count()) > 0) {
          // Default state
          await visualHelper.takeComponentScreenshot(textarea, 'heroui-textarea-default')

          // Focused state
          await textarea.focus()
          await visualHelper.takeComponentScreenshot(textarea, 'heroui-textarea-focused')

          // Filled state with multi-line content
          await textarea.fill(
            String.raw`You are a helpful AI assistant that provides detailed and accurate responses.\n\nYou should always be polite and professional in your interactions.`,
          )
          await page.locator('body').click() // Remove focus
          await visualHelper.takeComponentScreenshot(textarea, 'heroui-textarea-filled')
        }
      },
    )

    visualTest(
      'Textarea validation error states',
      async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
        // Navigate to a tab that might have required textarea
        const capabilitiesTab = page.locator('[role="tab"]:has-text("Capabilities")')
        if ((await capabilitiesTab.count()) > 0) {
          await capabilitiesTab.click()
          await page.waitForTimeout(500)
        }

        // Trigger validation
        await page.click('button:has-text("Save")')
        await page.waitForTimeout(1000)

        // Find textarea in error state
        const textareas = page.locator('textarea')
        const count = await textareas.count()

        for (let i = 0; i < count; i++) {
          const textarea = textareas.nth(i)
          const hasError = await textarea.evaluate((el: HTMLTextAreaElement) => {
            return el.hasAttribute('aria-invalid') || el.classList.contains('error') || el.dataset.invalid === 'true'
          })

          if (hasError) {
            await visualHelper.takeComponentScreenshot(textarea, `heroui-textarea-error-${i + 1}`)
          }
        }
      },
    )
  })

  visualTest.describe('HeroUI Checkbox Component States', () => {
    visualTest(
      'Checkbox states - unchecked, checked, focused',
      async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
        // Navigate to capabilities tab which has checkboxes
        const capabilitiesTab = page.locator('[role="tab"]:has-text("Capabilities")')
        if ((await capabilitiesTab.count()) > 0) {
          await capabilitiesTab.click()
          await page.waitForTimeout(500)

          const checkboxes = page.locator('input[type="checkbox"]')
          const count = await checkboxes.count()

          if (count > 0) {
            const firstCheckbox = checkboxes.first()

            // Unchecked state
            await visualHelper.takeComponentScreenshot(firstCheckbox, 'heroui-checkbox-unchecked')

            // Focused state
            await firstCheckbox.focus()
            await visualHelper.takeComponentScreenshot(firstCheckbox, 'heroui-checkbox-focused')

            // Checked state
            await firstCheckbox.check()
            await visualHelper.takeComponentScreenshot(firstCheckbox, 'heroui-checkbox-checked')

            // Checked and focused
            await firstCheckbox.focus()
            await visualHelper.takeComponentScreenshot(firstCheckbox, 'heroui-checkbox-checked-focused')
          }
        }
      },
    )

    visualTest('Checkbox group layout', async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
      // Navigate to capabilities tab
      const capabilitiesTab = page.locator('[role="tab"]:has-text("Capabilities")')
      if ((await capabilitiesTab.count()) > 0) {
        await capabilitiesTab.click()
        await page.waitForTimeout(500)

        // Take screenshot of the entire checkbox group
        const checkboxGroup = page.locator('[role="group"]').first()
        if ((await checkboxGroup.count()) > 0) {
          await visualHelper.takeComponentScreenshot(checkboxGroup, 'heroui-checkbox-group')
        }

        // Alternative: screenshot capabilities section
        const capabilitiesSection = page.locator('[data-testid*="capabilities"], .capabilities-section')
        if ((await capabilitiesSection.count()) > 0) {
          await visualHelper.takeComponentScreenshot(capabilitiesSection.first(), 'heroui-capabilities-section')
        }
      }
    })
  })

  visualTest.describe('HeroUI Form Error States', () => {
    visualTest(
      'Form with multiple validation errors',
      async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
        // Clear any pre-filled data and trigger validation
        await page.fill('input[name="name"]', '')
        await page.fill('textarea[name="description"]', '')

        // Try to save empty form
        await page.click('button:has-text("Save")')
        await page.waitForTimeout(1000)

        // Screenshot full form with errors
        await visualHelper.takeFullPageScreenshot('heroui-form-multiple-errors')

        // Screenshot individual error components
        const errorElements = page.locator('[aria-invalid="true"], .error, [data-invalid="true"]')
        const errorCount = await errorElements.count()

        for (let i = 0; i < Math.min(errorCount, 5); i++) {
          const errorElement = errorElements.nth(i)
          await visualHelper.takeComponentScreenshot(errorElement, `heroui-form-error-element-${i + 1}`)
        }
      },
    )

    visualTest(
      'Form error recovery flow',
      async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
        // Start with validation errors
        await page.click('button:has-text("Save")')
        await page.waitForTimeout(1000)

        // Screenshot initial error state
        await visualHelper.takeFullPageScreenshot('heroui-form-before-correction')

        // Fix errors gradually
        await page.fill('input[name="name"]', 'Corrected GPT Name')
        await page.waitForTimeout(500)
        await visualHelper.takeFullPageScreenshot('heroui-form-partial-correction')

        await page.fill('textarea[name="description"]', 'Corrected description for the GPT')
        await page.waitForTimeout(500)
        await visualHelper.takeFullPageScreenshot('heroui-form-full-correction')
      },
    )

    visualTest('Form success states', async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
      // Fill out form completely
      await page.fill('input[name="name"]', 'Complete Test GPT')
      await page.fill('textarea[name="description"]', 'A fully configured test GPT')

      const textarea = page.locator('textarea[name="systemPrompt"]').first()
      if ((await textarea.count()) > 0) {
        await textarea.fill('You are a helpful assistant for testing purposes.')
      }

      // Screenshot completed form before submission
      await visualHelper.takeFullPageScreenshot('heroui-form-ready-to-submit')

      // If form has success indicators after filling required fields
      await page.waitForTimeout(1000)
      const successElements = page.locator('.success, [data-valid="true"], .valid')
      const successCount = await successElements.count()

      if (successCount > 0) {
        await visualHelper.takeFullPageScreenshot('heroui-form-success-state')
      }
    })
  })

  visualTest.describe('HeroUI Form Theme Variations', () => {
    visualTest(
      'Form components in dark theme',
      async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
        // Fill form with test data
        await page.fill('input[name="name"]', 'Dark Theme Test')
        await page.fill('textarea[name="description"]', 'Testing HeroUI components in dark theme')

        // Switch to dark theme
        await visualHelper.setTheme('dark')

        // Screenshot various form states in dark theme
        await visualHelper.takeFullPageScreenshot('heroui-form-dark-theme')

        // Trigger validation in dark theme
        await page.fill('input[name="name"]', '')
        await page.click('button:has-text("Save")')
        await page.waitForTimeout(1000)

        await visualHelper.takeFullPageScreenshot('heroui-form-dark-theme-errors')
      },
    )

    visualTest('Form responsive design', async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
      // Fill form with test data
      await page.fill('input[name="name"]', 'Responsive Test GPT')
      await page.fill('textarea[name="description"]', 'Testing responsive layout of HeroUI components')

      // Test responsive layouts
      await visualHelper.takeResponsiveScreenshots('heroui-form-responsive')
    })
  })

  visualTest.describe('HeroUI Form Loading States', () => {
    visualTest(
      'Form with loading indicators',
      async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
        // Fill out form
        await page.fill('input[name="name"]', 'Loading Test GPT')
        await page.fill('textarea[name="description"]', 'Testing loading states')

        // Look for loading states (if any exist during form interactions)
        const loadingElements = page.locator('.loading, [data-loading="true"], .spinner')
        const loadingCount = await loadingElements.count()

        if (loadingCount > 0) {
          await visualHelper.takeFullPageScreenshot('heroui-form-loading-state')
        }

        // Simulate loading state by clicking submit and capturing immediate state
        await page.click('button:has-text("Save")')
        await page.waitForTimeout(100) // Capture very quickly to catch loading state
        await visualHelper.takeFullPageScreenshot('heroui-form-submit-loading')
      },
    )
  })

  visualTest.describe('HeroUI Form Disabled States', () => {
    visualTest(
      'Form with disabled components',
      async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
        // Disable form elements (if there's a way to simulate this)
        await page.evaluate(() => {
          const inputs = document.querySelectorAll('input, textarea, button')
          inputs.forEach((input: any) => {
            if (input.type !== 'submit') {
              input.disabled = true
            }
          })
        })

        await page.waitForTimeout(500)
        await visualHelper.takeFullPageScreenshot('heroui-form-disabled-state')

        // Screenshot individual disabled components (only visible ones)
        const disabledInputs = page.locator('input[disabled]:visible, textarea[disabled]:visible')
        const disabledCount = await disabledInputs.count()

        for (let i = 0; i < Math.min(disabledCount, 3); i++) {
          const disabledInput = disabledInputs.nth(i)
          await visualHelper.takeComponentScreenshot(disabledInput, `heroui-disabled-component-${i + 1}`)
        }
      },
    )
  })
})
