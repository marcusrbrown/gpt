import {getBudgetForPage, validateAgainstBudget} from './config/performance-budgets'
import {expect, test} from './fixtures/performance-fixtures'
import {
  collectPerformanceMetrics,
  CORE_WEB_VITALS_THRESHOLDS,
  measureCustomMetrics,
  waitForPageLoad,
} from './utils/performance-utils'

test.describe('Homepage Performance', () => {
  const pagePath = '/'
  const budget = getBudgetForPage(pagePath)

  test('should meet Core Web Vitals thresholds', async ({page, performanceResults}) => {
    // Navigate to homepage
    await page.goto(pagePath)
    await waitForPageLoad(page)

    // Collect metrics from the browser Performance API
    const result = await collectPerformanceMetrics(page)
    performanceResults.push(result)

    // Verify Core Web Vitals (LCP must actually be measured, not default to 0)
    expect(result.metrics.lcp).toBeGreaterThan(0)
    expect(result.metrics.lcp).toBeLessThanOrEqual(CORE_WEB_VITALS_THRESHOLDS.LCP)
    expect(result.metrics.cls).toBeLessThanOrEqual(CORE_WEB_VITALS_THRESHOLDS.CLS)
  })

  test('should meet performance budgets', async ({page, performanceResults}) => {
    await page.goto(pagePath)
    await waitForPageLoad(page)

    const result = await collectPerformanceMetrics(page)
    performanceResults.push(result)

    // validateAgainstBudget skips falsy values, so require real measurements first
    expect(result.metrics.fcp).toBeGreaterThan(0)
    expect(result.metrics.lcp).toBeGreaterThan(0)

    // Validate measured metrics against budget
    const violations = validateAgainstBudget(
      {
        lcp: result.metrics.lcp,
        fcp: result.metrics.fcp,
        cls: result.metrics.cls,
        tbt: result.metrics.tbt,
      },
      budget,
    )

    // Report budget violations if any
    if (violations.length > 0) {
      console.warn('Performance Budget Violations:', violations)
    }

    expect(violations).toHaveLength(0)
  })

  test('should load quickly on initial visit', async ({page}) => {
    const startTime = Date.now()

    await page.goto(pagePath)
    await waitForPageLoad(page)

    const loadTime = Date.now() - startTime

    // Verify page loads within acceptable time
    expect(loadTime).toBeLessThan(8000) // 8 seconds maximum for preview build
  })

  test('should have efficient resource loading', async ({page}) => {
    await page.goto(pagePath)
    await waitForPageLoad(page)

    const customMetrics = await measureCustomMetrics(page)

    // Verify resource count is within budget
    expect(customMetrics.resourceCount).toBeWithinBudget(budget.budgets.maxResourceCount)

    // Verify DOM content loaded time is reasonable
    expect(customMetrics.domContentLoaded).toBeLessThan(3000) // 3 seconds
  })

  test('should have good First Contentful Paint', async ({page, performanceResults}) => {
    await page.goto(pagePath)
    await waitForPageLoad(page)

    const result = await collectPerformanceMetrics(page)
    performanceResults.push(result)

    // FCP should be under 1.8 seconds for good user experience
    expect(result.metrics.fcp).toBeGreaterThan(0)
    expect(result.metrics.fcp).toBeWithinBudget(budget.budgets.fcp)
  })

  test('should have minimal layout shifts', async ({page, performanceResults}) => {
    await page.goto(pagePath)
    await waitForPageLoad(page)

    const result = await collectPerformanceMetrics(page)
    performanceResults.push(result)

    // CLS should be under 0.1 for good visual stability
    expect(result.metrics.cls).toBeLessThanOrEqual(CORE_WEB_VITALS_THRESHOLDS.CLS)
  })

  test('should have low approximate Total Blocking Time', async ({page, performanceResults}) => {
    await page.goto(pagePath)
    await waitForPageLoad(page)

    const result = await collectPerformanceMetrics(page)
    performanceResults.push(result)

    // TBT (approximated from long tasks after FCP) should be minimal to ensure interactivity
    expect(result.metrics.tbt).toBeWithinBudget(budget.budgets.tbt)
  })
})
