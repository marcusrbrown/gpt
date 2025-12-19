import {existsSync, readFileSync} from 'node:fs'
import {join} from 'node:path'
import process from 'node:process'

export interface CoverageSummary {
  total: {
    lines: {pct: number}
    branches: {pct: number}
    functions: {pct: number}
    statements: {pct: number}
  }
}

export interface CoverageResults {
  unitCoverage?: CoverageSummary
  e2eTests: number
  hasCoverage: boolean
  averageCoverage: number
}

export function parseCoverageResults(resultsDir: string): CoverageResults {
  const results: CoverageResults = {
    unitCoverage: undefined,
    e2eTests: 0,
    hasCoverage: false,
    averageCoverage: 0,
  }

  try {
    const coveragePath = join(resultsDir, 'coverage-summary.json')
    const coveragePathAlt = join(process.cwd(), 'coverage/coverage-summary.json')

    if (existsSync(coveragePath)) {
      results.unitCoverage = JSON.parse(readFileSync(coveragePath, 'utf8')) as CoverageSummary
      results.hasCoverage = true
    } else if (existsSync(coveragePathAlt)) {
      results.unitCoverage = JSON.parse(readFileSync(coveragePathAlt, 'utf8')) as CoverageSummary
      results.hasCoverage = true
    }

    if (results.unitCoverage) {
      const coverage = results.unitCoverage.total
      results.averageCoverage =
        (coverage.lines.pct + coverage.branches.pct + coverage.functions.pct + coverage.statements.pct) / 4
    }

    const e2eResultsPath = join(resultsDir, 'results.json')
    const e2eResultsPathAlt = join(process.cwd(), 'test-results/results.json')

    if (existsSync(e2eResultsPath)) {
      const e2eResults = JSON.parse(readFileSync(e2eResultsPath, 'utf8')) as {
        stats?: {expected?: number}
      }
      results.e2eTests = e2eResults.stats?.expected ?? 0
    } else if (existsSync(e2eResultsPathAlt)) {
      const e2eResults = JSON.parse(readFileSync(e2eResultsPathAlt, 'utf8')) as {
        stats?: {expected?: number}
      }
      results.e2eTests = e2eResults.stats?.expected ?? 0
    }
  } catch (error) {
    console.error('Failed to parse coverage results:', error)
  }

  return results
}

export function shouldFailCoverage(_results: CoverageResults): boolean {
  return false
}
