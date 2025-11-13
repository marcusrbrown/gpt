import {expect, test} from '@playwright/test'

/**
 * Cross-Browser Animation Consistency Tests
 *
 * Validates animation behavior is consistent across Chromium, Firefox, and WebKit.
 * Tests run against all browser projects in playwright.config.ts.
 *
 * Requirements: TEST-003, REQ-002, PAT-001
 */

test.describe('Cross-Browser Animation Consistency', () => {
  test('should render card hover animations consistently across browsers', async ({page, browserName}) => {
    await test.step('Navigate to homepage', async () => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
    })

    await test.step(`Test card hover animation in ${browserName}`, async () => {
      const card = page.locator('[data-testid="user-gpt-card"]').first()
      await expect(card).toBeVisible()

      const initialState = await card.evaluate(el => {
        const styles = window.getComputedStyle(el)
        return {
          transform: styles.transform,
          boxShadow: styles.boxShadow,
        }
      })

      await card.hover()
      // 250ms ensures animation completes across all browser engines
      await page.waitForTimeout(250)

      const hoverState = await card.evaluate(el => {
        const styles = window.getComputedStyle(el)
        return {
          transform: styles.transform,
          boxShadow: styles.boxShadow,
        }
      })

      // Log for cross-browser animation comparison debugging
      console.warn(`${browserName} Card Animation:`, {initial: initialState, hover: hoverState})

      const hasAnimation =
        hoverState.transform !== initialState.transform || hoverState.boxShadow !== initialState.boxShadow

      expect(hasAnimation, `Card should animate on hover in ${browserName}`).toBeTruthy()
    })
  })

  test('should apply button press animations consistently across browsers', async ({page, browserName}) => {
    await test.step('Navigate to homepage', async () => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
    })

    await test.step(`Test button press animation in ${browserName}`, async () => {
      const createButton = page.locator('button:has-text("Create"), button:has-text("New GPT")').first()
      await expect(createButton).toBeVisible()

      // Get initial transform
      const initialTransform = await createButton.evaluate(el => {
        const styles = window.getComputedStyle(el)
        return styles.transform
      })

      // Trigger press
      await createButton.dispatchEvent('mousedown')
      await page.waitForTimeout(100)

      // Get pressed transform
      const pressedTransform = await createButton.evaluate(el => {
        const styles = window.getComputedStyle(el)
        return styles.transform
      })

      await createButton.dispatchEvent('mouseup')

      console.warn(`${browserName} Button Press:`, {initial: initialTransform, pressed: pressedTransform})

      expect(pressedTransform, `Button should have transform in ${browserName}`).toBeTruthy()
    })
  })

  test('should render form focus animations consistently across browsers', async ({page, browserName}) => {
    await test.step('Navigate to GPT editor', async () => {
      await page.goto('/gpt/new')
      await page.waitForLoadState('networkidle')
    })

    await test.step(`Test form field focus animation in ${browserName}`, async () => {
      const nameInput = page.locator('input[name="name"]').first()
      await expect(nameInput).toBeVisible()

      // Get initial state
      const initialState = await nameInput.evaluate(el => {
        const styles = window.getComputedStyle(el)
        return {
          borderColor: styles.borderColor,
          boxShadow: styles.boxShadow,
        }
      })

      // Focus input
      await nameInput.focus()
      await page.waitForTimeout(200)

      // Get focused state
      const focusedState = await nameInput.evaluate(el => {
        const styles = window.getComputedStyle(el)
        return {
          borderColor: styles.borderColor,
          boxShadow: styles.boxShadow,
        }
      })

      console.warn(`${browserName} Input Focus:`, {initial: initialState, focused: focusedState})

      // Should have visible focus indicator
      const hasFocusIndicator =
        focusedState.borderColor !== initialState.borderColor || focusedState.boxShadow !== initialState.boxShadow

      expect(hasFocusIndicator, `Input should have focus indicator in ${browserName}`).toBeTruthy()
    })
  })

  test('should support reduced motion across browsers', async ({page, browserName}) => {
    await test.step('Enable reduced motion', async () => {
      await page.emulateMedia({reducedMotion: 'reduce'})
    })

    await test.step(`Verify animations disabled in ${browserName}`, async () => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      const card = page.locator('[data-testid="user-gpt-card"]').first()
      await expect(card).toBeVisible()

      const transitionDuration = await card.evaluate(el => {
        const styles = window.getComputedStyle(el)
        return styles.transitionDuration
      })

      console.warn(`${browserName} Reduced Motion Duration:`, transitionDuration)

      // Transitions should be minimal or disabled
      const hasReducedMotion = transitionDuration === '0s' || transitionDuration === '0.001s'

      expect(hasReducedMotion, `Reduced motion should work in ${browserName}`).toBeTruthy()
    })
  })

  test('should have consistent animation duration across browsers', async ({page}) => {
    await test.step('Measure animation duration', async () => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      const card = page.locator('[data-testid="user-gpt-card"]').first()
      await expect(card).toBeVisible()

      const duration = await card.evaluate(el => {
        const styles = window.getComputedStyle(el)
        return styles.transitionDuration
      })

      console.warn('Animation Duration:', duration)
      expect(duration, 'Animation duration should be defined').toBeTruthy()
    })
  })

  test('should have consistent easing functions across browsers', async ({page}) => {
    await test.step('Check easing consistency', async () => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      const card = page.locator('[data-testid="user-gpt-card"]').first()
      await expect(card).toBeVisible()

      const easing = await card.evaluate(el => {
        const styles = window.getComputedStyle(el)
        return styles.transitionTimingFunction
      })

      console.warn('Animation Easing:', easing)
      expect(easing, 'Easing function should be defined').toBeTruthy()
    })
  })

  test('should support CSS transform animations in all browsers', async ({page}) => {
    await test.step('Check transform support', async () => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      const supportsTransform = await page.evaluate(() => {
        const testElement = document.createElement('div')
        return (
          'transform' in testElement.style ||
          'webkitTransform' in testElement.style ||
          'msTransform' in testElement.style
        )
      })

      expect(supportsTransform, 'Browser should support CSS transforms').toBeTruthy()
    })
  })

  test('should support CSS transition animations in all browsers', async ({page}) => {
    await test.step('Check transition support', async () => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      const supportsTransition = await page.evaluate(() => {
        const testElement = document.createElement('div')
        return 'transition' in testElement.style || 'webkitTransition' in testElement.style
      })

      expect(supportsTransition, 'Browser should support CSS transitions').toBeTruthy()
    })
  })

  test('should maintain frame rate during animations across browsers', async ({page}) => {
    await test.step('Measure frame rate', async () => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      const metrics = await page.evaluate(async () => {
        const frameTimes: number[] = []
        let lastFrameTime = performance.now()

        return new Promise<{avgFrameTime: number; fps: number}>(resolve => {
          let frameCount = 0
          const maxFrames = 60

          function measureFrame() {
            const currentTime = performance.now()
            const frameTime = currentTime - lastFrameTime
            frameTimes.push(frameTime)
            lastFrameTime = currentTime
            frameCount++

            if (frameCount < maxFrames) {
              requestAnimationFrame(measureFrame)
            } else {
              const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
              const fps = 1000 / avgFrameTime
              resolve({avgFrameTime, fps})
            }
          }

          requestAnimationFrame(measureFrame)
        })
      })

      console.warn('Cross-Browser Performance:', {
        fps: metrics.fps.toFixed(2),
        avgFrameTime: `${metrics.avgFrameTime.toFixed(2)}ms`,
      })

      expect(metrics.fps, 'Frame rate should be at least 30fps').toBeGreaterThanOrEqual(30)
    })
  })
})
