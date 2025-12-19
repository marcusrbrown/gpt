export {parseAccessibilityResults, shouldFailAccessibility} from './accessibility.ts'
export type {AccessibilityResults, AccessibilityViolation} from './accessibility.ts'

export {parseCoverageResults, shouldFailCoverage} from './coverage.ts'
export type {CoverageResults, CoverageSummary} from './coverage.ts'

export {parsePerformanceResults, shouldFailPerformance} from './performance.ts'
export type {LighthouseResult, PerformanceResults} from './performance.ts'

export {parseVisualResults, shouldFailVisual} from './visual.ts'
export type {VisualResults, VisualTestResult} from './visual.ts'
