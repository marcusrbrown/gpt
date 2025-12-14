import {getBudgetForPage} from './config/performance-budgets'
import {expect, test} from './fixtures/performance-fixtures'
import {
  applyNetworkThrottling,
  measureCustomMetrics,
  waitForPageLoad,
  type NETWORK_CONDITIONS,
} from './utils/lighthouse-utils'

test.describe('Network Conditions Performance', () => {
  const pagePath = '/'
  const budget = getBudgetForPage(pagePath)

  test('should load acceptably on Fast 3G', async ({page}) => {
    // Apply Fast 3G network throttling
    await applyNetworkThrottling(page, 'FAST_3G')

    const startTime = Date.now()
    await page.goto(pagePath, {waitUntil: 'load', timeout: 45_000})
    await waitForPageLoad(page)
    const loadTime = Date.now() - startTime

    // On Fast 3G, expect longer load times but still reasonable
    expect(loadTime).toBeLessThan(18_000) // 18 seconds maximum

    const metrics = await measureCustomMetrics(page)

    // Verify page still loads efficiently despite network constraints
    expect(metrics.fcp).toBeLessThan(5000) // 5 seconds for FCP on throttled connection
    expect(metrics.resourceCount).toBeWithinBudget(budget.budgets.maxResourceCount)
  })

  test('should load on Slow 3G', async ({page}) => {
    // Apply Slow 3G network throttling
    await applyNetworkThrottling(page, 'SLOW_3G')

    const startTime = Date.now()
    await page.goto(pagePath, {waitUntil: 'load', timeout: 45_000})
    await waitForPageLoad(page)
    const loadTime = Date.now() - startTime

    // On Slow 3G, expect much longer load times
    expect(loadTime).toBeLessThan(20000) // 20 seconds maximum

    // Verify page content eventually loads
    const metrics = await measureCustomMetrics(page)
    expect(metrics.domComplete).toBeGreaterThan(0)
  })

  test('should load quickly on Fast 4G', async ({page}) => {
    // Apply Fast 4G network throttling
    await applyNetworkThrottling(page, 'FAST_4G')

    const startTime = Date.now()
    await page.goto(pagePath, {waitUntil: 'load', timeout: 45_000})
    await waitForPageLoad(page)
    const loadTime = Date.now() - startTime

    // On Fast 4G, expect near-optimal performance
    expect(loadTime).toBeLessThan(9000) // 9 seconds maximum

    const metrics = await measureCustomMetrics(page)
    expect(metrics.fcp).toBeLessThan(3000) // 3 seconds for FCP
  })

  test('should handle network conditions gracefully', async ({page}) => {
    // Test that application doesn't break under various network conditions
    const networkConditions: (keyof typeof NETWORK_CONDITIONS)[] = ['FAST_3G', 'SLOW_3G', 'FAST_4G']

    for (const condition of networkConditions) {
      await applyNetworkThrottling(page, condition)
      await page.goto(pagePath, {waitUntil: 'load', timeout: 45_000})
      await waitForPageLoad(page)

      // Verify page renders correctly regardless of network speed
      const isVisible = await page.locator('body').isVisible()
      expect(isVisible).toBe(true)
    }
  })
})

test.describe('Mobile Device Performance', () => {
  test('should perform well on mobile viewport', async ({page}) => {
    // Set mobile viewport
    await page.setViewportSize({width: 375, height: 667})

    await page.goto('/')
    await waitForPageLoad(page)

    const metrics = await measureCustomMetrics(page)

    // Mobile devices should have similar performance budgets
    expect(metrics.fcp).toBeLessThan(3000) // 3 seconds for mobile FCP
    expect(metrics.lcp).toBeLessThan(4000) // 4 seconds for mobile LCP
  })

  test('should perform well on tablet viewport', async ({page}) => {
    // Set tablet viewport (iPad)
    await page.setViewportSize({width: 768, height: 1024})

    await page.goto('/')
    await waitForPageLoad(page)

    const metrics = await measureCustomMetrics(page)

    // Tablet devices should have performance similar to desktop
    expect(metrics.fcp).toBeLessThan(2500) // 2.5 seconds for tablet FCP
    expect(metrics.lcp).toBeLessThan(3500) // 3.5 seconds for tablet LCP
  })

  test('should handle device orientation changes', async ({page}) => {
    // Test portrait mode
    await page.setViewportSize({width: 375, height: 667})
    await page.goto('/')
    await waitForPageLoad(page)

    let metrics = await measureCustomMetrics(page)
    const portraitFCP = metrics.fcp

    // Test landscape mode
    await page.setViewportSize({width: 667, height: 375})
    await page.reload()
    await waitForPageLoad(page)

    metrics = await measureCustomMetrics(page)
    const landscapeFCP = metrics.fcp

    // Performance should be similar in both orientations
    const fcpDifference = Math.abs(portraitFCP - landscapeFCP)
    expect(fcpDifference).toBeLessThan(1000) // Less than 1 second difference
  })
})
