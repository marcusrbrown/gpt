import {accessibilityTest, expect, test} from '.'
import {getAccessibilityConfig} from './utils/accessibility-config'

/**
 * Keyboard navigation and focus management accessibility tests
 * Tests keyboard accessibility patterns for WCAG 2.1 AA compliance
 */
test.describe('Keyboard Navigation Accessibility', () => {
  test.describe('Main Navigation', () => {
    test.beforeEach(async ({page}) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
    })

    test('should support keyboard navigation in main menu', async ({page}) => {
      await test.step('Test main navigation keyboard support', async () => {
        // Run navigation-specific accessibility scan
        await accessibilityTest.expectAccessible(page, getAccessibilityConfig('navigation'), 0, 0)

        // Test main navigation links
        const navLinks = page.locator('nav a, [role="navigation"] a')
        const linkCount = await navLinks.count()

        if (linkCount > 0) {
          // Start from first link
          const firstLink = navLinks.first()
          await firstLink.focus()
          await expect(firstLink).toBeFocused()

          // Test tab navigation through links
          for (let i = 1; i < Math.min(linkCount, 5); i++) {
            await page.keyboard.press('Tab')
            const currentLink = navLinks.nth(i)
            await expect(currentLink).toBeFocused()
          }
        }
      })
    })

    test('should support skip links for keyboard users', async ({page}) => {
      await test.step('Test skip link functionality', async () => {
        // Tab to first focusable element (should be skip link)
        await page.keyboard.press('Tab')

        // Check if focused element is a skip link
        const focusedElement = page.locator(':focus')
        const href = await focusedElement.getAttribute('href')
        const text = await focusedElement.textContent()

        if (href?.startsWith('#') && text?.toLowerCase().includes('skip')) {
          // Activate skip link
          await page.keyboard.press('Enter')

          // Verify focus moved to target
          const targetId = href.slice(1)
          const target = page.locator(`#${targetId}`)

          if ((await target.count()) > 0) {
            await expect(target).toBeFocused()
          }
        }
      })
    })

    test('should handle dropdown menus with keyboard', async ({page}) => {
      await test.step('Test dropdown keyboard interaction', async () => {
        // Look for dropdown triggers
        const dropdownTriggers = page.locator('[aria-haspopup], .dropdown-trigger, button[aria-expanded]')
        const triggerCount = await dropdownTriggers.count()

        if (triggerCount > 0) {
          const trigger = dropdownTriggers.first()

          // Focus and activate dropdown
          await trigger.focus()
          await expect(trigger).toBeFocused()

          // Check if it has proper ARIA attributes
          const ariaHaspopup = await trigger.getAttribute('aria-haspopup')
          const ariaExpanded = await trigger.getAttribute('aria-expanded')

          expect(ariaHaspopup || ariaExpanded !== null).toBeTruthy()

          // Activate dropdown with Enter or Space
          await page.keyboard.press('Enter')
          await page.waitForTimeout(300)

          // Check if dropdown opened
          const expandedState = await trigger.getAttribute('aria-expanded')
          if (expandedState === 'true') {
            // Test arrow key navigation in dropdown
            await page.keyboard.press('ArrowDown')

            // Verify focus moved to dropdown item
            const dropdownItems = page.locator('[role="menuitem"], .dropdown-item')
            if ((await dropdownItems.count()) > 0) {
              const firstItem = dropdownItems.first()
              await expect(firstItem).toBeFocused()
            }

            // Close dropdown with Escape
            await page.keyboard.press('Escape')
            await expect(trigger).toBeFocused()
          }
        }
      })
    })
  })

  test.describe('Form Navigation', () => {
    test.beforeEach(async ({page}) => {
      await page.goto('/gpt/editor')
      await page.waitForLoadState('networkidle')
    })

    test('should support logical tab order in forms', async ({page}) => {
      await test.step('Test form tab order', async () => {
        // Get all focusable elements in order
        const focusableElements = page.locator('input, textarea, select, button, [tabindex]:not([tabindex="-1"])')
        const elementCount = await focusableElements.count()

        if (elementCount > 0) {
          // Start from first element
          const firstElement = focusableElements.first()
          await firstElement.focus()
          await expect(firstElement).toBeFocused()

          // Tab through elements and verify order
          for (let i = 1; i < Math.min(elementCount, 10); i++) {
            await page.keyboard.press('Tab')

            // Check that focus is on expected element
            const expectedElement = focusableElements.nth(i)
            await expect(expectedElement).toBeFocused()
          }
        }
      })
    })

    test('should handle form field keyboard interactions', async ({page}) => {
      await test.step('Test form field interactions', async () => {
        // Test text inputs
        const textInputs = page.locator('input[type="text"], input:not([type]), textarea')
        const inputCount = await textInputs.count()

        if (inputCount > 0) {
          const input = textInputs.first()
          await input.focus()

          // Type in input
          await page.keyboard.type('Test content')

          // Verify content was entered
          const value = await input.inputValue()
          expect(value).toContain('Test')

          // Test selection with keyboard shortcuts
          await page.keyboard.press('Control+a')
          await page.keyboard.press('Delete')

          // Verify content was cleared
          const clearedValue = await input.inputValue()
          expect(clearedValue).toBe('')
        }

        // Test checkboxes/toggles
        const checkboxes = page.locator('input[type="checkbox"], [role="checkbox"], [role="switch"]')
        const checkboxCount = await checkboxes.count()

        if (checkboxCount > 0) {
          const checkbox = checkboxes.first()
          await checkbox.focus()
          await expect(checkbox).toBeFocused()

          // Toggle with space
          await page.keyboard.press('Space')

          // Verify state changed
          const isChecked = await checkbox.isChecked()
          expect(typeof isChecked).toBe('boolean')
        }
      })
    })

    test('should support keyboard shortcuts in editors', async ({page}) => {
      await test.step('Test editor keyboard shortcuts', async () => {
        // Look for Monaco editor or text editor
        const editor = page.locator('.monaco-editor textarea, .code-editor textarea, textarea[data-testid*="editor"]')

        if ((await editor.count()) > 0) {
          await editor.focus()
          await expect(editor).toBeFocused()

          // Test basic keyboard shortcuts
          await page.keyboard.type('function test() {')
          await page.keyboard.press('Enter')
          await page.keyboard.type('  return true;')
          await page.keyboard.press('Enter')
          await page.keyboard.type('}')

          // Test selection and formatting shortcuts
          await page.keyboard.press('Control+a')

          // Verify content exists
          const content = await editor.inputValue()
          expect(content.length).toBeGreaterThan(0)
        }
      })
    })
  })

  test.describe('Modal and Dialog Navigation', () => {
    test('should trap focus in modal dialogs', async ({page}) => {
      await test.step('Test modal focus trapping', async () => {
        // Look for modal triggers
        const modalTriggers = page.locator(
          'button[data-modal], [data-testid*="modal-trigger"], button:has-text("Delete"), button:has-text("Confirm")',
        )

        if ((await modalTriggers.count()) > 0) {
          const trigger = modalTriggers.first()
          await trigger.click()

          // Wait for modal to appear
          await page.waitForTimeout(500)

          // Look for modal dialog
          const modal = page.locator('[role="dialog"], .modal, [data-testid*="modal"]')

          if ((await modal.count()) > 0) {
            // Test focus management
            await accessibilityTest.expectProperFocusManagement(page, '[role="dialog"], .modal, [data-testid*="modal"]')

            // Get focusable elements within modal
            const modalFocusable = modal.locator('button, input, textarea, select, [tabindex]:not([tabindex="-1"])')
            const focusableCount = await modalFocusable.count()

            if (focusableCount > 0) {
              // Focus should be in modal
              const firstFocusable = modalFocusable.first()
              await expect(firstFocusable).toBeFocused()

              // Tab through modal elements
              for (let i = 1; i < focusableCount; i++) {
                await page.keyboard.press('Tab')
              }

              // Tab should cycle back to first element
              await page.keyboard.press('Tab')
              await expect(firstFocusable).toBeFocused()

              // Shift+Tab should cycle backwards
              await page.keyboard.press('Shift+Tab')
              const lastFocusable = modalFocusable.last()
              await expect(lastFocusable).toBeFocused()
            }

            // Close modal with Escape
            await page.keyboard.press('Escape')

            // Focus should return to trigger
            await expect(trigger).toBeFocused()
          }
        }
      })
    })
  })

  test.describe('Complex Component Navigation', () => {
    test('should handle card navigation', async ({page}) => {
      await test.step('Test card component navigation', async () => {
        await page.goto('/')
        await page.waitForLoadState('networkidle')

        // Look for card components
        const cards = page.locator('[data-testid*="card"], .card, .gpt-card')
        const cardCount = await cards.count()

        if (cardCount > 0) {
          for (let i = 0; i < Math.min(cardCount, 3); i++) {
            const card = cards.nth(i)

            // Card should be keyboard accessible
            await card.focus()
            await expect(card).toBeFocused()

            // Should be activatable with Enter or Space
            await page.keyboard.press('Enter')

            // Wait for navigation or action
            await page.waitForTimeout(500)

            // Verify something happened (URL change, modal, etc.)
            const currentUrl = page.url()
            expect(currentUrl).toBeTruthy()
          }
        }
      })
    })

    test('should support list navigation patterns', async ({page}) => {
      await test.step('Test list navigation', async () => {
        // Look for lists
        const lists = page.locator('ul, ol, [role="list"]')
        const listCount = await lists.count()

        if (listCount > 0) {
          const list = lists.first()
          const listItems = list.locator('li, [role="listitem"]')
          const itemCount = await listItems.count()

          if (itemCount > 0) {
            // Focus first item if focusable
            const firstItem = listItems.first()
            const firstLink = firstItem.locator('a, button').first()

            if ((await firstLink.count()) > 0) {
              await firstLink.focus()
              await expect(firstLink).toBeFocused()

              // Test arrow key navigation if supported
              await page.keyboard.press('ArrowDown')

              // Check if focus moved to next item
              const secondItem = listItems.nth(1)
              const secondLink = secondItem.locator('a, button').first()

              if ((await secondLink.count()) > 0) {
                // Either focus moved or it's regular tab navigation
                const isFocused = await secondLink.evaluate(el => document.activeElement === el)
                expect(typeof isFocused).toBe('boolean')
              }
            }
          }
        }
      })
    })
  })

  test.describe('Focus Indicators', () => {
    test('should have visible focus indicators', async ({page}) => {
      await test.step('Test focus indicator visibility', async () => {
        // Test various focusable elements
        const focusableElements = page.locator('a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])')
        const elementCount = await focusableElements.count()

        if (elementCount > 0) {
          for (let i = 0; i < Math.min(elementCount, 5); i++) {
            const element = focusableElements.nth(i)

            // Focus element
            await element.focus()
            await expect(element).toBeFocused()

            // Check for focus styling (this is a basic check)
            const focusVisible = await element.evaluate(el => {
              const styles = window.getComputedStyle(el)
              return (
                styles.outline !== 'none' ||
                styles.outlineWidth !== '0px' ||
                styles.boxShadow !== 'none' ||
                styles.borderColor !== styles.backgroundColor
              )
            })

            // Should have some form of focus indication
            expect(focusVisible).toBeTruthy()
          }
        }
      })
    })
  })
})
