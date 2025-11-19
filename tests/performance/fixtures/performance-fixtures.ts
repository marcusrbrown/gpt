import type {PerformanceTestResult} from '../utils/lighthouse-utils'

import {test as base, expect} from '@playwright/test'

/**
 * Performance test fixtures interface
 */
interface PerformanceTestFixtures {
  // Store performance results for reporting
  performanceResults: PerformanceTestResult[]
}

/**
 * Extended test with performance testing fixtures
 * Provides utilities for performance measurement and reporting
 */
export const test = base.extend<PerformanceTestFixtures>({
  // Performance results fixture - stores results for later reporting
  performanceResults: async (_context, use: (r: PerformanceTestResult[]) => Promise<void>) => {
    const results: PerformanceTestResult[] = []
    await use(results)

    // After test completion, results are available for reporting
    // This could be extended to write results to a file or database
  },
})

/**
 * Re-export expect for convenience
 */
export {expect}

/**
 * Custom expect matchers for performance testing
 */
expect.extend({
  /**
   * Assert that a performance score meets the threshold
   */
  toMeetPerformanceThreshold(received: number, threshold: number) {
    const pass = received >= threshold
    const message = pass
      ? () => `Expected performance score ${received} not to meet threshold ${threshold}`
      : () => `Expected performance score ${received} to meet threshold ${threshold}`

    return {
      message,
      pass,
    }
  },

  /**
   * Assert that a metric is within budget
   */
  toBeWithinBudget(received: number, budget: number) {
    const pass = received <= budget
    const message = pass
      ? () => `Expected metric ${received} not to be within budget ${budget}`
      : () => `Expected metric ${received} to be within budget ${budget}`

    return {
      message,
      pass,
    }
  },
})

/**
 * Extend TypeScript definitions for custom matchers
 */
declare module '@playwright/test' {
  interface Matchers<R> {
    toMeetPerformanceThreshold: (threshold: number) => R
    toBeWithinBudget: (budget: number) => R
  }
}
