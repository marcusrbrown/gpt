import type {VisualResults} from '../parsers/visual.ts'

export const VISUAL_COMMENT_IDENTIFIER = '<!-- gpt-visual-results -->'

export function formatVisualResults(results: VisualResults, runId?: string, repository?: string): string {
  let body = '## 📸 Visual Regression Test Results\n\n'

  if (!results.hasResults) {
    body += '❌ **No visual test results found**\n\n'
    body += 'Visual regression tests may have failed or not been executed.\n\n'
    return body
  }

  body += `### Test Summary\n\n`
  body += `| Status | Count |\n`
  body += `|--------|-------|\n`
  body += `| ✅ Passed | ${results.passed} |\n`
  body += `| ❌ Failed | ${results.failed} |\n`
  body += `| **Total** | **${results.total}** |\n\n`

  if (results.failed === 0) {
    body += '✅ **All visual tests passed!**\n\n'
    body += 'No visual regressions detected in this PR.\n\n'
  } else {
    body += `❌ **${results.failed} visual regression(s) detected**\n\n`

    if (results.failedTests.length > 0) {
      body += '### Failed Tests\n\n'
      for (const test of results.failedTests.slice(0, 10)) {
        body += `#### ${test.title}\n\n`
        if (test.error) {
          body += '```\n'
          body += test.error
          body += '\n```\n\n'
        }
      }

      if (results.failedTests.length > 10) {
        body += `*... and ${results.failedTests.length - 10} more failures*\n\n`
      }
    }

    if (runId && repository) {
      body += `📋 [View detailed results](https://github.com/${repository}/actions/runs/${runId})\n\n`
    }
  }

  body += '### Test Details\n'
  body += '- Uses Playwright for screenshot comparison\n'
  body += '- Compares against approved baseline images\n'
  body += '- Tests across multiple viewports and devices\n'
  body += '- View diff images in workflow artifacts\n\n'

  return body
}
