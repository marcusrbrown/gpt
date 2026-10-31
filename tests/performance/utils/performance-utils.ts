import type {Page} from '@playwright/test'

/**
 * Core Web Vitals thresholds based on Google's recommendations
 * @see https://web.dev/vitals/
 */
export const CORE_WEB_VITALS_THRESHOLDS = {
  LCP: 2500, // Good: < 2.5s
  FID: 100, // Good: < 100ms
  CLS: 0.1, // Good: < 0.1
  INP: 200, // Good: < 200ms
} as const

/**
 * Performance budgets for key metrics
 */
export const PERFORMANCE_BUDGETS = {
  TTFB: 800,
  FCP: 1800,
  SPEED_INDEX: 3400,
  TTI: 3800,
  TBT: 200,
  PERFORMANCE_SCORE: 0.9,
  ACCESSIBILITY_SCORE: 0.95,
  BEST_PRACTICES_SCORE: 0.9,
  SEO_SCORE: 0.9,
} as const

/**
 * Network conditions for performance testing
 */
export const NETWORK_CONDITIONS = {
  FAST_3G: {
    download: 1.6 * 1024, // 1.6 Mbps
    upload: 750, // 750 Kbps
    latency: 150, // 150ms RTT
  },
  SLOW_3G: {
    download: 500, // 500 Kbps
    upload: 500, // 500 Kbps
    latency: 400, // 400ms RTT
  },
  OFFLINE: {
    download: 0,
    upload: 0,
    latency: 0,
  },
  FAST_4G: {
    download: 4 * 1024,
    upload: 3 * 1024,
    latency: 170,
  },
} as const

/**
 * Performance test result interface
 *
 * All values come from the browser Performance API (Chromium). Nothing here is
 * a Lighthouse score; category scores and Speed Index are intentionally absent.
 */
export interface PerformanceTestResult {
  url: string
  timestamp: string
  metrics: {
    /** First Contentful Paint (ms) */
    fcp: number
    /** Largest Contentful Paint (ms) */
    lcp: number
    /** Cumulative Layout Shift (unitless, largest session window) */
    cls: number
    /** Approximate Total Blocking Time (ms), from long tasks after FCP */
    tbt: number
    /** Time from fetch start to end of the load event (ms) */
    loadComplete: number
  }
  passed: boolean
  failures: string[]
}

/**
 * Collect real performance metrics for the current page using the browser Performance API
 *
 * This is not a Lighthouse run: there is no throttling and no category scoring.
 * It reports FCP, LCP, CLS and an approximate TBT, then checks them against the
 * Core Web Vitals thresholds and the FCP budget.
 *
 * @param page - Playwright page instance
 * @returns Measured metrics and any threshold failures
 */
export async function collectPerformanceMetrics(page: Page): Promise<PerformanceTestResult> {
  const url = page.url()

  const metrics = await measureCustomMetrics(page)

  const result: PerformanceTestResult = {
    url,
    timestamp: new Date().toISOString(),
    metrics: {
      fcp: metrics.fcp,
      lcp: metrics.lcp,
      cls: metrics.cls,
      tbt: metrics.tbt,
      loadComplete: metrics.loadComplete,
    },
    passed: true,
    failures: [],
  }

  const failures: string[] = []

  if (result.metrics.lcp > CORE_WEB_VITALS_THRESHOLDS.LCP) {
    failures.push(`LCP ${result.metrics.lcp}ms exceeds threshold ${CORE_WEB_VITALS_THRESHOLDS.LCP}ms`)
  }

  if (result.metrics.cls > CORE_WEB_VITALS_THRESHOLDS.CLS) {
    failures.push(`CLS ${result.metrics.cls} exceeds threshold ${CORE_WEB_VITALS_THRESHOLDS.CLS}`)
  }

  if (result.metrics.fcp > PERFORMANCE_BUDGETS.FCP) {
    failures.push(`FCP ${result.metrics.fcp}ms exceeds budget ${PERFORMANCE_BUDGETS.FCP}ms`)
  }

  result.failures = failures
  result.passed = failures.length === 0

  return result
}

/**
 * Wait for page to reach stable loaded state
 *
 * Ensures both network idle and completion of animations/transitions
 * before measuring performance metrics for consistent results.
 *
 * @param page - Playwright page instance
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded')
  await page.waitForLoadState('load', {timeout: 10_000}).catch(() => {})
  await page.waitForTimeout(500)
}

/**
 * Measure performance metrics using browser Performance API
 *
 * LCP, CLS and long tasks are not available through `performance.getEntriesByType`,
 * so they are read with buffered PerformanceObservers. TBT is approximated as the
 * sum of (duration - 50ms) over long tasks that start after FCP; Lighthouse's TTI
 * window is not available here.
 *
 * @param page - Playwright page instance
 * @returns Performance metrics including navigation timing, paint metrics, and resource count
 */
export async function measureCustomMetrics(page: Page): Promise<{
  domContentLoaded: number
  domComplete: number
  loadComplete: number
  fcp: number
  lcp: number
  cls: number
  tbt: number
  resourceCount: number
}> {
  return page.evaluate(async () => {
    interface LayoutShiftEntry extends PerformanceEntry {
      value: number
      hadRecentInput: boolean
    }

    // Buffered observers deliver already-recorded entries asynchronously; drain them
    // once the delivery task has run, then disconnect.
    const collectEntries = async (type: string): Promise<PerformanceEntry[]> =>
      new Promise(resolve => {
        const entries: PerformanceEntry[] = []
        const observer = new PerformanceObserver(list => {
          entries.push(...list.getEntries())
        })
        observer.observe({type, buffered: true})
        setTimeout(() => {
          entries.push(...observer.takeRecords())
          observer.disconnect()
          resolve(entries)
        }, 50)
      })

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    const paint = performance.getEntriesByType('paint')
    const fcpEntry = paint.find(entry => entry.name === 'first-contentful-paint')
    const fcp = fcpEntry?.startTime ?? 0

    const [lcpEntries, layoutShifts, longTasks] = await Promise.all([
      collectEntries('largest-contentful-paint'),
      collectEntries('layout-shift') as Promise<LayoutShiftEntry[]>,
      collectEntries('longtask'),
    ])

    // The last LCP candidate is the final LCP value
    const lcp = lcpEntries.at(-1)?.startTime ?? 0

    // CLS: largest session window (gap < 1s, window <= 5s), ignoring input-driven shifts
    let cls = 0
    let sessionValue = 0
    let sessionStart = 0
    let previousShiftTime = 0
    for (const shift of layoutShifts) {
      if (shift.hadRecentInput) continue
      if (sessionValue > 0 && shift.startTime - previousShiftTime < 1000 && shift.startTime - sessionStart < 5000) {
        sessionValue += shift.value
      } else {
        sessionValue = shift.value
        sessionStart = shift.startTime
      }
      previousShiftTime = shift.startTime
      cls = Math.max(cls, sessionValue)
    }

    // TBT approximation: blocking portion (>50ms) of long tasks starting after FCP
    let tbt = 0
    if (fcp > 0) {
      for (const task of longTasks) {
        if (task.startTime >= fcp) tbt += Math.max(0, task.duration - 50)
      }
    }

    return {
      domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : 0,
      domComplete: navigation ? navigation.domComplete - navigation.fetchStart : 0,
      loadComplete: navigation ? navigation.loadEventEnd - navigation.fetchStart : 0,
      fcp,
      lcp,
      cls,
      tbt,
      resourceCount: performance.getEntriesByType('resource').length,
    }
  })
}

/**
 * Apply network throttling via Chrome DevTools Protocol
 *
 * Simulates different network conditions (3G, 4G, offline) to test
 * performance under various real-world network constraints.
 *
 * @param page - Playwright page instance
 * @param condition - Network condition preset to apply
 */
export async function applyNetworkThrottling(page: Page, condition: keyof typeof NETWORK_CONDITIONS): Promise<void> {
  const networkCondition = NETWORK_CONDITIONS[condition]

  const client = await page.context().newCDPSession(page)

  await client.send('Network.emulateNetworkConditions', {
    offline: networkCondition.download === 0,
    downloadThroughput: (networkCondition.download * 1024) / 8,
    uploadThroughput: (networkCondition.upload * 1024) / 8,
    latency: networkCondition.latency,
  })
}
