import type {Locator, Page} from '@playwright/test'
import {BasePage} from './base-page'

/**
 * Page Object Model for the Settings page
 * Handles interactions with application settings and API configuration
 */
export class SettingsPage extends BasePage {
  // API Settings
  readonly apiKeyInput: Locator
  readonly saveApiKeyButton: Locator
  readonly testApiKeyButton: Locator
  readonly apiKeyStatus: Locator
  readonly apiKeyVisibilityToggle: Locator

  // Theme Settings
  readonly themeToggle: Locator
  readonly lightThemeOption: Locator
  readonly darkThemeOption: Locator
  readonly systemThemeOption: Locator

  // Export/Import Settings
  readonly exportDataButton: Locator
  readonly importDataButton: Locator
  readonly importFileInput: Locator
  readonly clearDataButton: Locator

  // Notification elements
  readonly successMessage: Locator
  readonly errorMessage: Locator

  constructor(page: Page) {
    super(page)

    // API Settings
    this.apiKeyInput = page.locator('input[name="apiKey"]')
    this.saveApiKeyButton = page.locator('button', {hasText: 'Save API Key'})
    this.testApiKeyButton = page.locator('button', {hasText: 'Test API Key'})
    this.apiKeyStatus = page.locator('[data-testid="api-key-status"]')
    this.apiKeyVisibilityToggle = page.locator('button[aria-label="Toggle API key visibility"]')

    // Theme Settings
    this.themeToggle = page.locator('[data-testid="theme-toggle"]')
    this.lightThemeOption = page.locator('button[data-theme="light"]')
    this.darkThemeOption = page.locator('button[data-theme="dark"]')
    this.systemThemeOption = page.locator('button[data-theme="system"]')

    // Export/Import Settings
    this.exportDataButton = page.locator('button', {hasText: 'Export Data'})
    this.importDataButton = page.locator('button', {hasText: 'Import Data'})
    this.importFileInput = page.locator('input[type="file"][accept=".json"]')
    this.clearDataButton = page.locator('button', {hasText: 'Clear All Data'})

    // Notifications
    this.successMessage = page.locator('[data-testid="success-message"]')
    this.errorMessage = page.locator('[data-testid="error-message"]')
  }

  /**
   * Navigate to settings page
   */
  async navigate(): Promise<void> {
    await this.goto('/settings')
    await this.waitForLoad()
  }

  /**
   * Set API key
   */
  async setApiKey(apiKey: string): Promise<void> {
    await this.fillInput(this.apiKeyInput, apiKey)
    await this.clickElement(this.saveApiKeyButton)
  }

  /**
   * Get current API key value (visible characters)
   */
  async getApiKeyValue(): Promise<string> {
    return await this.apiKeyInput.inputValue()
  }

  /**
   * Test API key connection
   */
  async testApiKey(): Promise<void> {
    await this.clickElement(this.testApiKeyButton)
  }

  /**
   * Toggle API key visibility
   */
  async toggleApiKeyVisibility(): Promise<void> {
    await this.clickElement(this.apiKeyVisibilityToggle)
  }

  /**
   * Get API key status
   */
  async getApiKeyStatus(): Promise<string | null> {
    return await this.getTextContent(this.apiKeyStatus)
  }

  /**
   * Check if API key is valid
   */
  async isApiKeyValid(): Promise<boolean> {
    const status = await this.getApiKeyStatus()
    return status?.includes('Valid') || status?.includes('Connected') || false
  }

  /**
   * Switch to light theme
   */
  async switchToLightTheme(): Promise<void> {
    await this.clickElement(this.lightThemeOption)
  }

  /**
   * Switch to dark theme
   */
  async switchToDarkTheme(): Promise<void> {
    await this.clickElement(this.darkThemeOption)
  }

  /**
   * Switch to system theme
   */
  async switchToSystemTheme(): Promise<void> {
    await this.clickElement(this.systemThemeOption)
  }

  /**
   * Export application data
   */
  async exportData(): Promise<void> {
    await this.clickElement(this.exportDataButton)
  }

  /**
   * Import application data from file
   */
  async importData(filePath: string): Promise<void> {
    await this.importFileInput.setInputFiles(filePath)
    await this.clickElement(this.importDataButton)
  }

  /**
   * Clear all application data
   */
  async clearAllData(): Promise<void> {
    await this.clickElement(this.clearDataButton)

    // Handle confirmation dialog
    const confirmButton = this.page.locator('button', {hasText: 'Confirm'})
    if (await confirmButton.isVisible()) {
      await this.clickElement(confirmButton)
    }
  }

  /**
   * Wait for success message
   */
  async waitForSuccessMessage(): Promise<void> {
    await this.waitForElement(this.successMessage)
  }

  /**
   * Wait for error message
   */
  async waitForErrorMessage(): Promise<void> {
    await this.waitForElement(this.errorMessage)
  }

  /**
   * Get success message text
   */
  async getSuccessMessage(): Promise<string | null> {
    return await this.getTextContent(this.successMessage)
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string | null> {
    return await this.getTextContent(this.errorMessage)
  }

  /**
   * Check if settings page is loaded
   */
  async isLoaded(): Promise<boolean> {
    return await this.isVisible(this.apiKeyInput)
  }

  /**
   * Get current theme from document
   */
  async getCurrentTheme(): Promise<string> {
    return await this.page.evaluate(() => {
      return document.documentElement.dataset.theme || 'system'
    })
  }
}
