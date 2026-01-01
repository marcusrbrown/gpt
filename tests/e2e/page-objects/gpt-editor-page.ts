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

  // Auto-save indicators (no manual Save button - uses auto-save with 2s debounce)
  readonly savingIndicator: Locator
  readonly savedIndicator: Locator
  readonly unsavedChangesIndicator: Locator

  // Tab navigation (new full-width tab layout)
  readonly generalTab: Locator
  readonly knowledgeTab: Locator
  readonly toolsTab: Locator
  readonly advancedTab: Locator

  // Tools configuration
  readonly addToolButton: Locator
  readonly toolsList: Locator

  // Knowledge configuration
  readonly fileUploadButton: Locator
  readonly urlInput: Locator
  readonly addUrlButton: Locator

  // Capabilities configuration (in General tab)
  readonly codeInterpreterToggle: Locator
  readonly webBrowsingToggle: Locator
  readonly imageGenerationToggle: Locator
  readonly fileSearchToggle: Locator

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

    // Auto-save indicators (from GPTEditorPage header)
    this.savingIndicator = page.locator('text=Saving...')
    this.savedIndicator = page.locator('text=Saved')
    this.unsavedChangesIndicator = page.locator('text=Unsaved changes')

    // Tab navigation (new full-width tab layout)
    this.generalTab = page.locator('button[role="tab"]', {hasText: 'General'})
    this.knowledgeTab = page.locator('button[role="tab"]', {hasText: 'Knowledge'})
    this.toolsTab = page.locator('button[role="tab"]', {hasText: 'Tools'})
    this.advancedTab = page.locator('button[role="tab"]', {hasText: 'Advanced'})

    // Tools configuration
    this.addToolButton = page.locator('button', {hasText: 'Add Tool'})
    this.toolsList = page.locator('[data-testid="tools-list"]')

    // Knowledge configuration
    this.fileUploadButton = page.locator('input[type="file"]')
    this.urlInput = page.locator('input[placeholder*="URL"]')
    this.addUrlButton = page.locator('button', {hasText: 'Add URL'})

    // Capabilities configuration (in General tab)
    // Use checkbox role with accessible names matching the capability labels
    this.codeInterpreterToggle = page.getByRole('checkbox', {name: /code.*interpreter/i})
    this.webBrowsingToggle = page.getByRole('checkbox', {name: /web.*browsing/i})
    this.imageGenerationToggle = page.getByRole('checkbox', {name: /image.*generation/i})
    this.fileSearchToggle = page.getByRole('checkbox', {name: /file.*search/i})
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
    return this.isVisible(this.pageTitle)
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
    return this.nameInput.inputValue()
  }

  /**
   * Click on a specific tab
   */
  async clickTab(tabName: 'General' | 'Tools' | 'Knowledge' | 'Advanced'): Promise<void> {
    const tabMap = {
      General: this.generalTab,
      Tools: this.toolsTab,
      Knowledge: this.knowledgeTab,
      Advanced: this.advancedTab,
    }

    await this.clickElement(tabMap[tabName])
  }

  /**
   * Save the GPT configuration via auto-save
   * The GPT editor uses auto-save with a 2 second debounce - there's no manual Save button.
   *
   * This method waits for the auto-save debounce period to pass, then confirms the save
   * completed by waiting for the "Saved" indicator to appear.
   *
   * Note: Assumes the GPT has already been given a name via fillBasicConfiguration().
   * The name check is done by looking at the page title, not the input field,
   * since tests may be on different tabs when calling saveGPT().
   */
  async saveGPT(): Promise<void> {
    // Wait for auto-save debounce (2000ms) plus buffer for save operation
    await this.page.waitForTimeout(2500)

    // Wait for either "Saving..." to appear and then "Saved", or just "Saved" if save was quick
    try {
      // First check if we're currently saving
      const isSaving = await this.savingIndicator.isVisible({timeout: 500}).catch(() => false)

      if (isSaving) {
        // Wait for saving to complete - "Saved" should appear
        await this.page.waitForFunction(
          () => {
            const bodyText = document.body.textContent || ''
            return bodyText.includes('Saved') && !bodyText.includes('Saving...')
          },
          {timeout: 10000},
        )
      } else {
        // Either already saved or waiting for debounce - wait for "Saved" indicator
        await this.page.waitForFunction(() => document.body.textContent?.includes('Saved'), {timeout: 10000})
      }
    } catch {
      // If we can't detect the save indicator, give extra time for IndexedDB write
      await this.page.waitForTimeout(1000)
    }

    // Small buffer for IndexedDB write to stabilize
    await this.page.waitForTimeout(300)
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
   * Add a tool with configuration
   */
  async addTool(config?: {
    name: string
    description: string
    endpoint: string
    authenticationType: string
    authenticationValue: string
  }): Promise<void> {
    await this.clickTab('Tools')
    await this.clickElement(this.addToolButton)

    if (config) {
      // Basic tool configuration - simplified for e2e testing
      const toolNameInput = this.page.locator('[name*="name"]').last()
      const toolDescInput = this.page.locator('[name*="description"]').last()

      await this.fillInput(toolNameInput, config.name)
      await this.fillInput(toolDescInput, config.description)
    }
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
   * Toggle capabilities (now in General tab)
   */
  async toggleCodeInterpreter(): Promise<void> {
    await this.clickTab('General')
    await this.clickElement(this.codeInterpreterToggle)
  }

  async toggleWebBrowsing(): Promise<void> {
    await this.clickTab('General')
    await this.clickElement(this.webBrowsingToggle)
  }

  /**
   * Navigate to test page for this GPT
   * Note: Testing is now on a separate page, not embedded in the editor
   */
  async navigateToTest(gptId: string): Promise<void> {
    await this.goto(`/gpt/test/${gptId}`)
  }

  /**
   * Check if validation errors are present by looking for HeroUI error states
   */
  async hasValidationErrors(): Promise<boolean> {
    const errorElements = this.page.locator('[aria-invalid="true"]')
    const count = await errorElements.count()
    return count > 0
  }

  /**
   * Check if a specific field has validation error
   */
  async hasFieldError(fieldName: string): Promise<boolean> {
    const field = this.page.locator(`[name="${fieldName}"]`)
    const ariaInvalid = await field.getAttribute('aria-invalid')
    return ariaInvalid === 'true'
  }

  /**
   * Get field value by name
   */
  async getFieldValue(fieldName: string): Promise<string | null> {
    const field = this.page.locator(`[name="${fieldName}"]`)
    return field.inputValue()
  }

  /**
   * Check if form is currently submitting (look for loading overlay)
   */
  async isFormSubmitting(): Promise<boolean> {
    const loadingOverlay = this.page.locator('.absolute.inset-0:has-text("Saving GPT")')
    return loadingOverlay.isVisible()
  }

  /**
   * Wait for form to finish submitting
   */
  async waitForFormSubmission(): Promise<void> {
    await this.page.waitForFunction(
      () => {
        const overlay = document.querySelector('.absolute.inset-0:has-text("Saving GPT")')
        return !overlay
      },
      {timeout: 10000},
    )
  }
}
