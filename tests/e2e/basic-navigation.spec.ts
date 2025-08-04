import {expect, test} from './fixtures'

test.describe('Basic Navigation Test', () => {
  test('should load home page and show title', async ({homePage}) => {
    await homePage.navigate()

    // Check if page loads
    await expect(homePage.pageTitle).toBeVisible()

    // Check if create button is visible
    await expect(homePage.createNewGPTButton).toBeVisible()
  })

  test('should navigate to new GPT page', async ({homePage}) => {
    await homePage.navigate()
    await homePage.clickCreateNewGPT()

    // Verify URL changed
    await expect(homePage.getPage()).toHaveURL('/gpt/new')
  })
})
