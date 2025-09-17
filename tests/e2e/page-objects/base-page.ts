import type {Locator, Page} from '@playwright/test'

/**
 * Base Page Object Model
 * Provides common functionality for all page objects
 */
export abstract class BasePage {
  protected readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  /**
   * Get the underlying page object for direct access when needed
   */
  getPage(): Page {
    return this.page
  }

  /**
   * Navigate to a specific URL
   */
  async goto(url: string): Promise<void> {
    await this.page.goto(url)
  }

  /**
   * Wait for page to be loaded
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Reload the current page
   */
  async reload(): Promise<void> {
    await this.page.reload()
  }

  /**
   * Get page title
   */
  async getTitle(): Promise<string> {
    return this.page.title()
  }

  /**
   * Take a screenshot
   */
  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({path: `screenshots/${name}.png`})
  }

  /**
   * Wait for element to be visible
   */
  async waitForElement(locator: Locator): Promise<void> {
    await locator.waitFor({state: 'visible'})
  }

  /**
   * Get element text content
   */
  async getTextContent(locator: Locator): Promise<string | null> {
    return locator.textContent()
  }

  /**
   * Click element with wait
   */
  async clickElement(locator: Locator): Promise<void> {
    await locator.waitFor({state: 'visible'})
    await locator.click()
  }

  /**
   * Fill input with wait
   */
  async fillInput(locator: Locator, value: string): Promise<void> {
    await locator.waitFor({state: 'visible'})
    await locator.fill(value)
  }

  /**
   * Check if element is visible
   */
  async isVisible(locator: Locator): Promise<boolean> {
    return locator.isVisible()
  }

  /**
   * Evaluate JavaScript in the page context
   */
  async evaluate<T>(fn: () => T): Promise<T> {
    return this.page.evaluate(fn)
  }

  /**
   * Set viewport size
   */
  async setViewportSize(size: {width: number; height: number}): Promise<void> {
    await this.page.setViewportSize(size)
  }
}
