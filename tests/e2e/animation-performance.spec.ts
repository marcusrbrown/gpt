import {expect, test} from '@playwright/test'

const PERFORMANCE_THRESHOLDS = {
  minFps: 50,
} as const

interface AnimationMetrics {
  avgFrameTime: number
  fps: number
  droppedFrames: number
  frameCount: number
}

async function measureAnimationFrameRate(
  page: import('@playwright/test').Page,
  durationMs = 1000,
): Promise<AnimationMetrics> {
  return page.evaluate(async (duration: number) => {
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
          const fps = 1000 / avgFrameTime
          const droppedFrames = frameTimes.filter(ft => ft > 33).length

          resolve({
            avgFrameTime,
            fps,
            droppedFrames,
            frameCount: frameTimes.length,
          })
        }
      }

      requestAnimationFrame(measureFrame)
    })
  }, durationMs)
}

test.describe('Animation Performance', () => {
  test('should maintain 60fps during card hover animations', async ({page}) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const card = page.locator('[data-testid="example-gpt-card"]').first()
    await expect(card).toBeVisible()

    await card.hover()
    const metrics = await measureAnimationFrameRate(page, 500)

    expect(metrics.fps).toBeGreaterThanOrEqual(PERFORMANCE_THRESHOLDS.minFps)
    expect(metrics.droppedFrames).toBeLessThanOrEqual(metrics.frameCount * 0.1)
  })
})
