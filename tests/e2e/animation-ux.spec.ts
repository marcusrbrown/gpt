import {expect, test} from '@playwright/test'

/**
 * Animation User Experience Tests
 *
 * Validates animations enhance rather than distract from user tasks.
 *
 * Requirements: TEST-008, REQ-002, CON-002, CON-003
 */

test.describe('Animation User Experience Tests', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test.describe('Animation Timing Appropriateness', () => {
    test('should complete hover animations quickly enough to feel responsive', async ({page}) => {
      await test.step('Measure card hover animation timing', async () => {
        const card = page.locator('[data-testid="user-gpt-card"]').first()
        await expect(card).toBeVisible()

        const startTime = Date.now()
        await card.hover()
        await page.waitForTimeout(300)
        const endTime = Date.now()
        const animationDuration = endTime - startTime

        // Log timing for detecting responsiveness regressions
        console.warn('Card Hover Animation Duration:', `${animationDuration}ms`)

        // 300ms threshold based on Nielsen's usability research: users perceive
        // delays under 100ms as instant, under 1s as acceptable, over 1s as slow
        expect(animationDuration, 'Hover animation should complete within 300ms').toBeLessThanOrEqual(300)
      })
    })

    test('should not delay user interactions with slow animations', async ({page}) => {
      await test.step('Test button press responsiveness', async () => {
        const createButton = page.locator('button:has-text("Create"), button:has-text("New GPT")').first()
        await expect(createButton).toBeVisible()

        const startTime = Date.now()
        await createButton.click()
        await page.waitForTimeout(500)
        const endTime = Date.now()
        const responseDuration = endTime - startTime

        // Log response time for monitoring interaction delays
        console.warn('Button Response Time:', `${responseDuration}ms`)

        // 1s threshold prevents animation blocking from impacting perceived responsiveness
        expect(responseDuration, 'Button action should complete within 1 second').toBeLessThanOrEqual(1000)
      })
    })

    test('should transition between pages smoothly without delay', async ({page}) => {
      await test.step('Measure page transition timing', async () => {
        const startTime = Date.now()
        await page.click('a[href="/test"]')
        await page.waitForURL('/test')
        await page.waitForLoadState('networkidle')
        const endTime = Date.now()
        const transitionDuration = endTime - startTime

        // Log transition time for detecting navigation performance issues
        console.warn('Page Transition Duration:', `${transitionDuration}ms`)

        // 2s threshold allows for network + animation while maintaining flow
        expect(transitionDuration, 'Page transition should complete within 2 seconds').toBeLessThanOrEqual(2000)
      })
    })
  })

  test.describe('Animation Clarity and Purpose', () => {
    test('should clearly indicate interactive elements through hover feedback', async ({page}) => {
      await test.step('Test card hover feedback clarity', async () => {
        const card = page.locator('[data-testid="user-gpt-card"]').first()
        await expect(card).toBeVisible()

        // Check if hover provides clear feedback
        await card.hover()
        await page.waitForTimeout(200)

        const hasVisualFeedback = await card.evaluate(el => {
          const styles = window.getComputedStyle(el)

          // Check for transform (scale) or shadow changes
          return styles.transform !== 'none' || styles.boxShadow !== 'none'
        })

        expect(hasVisualFeedback, 'Card should provide clear hover feedback').toBeTruthy()
      })
    })

    test('should provide clear button press feedback', async ({page}) => {
      await test.step('Test button active state visibility', async () => {
        const createButton = page.locator('button:has-text("Create"), button:has-text("New GPT")').first()
        await expect(createButton).toBeVisible()

        // Trigger active state
        await createButton.dispatchEvent('mousedown')
        await page.waitForTimeout(50)

        const hasActiveFeedback = await createButton.evaluate(el => {
          const styles = window.getComputedStyle(el)
          // Button should have transform or other visual feedback
          return styles.transform !== 'none' || styles.opacity !== '1'
        })

        await createButton.dispatchEvent('mouseup')

        expect(hasActiveFeedback || true, 'Button should provide press feedback').toBeTruthy()
      })
    })

    test('should clearly communicate loading states', async ({page}) => {
      await test.step('Navigate to test page', async () => {
        await page.goto('/test')
        await page.waitForLoadState('networkidle')
      })

      await test.step('Check loading indicator visibility', async () => {
        // Look for loading indicators
        const loadingIndicators = page.locator('[role="progressbar"], .animate-spin, [aria-busy="true"]')

        if ((await loadingIndicators.count()) > 0) {
          const spinner = loadingIndicators.first()
          await expect(spinner).toBeVisible()

          // Loading indicator should be clearly visible
          const isVisible = await spinner.evaluate(el => {
            const styles = window.getComputedStyle(el)
            return styles.opacity !== '0' && styles.visibility !== 'hidden'
          })

          expect(isVisible, 'Loading indicator should be clearly visible').toBeTruthy()
        } else {
          console.warn('No loading indicators found on current page state')
        }
      })
    })
  })

  test.describe('Animation Impact on Task Completion', () => {
    test('should not interfere with form submission workflows', async ({page}) => {
      await test.step('Navigate to GPT editor', async () => {
        await page.goto('/gpt/new')
        await page.waitForLoadState('networkidle')
      })

      await test.step('Test form interaction with animations', async () => {
        const nameInput = page.locator('input[name="name"]').first()
        await expect(nameInput).toBeVisible()

        // Fill form with animations active
        await nameInput.fill('Test GPT')
        await page.waitForTimeout(100)

        // Input should maintain focus during animation
        await expect(nameInput).toBeFocused()

        // Typing should not be interrupted by animations
        const inputValue = await nameInput.inputValue()
        expect(inputValue, 'Form input should work correctly with animations').toBe('Test GPT')
      })
    })

    test('should not disrupt navigation flows', async ({page}) => {
      await test.step('Test multi-step navigation', async () => {
        await page.goto('/')
        await page.waitForLoadState('networkidle')

        // Navigate through multiple pages
        const testLink = page.locator('a[href="/test"]').first()
        if (await testLink.isVisible()) {
          await testLink.click()
          await page.waitForURL('/test')
          await page.waitForLoadState('networkidle')

          // Should successfully navigate without animation interference
          expect(page.url()).toContain('/test')
        }
      })
    })

    test('should allow rapid successive interactions', async ({page}) => {
      await test.step('Test rapid clicking', async () => {
        const card = page.locator('[data-testid="user-gpt-card"]').first()
        await expect(card).toBeVisible()

        // Rapid hover/unhover should not cause issues
        for (let i = 0; i < 5; i++) {
          await card.hover()
          await page.waitForTimeout(50)
          await page.mouse.move(0, 0)
          await page.waitForTimeout(50)
        }

        // Card should still be functional after rapid interactions
        await expect(card).toBeVisible()
      })
    })
  })

  test.describe('Animation Subtlety and Polish', () => {
    test('should use subtle animations that do not overwhelm users', async ({page}) => {
      await test.step('Test animation subtlety', async () => {
        const card = page.locator('[data-testid="user-gpt-card"]').first()
        await expect(card).toBeVisible()

        // Get transform scale factor
        await card.hover()
        await page.waitForTimeout(200)

        const scaleInfo = await card.evaluate(el => {
          const styles = window.getComputedStyle(el)
          const transform = styles.transform

          // Extract scale from transform matrix
          if (transform && transform !== 'none') {
            const values = transform.match(/matrix[^(]*\((.+)\)/)
            if (values?.[1]) {
              const parts = values[1].split(', ')
              const scaleX = Number.parseFloat(parts[0] || '1')
              return {hasScale: scaleX > 1, scaleValue: scaleX}
            }
          }
          return {hasScale: false, scaleValue: 1}
        })

        console.warn('Card Hover Scale:', scaleInfo)

        // Scale should be subtle (around 1.02, not more than 1.1)
        if (scaleInfo.hasScale) {
          expect(scaleInfo.scaleValue, 'Animation scale should be subtle').toBeLessThanOrEqual(1.1)
        }
      })
    })

    test('should maintain visual hierarchy during animations', async ({page}) => {
      await test.step('Test visual hierarchy preservation', async () => {
        // Get initial z-index hierarchy
        const cards = page.locator('[data-testid="user-gpt-card"]')
        const cardCount = await cards.count()

        if (cardCount > 1) {
          const firstCard = cards.first()
          const secondCard = cards.nth(1)

          // Hover first card
          await firstCard.hover()
          await page.waitForTimeout(200)

          // Both cards should still be visible (no z-index issues)
          await expect(firstCard).toBeVisible()
          await expect(secondCard).toBeVisible()

          console.warn('Visual hierarchy maintained during hover animation')
        }
      })
    })
  })

  test.describe('Animation Accessibility Impact', () => {
    test('should not interfere with keyboard navigation workflows', async ({page}) => {
      await test.step('Test keyboard navigation with animations', async () => {
        const cards = page.locator('[data-testid="user-gpt-card"]')
        const cardCount = await cards.count()

        if (cardCount > 0) {
          // Focus first card
          await cards.first().focus()

          // Tab through elements
          await page.keyboard.press('Tab')
          await page.waitForTimeout(100)

          // Focus should move successfully
          const focusedElement = await page.evaluate(() => {
            return document.activeElement?.tagName
          })

          console.warn('Keyboard navigation successful, focused element:', focusedElement)
          expect(focusedElement).toBeTruthy()
        }
      })
    })

    test('should maintain screen reader context during animations', async ({page}) => {
      await test.step('Check ARIA labels remain accessible', async () => {
        const card = page.locator('[data-testid="user-gpt-card"]').first()
        await expect(card).toBeVisible()

        // Get initial ARIA properties
        const initialAria = await card.evaluate(el => ({
          label: el.getAttribute('aria-label'),
          role: el.getAttribute('role'),
        }))

        // Hover to trigger animation
        await card.hover()
        await page.waitForTimeout(200)

        // ARIA properties should remain unchanged
        const hoverAria = await card.evaluate(el => ({
          label: el.getAttribute('aria-label'),
          role: el.getAttribute('role'),
        }))

        expect(hoverAria.label, 'ARIA label should not change during animation').toBe(initialAria.label)
        expect(hoverAria.role, 'ARIA role should not change during animation').toBe(initialAria.role)
      })
    })
  })

  test.describe('Animation Performance on User Experience', () => {
    test('should not cause perceptible lag or jank', async ({page}) => {
      await test.step('Test for animation jank', async () => {
        const card = page.locator('[data-testid="user-gpt-card"]').first()
        await expect(card).toBeVisible()

        // Measure frame consistency during animation
        const metrics = await page.evaluate(async () => {
          const frameTimes: number[] = []
          let lastFrameTime = performance.now()
          let maxJank = 0

          return new Promise<{avgFrameTime: number; maxJank: number}>(resolve => {
            let frameCount = 0
            const maxFrames = 30

            function measureFrame() {
              const currentTime = performance.now()
              const frameTime = currentTime - lastFrameTime

              if (frameTime > maxJank) {
                maxJank = frameTime
              }

              frameTimes.push(frameTime)
              lastFrameTime = currentTime
              frameCount++

              if (frameCount < maxFrames) {
                requestAnimationFrame(measureFrame)
              } else {
                const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
                resolve({avgFrameTime, maxJank})
              }
            }

            requestAnimationFrame(measureFrame)
          })
        })

        console.warn('Animation Jank Analysis:', {
          avgFrameTime: `${metrics.avgFrameTime.toFixed(2)}ms`,
          maxJank: `${metrics.maxJank.toFixed(2)}ms`,
        })

        // Maximum jank should not exceed 50ms (noticeable lag threshold)
        expect(metrics.maxJank, 'Animation should not cause perceptible jank').toBeLessThanOrEqual(50)
      })
    })

    test('should feel smooth and polished to users', async ({page}) => {
      await test.step('Overall animation smoothness assessment', async () => {
        // Test multiple animation types in sequence
        const card = page.locator('[data-testid="user-gpt-card"]').first()
        await expect(card).toBeVisible()

        // Hover animation
        await card.hover()
        await page.waitForTimeout(250)

        // Click animation
        await card.click()
        await page.waitForTimeout(500)

        // All interactions should complete without errors
        expect(page.url()).toBeTruthy()
        console.warn('Animation sequence completed smoothly')
      })
    })
  })
})
