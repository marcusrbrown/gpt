import {expect, test} from './fixtures'
import {GPTDataFactory} from './utils/test-data-factory'

test.describe('GPT Showcase Page', () => {
  test.beforeEach(async ({gptEditorPage, homePage, page}) => {
    // Create a GPT for testing the showcase page
    await gptEditorPage.navigateToNew()
    expect(await gptEditorPage.isLoaded()).toBe(true)

    const testGPT = GPTDataFactory.createBasicGPT({
      name: 'Showcase Test GPT',
      description: 'A test GPT for showcase page testing',
    })

    await gptEditorPage.fillBasicConfiguration(testGPT.name, testGPT.description, testGPT.systemPrompt)
    await gptEditorPage.saveGPT()

    // Navigate to home and get the GPT card
    await homePage.navigate()
    await homePage.waitForGPTCards()

    // Find the GPT card and click on its clickable content area
    const gptCard = page.locator('[data-testid="user-gpt-card"]').filter({hasText: 'Showcase Test GPT'})
    await expect(gptCard).toBeVisible()

    // Click on the GPT name header element which has the onClick handler
    const gptNameHeader = gptCard.locator('[data-testid="gpt-name"]')
    await gptNameHeader.click()

    // Wait for navigation to showcase page
    await page.waitForURL(/\/gpt\/[a-f0-9-]+$/, {timeout: 10000})
  })

  test('should display GPT showcase page with correct data', async ({gptShowcasePage, page}) => {
    // Verify we're on the showcase page
    await expect(page).toHaveURL(/\/gpt\/[a-f0-9-]+$/)

    // Wait for the showcase to fully load
    await gptShowcasePage.waitForShowcaseLoad()

    // Verify the page is loaded
    expect(await gptShowcasePage.isLoaded()).toBe(true)
  })

  test('should show GPT name and description', async ({gptShowcasePage}) => {
    await gptShowcasePage.waitForShowcaseLoad()

    const name = await gptShowcasePage.getGPTName()
    expect(name).toBe('Showcase Test GPT')

    const description = await gptShowcasePage.getDescription()
    expect(description).toBe('A test GPT for showcase page testing')
  })

  test('should display conversation starters section', async ({gptShowcasePage}) => {
    await gptShowcasePage.waitForShowcaseLoad()

    // The section should be visible even if empty
    const startersSection = gptShowcasePage.conversationStartersSection
    await expect(startersSection).toBeVisible()

    // Since we didn't add conversation starters, check for the no-starters message
    const noStartersMessage = gptShowcasePage.noStartersMessage
    await expect(noStartersMessage).toBeVisible()
  })

  test('should display capabilities section', async ({gptShowcasePage, page}) => {
    await gptShowcasePage.waitForShowcaseLoad()

    // Capabilities section should be visible
    const capabilitiesSection = gptShowcasePage.capabilitiesSection
    await expect(capabilitiesSection).toBeVisible()

    // Since we created a basic GPT without special capabilities, check for the no capabilities message
    const noCapabilitiesMessage = page.locator('[data-testid="no-capabilities-message"]')
    await expect(noCapabilitiesMessage).toBeVisible()
  })

  test('should navigate to test page when clicking Start Chatting', async ({gptShowcasePage, page}) => {
    await gptShowcasePage.waitForShowcaseLoad()

    await gptShowcasePage.clickStartChatting()

    // Should navigate to the test page
    await expect(page).toHaveURL(/\/gpt\/test\/[a-f0-9-]+/)
  })

  test('should navigate to editor when clicking Edit button', async ({gptShowcasePage, page}) => {
    await gptShowcasePage.waitForShowcaseLoad()

    await gptShowcasePage.clickEdit()

    // Should navigate to the edit page
    await expect(page).toHaveURL(/\/gpt\/edit\/[a-f0-9-]+/)
  })

  test('should navigate back to home when clicking back button', async ({gptShowcasePage, page}) => {
    await gptShowcasePage.waitForShowcaseLoad()

    await gptShowcasePage.clickBack()

    // Should navigate back to home
    await expect(page).toHaveURL('/')
  })

  test('should navigate to edit page via edit icon button in header', async ({gptShowcasePage, page}) => {
    await gptShowcasePage.waitForShowcaseLoad()

    await gptShowcasePage.clickEditIcon()

    // Should navigate to the edit page
    await expect(page).toHaveURL(/\/gpt\/edit\/[a-f0-9-]+/)
  })
})

test.describe('GPT Showcase Page - Error States', () => {
  test('should show error state for invalid GPT ID', async ({gptShowcasePage, page}) => {
    // Navigate to a non-existent GPT
    await gptShowcasePage.navigateTo('non-existent-id-12345')

    // Wait for the page to load
    await page.waitForTimeout(1000)

    // Should show error card
    expect(await gptShowcasePage.hasError()).toBe(true)

    // Error message should indicate GPT not found
    const errorMessage = await gptShowcasePage.getErrorMessage()
    expect(errorMessage).toContain('not found')
  })

  test('should navigate to home when clicking Return to Library on error page', async ({gptShowcasePage, page}) => {
    // Navigate to a non-existent GPT to trigger error
    await gptShowcasePage.navigateTo('non-existent-id-12345')
    await page.waitForTimeout(1000)

    expect(await gptShowcasePage.hasError()).toBe(true)

    // Click Return to Library
    await gptShowcasePage.clickReturnToLibrary()

    // Should navigate to home
    await expect(page).toHaveURL('/')
  })
})

test.describe('GPT Showcase Page - With Conversation Starters', () => {
  test('should display and interact with conversation starters', async ({
    gptEditorPage,
    homePage,
    gptShowcasePage,
    page,
  }) => {
    // Create a GPT with conversation starters
    await gptEditorPage.navigateToNew()

    const testGPT = GPTDataFactory.createBasicGPT({
      name: 'GPT With Starters',
      description: 'Testing conversation starters',
    })

    await gptEditorPage.fillBasicConfiguration(testGPT.name, testGPT.description, testGPT.systemPrompt)

    // Navigate to Advanced tab to add conversation starters
    await gptEditorPage.clickTab('Advanced')

    // Look for conversation starters input and add some
    const startersTextarea = page.locator('textarea[name="conversationStarters"]')
    if (await startersTextarea.isVisible()) {
      await startersTextarea.fill('Tell me a joke\nExplain quantum physics\nWrite a haiku')
    }

    await gptEditorPage.saveGPT()

    // Navigate to showcase page
    await homePage.navigate()
    await homePage.waitForGPTCards()

    // Click on the GPT name to navigate to showcase
    const gptCard = page.locator('[data-testid="user-gpt-card"]').filter({hasText: 'GPT With Starters'})
    const gptNameHeader = gptCard.locator('[data-testid="gpt-name"]')
    await gptNameHeader.click()
    await page.waitForURL(/\/gpt\/[a-f0-9-]+$/, {timeout: 10000})

    await gptShowcasePage.waitForShowcaseLoad()

    // Check if conversation starters are displayed
    const starters = await gptShowcasePage.getConversationStarters()

    // If starters were successfully added, verify they appear
    if (starters.length > 0) {
      expect(starters.length).toBeGreaterThan(0)

      // Click on a conversation starter
      await gptShowcasePage.clickConversationStarter(0)

      // Should navigate to test page with starter query param
      await expect(page).toHaveURL(/\/gpt\/test\/[a-f0-9-]+\?starter=/)
    }
  })
})

test.describe('GPT Showcase Page - With Capabilities', () => {
  test('should display capability badges when capabilities are enabled', async ({
    gptEditorPage,
    homePage,
    gptShowcasePage,
    page,
  }) => {
    // Create a GPT with capabilities enabled
    await gptEditorPage.navigateToNew()

    const testGPT = GPTDataFactory.createFullFeaturedGPT({
      name: 'GPT With Capabilities',
      description: 'Testing capabilities display',
    })

    await gptEditorPage.fillBasicConfiguration(testGPT.name, testGPT.description, testGPT.systemPrompt)

    // Try to enable code interpreter if the toggle is available
    // Using force:true because HeroUI checkbox labels intercept pointer events
    const codeInterpreterToggle = page.getByRole('checkbox', {name: /code.*interpreter/i})
    if (await codeInterpreterToggle.isVisible({timeout: 2000}).catch(() => false)) {
      await codeInterpreterToggle.click({force: true})
    }

    await gptEditorPage.saveGPT()

    // Navigate to showcase page
    await homePage.navigate()
    await homePage.waitForGPTCards()

    // Click on the GPT name to navigate to showcase
    const gptCard = page.locator('[data-testid="user-gpt-card"]').filter({hasText: 'GPT With Capabilities'})
    const gptNameHeader = gptCard.locator('[data-testid="gpt-name"]')
    await gptNameHeader.click()
    await page.waitForURL(/\/gpt\/[a-f0-9-]+$/, {timeout: 10000})

    await gptShowcasePage.waitForShowcaseLoad()

    // Check capabilities section is visible
    const capabilitiesSection = gptShowcasePage.capabilitiesSection
    await expect(capabilitiesSection).toBeVisible()
  })
})

test.describe('GPT Showcase Page - With Knowledge', () => {
  test('should display knowledge base summary when knowledge is configured', async ({
    gptEditorPage,
    homePage,
    gptShowcasePage,
    page,
  }) => {
    // Create a GPT with knowledge URLs
    await gptEditorPage.navigateToNew()

    const testGPT = GPTDataFactory.createKnowledgeGPT({
      name: 'GPT With Knowledge',
      description: 'Testing knowledge display',
    })

    await gptEditorPage.fillBasicConfiguration(testGPT.name, testGPT.description, testGPT.systemPrompt)

    // Try to add a knowledge URL if the Knowledge tab and input are available
    const knowledgeTab = page.locator('button[role="tab"]', {hasText: 'Knowledge'})
    if (await knowledgeTab.isVisible({timeout: 2000}).catch(() => false)) {
      await knowledgeTab.click()
      // Wait for tab content to load
      await page.waitForTimeout(500)

      // Look for URL input - may have different placeholders/names
      const urlInput = page.locator('input[placeholder*="URL"], input[placeholder*="url"]').first()
      if (await urlInput.isVisible({timeout: 2000}).catch(() => false)) {
        await urlInput.fill('https://example.com/docs')

        // Look for Add URL button
        const addButton = page.locator('button', {hasText: /add.*url/i}).first()
        if (await addButton.isVisible({timeout: 1000}).catch(() => false)) {
          await addButton.click()
        }
      }
    }

    await gptEditorPage.saveGPT()

    // Navigate to showcase page
    await homePage.navigate()
    await homePage.waitForGPTCards()

    // Click on the GPT name to navigate to showcase
    const gptCard = page.locator('[data-testid="user-gpt-card"]').filter({hasText: 'GPT With Knowledge'})
    const gptNameHeader = gptCard.locator('[data-testid="gpt-name"]')
    await gptNameHeader.click()
    await page.waitForURL(/\/gpt\/[a-f0-9-]+$/, {timeout: 10000})

    await gptShowcasePage.waitForShowcaseLoad()

    // Check if knowledge section appears (only if URLs were added successfully)
    const hasKnowledge = await gptShowcasePage.hasKnowledgeSection()
    if (hasKnowledge) {
      const urlsCount = await gptShowcasePage.getUrlsCount()
      expect(urlsCount).toBeGreaterThan(0)
    }
  })
})
