import {getBudgetForPage, validateAgainstBudget} from './config/performance-budgets'
import {expect, test} from './fixtures/performance-fixtures'
import {
  CORE_WEB_VITALS_THRESHOLDS,
  DEFAULT_LIGHTHOUSE_CONFIG,
  measureCustomMetrics,
  runLighthouseAudit,
  waitForPageLoad,
} from './utils/lighthouse-utils'

test.describe('Homepage Performance', () => {
  const pagePath = '/'
  const budget = getBudgetForPage(pagePath)

  test('should meet Core Web Vitals thresholds', async ({page, performanceResults}) => {
    // Navigate to homepage
    await page.goto(pagePath)
    await waitForPageLoad(page)

    // Run Lighthouse audit
    const result = await runLighthouseAudit(page, DEFAULT_LIGHTHOUSE_CONFIG)
    performanceResults.push(result)

    // Verify Core Web Vitals
    expect(result.metrics.lcp).toBeLessThanOrEqual(CORE_WEB_VITALS_THRESHOLDS.LCP)
    expect(result.metrics.cls).toBeLessThanOrEqual(CORE_WEB_VITALS_THRESHOLDS.CLS)
  })

  test('should meet performance budgets', async ({page, performanceResults}) => {
    await page.goto(pagePath)
    await waitForPageLoad(page)

    const result = await runLighthouseAudit(page, DEFAULT_LIGHTHOUSE_CONFIG)
    performanceResults.push(result)

    // Validate against budget
    const violations = validateAgainstBudget(
      {
        lcp: result.metrics.lcp,
        fcp: result.metrics.fcp,
        cls: result.metrics.cls,
        tbt: result.metrics.tbt,
        speedIndex: result.metrics.speedIndex,
        tti: result.metrics.tti,
        performanceScore: result.scores.performance,
        accessibilityScore: result.scores.accessibility,
        bestPracticesScore: result.scores.bestPractices,
        seoScore: result.scores.seo,
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

    const result = await runLighthouseAudit(page, DEFAULT_LIGHTHOUSE_CONFIG)
    performanceResults.push(result)

    // FCP should be under 1.8 seconds for good user experience
    expect(result.metrics.fcp).toBeWithinBudget(budget.budgets.fcp)
  })

  test('should have minimal layout shifts', async ({page, performanceResults}) => {
    await page.goto(pagePath)
    await waitForPageLoad(page)

    const result = await runLighthouseAudit(page, DEFAULT_LIGHTHOUSE_CONFIG)
    performanceResults.push(result)

    // CLS should be under 0.1 for good visual stability
    expect(result.metrics.cls).toBeLessThanOrEqual(CORE_WEB_VITALS_THRESHOLDS.CLS)
  })

  test('should have low Total Blocking Time', async ({page, performanceResults}) => {
    await page.goto(pagePath)
    await waitForPageLoad(page)

    const result = await runLighthouseAudit(page, DEFAULT_LIGHTHOUSE_CONFIG)
    performanceResults.push(result)

    // TBT should be minimal to ensure interactivity
    expect(result.metrics.tbt).toBeWithinBudget(budget.budgets.tbt)
  })

  test('should meet Lighthouse performance score threshold', async ({page, performanceResults}) => {
    await page.goto(pagePath)
    await waitForPageLoad(page)

    const result = await runLighthouseAudit(page, DEFAULT_LIGHTHOUSE_CONFIG)
    performanceResults.push(result)

    // Performance score should meet or exceed budget
    expect(result.scores.performance).toMeetPerformanceThreshold(budget.budgets.performanceScore)
  })
})
