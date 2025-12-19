#!/usr/bin/env node
import process from 'node:process'
import {
  ACCESSIBILITY_COMMENT_IDENTIFIER,
  COVERAGE_COMMENT_IDENTIFIER,
  formatAccessibilityResults,
  formatCoverageResults,
  formatPerformanceResults,
  formatVisualResults,
  PERFORMANCE_COMMENT_IDENTIFIER,
  VISUAL_COMMENT_IDENTIFIER,
} from './lib/formatters/index.ts'
import {GitHubComments} from './lib/github-comments.ts'
import {JobSummary} from './lib/job-summary.ts'
import {
  parseAccessibilityResults,
  parseCoverageResults,
  parsePerformanceResults,
  parseVisualResults,
  shouldFailAccessibility,
  shouldFailPerformance,
  shouldFailVisual,
} from './lib/parsers/index.ts'

interface CLIArgs {
  type: 'performance' | 'accessibility' | 'visual' | 'coverage'
  resultsDir: string
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2)
  let type: CLIArgs['type'] | undefined
  let resultsDir = 'test-results'

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--type' && args[i + 1]) {
      const typeArg = args[i + 1]
      if (['performance', 'accessibility', 'visual', 'coverage'].includes(typeArg)) {
        type = typeArg as CLIArgs['type']
      } else {
        console.error(`Invalid test type: ${typeArg}`)
        console.error('Valid types: performance, accessibility, visual, coverage')
        process.exit(1)
      }
      i++
    } else if (args[i] === '--results-dir' && args[i + 1]) {
      resultsDir = args[i + 1]
      i++
    }
  }

  if (!type) {
    console.error('Missing required argument: --type')
    console.error('Usage: report-test-results.ts --type <test-type> [--results-dir <path>]')
    process.exit(1)
  }

  return {type, resultsDir}
}

async function main(): Promise<void> {
  const {type, resultsDir} = parseArgs()

  const repo = process.env.GH_REPO ?? process.env.GITHUB_REPOSITORY
  const prNumber = process.env.PR_NUMBER ?? ''
  const runId = process.env.GITHUB_RUN_ID
  const summaryWriter = new JobSummary()

  if (!repo) {
    console.error('Missing required environment variable: GH_REPO or GITHUB_REPOSITORY')
    process.exit(1)
  }

  console.info(`Processing ${type} test results from ${resultsDir}`)

  let commentBody: string
  let commentIdentifier: string
  let shouldFail = false

  switch (type) {
    case 'performance': {
      const results = parsePerformanceResults(resultsDir)
      commentBody = formatPerformanceResults(results)
      commentIdentifier = PERFORMANCE_COMMENT_IDENTIFIER
      shouldFail = shouldFailPerformance(results)

      summaryWriter.writeHeading('Performance Test Results')
      summaryWriter.write(commentBody)

      if (shouldFail) {
        console.error(`❌ Performance score too low: ${results.averagePerformance.toFixed(1)}%`)
      }
      break
    }

    case 'accessibility': {
      const results = parseAccessibilityResults(resultsDir)
      commentBody = formatAccessibilityResults(results)
      commentIdentifier = ACCESSIBILITY_COMMENT_IDENTIFIER
      shouldFail = shouldFailAccessibility(results)

      summaryWriter.writeHeading('Accessibility Test Results')
      summaryWriter.write(commentBody)

      if (shouldFail) {
        console.error(`❌ ${results.criticalViolations} critical accessibility violations found`)
      }
      break
    }

    case 'visual': {
      const results = parseVisualResults(resultsDir)
      commentBody = formatVisualResults(results, runId, repo)
      commentIdentifier = VISUAL_COMMENT_IDENTIFIER
      shouldFail = shouldFailVisual(results)

      summaryWriter.writeHeading('Visual Regression Test Results')
      summaryWriter.write(commentBody)

      if (shouldFail) {
        console.error(`❌ ${results.failed} visual regression(s) detected`)
      }
      break
    }

    case 'coverage': {
      const results = parseCoverageResults(resultsDir)
      commentBody = formatCoverageResults(results, repo)
      commentIdentifier = COVERAGE_COMMENT_IDENTIFIER

      summaryWriter.writeHeading('Test Coverage Report')
      summaryWriter.write(commentBody)
      break
    }
  }

  if (prNumber) {
    console.info(`Posting comment to PR #${prNumber}`)
    const commentManager = new GitHubComments({
      repo,
      prNumber,
      identifier: commentIdentifier,
    })

    await commentManager.upsertComment(commentBody)
  } else {
    console.warn('No PR number provided, skipping comment posting')
  }

  if (shouldFail) {
    process.exit(1)
  }
}

main().catch(error => {
  console.error('Failed to generate test report:', error)
  process.exit(1)
})
