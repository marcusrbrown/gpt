import {existsSync, readFileSync} from 'node:fs'
import {join} from 'node:path'
import process from 'node:process'

export interface E2ETestStats {
  duration: number
  expected: number
  flaky: number
  skipped: number
  unexpected: number
}

export interface E2EFailure {
  title: string
  error?: string
}

export interface E2EResults {
  durationMs: number
  failed: number
  failedTests: E2EFailure[]
  flaky: number
  hasResults: boolean
  passed: number
  skipped: number
  total: number
}

interface PlaywrightTestAttempt {
  errors?: {message?: string; value?: string}[]
}

interface PlaywrightSpec {
  title: string
  tests?: {
    results?: PlaywrightTestAttempt[]
    status?: 'expected' | 'flaky' | 'skipped' | 'unexpected'
  }[]
}

interface PlaywrightSuite {
  specs?: PlaywrightSpec[]
  suites?: PlaywrightSuite[]
  title?: string
}

interface PlaywrightResults {
  stats?: Partial<E2ETestStats>
  suites?: PlaywrightSuite[]
}

export function parseE2EResults(resultsDir: string): E2EResults {
  const results: E2EResults = {
    durationMs: 0,
    failed: 0,
    failedTests: [],
    flaky: 0,
    hasResults: false,
    passed: 0,
    skipped: 0,
    total: 0,
  }

  try {
    const resultsPath = resolveResultsPath(resultsDir)
    if (resultsPath == null) {
      return results
    }

    const content = JSON.parse(readFileSync(resultsPath, 'utf8')) as PlaywrightResults
    const stats = content.stats

    results.durationMs = stats?.duration ?? 0
    results.failed = stats?.unexpected ?? 0
    results.flaky = stats?.flaky ?? 0
    results.hasResults = true
    results.passed = stats?.expected ?? 0
    results.skipped = stats?.skipped ?? 0
    results.total = results.passed + results.failed + results.flaky + results.skipped
    results.failedTests = collectFailedTests(content.suites ?? [])
  } catch (error) {
    console.error('Failed to parse E2E test results:', error)
  }

  return results
}

function resolveResultsPath(resultsDir: string): string | undefined {
  const candidates = [join(resultsDir, 'results.json'), join(process.cwd(), 'test-results/results.json')]
  return candidates.find(candidate => existsSync(candidate))
}

function collectFailedTests(suites: PlaywrightSuite[], titles: string[] = []): E2EFailure[] {
  const failures: E2EFailure[] = []

  for (const suite of suites) {
    const nextTitles = suite.title != null && suite.title.length > 0 ? [...titles, suite.title] : titles

    for (const spec of suite.specs ?? []) {
      const failingTest = spec.tests?.find(test => test.status === 'unexpected' || test.status === 'flaky')
      if (failingTest != null) {
        failures.push({
          title: [...nextTitles, spec.title].join(' > '),
          error: extractErrorMessage(failingTest.results ?? []),
        })
      }
    }

    failures.push(...collectFailedTests(suite.suites ?? [], nextTitles))
  }

  return failures
}

function extractErrorMessage(results: PlaywrightTestAttempt[]): string | undefined {
  for (const result of results) {
    for (const error of result.errors ?? []) {
      if (typeof error.message === 'string' && error.message.length > 0) {
        return error.message
      }

      if (typeof error.value === 'string' && error.value.length > 0) {
        return error.value
      }
    }
  }

  return undefined
}

export function shouldFailE2E(_results: E2EResults): boolean {
  return false
}
