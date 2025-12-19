import type {PerformanceResults} from '../parsers/performance.ts'

export const PERFORMANCE_COMMENT_IDENTIFIER = '<!-- gpt-perf-results -->'

export function formatPerformanceResults(results: PerformanceResults): string {
  let body = '## ⚡ Performance Test Results\n\n'

  if (!results.hasResults) {
    body += '❌ **No performance results found**\n\n'
    body += 'Performance tests may have failed or not been executed.\n\n'
    return body
  }

  body += '### Lighthouse Scores\n\n'
  body += `| Test | Performance | Accessibility | LCP | CLS |\n`
  body += `|------|-------------|----------------|-----|-----|\n`

  for (const result of results.lighthouseResults) {
    const perfIcon = result.performance >= 90 ? '🟢' : result.performance >= 50 ? '🟡' : '🔴'
    const accIcon = result.accessibility >= 90 ? '🟢' : result.accessibility >= 50 ? '🟡' : '🔴'

    body +=
      `| ${result.file.replace('lighthouse-', '').replace('.json', '')} | ` +
      `${perfIcon} ${result.performance}% | ` +
      `${accIcon} ${result.accessibility}% | ` +
      `${(result.lcp / 1000).toFixed(1)}s | ` +
      `${result.cls.toFixed(3)} |\n`
  }

  body += '\n'

  if (results.averagePerformance >= 90) {
    body += '✅ **Excellent performance** - all scores above 90%\n\n'
  } else if (results.averagePerformance >= 80) {
    body += '⚠️ **Good performance** - scores above 80%\n\n'
  } else if (results.averagePerformance >= 70) {
    body += '🟡 **Moderate performance** - scores above 70%\n\n'
  } else {
    body += '❌ **Poor performance** - scores below 70%\n\n'
  }

  const avgLCP = results.lighthouseResults.reduce((sum, r) => sum + r.lcp, 0) / results.lighthouseResults.length
  const avgCLS = results.lighthouseResults.reduce((sum, r) => sum + r.cls, 0) / results.lighthouseResults.length

  body += '### Core Web Vitals\n\n'
  body += `| Metric | Target | Actual | Status |\n`
  body += `|--------|--------|--------|--------|\n`

  const lcpStatus = avgLCP <= 2500 ? '✅ Good' : avgLCP <= 4000 ? '⚠️ Needs work' : '❌ Poor'
  const clsStatus = avgCLS <= 0.1 ? '✅ Good' : avgCLS <= 0.25 ? '⚠️ Needs work' : '❌ Poor'

  body += `| LCP | < 2.5s | ${(avgLCP / 1000).toFixed(1)}s | ${lcpStatus} |\n`
  body += `| CLS | < 0.1 | ${avgCLS.toFixed(3)} | ${clsStatus} |\n\n`

  body += '### Test Details\n'
  body += '- Uses Lighthouse for comprehensive performance auditing\n'
  body += '- Tests against Core Web Vitals metrics\n'
  body += '- Includes accessibility scoring\n'
  body += '- View detailed reports in workflow artifacts\n\n'

  return body
}
