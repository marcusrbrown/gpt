import {accessibilityTest, expect, test} from '../accessibility'
import {getAccessibilityConfig} from '../accessibility/utils/accessibility-config'

/**
 * Card Components Accessibility Tests
 * Tests keyboard navigation and screen reader compatibility for UserGPTCard, FeatureCard, and Card components
 * Ensures WCAG 2.1 AA compliance for card-based interactions
 */
test.describe('Card Components Accessibility', () => {
  test.describe('UserGPTCard', () => {
    test.beforeEach(async ({page}) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
    })

    test('should support keyboard navigation for GPT cards', async ({page}) => {
      await test.step('Test UserGPTCard keyboard accessibility', async () => {
        // Run card-specific accessibility scan
        await accessibilityTest.expectAccessible(page, getAccessibilityConfig('navigation'), 0, 0)

        // Find all user GPT cards on the page
        const gptCards = page.locator('[data-testid="user-gpt-card"]')
        const cardCount = await gptCards.count()

        if (cardCount > 0) {
          // Test each card's keyboard accessibility
          for (let i = 0; i < Math.min(cardCount, 3); i++) {
            const card = gptCards.nth(i)

            // Test card focusability
            await card.focus()
            await expect(card).toBeFocused()

            // Test focus ring visibility
            const focusedCard = page.locator(':focus')
            await expect(focusedCard).toHaveClass(/focus-ring|focus:ring/)

            // Test edit button accessibility
            const editButton = card.locator('a[href*="/gpt/edit/"]')
            if ((await editButton.count()) > 0) {
              await editButton.focus()
              await expect(editButton).toBeFocused()

              // Test accessible name
              const accessibleName = (await editButton.getAttribute('aria-label')) || (await editButton.textContent())
              expect(accessibleName).toBeTruthy()
              expect(accessibleName?.toLowerCase()).toContain('edit')
            }

            // Test test button accessibility
            const testButton = card.locator('a[href*="/gpt/test/"]')
            if ((await testButton.count()) > 0) {
              await testButton.focus()
              await expect(testButton).toBeFocused()

              // Test accessible name
              const accessibleName = (await testButton.getAttribute('aria-label')) || (await testButton.textContent())
              expect(accessibleName).toBeTruthy()
              expect(accessibleName?.toLowerCase()).toContain('test')
            }
          }
        }
      })
    })

    test('should provide proper screen reader announcements', async ({page}) => {
      await test.step('Test UserGPTCard screen reader compatibility', async () => {
        // Find user GPT cards
        const gptCards = page.locator('[data-testid="user-gpt-card"]')
        const cardCount = await gptCards.count()

        if (cardCount > 0) {
          const firstCard = gptCards.first()

          // Test card has accessible structure
          const cardName = firstCard.locator('[data-testid="gpt-name"]')
          await expect(cardName).toBeVisible()

          // Test semantic structure with proper headings
          const heading = cardName.locator('h3, h4, h5, h6')
          if ((await heading.count()) > 0) {
            await expect(heading).toBeVisible()
          }

          // Test description accessibility
          const description = firstCard.locator('text=/.*/')
          if ((await description.count()) > 0) {
            // Ensure text content is accessible
            const textContent = await description.first().textContent()
            expect(textContent?.trim().length).toBeGreaterThan(0)
          }

          // Test button labels are descriptive
          const editButton = firstCard.locator('a[href*="/gpt/edit/"]')
          if ((await editButton.count()) > 0) {
            const buttonText = await editButton.textContent()
            const ariaLabel = await editButton.getAttribute('aria-label')
            const accessibleText = ariaLabel || buttonText
            expect(accessibleText).toBeTruthy()
            expect(accessibleText?.toLowerCase()).toMatch(/edit|modify|update/)
          }

          const testButton = firstCard.locator('a[href*="/gpt/test/"]')
          if ((await testButton.count()) > 0) {
            const buttonText = await testButton.textContent()
            const ariaLabel = await testButton.getAttribute('aria-label')
            const accessibleText = ariaLabel || buttonText
            expect(accessibleText).toBeTruthy()
            expect(accessibleText?.toLowerCase()).toMatch(/test|try|run/)
          }
        }
      })
    })

    test('should handle error and loading states accessibly', async ({page}) => {
      await test.step('Test UserGPTCard state announcements', async () => {
        // This would need to be tested with specific state configurations
        // For now, we test the structure that should support these states

        const gptCards = page.locator('[data-testid="user-gpt-card"]')
        const cardCount = await gptCards.count()

        if (cardCount > 0) {
          const card = gptCards.first()

          // Test for loading state indicators
          const loadingIndicators = card.locator('[aria-busy="true"], .skeleton, [role="progressbar"]')
          if ((await loadingIndicators.count()) > 0) {
            // Loading state should be announced
            const loadingElement = loadingIndicators.first()
            const ariaBusy = await loadingElement.getAttribute('aria-busy')
            const role = await loadingElement.getAttribute('role')
            expect(ariaBusy === 'true' || role === 'progressbar').toBeTruthy()
          }

          // Test for error state indicators
          const errorIndicators = card.locator('[role="alert"], .error, [aria-live="polite"]')
          if ((await errorIndicators.count()) > 0) {
            // Error state should be announced
            const errorElement = errorIndicators.first()
            const role = await errorElement.getAttribute('role')
            const ariaLive = await errorElement.getAttribute('aria-live')
            expect(role === 'alert' || ariaLive === 'polite').toBeTruthy()
          }
        }
      })
    })
  })

  test.describe('FeatureCard', () => {
    test.beforeEach(async ({page}) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
    })

    test('should support keyboard interaction for feature cards', async ({page}) => {
      await test.step('Test FeatureCard keyboard accessibility', async () => {
        // Look for feature cards on the page (they might be on a different route)
        const featureCards = page.locator('[data-testid="feature-card"], .feature-card')
        const cardCount = await featureCards.count()

        if (cardCount > 0) {
          for (let i = 0; i < Math.min(cardCount, 3); i++) {
            const card = featureCards.nth(i)

            // Test card is keyboard accessible
            await card.focus()
            await expect(card).toBeFocused()

            // Test Enter key activation
            await page.keyboard.press('Enter')

            // Should navigate or trigger action (we'll check for navigation)
            await page.waitForTimeout(100) // Short wait for navigation

            // Test Escape to return focus if needed
            await page.keyboard.press('Escape')
          }
        } else {
          // Navigate to a page that might have feature cards
          await page.goto('/docs')
          await page.waitForLoadState('networkidle')

          const docsFeatureCards = page.locator('[data-testid="feature-card"], .feature-card')
          const docsCardCount = await docsFeatureCards.count()

          if (docsCardCount > 0) {
            const card = docsFeatureCards.first()
            await card.focus()
            await expect(card).toBeFocused()
          }
        }
      })
    })

    test('should provide accessible content structure', async ({page}) => {
      await test.step('Test FeatureCard content accessibility', async () => {
        const featureCards = page.locator('[data-testid="feature-card"], .feature-card')
        const cardCount = await featureCards.count()

        if (cardCount === 0) {
          // Try docs page
          await page.goto('/docs')
          await page.waitForLoadState('networkidle')
        }

        const cards = page.locator('[data-testid="feature-card"], .feature-card')
        const finalCardCount = await cards.count()

        if (finalCardCount > 0) {
          const card = cards.first()

          // Test heading structure
          const headings = card.locator('h1, h2, h3, h4, h5, h6')
          if ((await headings.count()) > 0) {
            const heading = headings.first()
            await expect(heading).toBeVisible()

            const headingText = await heading.textContent()
            expect(headingText?.trim().length).toBeGreaterThan(0)
          }

          // Test icon accessibility
          const icons = card.locator('svg, [role="img"]')
          if ((await icons.count()) > 0) {
            const icon = icons.first()
            const ariaLabel = await icon.getAttribute('aria-label')
            const ariaHidden = await icon.getAttribute('aria-hidden')

            // Icon should either have a label or be hidden from screen readers
            expect(ariaLabel || ariaHidden === 'true').toBeTruthy()
          }

          // Test action text accessibility
          const actionText = card.locator('text=/learn more|open|visit|explore/i')
          if ((await actionText.count()) > 0) {
            const action = actionText.first()
            await expect(action).toBeVisible()
          }
        }
      })
    })
  })

  test.describe('Generic Card Component', () => {
    test.beforeEach(async ({page}) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
    })

    test('should support keyboard navigation for generic cards', async ({page}) => {
      await test.step('Test generic Card keyboard accessibility', async () => {
        // Look for any card components that might use the generic Card
        const genericCards = page.locator('[data-testid="card"], .card:not([data-testid])')
        const cardCount = await genericCards.count()

        if (cardCount > 0) {
          for (let i = 0; i < Math.min(cardCount, 3); i++) {
            const card = genericCards.nth(i)

            // Test if card is focusable (it should be if interactive)
            await card.focus()

            // Check if it has interactive elements
            const links = card.locator('a')
            const buttons = card.locator('button')

            if ((await links.count()) > 0) {
              const link = links.first()
              await link.focus()
              await expect(link).toBeFocused()

              // Test link accessibility
              const href = await link.getAttribute('href')
              const text = await link.textContent()
              const ariaLabel = await link.getAttribute('aria-label')

              expect(href || text || ariaLabel).toBeTruthy()
            }

            if ((await buttons.count()) > 0) {
              const button = buttons.first()
              await button.focus()
              await expect(button).toBeFocused()

              // Test button accessibility
              const text = await button.textContent()
              const ariaLabel = await button.getAttribute('aria-label')

              expect(text || ariaLabel).toBeTruthy()
            }
          }
        }
      })
    })

    test('should maintain focus management in card interactions', async ({page}) => {
      await test.step('Test Card focus management', async () => {
        // Test tab order through card components
        const interactiveElements = page.locator('a, button, [tabindex="0"], [tabindex="1"]')
        const elementCount = await interactiveElements.count()

        if (elementCount > 0) {
          // Start from first interactive element
          const firstElement = interactiveElements.first()
          await firstElement.focus()
          await page.waitForTimeout(50)

          // Test tab navigation through multiple elements
          for (let i = 0; i < Math.min(elementCount, 10); i++) {
            await page.keyboard.press('Tab')
            const currentElement = page.locator(':focus')
            await expect(currentElement).toBeFocused()

            // Verify focus is visible
            const focusOutline = await currentElement.evaluate(el => {
              const styles = window.getComputedStyle(el)
              return (
                styles.outline !== 'none' ||
                styles.boxShadow.includes('inset') ||
                el.classList.contains('focus-ring') ||
                el.classList.contains('focus:ring')
              )
            })
            expect(focusOutline).toBeTruthy()
          }
        }
      })
    })
  })

  test.describe('Card Accessibility Integration', () => {
    test('should pass comprehensive accessibility audit', async ({page}) => {
      await test.step('Run comprehensive card accessibility audit', async () => {
        await page.goto('/')
        await page.waitForLoadState('networkidle')

        // Run comprehensive accessibility scan focusing on cards
        await accessibilityTest.expectAccessible(page, getAccessibilityConfig('strict'), 0, 1)
      })
    })

    test('should maintain accessibility standards across themes', async ({page}) => {
      await test.step('Test accessibility in light theme', async () => {
        await page.goto('/')
        await page.waitForLoadState('networkidle')

        // Ensure light theme
        await page.evaluate(() => {
          document.documentElement.classList.remove('dark')
          document.documentElement.classList.add('light')
        })

        await accessibilityTest.expectAccessible(page, getAccessibilityConfig('color'), 0, 0)
      })

      await test.step('Test accessibility in dark theme', async () => {
        // Switch to dark theme
        await page.evaluate(() => {
          document.documentElement.classList.remove('light')
          document.documentElement.classList.add('dark')
        })

        await page.waitForTimeout(100) // Allow theme transition

        await accessibilityTest.expectAccessible(page, getAccessibilityConfig('color'), 0, 0)
      })
    })
  })
})
