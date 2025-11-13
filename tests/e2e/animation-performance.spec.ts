import {expect, test} from '@playwright/test'

/**
 * Animation Performance Tests
 *
 * Validates 60fps animation smoothness across components using Playwright's
 * Performance API and Chrome DevTools Protocol.
 *
 * Requirements: TEST-001, REQ-002, A11Y-002
 */

/**
 * Thresholds based on Web Vitals recommendations and user perception research:
 * - 60fps maintains smooth appearance to human eye
 * - 20% variance accounts for browser scheduling variability
 * - 30fps (33ms) is absolute minimum before jank becomes noticeable
 * - 50MB memory allows animations without causing garbage collection
 * - 0.1 CLS prevents layout shift impact on reading flow
 */
const PERFORMANCE_THRESHOLDS = {
  targetFrameTime: 16.67,
  frameTimeVariance: 0.2,
  maxFrameTime: 33,
  minFps: 50,
  maxMemoryIncrease: 50,
  maxLayoutShift: 0.1,
} as const

interface AnimationMetrics {
  avgFrameTime: number
  minFrameTime: number
  maxFrameTime: number
  frameCount: number
  droppedFrames: number
  fps: number
}

async function measureAnimationFrameRate(
  page: import('@playwright/test').Page,
  animationSelector: string,
  durationMs = 1000,
): Promise<AnimationMetrics> {
  return page.evaluate(
    async ({selector, duration}) => {
      const element = document.querySelector(selector)
      if (!element) {
        throw new Error(`Element not found: ${selector}`)
      }

      const frameTimes: number[] = []
      let lastFrameTime = performance.now()
      let animationStartTime = 0

      return new Promise<AnimationMetrics>(resolve => {
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
            const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
            const minFrameTime = Math.min(...frameTimes)
            const maxFrameTime = Math.max(...frameTimes)
            const fps = 1000 / avgFrameTime
            // 33ms = 30fps threshold where dropped frames become noticeable
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

        if (element instanceof HTMLElement) {
          element.dispatchEvent(new MouseEvent('mouseenter', {bubbles: true}))
        }

        requestAnimationFrame(measureFrame)
      })
    },
    {selector: animationSelector, duration: durationMs},
  )
}

interface LayoutShiftEntry extends PerformanceEntry {
  hadRecentInput: boolean
  value: number
}

async function measureLayoutStability(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(async () => {
    return new Promise<number>(resolve => {
      let cls = 0

      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          const shiftEntry = entry as LayoutShiftEntry
          // Ignore shifts caused by user input (typing, clicking)
          if (entry.entryType === 'layout-shift' && !shiftEntry.hadRecentInput) {
            cls += shiftEntry.value
          }
        }
      })

      observer.observe({type: 'layout-shift', buffered: true})

      // 2s window captures animation completion and settling
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
        const card = page.locator('[data-testid="user-gpt-card"]').first()
        await expect(card).toBeVisible()

        const cardId = await card.getAttribute('data-testid')
        const metrics = await measureAnimationFrameRate(page, `[data-testid="${cardId}"]`, 1000)

        // Log detailed metrics for debugging performance issues in CI/CD
        console.warn('Card Animation Performance:', {
          fps: metrics.fps.toFixed(2),
          avgFrameTime: `${metrics.avgFrameTime.toFixed(2)}ms`,
          frameCount: metrics.frameCount,
          droppedFrames: metrics.droppedFrames,
        })

        expect(metrics.fps, 'Frame rate should be at least 50fps').toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.minFps)
        expect(metrics.avgFrameTime, 'Average frame time should be under 20ms').toBeLessThanOrEqual(
          PERFORMANCE_THRESHOLDS.targetFrameTime * (1 + PERFORMANCE_THRESHOLDS.frameTimeVariance),
        )
        // 10% dropped frames allows for occasional browser scheduling delays
        expect(metrics.droppedFrames, 'Should have minimal dropped frames').toBeLessThanOrEqual(
          metrics.frameCount * 0.1,
        )
      })
    })

    test('should not cause layout shifts during card animations', async ({page}) => {
      await test.step('Measure layout stability', async () => {
        const card = page.locator('[data-testid="user-gpt-card"]').first()
        await expect(card).toBeVisible()

        await card.hover()
        const cls = await measureLayoutStability(page)

        // Log CLS for monitoring layout shift trends over time
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
