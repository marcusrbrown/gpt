import type {PerformanceTestResult} from '../utils/performance-utils'

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
}

/**
 * Extended test with performance testing fixtures
 * Provides utilities for performance measurement and reporting
 */
export const test = base.extend<PerformanceTestFixtures>({
  performanceResults: async ({context: _}, use: (r: PerformanceTestResult[]) => Promise<void>, testInfo) => {
    const results: PerformanceTestResult[] = []
    await use(results)

    if (results.length > 0) {
      const resultsDir = join(process.cwd(), 'test-results')
      if (!existsSync(resultsDir)) {
        mkdirSync(resultsDir, {recursive: true})
      }

      // Each test gets its own fixture instance, so the file holds the sample from
      // the last test in the project that recorded a result.
      const latestResult = results.at(-1)
      if (!latestResult) {
        return
      }

      const metricsJson = {
        url: latestResult.url,
        timestamp: latestResult.timestamp,
        metrics: {
          fcp: latestResult.metrics.fcp,
          lcp: latestResult.metrics.lcp,
          cls: latestResult.metrics.cls,
          tbt: latestResult.metrics.tbt,
        },
      }

      const outputPath = join(resultsDir, `performance-metrics-${testInfo.project.name}.json`)
      writeFileSync(outputPath, JSON.stringify(metricsJson, null, 2), 'utf-8')
      console.log(`Performance results written to ${outputPath}`)
    }
  },
})

/**
 * Custom expect matchers for performance testing
 */
export const expect = baseExpect.extend({
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
