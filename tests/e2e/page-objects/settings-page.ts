import type {Locator, Page} from '@playwright/test'
import {BasePage} from './base-page'

/**
 * Page Object Model for the Settings page
 * Handles interactions with application settings including providers, appearance, and data management
 */
export class SettingsPage extends BasePage {
  // Page header
  readonly pageTitle: Locator

  // Tab navigation
  readonly tabsContainer: Locator
  readonly providersTab: Locator
  readonly integrationsTab: Locator
  readonly appearanceTab: Locator
  readonly dataTab: Locator

  // Provider Settings (Providers tab)
  readonly apiKeyInput: Locator
  readonly saveApiKeyButton: Locator
  readonly testApiKeyButton: Locator
  readonly apiKeyStatus: Locator
  readonly apiKeyVisibilityToggle: Locator
  readonly providerAccordion: Locator

  // Theme Settings (Appearance tab)
  readonly themeToggle: Locator
  readonly lightThemeOption: Locator
  readonly darkThemeOption: Locator
  readonly systemThemeOption: Locator
  readonly reducedMotionSwitch: Locator

  // Data Settings (Data tab)
  readonly storageUsageBar: Locator
  readonly manageBackupsLink: Locator
  readonly clearDataButton: Locator
  readonly exportDataButton: Locator
  readonly importDataButton: Locator
  readonly importFileInput: Locator

  // Notification elements
  readonly successMessage: Locator
  readonly errorMessage: Locator

  constructor(page: Page) {
    super(page)

    // Page header
    this.pageTitle = page.locator('h1', {hasText: 'Settings'})

    // Tab navigation - using HeroUI Tabs structure
    this.tabsContainer = page.locator('[role="tablist"]')
    this.providersTab = page.locator('[role="tab"]', {hasText: 'Providers'})
    this.integrationsTab = page.locator('[role="tab"]', {hasText: 'Integrations'})
    this.appearanceTab = page.locator('[role="tab"]', {hasText: 'Appearance'})
    this.dataTab = page.locator('[role="tab"]', {hasText: 'Data'})

    // Provider Settings
    this.apiKeyInput = page.locator('input[name="apiKey"]')
    this.saveApiKeyButton = page.locator('button', {hasText: 'Save API Key'})
    this.testApiKeyButton = page.locator('button', {hasText: 'Test API Key'})
    this.apiKeyStatus = page.locator('[data-testid="api-key-status"]')
    this.apiKeyVisibilityToggle = page.locator('button[aria-label="Toggle API key visibility"]')
    this.providerAccordion = page.locator('[data-testid="provider-accordion"]')

    // Theme Settings
    this.themeToggle = page.locator('[data-testid="theme-toggle"]')
    this.lightThemeOption = page.locator('[data-key="light"]')
    this.darkThemeOption = page.locator('[data-key="dark"]')
    this.systemThemeOption = page.locator('[data-key="system"]')
    this.reducedMotionSwitch = page.locator('[data-testid="reduced-motion-switch"]')

    // Data Settings
    this.storageUsageBar = page.locator('[data-testid="storage-usage-bar"]')
    this.manageBackupsLink = page.locator('a[href="/backup"]')
    this.clearDataButton = page.locator('button', {hasText: 'Clear All Data'})
    this.exportDataButton = page.locator('button', {hasText: 'Export Data'})
    this.importDataButton = page.locator('button', {hasText: 'Import Data'})
    this.importFileInput = page.locator('input[type="file"][accept=".json"]')

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
   * Navigate to settings page with specific tab
   */
  async navigateToTab(tab: 'providers' | 'integrations' | 'appearance' | 'data'): Promise<void> {
    await this.goto(`/settings?tab=${tab}`)
    await this.waitForLoad()
  }

  /**
   * Check if settings page is loaded
   */
  async isLoaded(): Promise<boolean> {
    return this.isVisible(this.pageTitle)
  }

  // Tab navigation methods
  async switchToProvidersTab(): Promise<void> {
    await this.clickElement(this.providersTab)
  }

  async switchToIntegrationsTab(): Promise<void> {
    await this.clickElement(this.integrationsTab)
  }

  async switchToAppearanceTab(): Promise<void> {
    await this.clickElement(this.appearanceTab)
  }

  async switchToDataTab(): Promise<void> {
    await this.clickElement(this.dataTab)
  }

  async getActiveTab(): Promise<string | null> {
    const activeTab = this.page.locator('[role="tab"][aria-selected="true"]')
    return this.getTextContent(activeTab)
  }

  // Provider settings methods
  async setApiKey(apiKey: string): Promise<void> {
    await this.fillInput(this.apiKeyInput, apiKey)
    await this.clickElement(this.saveApiKeyButton)
  }

  async getApiKeyValue(): Promise<string> {
    return this.apiKeyInput.inputValue()
  }

  async testApiKey(): Promise<void> {
    await this.clickElement(this.testApiKeyButton)
  }

  async toggleApiKeyVisibility(): Promise<void> {
    await this.clickElement(this.apiKeyVisibilityToggle)
  }

  async getApiKeyStatus(): Promise<string | null> {
    return this.getTextContent(this.apiKeyStatus)
  }

  async isApiKeyValid(): Promise<boolean> {
    const status = await this.getApiKeyStatus()
    return status?.includes('Valid') || status?.includes('Connected') || false
  }

  // Theme settings methods
  async switchToLightTheme(): Promise<void> {
    await this.switchToAppearanceTab()
    await this.clickElement(this.lightThemeOption)
  }

  async switchToDarkTheme(): Promise<void> {
    await this.switchToAppearanceTab()
    await this.clickElement(this.darkThemeOption)
  }

  async switchToSystemTheme(): Promise<void> {
    await this.switchToAppearanceTab()
    await this.clickElement(this.systemThemeOption)
  }

  async toggleReducedMotion(): Promise<void> {
    await this.switchToAppearanceTab()
    await this.clickElement(this.reducedMotionSwitch)
  }

  async getCurrentTheme(): Promise<string> {
    return this.page.evaluate(() => {
      const theme = document.documentElement.dataset.theme
      return typeof theme === 'string' && theme.trim() !== '' ? theme : 'system'
    })
  }

  // Data settings methods
  async exportData(): Promise<void> {
    await this.switchToDataTab()
    await this.clickElement(this.exportDataButton)
  }

  async importData(filePath: string): Promise<void> {
    await this.switchToDataTab()
    await this.importFileInput.setInputFiles(filePath)
    await this.clickElement(this.importDataButton)
  }

  async clearAllData(): Promise<void> {
    await this.switchToDataTab()
    await this.clickElement(this.clearDataButton)

    // Handle confirmation dialog
    const confirmButton = this.page.locator('button', {hasText: 'Clear Data'})
    if (await confirmButton.isVisible()) {
      await this.clickElement(confirmButton)
    }
  }

  async navigateToBackups(): Promise<void> {
    await this.switchToDataTab()
    await this.clickElement(this.manageBackupsLink)
  }

  // Notification methods
  async waitForSuccessMessage(): Promise<void> {
    await this.waitForElement(this.successMessage)
  }

  async waitForErrorMessage(): Promise<void> {
    await this.waitForElement(this.errorMessage)
  }

  async getSuccessMessage(): Promise<string | null> {
    return this.getTextContent(this.successMessage)
  }

  async getErrorMessage(): Promise<string | null> {
    return this.getTextContent(this.errorMessage)
  }
}
