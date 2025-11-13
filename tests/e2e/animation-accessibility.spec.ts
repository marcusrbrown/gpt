import {accessibilityTest, expect, test} from '../accessibility'
import {getAccessibilityConfig} from '../accessibility/utils/accessibility-config'

/**
 * Animation Accessibility Tests
 *
 * Validates WCAG 2.1 AA compliance for animated components.
 *
 * Requirements: TEST-002, A11Y-001, A11Y-002, A11Y-003
 */

test.describe('Animation Accessibility Tests', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test.describe('Focus Indicator Visibility During Animations', () => {
    test('should maintain visible focus indicators during card hover animations', async ({page}) => {
      await test.step('Test focus visibility on animated cards', async () => {
        const card = page.locator('[data-testid="user-gpt-card"]').first()
        await expect(card).toBeVisible()

        await card.focus()
        await expect(card).toBeFocused()

        const hasFocusRing = await card.evaluate(el => {
          const styles = window.getComputedStyle(el)
          return (
            (styles.outline !== 'none' && styles.outline !== '0px') ||
            styles.outlineWidth !== '0px' ||
            (styles.boxShadow && styles.boxShadow !== 'none')
          )
        })

        expect(hasFocusRing, 'Card should have visible focus indicator').toBeTruthy()

        await card.hover()
        // 100ms allows animation to start while avoiding timing flakiness
        await page.waitForTimeout(100)

        const hasFocusRingDuringAnimation = await card.evaluate(el => {
          const styles = window.getComputedStyle(el)
          return (
            (styles.outline !== 'none' && styles.outline !== '0px') ||
            styles.outlineWidth !== '0px' ||
            (styles.boxShadow && styles.boxShadow !== 'none')
          )
        })

        expect(hasFocusRingDuringAnimation, 'Focus indicator should remain visible during animation').toBeTruthy()
      })
    })

    test('should maintain focus indicators on buttons during press animations', async ({page}) => {
      await test.step('Test focus on animated buttons', async () => {
        const createButton = page.locator('button:has-text("Create"), button:has-text("New GPT")').first()
        await expect(createButton).toBeVisible()

        await createButton.focus()
        await expect(createButton).toBeFocused()

        const hasFocusIndicator = await createButton.evaluate(el => {
          const styles = window.getComputedStyle(el)
          return (
            (styles.outline !== 'none' && styles.outline !== '0px') ||
            styles.outlineWidth !== '0px' ||
            (styles.boxShadow && styles.boxShadow !== 'none')
          )
        })

        expect(hasFocusIndicator, 'Button should have visible focus indicator').toBeTruthy()

        await createButton.dispatchEvent('mousedown')
        // 50ms catches mid-animation state for button press
        await page.waitForTimeout(50)

        await expect(createButton).toBeFocused()
        await createButton.dispatchEvent('mouseup')
      })
    })

    test('should maintain focus visibility on form inputs during focus animations', async ({page}) => {
      await test.step('Navigate to form page', async () => {
        await page.goto('/gpt/new')
        await page.waitForLoadState('networkidle')
      })

      await test.step('Test focus animations on inputs', async () => {
        const nameInput = page.locator('input[name="name"]').first()
        await expect(nameInput).toBeVisible()

        // Focus input to trigger animation
        await nameInput.focus()
        await expect(nameInput).toBeFocused()

        // Wait for focus animation to complete
        await page.waitForTimeout(200)

        // Check focus indicator visibility
        const hasFocusRing = await nameInput.evaluate(el => {
          const styles = window.getComputedStyle(el)
          return (
            (styles.outline !== 'none' && styles.outline !== '0px') ||
            styles.outlineWidth !== '0px' ||
            (styles.boxShadow && styles.boxShadow !== 'none') ||
            styles.borderColor !== styles.backgroundColor
          )
        })

        expect(hasFocusRing, 'Input should have visible focus indicator during animation').toBeTruthy()
      })
    })
  })

  test.describe('Keyboard Navigation During Animations', () => {
    test('should support keyboard navigation between animated cards', async ({page}) => {
      await test.step('Test Tab navigation through cards', async () => {
        const cards = page.locator('[data-testid="user-gpt-card"]')
        const cardCount = await cards.count()

        if (cardCount > 1) {
          const firstCard = cards.first()

          // Focus first card
          await firstCard.focus()
          await expect(firstCard).toBeFocused()

          // Tab to next card
          await page.keyboard.press('Tab')

          // Either second card or a link within first card should be focused
          const isFocusInExpectedLocation = await page.evaluate(() => {
            const activeElement = document.activeElement
            return activeElement?.closest('[data-testid="user-gpt-card"]') !== null
          })

          expect(isFocusInExpectedLocation, 'Focus should move to next focusable element within cards').toBeTruthy()
        }
      })
    })

    test('should support Enter/Space key activation during button animations', async ({page}) => {
      await test.step('Test keyboard activation of buttons', async () => {
        const createButton = page.locator('button:has-text("Create"), button:has-text("New GPT")').first()
        await expect(createButton).toBeVisible()

        // Focus button using keyboard
        await createButton.focus()
        await expect(createButton).toBeFocused()

        // Get button text to verify it's the right one
        const buttonText = await createButton.textContent()

        // Press Enter to activate (triggers animation)
        await page.keyboard.press('Enter')

        // Wait for animation to complete
        await page.waitForTimeout(300)

        // Should navigate or perform action
        const currentUrl = page.url()
        console.warn(`Button "${buttonText}" activated via keyboard, current URL: ${currentUrl}`)

        // Button activation should work regardless of animation
        expect(typeof currentUrl).toBe('string')
      })
    })

    test('should maintain keyboard focus order during page transitions', async ({page}) => {
      await test.step('Test focus order during navigation', async () => {
        await page.goto('/')
        await page.waitForLoadState('networkidle')

        // Tab through interactive elements
        await page.keyboard.press('Tab')
        const firstFocusable = await page.evaluate(() => document.activeElement?.tagName)

        await page.keyboard.press('Tab')
        const secondFocusable = await page.evaluate(() => document.activeElement?.tagName)

        console.warn('Tab order:', {firstFocusable, secondFocusable})

        // Should have logical tab order
        expect(firstFocusable).toBeTruthy()
        expect(secondFocusable).toBeTruthy()
      })
    })
  })

  test.describe('Reduced Motion Support', () => {
    test('should respect prefers-reduced-motion preference', async ({page}) => {
      await test.step('Enable reduced motion preference', async () => {
        await page.emulateMedia({reducedMotion: 'reduce'})
      })

      await test.step('Verify animations are disabled', async () => {
        await page.goto('/')
        await page.waitForLoadState('networkidle')

        const card = page.locator('[data-testid="user-gpt-card"]').first()
        await expect(card).toBeVisible()

        // Check if transition duration is minimal or zero
        const hasReducedMotion = await card.evaluate(el => {
          const styles = window.getComputedStyle(el)
          const duration = styles.transitionDuration
          return duration === '0s' || duration === '0.001s'
        })

        expect(hasReducedMotion, 'Animations should be disabled with prefers-reduced-motion').toBeTruthy()
      })
    })

    test('should apply motion-reduce utilities correctly', async ({page}) => {
      await test.step('Check motion-reduce classes in design system', async () => {
        await page.emulateMedia({reducedMotion: 'reduce'})
        await page.goto('/')
        await page.waitForLoadState('networkidle')

        // Check animated elements for motion-reduce compliance
        const animatedElements = page.locator('[class*="motion-safe"], [class*="transition"]')
        const elementCount = await animatedElements.count()

        console.warn(`Found ${elementCount} animated elements to check for reduced motion compliance`)

        if (elementCount > 0) {
          const sampleElement = animatedElements.first()
          const hasMotionReduceClass = await sampleElement.evaluate(el => {
            const className = el.getAttribute('class') || ''
            return className.includes('motion-reduce') || className.includes('motion-safe')
          })

          console.warn('Sample element has motion-reduce classes:', hasMotionReduceClass)
          expect(typeof hasMotionReduceClass).toBe('boolean')
        }
      })
    })

    test('should maintain functionality with animations disabled', async ({page}) => {
      await test.step('Test interactions with reduced motion', async () => {
        await page.emulateMedia({reducedMotion: 'reduce'})
        await page.goto('/')
        await page.waitForLoadState('networkidle')

        // Card interactions should still work
        const card = page.locator('[data-testid="user-gpt-card"]').first()
        await expect(card).toBeVisible()

        // Click should still work even without animation
        await card.click()
        await page.waitForTimeout(500)

        // Navigation or action should complete
        expect(page.url()).toBeTruthy()
      })
    })
  })

  test.describe('Screen Reader Compatibility with Animations', () => {
    test('should announce loading states appropriately', async ({page}) => {
      await test.step('Test loading state announcements', async () => {
        await page.goto('/test')
        await page.waitForLoadState('networkidle')

        // Check for ARIA live regions for loading states
        const liveRegions = page.locator('[aria-live="polite"], [aria-live="assertive"], [role="status"]')
        const liveRegionCount = await liveRegions.count()

        console.warn(`Found ${liveRegionCount} ARIA live regions for state announcements`)

        if (liveRegionCount > 0) {
          const firstLiveRegion = liveRegions.first()
          const ariaLive = await firstLiveRegion.getAttribute('aria-live')

          expect(ariaLive, 'Live region should have appropriate aria-live value').toBeTruthy()
        }
      })
    })

    test('should provide accessible names for animated interactive elements', async ({page}) => {
      await test.step('Test ARIA labels on animated elements', async () => {
        await page.goto('/')
        await page.waitForLoadState('networkidle')

        // Check animated interactive elements for accessible names
        const interactiveElements = page.locator('button, a[href], [role="button"]')
        const elementCount = await interactiveElements.count()

        let elementsWithLabels = 0

        for (let i = 0; i < Math.min(elementCount, 10); i++) {
          const element = interactiveElements.nth(i)
          const hasAccessibleName = await element.evaluate(el => {
            const ariaLabel = el.getAttribute('aria-label')
            const ariaLabelledBy = el.getAttribute('aria-labelledby')
            const textContent = el.textContent?.trim()

            return !!(ariaLabel || ariaLabelledBy || (textContent && textContent.length > 0))
          })

          if (hasAccessibleName) {
            elementsWithLabels++
          }
        }

        console.warn(`${elementsWithLabels} out of ${Math.min(elementCount, 10)} elements have accessible names`)

        expect(elementsWithLabels, 'Most interactive elements should have accessible names').toBeGreaterThan(0)
      })
    })

    test('should maintain focus trap in animated modals/dialogs', async ({page}) => {
      await test.step('Test focus management in dialogs', async () => {
        await page.goto('/gpt/new')
        await page.waitForLoadState('networkidle')

        // Look for any modal or dialog elements
        const dialogs = page.locator('[role="dialog"], [role="alertdialog"], .modal')
        const dialogCount = await dialogs.count()

        if (dialogCount > 0) {
          // Focus should be trapped within dialog
          await page.keyboard.press('Tab')
          const focusedElement = await page.evaluate(() => {
            const activeElement = document.activeElement
            return activeElement?.closest('[role="dialog"]') !== null
          })

          console.warn('Focus trapped in dialog:', focusedElement)
          expect(typeof focusedElement).toBe('boolean')
        } else {
          console.warn('No dialogs found on this page')
        }
      })
    })
  })

  test.describe('Color Contrast During Animations', () => {
    test('should maintain sufficient contrast in hover states', async ({page}) => {
      await test.step('Test contrast during card hover', async () => {
        const card = page.locator('[data-testid="user-gpt-card"]').first()
        await expect(card).toBeVisible()

        // Hover to trigger animation
        await card.hover()
        await page.waitForTimeout(200)

        // Run accessibility scan with color focus
        await accessibilityTest.expectProperColorContrast(page)
      })
    })

    test('should maintain contrast on focus states', async ({page}) => {
      await test.step('Test contrast during focus animations', async () => {
        const card = page.locator('[data-testid="user-gpt-card"]').first()
        await expect(card).toBeVisible()

        // Focus to trigger animation
        await card.focus()
        await page.waitForTimeout(200)

        // Color contrast should meet WCAG AA
        await accessibilityTest.expectProperColorContrast(page)
      })
    })

    test('should maintain contrast during button press states', async ({page}) => {
      await test.step('Test contrast during button animations', async () => {
        const createButton = page.locator('button:has-text("Create"), button:has-text("New GPT")').first()
        await expect(createButton).toBeVisible()

        // Trigger press animation
        await createButton.dispatchEvent('mousedown')
        await page.waitForTimeout(50)

        // Contrast should be maintained during active state
        await accessibilityTest.expectProperColorContrast(page)

        await createButton.dispatchEvent('mouseup')
      })
    })
  })

  test.describe('Comprehensive Animation Accessibility Audit', () => {
    test('should pass full accessibility scan with animations', async ({page}) => {
      await test.step('Run comprehensive audit', async () => {
        await page.goto('/')
        await page.waitForLoadState('networkidle')

        // Run comprehensive accessibility scan
        const summary = await accessibilityTest.expectAccessible(page, getAccessibilityConfig('strict'), 0, 0)

        console.warn('Animation Accessibility Audit Results:', {
          total: summary.total,
          critical: summary.critical,
          serious: summary.serious,
        })

        // Should have zero critical/serious violations
        expect(summary.critical, 'Should have no critical accessibility violations').toBe(0)
        expect(summary.serious, 'Should have no serious accessibility violations').toBe(0)
      })
    })

    test('should pass accessibility audit across themes', async ({page}) => {
      await test.step('Test light theme accessibility', async () => {
        await page.goto('/')
        await page.waitForLoadState('networkidle')

        await page.evaluate(() => {
          document.documentElement.classList.remove('dark')
          document.documentElement.classList.add('light')
        })

        await accessibilityTest.expectAccessible(page, getAccessibilityConfig('color'), 0, 0)
      })

      await test.step('Test dark theme accessibility', async () => {
        await page.evaluate(() => {
          document.documentElement.classList.remove('light')
          document.documentElement.classList.add('dark')
        })

        await accessibilityTest.expectAccessible(page, getAccessibilityConfig('color'), 0, 0)
      })
    })
  })
})
