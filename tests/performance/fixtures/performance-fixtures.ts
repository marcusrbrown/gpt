import type {PerformanceTestResult} from '../utils/lighthouse-utils'

import {existsSync, mkdirSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'
import process from 'node:process'
import {test as base, expect as baseExpect} from '@playwright/test'

/**
 * Performance test fixtures interface
 */
interface PerformanceTestFixtures {
  // Store performance results for reporting
  performanceResults: PerformanceTestResult[]
  deviceType: 'desktop' | 'mobile'
}

/**
 * Extended test with performance testing fixtures
 * Provides utilities for performance measurement and reporting
 */
export const test = base.extend<PerformanceTestFixtures>({
  deviceType: ['desktop', {option: true}],

  performanceResults: async ({context: _, deviceType}, use: (r: PerformanceTestResult[]) => Promise<void>) => {
    const results: PerformanceTestResult[] = []
    await use(results)

    if (results.length > 0) {
      const resultsDir = join(process.cwd(), 'test-results')
      if (!existsSync(resultsDir)) {
        mkdirSync(resultsDir, {recursive: true})
      }

      const avgResult = results[0]
      if (!avgResult) {
        return
      }

      const lighthouseJson = {
        categories: {
          performance: {score: avgResult.scores.performance},
          accessibility: {score: avgResult.scores.accessibility},
        },
        audits: {
          'largest-contentful-paint': {numericValue: avgResult.metrics.lcp},
          'cumulative-layout-shift': {numericValue: avgResult.metrics.cls},
          'first-contentful-paint': {numericValue: avgResult.metrics.fcp},
          'speed-index': {numericValue: avgResult.metrics.speedIndex},
          interactive: {numericValue: avgResult.metrics.tti},
        },
      }

      const outputPath = join(resultsDir, `lighthouse-${deviceType}.json`)
      writeFileSync(outputPath, JSON.stringify(lighthouseJson, null, 2), 'utf-8')
      console.log(`Performance results written to ${outputPath}`)
    }
  },
})

/**
 * Custom expect matchers for performance testing
 */
export const expect = baseExpect.extend({
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
