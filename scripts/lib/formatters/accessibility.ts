import type {AccessibilityResults} from '../parsers/accessibility.ts'

export const ACCESSIBILITY_COMMENT_IDENTIFIER = '<!-- gpt-a11y-results -->'

export function formatAccessibilityResults(results: AccessibilityResults): string {
  let body = '## ♿ Accessibility Test Results\n\n'

  body += '### WCAG 2.1 AA Compliance Summary\n\n'
  body += `| Severity | Count |\n`
  body += `|----------|-------|\n`
  body += `| Critical | ${results.criticalViolations} |\n`
  body += `| Serious | ${results.seriousViolations} |\n`
  body += `| Moderate | ${results.moderateViolations} |\n`
  body += `| Minor | ${results.minorViolations} |\n`
  body += `| **Total** | **${results.totalViolations}** |\n\n`

  if (results.criticalViolations > 0) {
    body += '❌ **Critical violations found** - these must be fixed before merging.\n\n'
  } else if (results.seriousViolations > 0) {
    body += '⚠️ **Serious violations found** - review and fix these issues.\n\n'
  } else if (results.totalViolations > 0) {
    body += 'ℹ️ **Minor violations found** - consider fixing these for better accessibility.\n\n'
  } else {
    body += '✅ **All accessibility tests passed!**\n\n'
  }

  if (results.violations.length > 0 && results.violations.length <= 5) {
    body += '### Top Violations\n\n'
    for (const violation of results.violations.slice(0, 5)) {
      body += `#### ${violation.impact.toUpperCase()}: ${violation.description}\n\n`
      body += `${violation.help}\n\n`
      if (violation.helpUrl) {
        body += `[Learn more](${violation.helpUrl})\n\n`
      }
    }
  }

  body += '### Test Details\n'
  body += '- Uses axe-core for WCAG 2.1 AA compliance testing\n'
  body += '- Tests keyboard navigation, screen reader support, and color contrast\n'
  body += '- View detailed results in workflow artifacts\n\n'

  return body
}
