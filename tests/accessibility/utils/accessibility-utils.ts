import type {Page} from '@playwright/test'
import type {AxeResults} from 'axe-core'
import {AxeBuilder} from '@axe-core/playwright'

/**
 * Accessibility testing utilities
 * Provides consistent axe-core configuration and helper functions
 */

/**
 * Accessibility violation severity levels
 */
export type ViolationSeverity = 'critical' | 'serious' | 'moderate' | 'minor'

/**
 * Accessibility test options
 */
export interface AccessibilityTestOptions {
  /** Include specific rules */
  includeTags?: string[]
  /** Exclude specific rules */
  excludeTags?: string[]
  /** Include only specific rules */
  includeRules?: string[]
  /** Exclude specific rules */
  excludeRules?: string[]
  /** Enable experimental rules */
  experimental?: boolean
  /** Custom timeout for accessibility scan */
  timeout?: number
}

/**
 * Accessibility violation summary
 */
export interface ViolationSummary {
  total: number
  critical: number
  serious: number
  moderate: number
  minor: number
  violations: AxeResults['violations']
}

/**
 * Default WCAG 2.1 AA configuration for axe-core
 * Includes comprehensive rule set for accessibility compliance
 */
export const WCAG_2_1_AA_CONFIG: AccessibilityTestOptions = {
  includeTags: [
    'wcag2a', // WCAG 2.0 Level A
    'wcag2aa', // WCAG 2.0 Level AA
    'wcag21a', // WCAG 2.1 Level A
    'wcag21aa', // WCAG 2.1 Level AA
    'best-practice', // Best practices for accessibility
  ],
  excludeTags: [
    'experimental', // Exclude experimental rules by default
  ],
  timeout: 30000, // 30 second timeout for scans
}

/**
 * Accessibility utility functions
 * Provides methods for running accessibility scans and analyzing results
 */
export const AccessibilityUtils = {
  /**
   * Run accessibility scan on a page with WCAG 2.1 AA compliance
   */
  async scanForAccessibility(page: Page, options: AccessibilityTestOptions = {}): Promise<AxeResults> {
    const config = {...WCAG_2_1_AA_CONFIG, ...options}

    let axeBuilder = new AxeBuilder({page})

    // Configure tags using withTags method
    if (config.includeTags && config.includeTags.length > 0) {
      axeBuilder = axeBuilder.withTags(config.includeTags)
    }

    // Configure specific rules using withRules method
    if (config.includeRules && config.includeRules.length > 0) {
      axeBuilder = axeBuilder.withRules(config.includeRules)
    }

    if (config.excludeRules && config.excludeRules.length > 0) {
      axeBuilder = axeBuilder.disableRules(config.excludeRules)
    }

    // No need to configure CSS selectors unless specifically required
    // The scanner will analyze the entire page by default

    return await axeBuilder.analyze()
  },

  /**
   * Analyze accessibility scan results and categorize violations by severity
   */
  analyzeViolations(results: AxeResults): ViolationSummary {
    const summary: ViolationSummary = {
      total: results.violations.length,
      critical: 0,
      serious: 0,
      moderate: 0,
      minor: 0,
      violations: results.violations,
    }

    results.violations.forEach(violation => {
      switch (violation.impact) {
        case 'critical':
          summary.critical++
          break
        case 'serious':
          summary.serious++
          break
        case 'moderate':
          summary.moderate++
          break
        case 'minor':
          summary.minor++
          break
      }
    })

    return summary
  },

  /**
   * Generate detailed accessibility violation report
   */
  generateViolationReport(summary: ViolationSummary): string {
    if (summary.total === 0) {
      return '✅ No accessibility violations found'
    }

    let report = `❌ Found ${summary.total} accessibility violation(s):\n`

    if (summary.critical > 0) {
      report += `  🔴 Critical: ${summary.critical}\n`
    }
    if (summary.serious > 0) {
      report += `  🟠 Serious: ${summary.serious}\n`
    }
    if (summary.moderate > 0) {
      report += `  🟡 Moderate: ${summary.moderate}\n`
    }
    if (summary.minor > 0) {
      report += `  🔵 Minor: ${summary.minor}\n`
    }

    report += '\nDetailed Violations:\n'
    summary.violations.forEach((violation, index) => {
      report += `\n${index + 1}. ${violation.id} (${violation.impact})\n`
      report += `   Description: ${violation.description}\n`
      report += `   Help: ${violation.help}\n`
      report += `   Help URL: ${violation.helpUrl}\n`
      report += `   Nodes affected: ${violation.nodes.length}\n`

      // Show first few affected nodes
      violation.nodes.slice(0, 3).forEach((node, nodeIndex) => {
        report += `     ${nodeIndex + 1}. ${node.html}\n`
        if (node.failureSummary) {
          report += `        Failure: ${node.failureSummary}\n`
        }
      })

      if (violation.nodes.length > 3) {
        report += `     ... and ${violation.nodes.length - 3} more\n`
      }
    })

    return report
  },

  /**
   * Check if accessibility scan meets minimum compliance standards
   */
  meetsComplianceStandards(summary: ViolationSummary, allowedCritical = 0, allowedSerious = 0): boolean {
    return summary.critical <= allowedCritical && summary.serious <= allowedSerious
  },

  /**
   * Test keyboard navigation on an element
   */
  async testKeyboardNavigation(
    page: Page,
    selector: string,
  ): Promise<{
    focusable: boolean
    tabIndex: string | null
    ariaLabel: string | null
    role: string | null
  }> {
    const element = page.locator(selector)

    // Check if element is focusable
    await element.focus()
    const isFocused = await element.evaluate(el => document.activeElement === el)

    // Get accessibility attributes
    const tabIndex = await element.getAttribute('tabindex')
    const ariaLabel = await element.getAttribute('aria-label')
    const role = await element.getAttribute('role')

    return {
      focusable: isFocused,
      tabIndex,
      ariaLabel,
      role,
    }
  },

  /**
   * Test focus management within a container
   */
  async testFocusManagement(
    page: Page,
    containerSelector: string,
  ): Promise<{
    focusableElements: number
    trapsFocus: boolean
    hasProperOrder: boolean
  }> {
    // Get all focusable elements within container
    const focusableElements = await page
      .locator(
        `${containerSelector} button, ${containerSelector} [href], ${containerSelector} input, ${containerSelector} select, ${containerSelector} textarea, ${containerSelector} [tabindex]:not([tabindex="-1"])`,
      )
      .count()

    // Test focus trapping (for modals/dialogs)
    const container = page.locator(containerSelector)
    const role = await container.getAttribute('role')
    const trapsFocus = role === 'dialog' || role === 'alertdialog'

    // Test tab order (simplified check)
    const hasProperOrder = focusableElements > 0

    return {
      focusableElements,
      trapsFocus,
      hasProperOrder,
    }
  },

  /**
   * Validate color contrast ratios
   */
  async validateColorContrast(page: Page): Promise<AxeResults> {
    return await new AxeBuilder({page}).withRules(['color-contrast']).analyze()
  },

  /**
   * Test screen reader compatibility
   */
  async testScreenReaderCompatibility(
    page: Page,
    selector: string,
  ): Promise<{
    hasAccessibleName: boolean
    hasDescription: boolean
    hasRole: boolean
    landmarks: number
  }> {
    const element = page.locator(selector)

    // Check for accessible name (aria-label, aria-labelledby, or text content)
    const ariaLabel = await element.getAttribute('aria-label')
    const ariaLabelledBy = await element.getAttribute('aria-labelledby')
    const textContent = await element.textContent()
    const hasAccessibleName = !!(ariaLabel || ariaLabelledBy || textContent?.trim())

    // Check for description
    const ariaDescribedBy = await element.getAttribute('aria-describedby')
    const hasDescription = !!ariaDescribedBy

    // Check for role
    const role = await element.getAttribute('role')
    const hasRole = !!role

    // Count landmarks on page
    const landmarks = await page
      .locator(
        '[role="banner"], [role="navigation"], [role="main"], [role="contentinfo"], [role="complementary"], [role="search"], [role="form"]',
      )
      .count()

    return {
      hasAccessibleName,
      hasDescription,
      hasRole,
      landmarks,
    }
  },
}
