import type {Locator, Page} from '@playwright/test'
import {BasePage} from './base-page'

/**
 * Page Object Model for the GPT Editor page
 * Handles interactions with GPT creation and editing functionality
 */
export class GPTEditorPage extends BasePage {
  // Header elements
  readonly pageTitle: Locator
  readonly testGPTButton: Locator
  readonly apiSettingsToggle: Locator
  readonly apiSettingsPanel: Locator

  // Editor form elements
  readonly nameInput: Locator
  readonly descriptionInput: Locator
  readonly systemPromptTextarea: Locator
  readonly saveButton: Locator

  // Tab navigation
  readonly configurationTab: Locator
  readonly toolsTab: Locator
  readonly knowledgeTab: Locator
  readonly capabilitiesTab: Locator

  // Tools configuration
  readonly addToolButton: Locator
  readonly toolsList: Locator

  // Knowledge configuration
  readonly fileUploadButton: Locator
  readonly urlInput: Locator
  readonly addUrlButton: Locator

  // Capabilities configuration
  readonly codeInterpreterToggle: Locator
  readonly webBrowsingToggle: Locator
  readonly imageGenerationToggle: Locator
  readonly fileSearchToggle: Locator

  // Test panel
  readonly testPanel: Locator
  readonly testChatInput: Locator
  readonly testSendButton: Locator
  readonly testMessages: Locator

  constructor(page: Page) {
    super(page)

    // Header elements
    this.pageTitle = page.locator('h1')
    this.testGPTButton = page.locator('button', {hasText: 'Test GPT'})
    this.apiSettingsToggle = page.locator('button', {hasText: /API Settings/})
    this.apiSettingsPanel = page.locator('[data-testid="api-settings"]')

    // Form elements
    this.nameInput = page.locator('input[name="name"]')
    this.descriptionInput = page.locator('textarea[name="description"]')
    this.systemPromptTextarea = page.locator('textarea[name="systemPrompt"]')
    this.saveButton = page.locator('button', {hasText: 'Save'})

    // Tab navigation
    this.configurationTab = page.locator('button[role="tab"]', {hasText: 'Configuration'})
    this.toolsTab = page.locator('button[role="tab"]', {hasText: 'Tools'})
    this.knowledgeTab = page.locator('button[role="tab"]', {hasText: 'Knowledge'})
    this.capabilitiesTab = page.locator('button[role="tab"]', {hasText: 'Capabilities'})

    // Tools configuration
    this.addToolButton = page.locator('button', {hasText: 'Add Tool'})
    this.toolsList = page.locator('[data-testid="tools-list"]')

    // Knowledge configuration
    this.fileUploadButton = page.locator('input[type="file"]')
    this.urlInput = page.locator('input[placeholder*="URL"]')
    this.addUrlButton = page.locator('button', {hasText: 'Add URL'})

    // Capabilities configuration
    this.codeInterpreterToggle = page.locator('[data-testid="code-interpreter-toggle"]')
    this.webBrowsingToggle = page.locator('[data-testid="web-browsing-toggle"]')
    this.imageGenerationToggle = page.locator('[data-testid="image-generation-toggle"]')
    this.fileSearchToggle = page.locator('[data-testid="file-search-toggle"]')

    // Test panel
    this.testPanel = page.locator('[data-testid="test-panel"]')
    this.testChatInput = page.locator('textarea[placeholder*="message"]')
    this.testSendButton = page.locator('button[aria-label="Send message"]')
    this.testMessages = page.locator('[data-testid="test-messages"]')
  }

  /**
   * Navigate to the new GPT editor
   */
  async navigateToNew(): Promise<void> {
    await this.goto('/gpt/new')
    await this.waitForLoad()
  }

  /**
   * Navigate to edit an existing GPT
   */
  async navigateToEdit(gptId: string): Promise<void> {
    await this.goto(`/gpt/edit/${gptId}`)
    await this.waitForLoad()
  }

  /**
   * Check if the editor is loaded
   */
  async isLoaded(): Promise<boolean> {
    return await this.isVisible(this.pageTitle)
  }

  /**
   * Fill in basic GPT configuration
   */
  async fillBasicConfiguration(name: string, description: string, systemPrompt: string): Promise<void> {
    await this.fillInput(this.nameInput, name)
    await this.fillInput(this.descriptionInput, description)
    await this.fillInput(this.systemPromptTextarea, systemPrompt)
  }

  /**
   * Get the current GPT name
   */
  async getGPTName(): Promise<string | null> {
    return await this.nameInput.inputValue()
  }

  /**
   * Click on a specific tab
   */
  async clickTab(tabName: 'Configuration' | 'Tools' | 'Knowledge' | 'Capabilities'): Promise<void> {
    const tabMap = {
      Configuration: this.configurationTab,
      Tools: this.toolsTab,
      Knowledge: this.knowledgeTab,
      Capabilities: this.capabilitiesTab,
    }

    await this.clickElement(tabMap[tabName])
  }

  /**
   * Save the GPT configuration
   */
  async saveGPT(): Promise<void> {
    await this.clickElement(this.saveButton)
    // Wait for save to complete (you might want to wait for a success message)
    await this.page.waitForTimeout(1000)
  }

  /**
   * Click Test GPT button
   */
  async clickTestGPT(): Promise<void> {
    await this.clickElement(this.testGPTButton)
  }

  /**
   * Toggle API settings panel
   */
  async toggleAPISettings(): Promise<void> {
    await this.clickElement(this.apiSettingsToggle)
  }

  /**
   * Add a tool (simplified - you might need more specific methods)
   */
  async addTool(): Promise<void> {
    await this.clickTab('Tools')
    await this.clickElement(this.addToolButton)
  }

  /**
   * Add knowledge URL
   */
  async addKnowledgeURL(url: string): Promise<void> {
    await this.clickTab('Knowledge')
    await this.fillInput(this.urlInput, url)
    await this.clickElement(this.addUrlButton)
  }

  /**
   * Toggle capabilities
   */
  async toggleCodeInterpreter(): Promise<void> {
    await this.clickTab('Capabilities')
    await this.clickElement(this.codeInterpreterToggle)
  }

  async toggleWebBrowsing(): Promise<void> {
    await this.clickTab('Capabilities')
    await this.clickElement(this.webBrowsingToggle)
  }

  /**
   * Send a test message
   */
  async sendTestMessage(message: string): Promise<void> {
    await this.fillInput(this.testChatInput, message)
    await this.clickElement(this.testSendButton)
  }

  /**
   * Get test message count
   */
  async getTestMessageCount(): Promise<number> {
    return await this.testMessages.locator('> *').count()
  }

  /**
   * Wait for test response
   */
  async waitForTestResponse(): Promise<void> {
    // Wait for loading indicator to disappear and response to appear
    await this.page.waitForFunction(
      () => {
        const loadingIndicator = document.querySelector('[data-testid="test-loading"]')
        return !loadingIndicator || loadingIndicator.getAttribute('style')?.includes('display: none')
      },
      {timeout: 30000},
    )
  }
}
