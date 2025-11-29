#!/usr/bin/env node
/**
 * Test Result Aggregation Script
 *
 * Aggregates test results from multiple test types and generates
 * a comprehensive summary report with detailed failure analysis.
 */

import {existsSync, readdirSync, readFileSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'
import process from 'node:process'

interface TestResult {
  type: 'unit' | 'e2e' | 'visual' | 'accessibility' | 'performance'
  passed: number
  failed: number
  skipped: number
  total: number
  duration: number
  failures: {
    test: string
    error: string
    file: string
  }[]
}

interface AggregatedResults {
  summary: {
    totalTests: number
    passed: number
    failed: number
    skipped: number
    successRate: number
    totalDuration: number
  }
  byType: Record<string, TestResult>
  failures: {
    type: string
    test: string
    error: string
    file: string
  }[]
  timestamp: string
}

function parsePlaywrightResults(filePath: string): Partial<TestResult> | null {
  try {
    interface RawStats {
      expected?: number
      unexpected?: number
      skipped?: number
      duration?: number
    }
    interface RawTestResult {
      error?: {message?: string}
    }
    interface RawTest {
      results?: RawTestResult[]
    }
    interface RawSpec {
      title?: string
      ok?: boolean
      tests?: RawTest[]
      file?: string
    }
    interface RawSuite {
      specs?: RawSpec[]
    }
    interface PlaywrightRaw {
      stats?: RawStats
      suites?: RawSuite[]
    }

    const content = JSON.parse(readFileSync(filePath, 'utf8')) as PlaywrightRaw

    const passed = content.stats?.expected || 0
    const failed = content.stats?.unexpected || 0
    const skipped = content.stats?.skipped || 0
    const duration = content.stats?.duration || 0

    const failures = (content.suites ?? []).flatMap((suite: RawSuite) =>
      (suite.specs ?? [])
        .filter((spec: RawSpec) => spec.ok === false)
        .map((spec: RawSpec) => {
          const errorMsg = spec.tests?.[0]?.results?.[0]?.error?.message ?? 'Unknown error'
          return {
            test: spec.title ?? 'Unnamed test',
            error: errorMsg,
            file: spec.file ?? 'unknown',
          }
        }),
    )

    return {
      passed,
      failed,
      skipped,
      total: passed + failed + skipped,
      duration,
      failures,
    }
  } catch {
    return null
  }
}

function parseVitestCoverage(coverageDir: string): Partial<TestResult> | null {
  try {
    const summaryPath = join(coverageDir, 'coverage-summary.json')
    if (!existsSync(summaryPath)) {
      return null
    }

    // Coverage data exists - tests have been run
    return {
      passed: 0, // Will be filled from test output
      failed: 0,
      skipped: 0,
      total: 0,
      duration: 0,
      failures: [],
    }
  } catch {
    return null
  }
}

function aggregateTestResults(resultsDir: string): AggregatedResults {
  const results: AggregatedResults = {
    summary: {
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      successRate: 0,
      totalDuration: 0,
    },
    byType: {},
    failures: [],
    timestamp: new Date().toISOString(),
  }

  // Parse E2E test results
  const e2eResultsPath = join(resultsDir, 'results.json')
  if (existsSync(e2eResultsPath)) {
    const e2eResults = parsePlaywrightResults(e2eResultsPath)
    if (e2eResults) {
      results.byType.e2e = {type: 'e2e', ...e2eResults} as TestResult
    }
  }

  // Parse visual test results
  const visualResultsPath = join(resultsDir, 'visual-results.json')
  if (existsSync(visualResultsPath)) {
    const visualResults = parsePlaywrightResults(visualResultsPath)
    if (visualResults) {
      results.byType.visual = {type: 'visual', ...visualResults} as TestResult
    }
  }

  // Parse accessibility test results
  const accessibilityDir = join(resultsDir, 'accessibility')
  if (existsSync(accessibilityDir)) {
    const accessibilityFiles = readdirSync(accessibilityDir).filter(f => f.endsWith('.json'))

    let totalPassed = 0
    let totalFailed = 0
    let totalDuration = 0

    for (const file of accessibilityFiles) {
      const result = parsePlaywrightResults(join(accessibilityDir, file))
      if (result) {
        totalPassed += result.passed || 0
        totalFailed += result.failed || 0
        totalDuration += result.duration || 0
      }
    }

    results.byType.accessibility = {
      type: 'accessibility',
      passed: totalPassed,
      failed: totalFailed,
      skipped: 0,
      total: totalPassed + totalFailed,
      duration: totalDuration,
      failures: [],
    }
  }

  // Parse performance test results
  const performanceResultsPath = join(resultsDir, 'performance-results.json')
  if (existsSync(performanceResultsPath)) {
    const perfResults = parsePlaywrightResults(performanceResultsPath)
    if (perfResults) {
      results.byType.performance = {type: 'performance', ...perfResults} as TestResult
    }
  }

  // Parse unit test coverage
  const coverageDir = join(process.cwd(), 'coverage')
  if (existsSync(coverageDir)) {
    const unitResults = parseVitestCoverage(coverageDir)
    if (unitResults) {
      results.byType.unit = {type: 'unit', ...unitResults} as TestResult
    }
  }

  // Calculate summary
  for (const [type, result] of Object.entries(results.byType)) {
    results.summary.totalTests += result.total
    results.summary.passed += result.passed
    results.summary.failed += result.failed
    results.summary.skipped += result.skipped
    results.summary.totalDuration += result.duration

    // Collect failures
    for (const failure of result.failures) {
      results.failures.push({
        type,
        ...failure,
      })
    }
  }

  results.summary.successRate =
    results.summary.totalTests > 0 ? (results.summary.passed / results.summary.totalTests) * 100 : 0

  return results
}

function generateMarkdownReport(results: AggregatedResults): string {
  let report = '# Test Results Summary\n\n'
  report += `Generated: ${new Date(results.timestamp).toLocaleString()}\n\n`

  // Overall summary
  report += '## Overall Summary\n\n'
  report += `| Metric | Value |\n`
  report += `|--------|-------|\n`
  report += `| Total Tests | ${results.summary.totalTests} |\n`
  report += `| Passed | ${results.summary.passed} |\n`
  report += `| Failed | ${results.summary.failed} |\n`
  report += `| Skipped | ${results.summary.skipped} |\n`
  report += `| Success Rate | ${results.summary.successRate.toFixed(2)}% |\n`
  report += `| Total Duration | ${(results.summary.totalDuration / 1000).toFixed(2)}s |\n\n`

  // Results by type
  report += '## Results by Test Type\n\n'
  for (const [type, result] of Object.entries(results.byType)) {
    const emoji = result.failed === 0 ? '✅' : '❌'
    report += `### ${emoji} ${type.charAt(0).toUpperCase() + type.slice(1)} Tests\n\n`
    report += `- **Passed**: ${result.passed}\n`
    report += `- **Failed**: ${result.failed}\n`
    report += `- **Skipped**: ${result.skipped}\n`
    report += `- **Duration**: ${(result.duration / 1000).toFixed(2)}s\n\n`
  }

  // Failures
  if (results.failures.length > 0) {
    report += '## Failures\n\n'
    for (const failure of results.failures) {
      report += `### ❌ ${failure.type}: ${failure.test}\n\n`
      report += `**File**: \`${failure.file}\`\n\n`
      report += '```\n'
      report += failure.error
      report += '\n```\n\n'
    }
  } else {
    report += '## ✅ No Failures\n\n'
    report += 'All tests passed successfully!\n\n'
  }

  return report
}

// Main execution
const resultsDir = process.argv[2] || 'test-results'
const outputFile = process.argv[3] || 'test-summary.md'

console.log(`Aggregating test results from: ${resultsDir}`)

const results = aggregateTestResults(resultsDir)
const report = generateMarkdownReport(results)

// Write results
writeFileSync(outputFile, report)
writeFileSync('test-results.json', JSON.stringify(results, null, 2))

console.log(`\n✅ Test summary written to: ${outputFile}`)
console.log(`📊 Detailed results written to: test-results.json`)

// Exit with error if tests failed
if (results.summary.failed > 0) {
  console.error(`\n❌ ${results.summary.failed} tests failed`)
  process.exit(1)
}

console.log(`\n✅ All ${results.summary.passed} tests passed!`)
