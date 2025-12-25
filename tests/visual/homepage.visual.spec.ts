import type {Page} from '@playwright/test'
import type {VisualTestHelper} from './utils/visual-test-helper'
import {visualTest, VisualTestData} from './fixtures'

visualTest.describe('Home Page Visual Tests', () => {
  visualTest.beforeEach(async ({page}: {page: Page}) => {
    // Navigate to home page
    await page.goto('/')
  })

  visualTest(
    'home page layout - empty state',
    async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
      // Clear any existing GPTs to show empty state
      await page.evaluate(() => {
        localStorage.clear()
      })

      await page.reload()
      await visualHelper.takeFullPageScreenshot('home-empty-state')
    },
  )

  visualTest(
    'home page layout - with GPTs',
    async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
      // Add mock GPTs to localStorage
      const mockGPTs = VisualTestData.createMockGPTList(3)
      await page.evaluate((gpts: any) => {
        localStorage.setItem('gpt-configurations', JSON.stringify(gpts))
      }, mockGPTs)

      await page.reload()
      await visualHelper.takeFullPageScreenshot('home-with-gpts')
    },
  )

  visualTest(
    'home page responsive layout',
    async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
      // Add mock GPTs
      const mockGPTs = VisualTestData.createMockGPTList(6)
      await page.evaluate((gpts: any) => {
        localStorage.setItem('gpt-configurations', JSON.stringify(gpts))
      }, mockGPTs)

      await page.reload()
      await visualHelper.takeResponsiveScreenshots('home-responsive')
    },
  )

  visualTest('home page dark theme', async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
    // Add mock GPTs
    const mockGPTs = VisualTestData.createMockGPTList(3)
    await page.evaluate((gpts: any) => {
      localStorage.setItem('gpt-configurations', JSON.stringify(gpts))
    }, mockGPTs)

    await page.reload()

    // Switch to dark theme
    await visualHelper.setTheme('dark')
    await visualHelper.takeFullPageScreenshot('home-dark-theme')
  })

  visualTest(
    'navbar component visual test',
    async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
      const navbar = page.locator('nav[aria-label="Main navigation"]')
      await visualHelper.takeComponentScreenshot(navbar, 'navbar')
    },
  )

  visualTest(
    'GPT card components visual test',
    async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
      // Add mock GPTs
      const mockGPTs = VisualTestData.createMockGPTList(2)
      await page.evaluate((gpts: any) => {
        localStorage.setItem('gpt-configurations', JSON.stringify(gpts))
      }, mockGPTs)

      await page.reload()

      // Screenshot individual GPT cards
      const cards = page.locator('[data-testid="gpt-card"]')
      const cardCount = await cards.count()

      for (let i = 0; i < cardCount; i++) {
        const card = cards.nth(i)
        await visualHelper.takeComponentScreenshot(card, `gpt-card-${i + 1}`)
      }
    },
  )

  visualTest('create new GPT button', async ({page, visualHelper}) => {
    await page.goto('/')
    const newGptButton = page.locator('[data-testid="new-gpt-button"], [data-testid="create-first-gpt-button"]').first()
    await visualHelper.takeComponentScreenshot(newGptButton, 'create-new-gpt-button.png')
  })
})
