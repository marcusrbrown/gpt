import {accessibilityTest, expect, test} from '.'
import {getAccessibilityConfig} from './utils/accessibility-config'

/**
 * Home page accessibility tests
 * Tests the main landing page for WCAG 2.1 AA compliance
 */
test.describe('Home Page Accessibility', () => {
  test.beforeEach(async ({page}) => {
    // Navigate to home page
    await page.goto('/')
    // Wait for page to load completely
    await page.waitForLoadState('networkidle')
  })

  test('should meet WCAG 2.1 AA standards', async ({page}) => {
    // Run comprehensive accessibility scan
    const summary = await accessibilityTest.expectAccessible(
      page,
      getAccessibilityConfig('standard'),
      0, // No critical violations allowed
      1, // Allow up to 1 serious violation (transient)
    )

    // Log summary for debugging
    console.warn(`Accessibility scan completed: ${summary.total} violations found`)
  })

  test('should have proper page structure and landmarks', async ({page}) => {
    await test.step('Check page structure', async () => {
      // Verify main landmark exists
      const mainLandmark = page.locator('main, [role="main"]')
      await expect(mainLandmark).toBeVisible()

      // Verify navigation landmark exists
      const navLandmark = page.locator('nav, [role="navigation"]')
      await expect(navLandmark).toBeVisible()

      // Check for proper heading structure
      const h1 = page.locator('h1')
      await expect(h1).toBeVisible()

      // Should have only one h1
      await expect(h1).toHaveCount(1)
    })

    // Test screen reader compatibility
    await accessibilityTest.expectScreenReaderCompatible(
      page,
      'body',
      4, // Expected landmarks: header, nav, main, footer
    )
  })

  test('should have keyboard accessible navigation', async ({page}) => {
    await test.step('Test keyboard navigation', async () => {
      // Test main navigation links
      const navLinks = page.locator('nav a, [role="navigation"] a')
      const navCount = await navLinks.count()

      if (navCount > 0) {
        for (let i = 0; i < Math.min(navCount, 5); i++) {
          const link = navLinks.nth(i)
          const href = await link.getAttribute('href')
          if (href) {
            await accessibilityTest.expectKeyboardAccessible(page, `nav a[href="${href}"]`)
          }
        }
      }
    })

    // Test focus management
    await accessibilityTest.expectProperFocusManagement(page, 'body')
  })

  test('should have proper color contrast', async ({page}) => {
    // Test color contrast ratios
    await accessibilityTest.expectProperColorContrast(page)
  })

  test('should support screen readers', async ({page}) => {
    await test.step('Check semantic markup', async () => {
      // Verify semantic HTML elements are used
      const semanticElements = page.locator('main, nav, header, footer, section, article')
      await expect(semanticElements.first()).toBeVisible()

      // Check for skip links (bypass navigation)
      const skipLinks = page.locator('a[href="#main"], a[href="#content"]')
      if ((await skipLinks.count()) > 0) {
        await expect(skipLinks.first()).toBeInViewport()
      }
    })
  })

  test('should handle dynamic content accessibility', async ({page}) => {
    await test.step('Test dynamic content', async () => {
      // Check if there are any GPT cards on the page
      const gptCards = page.locator('[data-testid="gpt-card"], .gpt-card')
      const cardCount = await gptCards.count()

      if (cardCount > 0) {
        // Test first few cards for accessibility
        for (let i = 0; i < Math.min(cardCount, 3); i++) {
          const card = gptCards.nth(i)

          // Each card should be keyboard accessible
          await card.focus()
          await expect(card).toBeFocused()

          // Cards should have proper ARIA attributes or semantic structure
          const cardRole = await card.getAttribute('role')
          const cardAriaLabel = await card.getAttribute('aria-label')
          const cardText = await card.textContent()

          // Either has role/aria-label or meaningful text content
          expect(cardRole || cardAriaLabel || cardText?.trim()).toBeTruthy()
        }
      }
    })
  })

  test('should handle error states accessibly', async ({page}) => {
    await test.step('Test error state accessibility', async () => {
      // Look for any error messages or alerts
      const errorElements = page.locator('[role="alert"], .error, [aria-live]')
      const errorCount = await errorElements.count()

      if (errorCount > 0) {
        for (let i = 0; i < errorCount; i++) {
          const error = errorElements.nth(i)

          // Error should have proper ARIA attributes
          const role = await error.getAttribute('role')
          const ariaLive = await error.getAttribute('aria-live')

          // Should have role="alert" or aria-live attribute
          expect(role === 'alert' || ariaLive).toBeTruthy()
        }
      }
    })
  })
})
