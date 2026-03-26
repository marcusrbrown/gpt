export {parseAccessibilityResults, shouldFailAccessibility} from './accessibility.ts'
export type {AccessibilityResults, AccessibilityViolation} from './accessibility.ts'

export {parseCoverageResults, shouldFailCoverage} from './coverage.ts'
export type {CoverageResults, CoverageSummary} from './coverage.ts'

export {parseE2EResults, shouldFailE2E} from './e2e.ts'
export type {E2EFailure, E2EResults, E2ETestStats} from './e2e.ts'

export {parsePerformanceResults, shouldFailPerformance} from './performance.ts'
export type {LighthouseResult, PerformanceResults} from './performance.ts'

export {parseVisualResults, shouldFailVisual} from './visual.ts'
export type {VisualResults, VisualTestResult} from './visual.ts'
