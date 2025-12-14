/**
 * Accessibility testing configuration for axe-core
 * Provides WCAG 2.1 AA compliance rules and custom exclusions
 */

import type {AccessibilityTestOptions} from './accessibility-utils'

/**
 * Standard WCAG 2.1 AA configuration
 * Includes all essential rules for accessibility compliance
 */
export const WCAG_2_1_AA_STANDARD: AccessibilityTestOptions = {
  includeTags: [
    'wcag2a', // WCAG 2.0 Level A
    'wcag2aa', // WCAG 2.0 Level AA
    'wcag21a', // WCAG 2.1 Level A
    'wcag21aa', // WCAG 2.1 Level AA
    'best-practice', // Best practices for accessibility
  ],
  excludeTags: [
    'experimental', // Exclude experimental rules for stable testing
  ],
  timeout: 30000,
}

/**
 * Strict WCAG 2.1 AA configuration
 * No exclusions - for comprehensive accessibility audits
 */
export const WCAG_2_1_AA_STRICT: AccessibilityTestOptions = {
  includeTags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
  excludeTags: ['experimental'],
  timeout: 45000, // Longer timeout for comprehensive scans
}

/**
 * Development-friendly configuration
 * Excludes minor issues to focus on critical accessibility barriers
 */
export const WCAG_2_1_AA_DEVELOPMENT: AccessibilityTestOptions = {
  includeTags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
  excludeTags: [
    'experimental',
    'best-practice', // Exclude best practices during development
  ],
  // Exclude minor color contrast issues during development
  excludeRules: [
    'color-contrast-enhanced', // WCAG AAA rule, not required for AA
  ],
  timeout: 20000,
}

/**
 * Form-specific accessibility configuration
 * Focused on form accessibility requirements
 */
export const FORM_ACCESSIBILITY_CONFIG: AccessibilityTestOptions = {
  includeRules: [
    'label', // Form controls must have labels
    'form-field-multiple-labels', // Multiple labels for form fields
    'aria-required-attr', // ARIA required attributes
    'aria-valid-attr-value', // Valid ARIA attribute values
    'duplicate-id', // IDs must be unique
    'duplicate-id-aria', // ARIA IDs must be unique
    'autocomplete-valid', // Autocomplete attributes are valid
    'select-name', // Select elements must have accessible names
  ],
  timeout: 15000,
}

/**
 * Navigation-specific accessibility configuration
 * Focused on keyboard navigation and focus management
 */
export const NAVIGATION_ACCESSIBILITY_CONFIG: AccessibilityTestOptions = {
  includeRules: [
    'focus-order-semantics', // Focus order follows DOM order
    'tabindex', // Tabindex usage
    'bypass', // Bypass blocks (skip links)
    'landmark-one-main', // Single main landmark
    'landmark-unique', // Unique landmarks
    'landmark-no-duplicate-banner', // No duplicate banners
    'landmark-no-duplicate-contentinfo', // No duplicate contentinfo
    'link-name', // Links must have accessible names
    'button-name', // Buttons must have accessible names
    'aria-hidden-focus', // Focusable elements not hidden from screen readers
  ],
  timeout: 15000,
}

/**
 * Color and contrast configuration
 * Focused on visual accessibility requirements
 */
export const COLOR_CONTRAST_CONFIG: AccessibilityTestOptions = {
  includeRules: [
    'color-contrast', // Minimum color contrast (WCAG AA)
    'link-in-text-block', // Links in text blocks are distinguishable
    'focus-order-semantics', // Focus indicators are visible
  ],
  timeout: 10000,
}

/**
 * Screen reader configuration
 * Focused on screen reader compatibility
 */
export const SCREEN_READER_CONFIG: AccessibilityTestOptions = {
  includeRules: [
    'aria-allowed-attr', // ARIA attributes are allowed
    'aria-required-attr', // Required ARIA attributes
    'aria-valid-attr', // Valid ARIA attributes
    'aria-valid-attr-value', // Valid ARIA attribute values
    'aria-roles', // Valid ARIA roles
    'aria-hidden-body', // Body element not hidden from screen readers
    'empty-heading', // Headings are not empty
    'heading-order', // Heading levels should increase by one
    'image-alt', // Images have alt text
    'input-image-alt', // Image inputs have alt text
    'label', // Form controls have labels
    'link-name', // Links have accessible names
    'list', // Lists are properly structured
    'listitem', // List items are properly structured
    'definition-list', // Definition lists are properly structured
    'dlitem', // Definition list items are properly structured
  ],
  timeout: 20000,
}

/**
 * Custom rule exclusions with justifications
 * Only exclude rules where there are valid technical or design reasons
 */
export const JUSTIFIED_RULE_EXCLUSIONS = {
  // Example exclusions - only add if absolutely necessary with clear justification
  // 'color-contrast-enhanced': 'WCAG AAA rule not required for AA compliance',
  // 'focus-order-semantics': 'Custom focus management implemented with proper ARIA',
  // 'landmark-unique': 'Multiple navigation landmarks for complex layouts'
}

/**
 * Get configuration based on test type
 */
export function getAccessibilityConfig(
  testType: 'standard' | 'strict' | 'development' | 'form' | 'navigation' | 'color' | 'screen-reader',
): AccessibilityTestOptions {
  switch (testType) {
    case 'strict':
      return WCAG_2_1_AA_STRICT
    case 'development':
      return WCAG_2_1_AA_DEVELOPMENT
    case 'form':
      return FORM_ACCESSIBILITY_CONFIG
    case 'navigation':
      return NAVIGATION_ACCESSIBILITY_CONFIG
    case 'color':
      return COLOR_CONTRAST_CONFIG
    case 'screen-reader':
      return SCREEN_READER_CONFIG
    case 'standard':
    default:
      return WCAG_2_1_AA_STANDARD
  }
}

/**
 * Merge configurations for comprehensive testing
 */
export function mergeAccessibilityConfigs(...configs: AccessibilityTestOptions[]): AccessibilityTestOptions {
  const merged: AccessibilityTestOptions = {
    includeTags: [],
    excludeTags: [],
    includeRules: [],
    excludeRules: [],
    timeout: 30000,
  }

  configs.forEach(config => {
    if (config.includeTags) {
      merged.includeTags = [...(merged.includeTags || []), ...config.includeTags]
    }
    if (config.excludeTags) {
      merged.excludeTags = [...(merged.excludeTags || []), ...config.excludeTags]
    }
    if (config.includeRules) {
      merged.includeRules = [...(merged.includeRules || []), ...config.includeRules]
    }
    if (config.excludeRules) {
      merged.excludeRules = [...(merged.excludeRules || []), ...config.excludeRules]
    }
    if (
      typeof config.timeout === 'number' &&
      Number.isFinite(config.timeout) &&
      config.timeout > (merged.timeout ?? 0)
    ) {
      merged.timeout = config.timeout
    }
  })

  // Remove duplicates
  merged.includeTags = [...new Set(merged.includeTags)]
  merged.excludeTags = [...new Set(merged.excludeTags)]
  merged.includeRules = [...new Set(merged.includeRules)]
  merged.excludeRules = [...new Set(merged.excludeRules)]

  return merged
}
