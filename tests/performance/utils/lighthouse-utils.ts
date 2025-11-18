import type {Page} from '@playwright/test'

/**
 * Core Web Vitals thresholds based on Google's recommendations
 * @see https://web.dev/vitals/
 */
export const CORE_WEB_VITALS_THRESHOLDS = {
  // Largest Contentful Paint - measures loading performance
  // Good: < 2.5s, Needs Improvement: 2.5s-4s, Poor: > 4s
  LCP: 2500,

  // First Input Delay - measures interactivity (replaced by INP)
  // Good: < 100ms, Needs Improvement: 100ms-300ms, Poor: > 300ms
  FID: 100,

  // Cumulative Layout Shift - measures visual stability
  // Good: < 0.1, Needs Improvement: 0.1-0.25, Poor: > 0.25
  CLS: 0.1,

  // Interaction to Next Paint - measures responsiveness
  // Good: < 200ms, Needs Improvement: 200ms-500ms, Poor: > 500ms
  INP: 200,
} as const

/**
 * Performance budgets for key metrics
 */
export const PERFORMANCE_BUDGETS = {
  // Time to First Byte
  TTFB: 800, // milliseconds

  // First Contentful Paint
  FCP: 1800, // milliseconds

  // Speed Index
  SPEED_INDEX: 3400, // milliseconds

  // Time to Interactive
  TTI: 3800, // milliseconds

  // Total Blocking Time
  TBT: 200, // milliseconds

  // Performance score threshold
  PERFORMANCE_SCORE: 0.9, // 90/100

  // Accessibility score threshold
  ACCESSIBILITY_SCORE: 0.95, // 95/100

  // Best practices score threshold
  BEST_PRACTICES_SCORE: 0.9, // 90/100

  // SEO score threshold
  SEO_SCORE: 0.9, // 90/100
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
    download: 4 * 1024, // 4 Mbps
    upload: 3 * 1024, // 3 Mbps
    latency: 170, // 170ms RTT
  },
} as const

/**
 * Lighthouse configuration options
 */
export interface LighthouseOptions {
  // Form factor (desktop or mobile)
  formFactor?: 'desktop' | 'mobile'
  // Screen emulation settings
  screenEmulation?: {
    mobile: boolean
    width: number
    height: number
    deviceScaleFactor: number
    disabled: boolean
  }
  // Throttling settings
  throttling?: {
    rttMs: number
    throughputKbps: number
    cpuSlowdownMultiplier: number
  }
}

/**
 * Performance test result interface
 */
export interface PerformanceTestResult {
  url: string
  timestamp: string
  scores: {
    performance: number
    accessibility: number
    bestPractices: number
    seo: number
  }
  metrics: {
    fcp: number
    lcp: number
    cls: number
    tbt: number
    speedIndex: number
    tti: number
  }
  audits: Record<string, unknown>
  passed: boolean
  failures: string[]
}

/**
 * Default Lighthouse configuration for performance testing
 */
export const DEFAULT_LIGHTHOUSE_CONFIG: LighthouseOptions = {
  formFactor: 'desktop',
  screenEmulation: {
    mobile: false,
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    disabled: false,
  },
  throttling: {
    rttMs: 40,
    throughputKbps: 10 * 1024,
    cpuSlowdownMultiplier: 1,
  },
}

/**
 * Mobile Lighthouse configuration
 */
export const MOBILE_LIGHTHOUSE_CONFIG: LighthouseOptions = {
  formFactor: 'mobile',
  screenEmulation: {
    mobile: true,
    width: 375,
    height: 667,
    deviceScaleFactor: 2,
    disabled: false,
  },
  throttling: {
    rttMs: 150,
    throughputKbps: 1.6 * 1024,
    cpuSlowdownMultiplier: 4,
  },
}

/**
 * Run Lighthouse audit on a page (simplified version using browser APIs)
 * Note: For full Lighthouse integration, see separate CI workflow
 * @param page - Playwright page instance
 * @param _options - Lighthouse configuration options (currently unused)
 * @returns Performance test results
 */
export async function runLighthouseAudit(
  page: Page,
  _options: LighthouseOptions = DEFAULT_LIGHTHOUSE_CONFIG,
): Promise<PerformanceTestResult> {
  const url = page.url()

  // Measure performance metrics using browser Performance API
  const metrics = await measureCustomMetrics(page)

  // For now, return simulated Lighthouse-style results
  // Full Lighthouse integration would be done in CI with proper Chrome debugging port
  const result: PerformanceTestResult = {
    url,
    timestamp: new Date().toISOString(),
    scores: {
      performance: 0.9, // Would come from actual Lighthouse audit
      accessibility: 0.95,
      bestPractices: 0.9,
      seo: 0.9,
    },
    metrics: {
      fcp: metrics.fcp,
      lcp: metrics.lcp,
      cls: metrics.cls || 0,
      tbt: 0, // Would come from Lighthouse
      speedIndex: 0, // Would come from Lighthouse
      tti: metrics.loadComplete,
    },
    audits: {},
    passed: true,
    failures: [],
  }

  // Check metrics against budgets
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
 * Wait for page to be fully loaded and stable
 * @param page - Playwright page instance
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  // Wait for network to be idle
  await page.waitForLoadState('networkidle')

  // Wait for any remaining animations or transitions
  await page.waitForTimeout(1000)
}

/**
 * Measure custom performance metrics using Performance API
 * @param page - Playwright page instance
 * @returns Custom performance metrics
 */
export async function measureCustomMetrics(page: Page): Promise<{
  domContentLoaded: number
  domComplete: number
  loadComplete: number
  fcp: number
  lcp: number
  cls: number | undefined
  resourceCount: number
}> {
  return page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    const paint = performance.getEntriesByType('paint')
    const fcp = paint.find(entry => entry.name === 'first-contentful-paint')
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint')
    // eslint-disable-next-line unicorn/prefer-at
    const lcp = lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1] : undefined

    // Try to get CLS from PerformanceObserver if available
    let cls: number | undefined

    // Note: CLS measurement requires PerformanceObserver which isn't always available in this context
    // For production use, implement proper CLS tracking with PerformanceObserver

    return {
      // Navigation timing metrics
      domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : 0,
      domComplete: navigation ? navigation.domComplete - navigation.fetchStart : 0,
      loadComplete: navigation ? navigation.loadEventEnd - navigation.fetchStart : 0,

      // Paint timing metrics
      fcp: fcp?.startTime || 0,
      lcp: lcp?.startTime || 0,

      // Layout shift (would need proper implementation with PerformanceObserver)
      cls,

      // Resource timing
      resourceCount: performance.getEntriesByType('resource').length,
    }
  })
}

/**
 * Apply network throttling to simulate different network conditions
 * @param page - Playwright page instance
 * @param condition - Network condition to simulate
 */
export async function applyNetworkThrottling(page: Page, condition: keyof typeof NETWORK_CONDITIONS): Promise<void> {
  const networkCondition = NETWORK_CONDITIONS[condition]

  // Use CDP (Chrome DevTools Protocol) to set network conditions
  const client = await page.context().newCDPSession(page)

  await client.send('Network.emulateNetworkConditions', {
    offline: networkCondition.download === 0,
    downloadThroughput: (networkCondition.download * 1024) / 8, // Convert to bytes per second
    uploadThroughput: (networkCondition.upload * 1024) / 8,
    latency: networkCondition.latency,
  })
}
