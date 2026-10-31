import type {PerformanceResults} from '../parsers/performance.ts'

export const PERFORMANCE_COMMENT_IDENTIFIER = '<!-- gpt-perf-results -->'

// Homepage budgets from tests/performance/config/performance-budgets.ts
const FCP_BUDGET_MS = 1800
const TBT_BUDGET_MS = 200

const seconds = (ms: number): string => `${(ms / 1000).toFixed(2)}s`

export function formatPerformanceResults(results: PerformanceResults): string {
  let body = '## ⚡ Performance Test Results\n\n'

  if (!results.hasResults) {
    body += '❌ **No performance results found**\n\n'
    body += 'Performance tests may have failed or not been executed.\n\n'
    return body
  }

  body += '### Performance metrics\n\n'
  body += `| Test | FCP | LCP | CLS | TBT (approx.) |\n`
  body += `|------|-----|-----|-----|---------------|\n`

  for (const result of results.measurements) {
    body +=
      `| ${result.file.replace('performance-metrics-', '').replace('.json', '')} | ` +
      `${seconds(result.fcp)} | ` +
      `${seconds(result.lcp)} | ` +
      `${result.cls.toFixed(3)} | ` +
      `${Math.round(result.tbt)}ms |\n`
  }

  body += '\n'

  const count = results.measurements.length
  const average = (pick: (r: PerformanceResults['measurements'][number]) => number): number =>
    results.measurements.reduce((sum, r) => sum + pick(r), 0) / count

  const avgFCP = average(r => r.fcp)
  const avgLCP = average(r => r.lcp)
  const avgCLS = average(r => r.cls)
  const avgTBT = average(r => r.tbt)

  body += '### Core Web Vitals\n\n'
  body += `| Metric | Target | Actual | Status |\n`
  body += `|--------|--------|--------|--------|\n`

  const fcpStatus = avgFCP <= FCP_BUDGET_MS ? '✅ Good' : '❌ Over budget'
  const lcpStatus = avgLCP <= 2500 ? '✅ Good' : avgLCP <= 4000 ? '⚠️ Needs work' : '❌ Poor'
  const clsStatus = avgCLS <= 0.1 ? '✅ Good' : avgCLS <= 0.25 ? '⚠️ Needs work' : '❌ Poor'
  const tbtStatus = avgTBT <= TBT_BUDGET_MS ? '✅ Good' : '❌ Over budget'

  body += `| FCP | < ${seconds(FCP_BUDGET_MS)} | ${seconds(avgFCP)} | ${fcpStatus} |\n`
  body += `| LCP | < 2.50s | ${seconds(avgLCP)} | ${lcpStatus} |\n`
  body += `| CLS | < 0.1 | ${avgCLS.toFixed(3)} | ${clsStatus} |\n`
  body += `| TBT (approx.) | < ${TBT_BUDGET_MS}ms | ${Math.round(avgTBT)}ms | ${tbtStatus} |\n\n`

  body += '### Test Details\n'
  body += '- Measured with the browser Performance API in Chromium (not Lighthouse)\n'
  body += '- FCP, LCP and CLS come from paint, largest-contentful-paint and layout-shift entries\n'
  body += '- TBT is approximated from long tasks that start after FCP\n'
  body += '- Single unthrottled sample per run; no category scores\n'
  body += '- View detailed reports in workflow artifacts\n\n'

  return body
}
