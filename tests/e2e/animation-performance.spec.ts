import {expect, test} from '@playwright/test'

/**
 * Animation Performance Tests
 *
 * Validates animation smoothness at 60fps across all animated components.
 * Uses Playwright's Performance API and Chrome DevTools Protocol to measure:
 * - Frame rate (target: 60fps)
 * - Animation timing consistency
 * - Layout stability during animations
 * - Memory usage during animations
 *
 * Requirements:
 * - TEST-001: Animation performance tests ensuring 60fps smooth animations
 * - REQ-002: Animation performance must not degrade user experience
 * - A11Y-002: Animations respect user preferences for reduced motion
 */

/**
 * Performance metrics baseline thresholds
 */
const PERFORMANCE_THRESHOLDS = {
  // Target frame rate (60fps = ~16.67ms per frame)
  targetFrameTime: 16.67,
  // Allow up to 20% deviation from target (acceptable: 13-20ms per frame)
  frameTimeVariance: 0.2,
  // Maximum acceptable frame time (30fps fallback = ~33ms per frame)
  maxFrameTime: 33,
  // Minimum acceptable frame rate
  minFps: 50,
  // Maximum memory increase during animations (MB)
  maxMemoryIncrease: 50,
  // Layout shift threshold (Cumulative Layout Shift)
  maxLayoutShift: 0.1,
} as const

/**
 * Measure frame rate during animation using requestAnimationFrame
 */
async function measureAnimationFrameRate(
  page: import('@playwright/test').Page,
  animationSelector: string,
  durationMs = 1000,
) {
  return page.evaluate(
    async ({selector, duration}) => {
      const element = document.querySelector(selector)
      if (!element) {
        throw new Error(`Element not found: ${selector}`)
      }

      const frameTimes: number[] = []
      let lastFrameTime = performance.now()
      let animationStartTime = 0

      return new Promise<{
        avgFrameTime: number
        minFrameTime: number
        maxFrameTime: number
        frameCount: number
        droppedFrames: number
        fps: number
      }>(resolve => {
        function measureFrame() {
          const currentTime = performance.now()

          if (animationStartTime === 0) {
            animationStartTime = currentTime
          }

          const frameTime = currentTime - lastFrameTime
          frameTimes.push(frameTime)
          lastFrameTime = currentTime

          if (currentTime - animationStartTime < duration) {
            requestAnimationFrame(measureFrame)
          } else {
            // Calculate metrics
            const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
            const minFrameTime = Math.min(...frameTimes)
            const maxFrameTime = Math.max(...frameTimes)
            const fps = 1000 / avgFrameTime
            const droppedFrames = frameTimes.filter(ft => ft > 33).length

            resolve({
              avgFrameTime,
              minFrameTime,
              maxFrameTime,
              frameCount: frameTimes.length,
              droppedFrames,
              fps,
            })
          }
        }

        // Trigger animation (hover for card animations)
        if (element instanceof HTMLElement) {
          element.dispatchEvent(new MouseEvent('mouseenter', {bubbles: true}))
        }

        requestAnimationFrame(measureFrame)
      })
    },
    {selector: animationSelector, duration: durationMs},
  )
}

/**
 * Measure layout stability during animation
 */
async function measureLayoutStability(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(async () => {
    return new Promise<number>(resolve => {
      let cls = 0

      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
            cls += (entry as any).value
          }
        }
      })

      observer.observe({type: 'layout-shift', buffered: true})

      setTimeout(() => {
        observer.disconnect()
        resolve(cls)
      }, 2000)
    })
  })
}

test.describe('Animation Performance Tests', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test.describe('Card Animation Performance', () => {
    test('should maintain 60fps during card hover animations', async ({page}) => {
      await test.step('Measure card hover animation frame rate', async () => {
        // Find first GPT card
        const card = page.locator('[data-testid="user-gpt-card"]').first()
        await expect(card).toBeVisible()

        // Get card selector for performance measurement
        const cardId = await card.getAttribute('data-testid')

        // Measure animation performance
        const metrics = await measureAnimationFrameRate(page, `[data-testid="${cardId}"]`, 1000)

        console.warn('Card Animation Performance:', {
          fps: metrics.fps.toFixed(2),
          avgFrameTime: `${metrics.avgFrameTime.toFixed(2)}ms`,
          frameCount: metrics.frameCount,
          droppedFrames: metrics.droppedFrames,
        })

        // Validate performance thresholds
        expect(metrics.fps, 'Frame rate should be at least 50fps').toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.minFps)
        expect(metrics.avgFrameTime, 'Average frame time should be under 20ms').toBeLessThanOrEqual(
          PERFORMANCE_THRESHOLDS.targetFrameTime * (1 + PERFORMANCE_THRESHOLDS.frameTimeVariance),
        )
        expect(metrics.droppedFrames, 'Should have minimal dropped frames').toBeLessThanOrEqual(
          metrics.frameCount * 0.1,
        )
      })
    })

    test('should not cause layout shifts during card animations', async ({page}) => {
      await test.step('Measure layout stability', async () => {
        const card = page.locator('[data-testid="user-gpt-card"]').first()
        await expect(card).toBeVisible()

        // Trigger hover animation
        await card.hover()

        // Measure cumulative layout shift
        const cls = await measureLayoutStability(page)

        console.warn('Card Animation Layout Stability:', {
          cumulativeLayoutShift: cls.toFixed(4),
        })

        expect(cls, 'Cumulative Layout Shift should be minimal').toBeLessThanOrEqual(
          PERFORMANCE_THRESHOLDS.maxLayoutShift,
        )
      })
    })
  })

  test.describe('Button Press Animation Performance', () => {
    test('should maintain smooth button press feedback at 60fps', async ({page}) => {
      await test.step('Measure button press animation', async () => {
        const createButton = page.locator('button:has-text("Create"), button:has-text("New GPT")').first()
        await expect(createButton).toBeVisible()

        // Measure animation during button interaction
        const metrics = await page.evaluate(
          async button => {
            const frameTimes: number[] = []
            let lastFrameTime = performance.now()

            return new Promise<{avgFrameTime: number; fps: number}>(resolve => {
              let frameCount = 0
              const maxFrames = 60 // ~1 second at 60fps

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

              // Trigger button press animation
              if (button instanceof HTMLElement) {
                button.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}))
                setTimeout(() => {
                  button.dispatchEvent(new MouseEvent('mouseup', {bubbles: true}))
                }, 100)
              }

              requestAnimationFrame(measureFrame)
            })
          },
          await createButton.elementHandle(),
        )

        console.warn('Button Press Animation Performance:', {
          fps: metrics.fps.toFixed(2),
          avgFrameTime: `${metrics.avgFrameTime.toFixed(2)}ms`,
        })

        expect(metrics.fps, 'Button animation FPS should be at least 50fps').toBeGreaterThanOrEqual(
          PERFORMANCE_THRESHOLDS.minFps,
        )
      })
    })
  })

  test.describe('Form Field Focus Animation Performance', () => {
    test('should maintain smooth focus animations on form inputs', async ({page}) => {
      await test.step('Navigate to GPT editor', async () => {
        await page.goto('/gpt/new')
        await page.waitForLoadState('networkidle')
      })

      await test.step('Measure form focus animation', async () => {
        const nameInput = page.locator('input[name="name"]').first()
        await expect(nameInput).toBeVisible()

        // Measure animation during focus transition
        const metrics = await page.evaluate(
          async input => {
            const frameTimes: number[] = []
            let lastFrameTime = performance.now()

            return new Promise<{avgFrameTime: number; fps: number}>(resolve => {
              let frameCount = 0
              const maxFrames = 30 // ~500ms at 60fps

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

              // Trigger focus animation
              if (input instanceof HTMLElement) {
                input.focus()
              }

              requestAnimationFrame(measureFrame)
            })
          },
          await nameInput.elementHandle(),
        )

        console.warn('Form Focus Animation Performance:', {
          fps: metrics.fps.toFixed(2),
          avgFrameTime: `${metrics.avgFrameTime.toFixed(2)}ms`,
        })

        expect(metrics.fps, 'Form focus animation FPS should be at least 50fps').toBeGreaterThanOrEqual(
          PERFORMANCE_THRESHOLDS.minFps,
        )
      })
    })
  })

  test.describe('Loading State Animation Performance', () => {
    test('should maintain performance during loading spinner animations', async ({page}) => {
      await test.step('Measure loading spinner performance', async () => {
        // Navigate to test pane which has loading states
        await page.goto('/test')
        await page.waitForLoadState('networkidle')

        // Trigger action that shows loading state
        const sendButton = page.locator('button:has-text("Send")').first()
        if (await sendButton.isVisible()) {
          // Measure spinner animation if visible
          const spinner = page.locator('[role="progressbar"], .animate-spin').first()

          if (await spinner.isVisible()) {
            const metrics = await page.evaluate(async () => {
              const frameTimes: number[] = []
              let lastFrameTime = performance.now()

              return new Promise<{avgFrameTime: number; fps: number}>(resolve => {
                let frameCount = 0
                const maxFrames = 60 // 1 second

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

            console.warn('Loading Spinner Animation Performance:', {
              fps: metrics.fps.toFixed(2),
              avgFrameTime: `${metrics.avgFrameTime.toFixed(2)}ms`,
            })

            expect(metrics.fps, 'Loading spinner FPS should be at least 50fps').toBeGreaterThanOrEqual(
              PERFORMANCE_THRESHOLDS.minFps,
            )
          }
        }
      })
    })
  })

  test.describe('Page Transition Performance', () => {
    test('should maintain performance during route transitions', async ({page}) => {
      await test.step('Measure navigation transition performance', async () => {
        await page.goto('/')
        await page.waitForLoadState('networkidle')

        // Start performance measurement
        await page.evaluate(() => {
          performance.mark('navigation-start')
        })

        // Navigate to different page
        await page.click('a[href="/test"]')
        await page.waitForURL('/test')
        await page.waitForLoadState('networkidle')

        // End performance measurement
        const navigationMetrics = await page.evaluate(() => {
          performance.mark('navigation-end')
          performance.measure('navigation-duration', 'navigation-start', 'navigation-end')

          const measures = performance.getEntriesByType('measure')
          const navigationMeasure = measures.find(m => m.name === 'navigation-duration')

          return {
            duration: navigationMeasure?.duration || 0,
          }
        })

        console.warn('Page Transition Performance:', {
          navigationDuration: `${navigationMetrics.duration.toFixed(2)}ms`,
        })

        // Page transitions should complete within reasonable time (2s)
        expect(navigationMetrics.duration, 'Page transition should complete within 2 seconds').toBeLessThanOrEqual(2000)
      })
    })
  })

  test.describe('Reduced Motion Performance', () => {
    test('should respect prefers-reduced-motion and skip animations', async ({page}) => {
      await test.step('Enable reduced motion preference', async () => {
        await page.emulateMedia({reducedMotion: 'reduce'})
      })

      await test.step('Verify animations are disabled', async () => {
        await page.goto('/')
        await page.waitForLoadState('networkidle')

        // Check if animations are properly disabled
        const card = page.locator('[data-testid="user-gpt-card"]').first()
        await expect(card).toBeVisible()

        // Hover card and check for animation classes
        await card.hover()

        // Animation classes should have motion-reduce variants applied
        const hasReducedMotion = await card.evaluate(el => {
          const styles = window.getComputedStyle(el)
          // Check if transition-duration is very short or 0 (reduced motion)
          const transitionDuration = styles.transitionDuration
          return transitionDuration === '0s' || transitionDuration === '0.001s'
        })

        console.warn('Reduced Motion Compliance:', {
          reducedMotionApplied: hasReducedMotion,
        })

        // Reduced motion should be applied (animations instant or disabled)
        expect(hasReducedMotion, 'Reduced motion preference should disable animations').toBeTruthy()
      })
    })
  })

  test.describe('Memory Performance During Animations', () => {
    test('should not significantly increase memory during animations', async ({page}) => {
      await test.step('Measure memory usage during card animations', async () => {
        await page.goto('/')
        await page.waitForLoadState('networkidle')

        // Get baseline memory
        const baselineMemory = await page.evaluate(() => {
          if ('memory' in performance) {
            return (performance as any).memory.usedJSHeapSize as number
          }
          return 0
        })

        // Trigger multiple animations
        const cards = page.locator('[data-testid="user-gpt-card"]')
        const cardCount = await cards.count()

        for (let i = 0; i < Math.min(cardCount, 5); i++) {
          await cards.nth(i).hover()
          await page.waitForTimeout(200)
        }

        // Measure memory after animations
        const afterAnimationMemory = await page.evaluate(() => {
          if ('memory' in performance) {
            return (performance as any).memory.usedJSHeapSize as number
          }
          return 0
        })

        const memoryIncrease = (afterAnimationMemory - baselineMemory) / 1024 / 1024 // Convert to MB

        console.warn('Animation Memory Usage:', {
          baselineMemory: `${(baselineMemory / 1024 / 1024).toFixed(2)}MB`,
          afterAnimationMemory: `${(afterAnimationMemory / 1024 / 1024).toFixed(2)}MB`,
          increase: `${memoryIncrease.toFixed(2)}MB`,
        })

        // Memory increase should be minimal
        if (baselineMemory > 0) {
          expect(memoryIncrease, 'Memory increase should be under 50MB').toBeLessThanOrEqual(
            PERFORMANCE_THRESHOLDS.maxMemoryIncrease,
          )
        }
      })
    })
  })
})
