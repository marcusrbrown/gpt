import {expect, test} from './fixtures'

test.describe('Home Page Navigation', () => {
  test.beforeEach(async ({homePage}) => {
    await homePage.navigate()
  })

  test('should load home page correctly', async ({homePage}) => {
    // Verify page is loaded
    await expect(homePage.pageTitle).toBeVisible()

    // Verify main sections are present
    await expect(homePage.yourGPTsSection).toBeVisible()
    await expect(homePage.exampleGPTsSection).toBeVisible()

    // Verify create button is visible
    await expect(homePage.createNewGPTButton).toBeVisible()
  })

  test('should show empty state when no GPTs exist', async ({homePage}) => {
    // Clear any existing GPTs in localStorage
    await homePage.evaluate(() => {
      localStorage.clear()
    })

    await homePage.reload()
    await homePage.waitForGPTCards()

    // Verify empty state is shown
    expect(await homePage.hasEmptyState()).toBe(true)

    // Verify empty state message
    await expect(homePage.emptyStateMessage).toBeVisible()
  })

  test('should navigate to GPT creation page', async ({homePage}) => {
    await homePage.clickCreateNewGPT()

    // Verify navigation to editor page
    await expect(homePage.getPage()).toHaveURL('/gpt/new')
  })

  test('should display example GPT cards', async ({homePage}) => {
    // Verify example GPTs are displayed
    const exampleCount = await homePage.getExampleGPTCount()
    expect(exampleCount).toBeGreaterThan(0)
  })

  test('should be responsive on mobile viewport', async ({homePage}) => {
    // Set mobile viewport
    await homePage.setViewportSize({width: 375, height: 667})

    // Reload to apply responsive styles
    await homePage.reload()

    // Verify page elements are still visible
    await expect(homePage.pageTitle).toBeVisible()
    await expect(homePage.createNewGPTButton).toBeVisible()
  })
})
