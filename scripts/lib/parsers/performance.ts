import {existsSync, readdirSync, readFileSync} from 'node:fs'
import {join} from 'node:path'

export interface LighthouseResult {
  categories: {
    performance: {score: number}
    accessibility: {score: number}
  }
  audits: {
    'largest-contentful-paint': {numericValue: number}
    'cumulative-layout-shift': {numericValue: number}
    'first-contentful-paint': {numericValue: number}
    'speed-index': {numericValue: number}
    interactive: {numericValue: number}
  }
}

export interface PerformanceResults {
  lighthouseResults: {
    file: string
    performance: number
    accessibility: number
    lcp: number
    cls: number
    fcp: number
    speedIndex: number
    tti: number
  }[]
  hasResults: boolean
  averagePerformance: number
}

export function parsePerformanceResults(resultsDir: string): PerformanceResults {
  const results: PerformanceResults = {
    lighthouseResults: [],
    hasResults: false,
    averagePerformance: 0,
  }

  try {
    if (!existsSync(resultsDir)) {
      console.warn(`Results directory not found: ${resultsDir}`)
      return results
    }

    const lighthouseFiles = readdirSync(resultsDir).filter(
      file => file.startsWith('lighthouse-') && file.endsWith('.json'),
    )

    for (const file of lighthouseFiles) {
      const filePath = join(resultsDir, file)
      if (existsSync(filePath)) {
        const content = JSON.parse(readFileSync(filePath, 'utf8')) as LighthouseResult

        const performanceScore = Math.round(content.categories.performance.score * 100)
        results.lighthouseResults.push({
          file,
          performance: performanceScore,
          accessibility: Math.round(content.categories.accessibility.score * 100),
          lcp: content.audits['largest-contentful-paint'].numericValue,
          cls: content.audits['cumulative-layout-shift'].numericValue,
          fcp: content.audits['first-contentful-paint'].numericValue,
          speedIndex: content.audits['speed-index'].numericValue,
          tti: content.audits.interactive.numericValue,
        })

        results.hasResults = true
      }
    }

    if (results.lighthouseResults.length > 0) {
      results.averagePerformance =
        results.lighthouseResults.reduce((sum, r) => sum + r.performance, 0) / results.lighthouseResults.length
    }
  } catch (error) {
    console.error('Failed to parse performance results:', error)
  }

  return results
}

export function shouldFailPerformance(results: PerformanceResults): boolean {
  return results.hasResults && results.averagePerformance < 70
}
