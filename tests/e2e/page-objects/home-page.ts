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
  readonly yourGPTsSection: Locator
  readonly exampleGPTsSection: Locator
  readonly emptyStateMessage: Locator
  readonly userGPTCards: Locator
  readonly exampleGPTCards: Locator

  constructor(page: Page) {
    super(page)

    // Initialize locators based on actual HTML structure
    this.pageTitle = page.locator('h1').filter({hasText: 'Custom GPTs'})
    this.createNewGPTButton = page.locator('a[href="/gpt/new"]').first()
    this.yourGPTsSection = page.locator('h2').filter({hasText: 'Your GPTs'}).locator('..')
    this.exampleGPTsSection = page.locator('h2').filter({hasText: 'Example GPTs'}).locator('..')
    this.emptyStateMessage = page.locator('p').filter({hasText: "You haven't created any GPTs yet."})

    // User GPT cards with test IDs
    this.userGPTCards = page.locator('[data-testid="user-gpt-card"]')

    // Example GPT cards with test IDs
    this.exampleGPTCards = page.locator('[data-testid="example-gpt-card"]')
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
   * Get the number of example GPT cards
   */
  async getExampleGPTCount(): Promise<number> {
    return this.exampleGPTCards.count()
  }

  /**
   * Click on an example GPT card by index
   */
  async clickExampleGPT(index: number): Promise<void> {
    const card = this.exampleGPTCards.nth(index)
    await this.clickElement(card)
  }

  /**
   * Wait for GPT cards to load
   */
  async waitForGPTCards(): Promise<void> {
    // Wait for the page to be in a stable state
    // Try to wait for either user cards or empty state, with timeout handling
    try {
      await this.page.waitForSelector('[data-testid="user-gpt-card"], .empty-state, [data-testid="gpt-list"]', {
        timeout: 5000,
        state: 'visible',
      })
    } catch {
      // If specific selectors fail, just wait for page to be loaded
      await this.waitForLoad()
      await this.page.waitForTimeout(2000) // Give time for components to render
    }
  }
}
