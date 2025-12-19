import {existsSync, readFileSync} from 'node:fs'
import {join} from 'node:path'

export interface AccessibilityViolation {
  impact: 'minor' | 'moderate' | 'serious' | 'critical'
  description: string
  help: string
  helpUrl: string
  nodes: {
    target: string[]
    html: string
  }[]
}

export interface AccessibilityResults {
  totalViolations: number
  criticalViolations: number
  seriousViolations: number
  moderateViolations: number
  minorViolations: number
  violations: AccessibilityViolation[]
  hasResults: boolean
}

export function parseAccessibilityResults(resultsDir: string): AccessibilityResults {
  const results: AccessibilityResults = {
    totalViolations: 0,
    criticalViolations: 0,
    seriousViolations: 0,
    moderateViolations: 0,
    minorViolations: 0,
    violations: [],
    hasResults: false,
  }

  try {
    const violationFiles = [
      join(resultsDir, 'accessibility-violations.json'),
      join(resultsDir, 'test-results/accessibility-violations.json'),
    ]

    for (const filePath of violationFiles) {
      if (existsSync(filePath)) {
        const content = JSON.parse(readFileSync(filePath, 'utf8')) as {
          violations: AccessibilityViolation[]
        }

        results.totalViolations += content.violations.length
        results.violations.push(...content.violations)

        for (const violation of content.violations) {
          switch (violation.impact) {
            case 'critical':
              results.criticalViolations++
              break
            case 'serious':
              results.seriousViolations++
              break
            case 'moderate':
              results.moderateViolations++
              break
            case 'minor':
              results.minorViolations++
              break
          }
        }

        results.hasResults = true
      }
    }
  } catch (error) {
    console.error('Failed to parse accessibility results:', error)
  }

  return results
}

export function shouldFailAccessibility(results: AccessibilityResults): boolean {
  return results.hasResults && results.criticalViolations > 0
}
