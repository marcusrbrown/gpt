import type {Locator, Page} from '@playwright/test'
import {BasePage} from './base-page'

/**
 * Page Object Model for the Home page
 * Handles interactions with the main landing page including GPT cards and navigation
 */
export class HomePage extends BasePage {
  // Page elements
  readonly pageTitle: Locator
  readonly createNewGPTButton: Locator
  readonly gptLibrary: Locator
  readonly emptyStateMessage: Locator
  readonly userGPTCards: Locator

  constructor(page: Page) {
    super(page)

    // Initialize locators based on actual HTML structure
    this.pageTitle = page.locator('h1').filter({hasText: 'Custom GPTs'})
    this.createNewGPTButton = page
      .locator('[data-testid="new-gpt-button"], [data-testid="create-first-gpt-button"]')
      .first()
    this.gptLibrary = page.locator('[data-testid="gpt-library"]')
    this.emptyStateMessage = page.locator('[data-testid="gpt-empty-message"]')

    // User GPT cards with test IDs
    this.userGPTCards = page.locator('[data-testid="user-gpt-card"]')
  }

  /**
   * Navigate to the home page
   */
  async navigate(): Promise<void> {
    await this.goto('/')
    await this.waitForLoad()
  }

  /**
   * Check if the page is loaded correctly
   */
  async isLoaded(): Promise<boolean> {
    return this.isVisible(this.pageTitle)
  }

  /**
   * Click the "Create New GPT" button
   */
  async clickCreateNewGPT(): Promise<void> {
    await this.clickElement(this.createNewGPTButton)
  }

  /**
   * Get the number of user GPT cards
   */
  async getUserGPTCount(): Promise<number> {
    return this.userGPTCards.count()
  }

  /**
   * Get user GPT names
   */
  async getUserGPTNames(): Promise<string[]> {
    const count = await this.getUserGPTCount()
    const names: string[] = []

    for (let i = 0; i < count; i++) {
      const card = this.userGPTCards.nth(i)
      // Look for the GPT name using the test ID
      const nameElement = card.locator('[data-testid="gpt-name"]')
      const name = await this.getTextContent(nameElement)
      // Explicitly handle nullish and empty values
      if (typeof name === 'string' && name.trim() !== '') {
        names.push(name)
      }
    }

    return names
  }

  /**
   * Click on a user GPT card by name
   */
  async clickUserGPT(name: string): Promise<void> {
    const card = this.userGPTCards.filter({hasText: name}).first()
    await this.clickElement(card)
  }

  /**
   * Check if empty state is shown
   */
  async hasEmptyState(): Promise<boolean> {
    return this.isVisible(this.emptyStateMessage)
  }

  /**
   * Wait for GPT cards to load
   */
  async waitForGPTCards(): Promise<void> {
    // Wait for either user cards, empty state, or GPT list to be visible
    await this.page.waitForSelector(
      '[data-testid="user-gpt-card"], [data-testid="gpt-empty-state"], [data-testid="gpt-list"]',
      {
        timeout: 10000,
        state: 'visible',
      },
    )
  }
}
