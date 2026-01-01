import type {AxeResults} from 'axe-core'
import {test as base, expect, type Page} from '@playwright/test'

// Import existing page object models
import {GPTEditorPage, GPTTestPage, HomePage, SettingsPage} from '../../e2e/page-objects'
// Import accessibility utilities
import {AccessibilityUtils, type AccessibilityTestOptions, type ViolationSummary} from '../utils/accessibility-utils'

// Extended test fixtures interface for accessibility testing
interface AccessibilityTestFixtures {
  homePage: HomePage
  gptEditorPage: GPTEditorPage
  gptTestPage: GPTTestPage
  settingsPage: SettingsPage
}

// Worker fixtures interface
interface AccessibilityWorkerFixtures {
  // Worker-scoped fixtures can be added here
}

/**
 * Extended test with accessibility-focused fixtures
 * Provides page object models and accessibility testing utilities
 */
export const test = base.extend<AccessibilityTestFixtures, AccessibilityWorkerFixtures>({
  // Home page fixture
  homePage: async ({page}: {page: Page}, use: (r: HomePage) => Promise<void>) => {
    const homePage = new HomePage(page)
    await use(homePage)
  },

  // GPT Editor page fixture
  gptEditorPage: async ({page}: {page: Page}, use: (r: GPTEditorPage) => Promise<void>) => {
    const gptEditorPage = new GPTEditorPage(page)
    await use(gptEditorPage)
  },

  // GPT Test page fixture
  gptTestPage: async ({page}: {page: Page}, use: (r: GPTTestPage) => Promise<void>) => {
    const gptTestPage = new GPTTestPage(page)
    await use(gptTestPage)
  },

  // Settings page fixture
  settingsPage: async ({page}: {page: Page}, use: (r: SettingsPage) => Promise<void>) => {
    const settingsPage = new SettingsPage(page)
    await use(settingsPage)
  },
})

/**
 * Custom accessibility testing helpers
 */
export const accessibilityTest = {
  /**
   * Run comprehensive accessibility scan with custom assertion
   */
  async expectAccessible(
    page: Page,
    options: AccessibilityTestOptions = {},
    allowedCritical = 0,
    allowedSerious = 0,
  ): Promise<ViolationSummary> {
    await test.step('Running accessibility scan', async () => {
      // Wait for page to be fully loaded with timeout fallback
      // networkidle can hang when there are mocked routes that respond immediately
      try {
        await page.waitForLoadState('networkidle', {timeout: 5000})
      } catch {
        // Fall back to domcontentloaded if networkidle times out
        await page.waitForLoadState('domcontentloaded')
      }
    })

    const results = await AccessibilityUtils.scanForAccessibility(page, options)
    const summary = AccessibilityUtils.analyzeViolations(results)

    await test.step('Analyzing accessibility violations', async () => {
      // Assert compliance standards
      const meetsStandards = AccessibilityUtils.meetsComplianceStandards(summary, allowedCritical, allowedSerious)

      const violationReport = AccessibilityUtils.generateViolationReport(summary)

      expect(
        meetsStandards,
        `${violationReport}

Accessibility violations found: ${summary.critical} critical, ${summary.serious} serious`,
      ).toBe(true)
    })

    return summary
  },

  /**
   * Test keyboard navigation for a specific element
   */
  async expectKeyboardAccessible(page: Page, selector: string, expectFocusable = true): Promise<void> {
    await test.step(`Testing keyboard accessibility for: ${selector}`, async () => {
      const navigation = await AccessibilityUtils.testKeyboardNavigation(page, selector)

      if (expectFocusable) {
        expect(navigation.focusable, `Element ${selector} should be focusable`).toBe(true)
        expect(
          navigation.ariaLabel || navigation.role,
          `Element ${selector} should have aria-label or role`,
        ).toBeTruthy()
      }
    })
  },

  /**
   * Test focus management within a container
   */
  async expectProperFocusManagement(
    page: Page,
    containerSelector: string,
    expectedFocusableElements?: number,
  ): Promise<void> {
    await test.step(`Testing focus management for: ${containerSelector}`, async () => {
      const focusManagement = await AccessibilityUtils.testFocusManagement(page, containerSelector)

      expect(
        focusManagement.focusableElements,
        `Container ${containerSelector} should have focusable elements`,
      ).toBeGreaterThan(0)

      if (expectedFocusableElements !== undefined) {
        expect(focusManagement.focusableElements).toBe(expectedFocusableElements)
      }

      expect(focusManagement.hasProperOrder, `Container ${containerSelector} should have proper tab order`).toBe(true)
    })
  },

  /**
   * Test screen reader compatibility
   */
  async expectScreenReaderCompatible(page: Page, selector: string, expectedLandmarks?: number): Promise<void> {
    await test.step(`Testing screen reader compatibility for: ${selector}`, async () => {
      const compatibility = await AccessibilityUtils.testScreenReaderCompatibility(page, selector)

      expect(compatibility.hasAccessibleName, `Element ${selector} should have accessible name`).toBe(true)
      // Body typically has no explicit role; only require role for non-body selectors
      if (selector !== 'body') {
        expect(compatibility.hasRole, `Element ${selector} should have proper role`).toBe(true)
      }

      if (expectedLandmarks !== undefined) {
        expect(compatibility.landmarks).toBe(expectedLandmarks)
      }
    })
  },

  /**
   * Test color contrast compliance
   */
  async expectProperColorContrast(page: Page): Promise<void> {
    await test.step('Testing color contrast ratios', async () => {
      const results = await AccessibilityUtils.validateColorContrast(page)
      const summary = AccessibilityUtils.analyzeViolations(results)

      const violationReport = AccessibilityUtils.generateViolationReport(summary)

      // Color contrast violations should be minimal
      expect(summary.critical, `${violationReport}\n\nCritical color contrast violations found`).toBe(0)
      expect(summary.serious, `${violationReport}\n\nSerious color contrast violations found`).toBe(0)
    })
  },
}

// Re-export expect and other utilities
export {expect}
export {AccessibilityUtils}
export type {AccessibilityTestOptions, AxeResults, ViolationSummary}
