import {existsSync, readdirSync, readFileSync} from 'node:fs'
import {join} from 'node:path'

/**
 * Shape of `performance-metrics-<device>.json`, written by the performance test fixture.
 * Values come from the browser Performance API, not Lighthouse.
 */
export interface PerformanceMetricsFile {
  metrics: {
    fcp: number
    lcp: number
    cls: number
    tbt: number
  }
}

export interface PerformanceResults {
  measurements: {
    file: string
    fcp: number
    lcp: number
    cls: number
    tbt: number
  }[]
  hasResults: boolean
}

const METRICS_FILE_PREFIX = 'performance-metrics-'

export function parsePerformanceResults(resultsDir: string): PerformanceResults {
  const results: PerformanceResults = {
    measurements: [],
    hasResults: false,
  }

  try {
    if (!existsSync(resultsDir)) {
      console.warn(`Results directory not found: ${resultsDir}`)
      return results
    }

    const metricsFiles = readdirSync(resultsDir).filter(
      file => file.startsWith(METRICS_FILE_PREFIX) && file.endsWith('.json'),
    )

    for (const file of metricsFiles) {
      const filePath = join(resultsDir, file)
      if (existsSync(filePath)) {
        const {metrics} = JSON.parse(readFileSync(filePath, 'utf8')) as PerformanceMetricsFile

        results.measurements.push({
          file,
          fcp: metrics.fcp,
          lcp: metrics.lcp,
          cls: metrics.cls,
          tbt: metrics.tbt,
        })

        results.hasResults = true
      }
    }
  } catch (error) {
    console.error('Failed to parse performance results:', error)
  }

  return results
}
