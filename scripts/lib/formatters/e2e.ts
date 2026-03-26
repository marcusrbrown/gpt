import type {E2EResults} from '../parsers/e2e.ts'

export const E2E_COMMENT_IDENTIFIER = '<!-- gpt-e2e-results -->'

export function formatE2EResults(results: E2EResults, runId?: string, repository?: string): string {
  let body = '## End-to-End Test Report\n\n'

  if (!results.hasResults) {
    body += '❌ **No E2E test results found**\n\n'
    body += 'The Playwright results artifact was not available for this run.\n\n'
    return body
  }

  body += '### Test Summary\n\n'
  body += '| Status | Count |\n'
  body += '|--------|-------|\n'
  body += `| ✅ Passed | ${results.passed} |\n`
  body += `| ❌ Failed | ${results.failed} |\n`
  body += `| ⚠️ Flaky | ${results.flaky} |\n`
  body += `| ⏭️ Skipped | ${results.skipped} |\n`
  body += `| **Total** | **${results.total}** |\n\n`

  body += `Duration: ${formatDuration(results.durationMs)}\n\n`

  if (results.failed === 0 && results.flaky === 0) {
    body += '✅ **All E2E tests passed.**\n\n'
  } else {
    body += `❌ **${results.failed} failing test(s), ${results.flaky} flaky test(s)**\n\n`

    if (results.failedTests.length > 0) {
      body += '### Failing Tests\n\n'
      for (const test of results.failedTests.slice(0, 10)) {
        body += `- ${test.title}\n`
        if (test.error != null) {
          body += '```\n'
          body += `${test.error}\n`
          body += '```\n'
        }
      }
      body += '\n'
    }

    if (runId != null && repository != null) {
      body += `View the full workflow run: https://github.com/${repository}/actions/runs/${runId}\n\n`
    }
  }

  body += '### Details\n'
  body += '- Source: Playwright JSON reporter\n'
  body += '- Artifact includes HTML report and raw test results\n'
  body += '- Failing and flaky tests are listed above when available\n\n'

  return body
}

function formatDuration(durationMs: number): string {
  const roundedSeconds = Math.round(durationMs / 1000)
  const minutes = Math.floor(roundedSeconds / 60)
  const seconds = roundedSeconds % 60

  if (minutes === 0) {
    return `${seconds}s`
  }

  return `${minutes}m ${seconds}s`
}
