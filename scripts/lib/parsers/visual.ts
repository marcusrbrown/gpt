import {existsSync, readFileSync} from 'node:fs'
import {join} from 'node:path'

export interface VisualTestResult {
  stats: {
    expected: number
    unexpected: number
    skipped: number
  }
  suites: {
    specs: {
      tests: {
        title: string
        status: 'passed' | 'failed'
        error?: string
      }[]
    }[]
  }[]
}

export interface VisualResults {
  total: number
  passed: number
  failed: number
  failedTests: {title: string; error?: string}[]
  hasResults: boolean
}

export function parseVisualResults(resultsDir: string): VisualResults {
  const results: VisualResults = {
    total: 0,
    passed: 0,
    failed: 0,
    failedTests: [],
    hasResults: false,
  }

  try {
    const resultsPath = join(resultsDir, 'visual-results.json')
    if (existsSync(resultsPath)) {
      const content = JSON.parse(readFileSync(resultsPath, 'utf8')) as VisualTestResult

      results.total = (content.stats.expected || 0) + (content.stats.unexpected || 0)
      results.passed = content.stats.expected || 0
      results.failed = content.stats.unexpected || 0
      results.hasResults = true

      if (content.suites) {
        for (const suite of content.suites) {
          if (suite.specs) {
            for (const spec of suite.specs) {
              if (spec.tests) {
                for (const test of spec.tests) {
                  if (test.status === 'failed') {
                    results.failedTests.push({
                      title: test.title,
                      error: test.error,
                    })
                  }
                }
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to parse visual test results:', error)
  }

  return results
}

export function shouldFailVisual(results: VisualResults): boolean {
  return results.hasResults && results.failed > 0
}
