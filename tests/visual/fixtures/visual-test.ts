import {test as base} from '@playwright/test'
import {VisualTestHelper} from '../utils/visual-test-helper'

/**
 * Custom test fixture with visual testing utilities
 * Extends Playwright's base test with visual regression testing capabilities
 */
export const visualTest = base.extend<{
  visualHelper: VisualTestHelper
}>({
  // Visual test helper fixture
  visualHelper: async ({page}, use) => {
    const helper = new VisualTestHelper(page)

    // Disable animations globally for all visual tests
    await helper.disableAnimations()

    await use(helper)
  },
})
