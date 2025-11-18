/**
 * Performance budgets configuration
 * Defines thresholds for key performance metrics across different pages
 *
 * @see https://web.dev/performance-budgets-101/
 */

export interface PageBudget {
  // Page identifier
  name: string
  // URL path
  path: string
  // Performance budgets
  budgets: {
    // Core Web Vitals
    lcp: number // Largest Contentful Paint (ms)
    fid: number // First Input Delay (ms)
    cls: number // Cumulative Layout Shift (score)
    inp: number // Interaction to Next Paint (ms)
    // Loading metrics
    fcp: number // First Contentful Paint (ms)
    ttfb: number // Time to First Byte (ms)
    tti: number // Time to Interactive (ms)
    tbt: number // Total Blocking Time (ms)
    speedIndex: number // Speed Index (ms)
    // Lighthouse scores (0-1)
    performanceScore: number
    accessibilityScore: number
    bestPracticesScore: number
    seoScore: number
    // Resource budgets
    maxBundleSize: number // Maximum JavaScript bundle size (KB)
    maxResourceCount: number // Maximum number of resources
  }
}

/**
 * Performance budgets for different pages
 */
export const PERFORMANCE_BUDGETS: PageBudget[] = [
  {
    name: 'Homepage',
    path: '/',
    budgets: {
      // Core Web Vitals - target "Good" thresholds
      lcp: 2500, // < 2.5s
      fid: 100, // < 100ms
      cls: 0.1, // < 0.1
      inp: 200, // < 200ms

      // Loading metrics
      fcp: 1800, // < 1.8s
      ttfb: 800, // < 800ms
      tti: 3800, // < 3.8s
      tbt: 200, // < 200ms
      speedIndex: 3400, // < 3.4s

      // Lighthouse scores
      performanceScore: 0.9, // 90/100
      accessibilityScore: 0.95, // 95/100
      bestPracticesScore: 0.9, // 90/100
      seoScore: 0.9, // 90/100

      // Resource budgets
      maxBundleSize: 500, // 500 KB
      maxResourceCount: 50,
    },
  },
  {
    name: 'GPT Editor',
    path: '/gpt/new',
    budgets: {
      // Core Web Vitals - slightly relaxed for editor complexity
      lcp: 3000, // < 3s
      fid: 100, // < 100ms
      cls: 0.1, // < 0.1
      inp: 200, // < 200ms

      // Loading metrics
      fcp: 2000, // < 2s
      ttfb: 800, // < 800ms
      tti: 4500, // < 4.5s
      tbt: 300, // < 300ms
      speedIndex: 4000, // < 4s

      // Lighthouse scores
      performanceScore: 0.85, // 85/100 (editor is more complex)
      accessibilityScore: 0.95, // 95/100
      bestPracticesScore: 0.9, // 90/100
      seoScore: 0.85, // 85/100

      // Resource budgets
      maxBundleSize: 800, // 800 KB (Monaco editor included)
      maxResourceCount: 75,
    },
  },
  {
    name: 'GPT Test Playground',
    path: '/gpt/test',
    budgets: {
      // Core Web Vitals
      lcp: 2800, // < 2.8s
      fid: 100, // < 100ms
      cls: 0.1, // < 0.1
      inp: 200, // < 200ms

      // Loading metrics
      fcp: 1900, // < 1.9s
      ttfb: 800, // < 800ms
      tti: 4000, // < 4s
      tbt: 250, // < 250ms
      speedIndex: 3700, // < 3.7s

      // Lighthouse scores
      performanceScore: 0.88, // 88/100
      accessibilityScore: 0.95, // 95/100
      bestPracticesScore: 0.9, // 90/100
      seoScore: 0.85, // 85/100

      // Resource budgets
      maxBundleSize: 600, // 600 KB
      maxResourceCount: 60,
    },
  },
  {
    name: 'Settings Page',
    path: '/settings',
    budgets: {
      // Core Web Vitals
      lcp: 2300, // < 2.3s
      fid: 100, // < 100ms
      cls: 0.1, // < 0.1
      inp: 200, // < 200ms

      // Loading metrics
      fcp: 1700, // < 1.7s
      ttfb: 800, // < 800ms
      tti: 3500, // < 3.5s
      tbt: 200, // < 200ms
      speedIndex: 3200, // < 3.2s

      // Lighthouse scores
      performanceScore: 0.92, // 92/100
      accessibilityScore: 0.95, // 95/100
      bestPracticesScore: 0.9, // 90/100
      seoScore: 0.88, // 88/100

      // Resource budgets
      maxBundleSize: 450, // 450 KB
      maxResourceCount: 45,
    },
  },
]

/**
 * Get performance budget for a specific page
 * @param path - URL path
 * @returns Performance budget for the page, or default budget if not found
 */
export function getBudgetForPage(path: string): PageBudget {
  const budget = PERFORMANCE_BUDGETS.find(b => b.path === path)

  if (!budget) {
    // Return default budget for unknown pages (use homepage budget as default)
    const defaultBudget = PERFORMANCE_BUDGETS[0]
    if (!defaultBudget) {
      throw new Error('No default performance budget configured')
    }
    return defaultBudget
  }

  return budget
}

/**
 * Validate performance results against budget
 * @param metrics - Performance metrics object containing optional metric values
 * @param metrics.lcp - Largest Contentful Paint in milliseconds
 * @param metrics.fcp - First Contentful Paint in milliseconds
 * @param metrics.cls - Cumulative Layout Shift score
 * @param metrics.tbt - Total Blocking Time in milliseconds
 * @param metrics.speedIndex - Speed Index in milliseconds
 * @param metrics.tti - Time to Interactive in milliseconds
 * @param metrics.performanceScore - Lighthouse performance score (0-1)
 * @param metrics.accessibilityScore - Lighthouse accessibility score (0-1)
 * @param metrics.bestPracticesScore - Lighthouse best practices score (0-1)
 * @param metrics.seoScore - Lighthouse SEO score (0-1)
 * @param budget - Performance budget to validate against
 * @returns Array of budget violations
 */
export function validateAgainstBudget(
  metrics: {
    lcp?: number
    fcp?: number
    cls?: number
    tbt?: number
    speedIndex?: number
    tti?: number
    performanceScore?: number
    accessibilityScore?: number
    bestPracticesScore?: number
    seoScore?: number
  },
  budget: PageBudget,
): string[] {
  const violations: string[] = []

  // Check Core Web Vitals
  if (metrics.lcp && metrics.lcp > budget.budgets.lcp) {
    violations.push(`LCP ${metrics.lcp}ms exceeds budget ${budget.budgets.lcp}ms`)
  }

  if (metrics.cls && metrics.cls > budget.budgets.cls) {
    violations.push(`CLS ${metrics.cls} exceeds budget ${budget.budgets.cls}`)
  }

  // Check loading metrics
  if (metrics.fcp && metrics.fcp > budget.budgets.fcp) {
    violations.push(`FCP ${metrics.fcp}ms exceeds budget ${budget.budgets.fcp}ms`)
  }

  if (metrics.tbt && metrics.tbt > budget.budgets.tbt) {
    violations.push(`TBT ${metrics.tbt}ms exceeds budget ${budget.budgets.tbt}ms`)
  }

  if (metrics.speedIndex && metrics.speedIndex > budget.budgets.speedIndex) {
    violations.push(`Speed Index ${metrics.speedIndex}ms exceeds budget ${budget.budgets.speedIndex}ms`)
  }

  if (metrics.tti && metrics.tti > budget.budgets.tti) {
    violations.push(`TTI ${metrics.tti}ms exceeds budget ${budget.budgets.tti}ms`)
  }

  // Check Lighthouse scores
  if (metrics.performanceScore && metrics.performanceScore < budget.budgets.performanceScore) {
    violations.push(`Performance score ${metrics.performanceScore} below budget ${budget.budgets.performanceScore}`)
  }

  if (metrics.accessibilityScore && metrics.accessibilityScore < budget.budgets.accessibilityScore) {
    violations.push(
      `Accessibility score ${metrics.accessibilityScore} below budget ${budget.budgets.accessibilityScore}`,
    )
  }

  if (metrics.bestPracticesScore && metrics.bestPracticesScore < budget.budgets.bestPracticesScore) {
    violations.push(
      `Best Practices score ${metrics.bestPracticesScore} below budget ${budget.budgets.bestPracticesScore}`,
    )
  }

  if (metrics.seoScore && metrics.seoScore < budget.budgets.seoScore) {
    violations.push(`SEO score ${metrics.seoScore} below budget ${budget.budgets.seoScore}`)
  }

  return violations
}
