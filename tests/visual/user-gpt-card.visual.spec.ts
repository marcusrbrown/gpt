import type {Page} from '@playwright/test'
import type {VisualTestHelper} from './utils/visual-test-helper'
import {visualTest, VisualTestData} from './fixtures'

visualTest.describe('User GPT Card Visual Tests', () => {
  visualTest.beforeEach(async ({page}: {page: Page}) => {
    // Create mock GPTs with different configurations to test various card states
    const mockGPTs = [
      VisualTestData.createMockGPT({
        id: 'card-test-1',
        name: 'Standard GPT',
        description: 'A standard GPT configuration for testing card layouts',
      }),
      VisualTestData.createMockGPT({
        id: 'card-test-2',
        name: 'GPT with Very Long Name That Should Wrap',
        description:
          'This is a GPT with a very long description that should test how the card handles wrapping text and maintains proper layout proportions when content exceeds normal lengths',
        capabilities: {
          codeInterpreter: true,
          webBrowsing: true,
          imageGeneration: true,
          fileSearch: {enabled: true},
        },
      }),
      VisualTestData.createMockGPT({
        id: 'card-test-3',
        name: 'Minimal GPT',
        description: 'Short desc',
        capabilities: {
          codeInterpreter: false,
          webBrowsing: false,
          imageGeneration: false,
          fileSearch: {enabled: false},
        },
      }),
    ]

    await page.evaluate((gpts: any) => {
      localStorage.setItem('gpt-configurations', JSON.stringify(gpts))
    }, mockGPTs)

    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  visualTest(
    'GPT card - standard layout',
    async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
      // Find and screenshot the first GPT card
      const firstCard = page.locator('[data-testid="gpt-card"]').first()
      await visualHelper.takeComponentScreenshot(firstCard, 'user-gpt-card-standard')
    },
  )

  visualTest(
    'GPT card - with long content',
    async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
      // Screenshot the card with long text content
      const longContentCard = page.locator('[data-testid="gpt-card"]').nth(1)
      await visualHelper.takeComponentScreenshot(longContentCard, 'user-gpt-card-long-content')
    },
  )

  visualTest(
    'GPT card - minimal content',
    async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
      // Screenshot the card with minimal content
      const minimalCard = page.locator('[data-testid="gpt-card"]').nth(2)
      await visualHelper.takeComponentScreenshot(minimalCard, 'user-gpt-card-minimal')
    },
  )

  visualTest('GPT card - hover states', async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
    const firstCard = page.locator('[data-testid="gpt-card"]').first()

    // Normal state
    await visualHelper.takeComponentScreenshot(firstCard, 'user-gpt-card-normal')

    // Hover state
    await firstCard.hover()
    await page.waitForTimeout(200) // Wait for hover animation
    await visualHelper.takeComponentScreenshot(firstCard, 'user-gpt-card-hover')
  })

  visualTest(
    'GPT card - capabilities indicators',
    async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
      // Screenshot cards with different capability configurations
      const cardWithCapabilities = page.locator('[data-testid="gpt-card"]').nth(1)
      const cardWithoutCapabilities = page.locator('[data-testid="gpt-card"]').nth(2)

      await visualHelper.takeComponentScreenshot(cardWithCapabilities, 'user-gpt-card-with-capabilities')
      await visualHelper.takeComponentScreenshot(cardWithoutCapabilities, 'user-gpt-card-no-capabilities')
    },
  )

  visualTest(
    'GPT card - action buttons',
    async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
      const firstCard = page.locator('[data-testid="gpt-card"]').first()

      // Find action buttons within the card
      const editButton = firstCard.locator('button[aria-label*="edit"], a[href*="edit"]')
      const testButton = firstCard.locator('button[aria-label*="test"], a[href*="test"]')
      const deleteButton = firstCard.locator('button[aria-label*="delete"]')

      // Screenshot action buttons if they exist
      if ((await editButton.count()) > 0) {
        await visualHelper.takeComponentScreenshot(editButton, 'user-gpt-card-edit-button')
      }

      if ((await testButton.count()) > 0) {
        await visualHelper.takeComponentScreenshot(testButton, 'user-gpt-card-test-button')
      }

      if ((await deleteButton.count()) > 0) {
        await visualHelper.takeComponentScreenshot(deleteButton, 'user-gpt-card-delete-button')
      }
    },
  )

  visualTest('GPT card - dark theme', async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
    await visualHelper.setTheme('dark')

    const firstCard = page.locator('[data-testid="gpt-card"]').first()
    await visualHelper.takeComponentScreenshot(firstCard, 'user-gpt-card-dark-theme')
  })

  visualTest(
    'GPT card - responsive layout',
    async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
      const firstCard = page.locator('[data-testid="gpt-card"]').first()

      // Test card at different viewport sizes
      const viewports = [
        {name: 'mobile', width: 375, height: 667},
        {name: 'tablet', width: 768, height: 1024},
        {name: 'desktop', width: 1280, height: 720},
      ]

      for (const viewport of viewports) {
        await page.setViewportSize({width: viewport.width, height: viewport.height})
        await page.waitForTimeout(200) // Wait for responsive adjustments
        await visualHelper.takeComponentScreenshot(firstCard, `user-gpt-card-${viewport.name}`)
      }
    },
  )

  visualTest('GPT cards - grid layout', async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
    // Screenshot the entire card grid layout
    const cardGrid = page.locator('.grid, .cards-container, [data-testid="gpt-cards-grid"]').first()

    if ((await cardGrid.count()) > 0) {
      await visualHelper.takeComponentScreenshot(cardGrid, 'user-gpt-cards-grid')
    } else {
      // Fallback to screenshot area containing all cards
      const cardsContainer = page.locator('[data-testid="gpt-card"]').first().locator('..')
      await visualHelper.takeComponentScreenshot(cardsContainer, 'user-gpt-cards-container')
    }
  })
})

visualTest.describe('GPT Card Error States', () => {
  visualTest.beforeEach(async ({page}: {page: Page}) => {
    await page.goto('/')
  })

  visualTest(
    'GPT card - corrupted data',
    async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
      // Create GPT with missing/corrupted data to test error handling
      const corruptedGPT = {
        id: 'corrupted-gpt',
        name: '', // Empty name
        description: null, // Null description
        // Missing other required fields
      }

      await page.evaluate((gpt: any) => {
        localStorage.setItem('gpt-configurations', JSON.stringify([gpt]))
      }, corruptedGPT)

      await page.reload()
      await page.waitForLoadState('networkidle')

      const errorCard = page.locator('[data-testid="gpt-card"]').first()
      if ((await errorCard.count()) > 0) {
        await visualHelper.takeComponentScreenshot(errorCard, 'user-gpt-card-corrupted-data')
      }
    },
  )

  visualTest(
    'GPT card - loading placeholder',
    async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
      // Clear localStorage to show loading/empty state
      await page.evaluate(() => {
        localStorage.clear()
      })

      await page.reload()

      // Look for loading placeholder or empty state
      const placeholder = page.locator('[data-testid="loading-card"], .loading-placeholder, .skeleton-card').first()
      if ((await placeholder.count()) > 0) {
        await visualHelper.takeComponentScreenshot(placeholder, 'user-gpt-card-loading-placeholder')
      }
    },
  )
})
