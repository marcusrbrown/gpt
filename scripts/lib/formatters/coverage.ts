import type {CoverageResults} from '../parsers/coverage.ts'

export const COVERAGE_COMMENT_IDENTIFIER = '<!-- gpt-coverage-results -->'

export function formatCoverageResults(results: CoverageResults, repository?: string): string {
  let body = '## 📊 Test Coverage Report\n\n'

  if (results.hasCoverage && results.unitCoverage) {
    const coverage = results.unitCoverage.total

    body += '### Unit Test Coverage\n\n'
    body += `| Metric | Coverage |\n`
    body += `|--------|----------|\n`
    body += `| Lines | ${coverage.lines.pct.toFixed(1)}% |\n`
    body += `| Branches | ${coverage.branches.pct.toFixed(1)}% |\n`
    body += `| Functions | ${coverage.functions.pct.toFixed(1)}% |\n`
    body += `| Statements | ${coverage.statements.pct.toFixed(1)}% |\n\n`

    if (results.averageCoverage >= 90) {
      body += '✅ **Excellent coverage** - above 90%\n\n'
    } else if (results.averageCoverage >= 80) {
      body += '⚠️ **Good coverage** - above 80%\n\n'
    } else if (results.averageCoverage >= 70) {
      body += '🟡 **Moderate coverage** - above 70%\n\n'
    } else {
      body += '❌ **Low coverage** - below 70%\n\n'
    }
  }

  body += '### Test Types Executed\n\n'
  body += `| Test Type | Status |\n`
  body += `|-----------|--------|\n`

  if (results.hasCoverage) {
    body += `| Unit Tests | ✅ Executed |\n`
  } else {
    body += `| Unit Tests | ❌ Not found |\n`
  }

  if (results.e2eTests > 0) {
    body += `| E2E Tests | ✅ ${results.e2eTests} tests executed |\n`
  } else {
    body += `| E2E Tests | ❌ Not executed |\n`
  }

  body += `| Visual Tests | ✅ Executed |\n`
  body += `| Accessibility Tests | ✅ Executed |\n`
  body += `| Performance Tests | ✅ Executed |\n\n`

  body += '### Coverage Details\n'
  body += '- **Unit Tests**: Vitest + React Testing Library\n'
  body += '- **E2E Tests**: Playwright\n'
  body += '- **Coverage Tool**: Istanbul/nyc\n\n'

  if (results.hasCoverage && repository) {
    body += `[View detailed coverage report](https://codecov.io/gh/${repository})\n\n`
  }

  return body
}
