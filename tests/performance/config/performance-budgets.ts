/**
 * Performance budgets configuration
 *
 * Defines thresholds for key performance metrics across different pages.
 * Budgets are based on Google's Core Web Vitals "Good" thresholds and
 * adjusted per page complexity.
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
      lcp: 2500,
      fid: 100,
      cls: 0.1,
      inp: 200,
      fcp: 1800,
      ttfb: 800,
      tti: 3800,
      tbt: 200,
      speedIndex: 3400,
      performanceScore: 0.9,
      accessibilityScore: 0.95,
      bestPracticesScore: 0.9,
      seoScore: 0.9,
      maxBundleSize: 500,
      maxResourceCount: 50,
    },
  },
  {
    name: 'GPT Editor',
    path: '/gpt/new',
    budgets: {
      lcp: 3000,
      fid: 100,
      cls: 0.1,
      inp: 200,
      fcp: 2000,
      ttfb: 800,
      tti: 4500,
      tbt: 300,
      speedIndex: 4000,
      performanceScore: 0.85,
      accessibilityScore: 0.95,
      bestPracticesScore: 0.9,
      seoScore: 0.85,
      maxBundleSize: 800,
      maxResourceCount: 75,
    },
  },
  {
    name: 'GPT Test Playground',
    path: '/gpt/test',
    budgets: {
      lcp: 2800,
      fid: 100,
      cls: 0.1,
      inp: 200,
      fcp: 1900,
      ttfb: 800,
      tti: 4000,
      tbt: 250,
      speedIndex: 3700,
      performanceScore: 0.88,
      accessibilityScore: 0.95,
      bestPracticesScore: 0.9,
      seoScore: 0.85,
      maxBundleSize: 600,
      maxResourceCount: 60,
    },
  },
  {
    name: 'Settings Page',
    path: '/settings',
    budgets: {
      lcp: 2300,
      fid: 100,
      cls: 0.1,
      inp: 200,
      fcp: 1700,
      ttfb: 800,
      tti: 3500,
      tbt: 200,
      speedIndex: 3200,
      performanceScore: 0.92,
      accessibilityScore: 0.95,
      bestPracticesScore: 0.9,
      seoScore: 0.88,
      maxBundleSize: 450,
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
 * Validate performance metrics against budget thresholds
 *
 * Compares actual measured metrics with defined budget limits to identify
 * performance regressions. Each violation includes specific measured vs. budget values.
 *
 * @param metrics - Measured performance metrics
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
 * @returns Array of budget violations (empty if all metrics pass)
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

  if (metrics.lcp && metrics.lcp > budget.budgets.lcp) {
    violations.push(`LCP ${metrics.lcp}ms exceeds budget ${budget.budgets.lcp}ms`)
  }

  if (metrics.cls && metrics.cls > budget.budgets.cls) {
    violations.push(`CLS ${metrics.cls} exceeds budget ${budget.budgets.cls}`)
  }

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
