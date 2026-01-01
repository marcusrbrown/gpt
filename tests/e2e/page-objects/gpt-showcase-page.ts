import type {Locator, Page} from '@playwright/test'
import {BasePage} from './base-page'

/**
 * Page Object Model for the GPT Showcase page
 * Read-only view displaying GPT configuration with navigation to edit/test
 */
export class GPTShowcasePage extends BasePage {
  // Top navigation
  readonly backButton: Locator
  readonly editIconButton: Locator

  // Hero section
  readonly gptIcon: Locator
  readonly gptName: Locator
  readonly gptDescription: Locator
  readonly gptTags: Locator

  // Action buttons
  readonly startChattingButton: Locator
  readonly editButton: Locator

  // Capabilities section
  readonly capabilitiesSection: Locator
  readonly capabilityBadges: Locator

  // Conversation starters section
  readonly conversationStartersSection: Locator
  readonly conversationStarters: Locator
  readonly noStartersMessage: Locator

  // Knowledge base section
  readonly knowledgeSection: Locator
  readonly filesCount: Locator
  readonly urlsCount: Locator

  // Model configuration
  readonly modelConfiguration: Locator

  // Loading state
  readonly loadingSkeleton: Locator

  // Error state
  readonly errorCard: Locator
  readonly errorMessage: Locator
  readonly returnToLibraryButton: Locator

  constructor(page: Page) {
    super(page)

    // Top navigation - use data-testid for reliable selectors
    this.backButton = page.locator('[data-testid="showcase-back-button"]')
    this.editIconButton = page.locator('[data-testid="showcase-edit-icon-button"]')

    // Hero section
    this.gptIcon = page.locator('[data-testid="gpt-icon"]')
    this.gptName = page.locator('[data-testid="gpt-showcase-name"]')
    this.gptDescription = page.locator('[data-testid="gpt-showcase-description"]')
    this.gptTags = page.locator('[data-testid="gpt-showcase-tags"] [data-testid="gpt-tag"]')

    // Action buttons - use data-testid for reliable selectors
    this.startChattingButton = page.locator('[data-testid="showcase-start-chatting-button"]')
    this.editButton = page.locator('[data-testid="showcase-edit-button"]')

    // Capabilities section
    this.capabilitiesSection = page.locator('[data-testid="capabilities-section"]')
    this.capabilityBadges = page.locator('[data-testid="capability-badge"]')

    // Conversation starters section
    this.conversationStartersSection = page.locator('[data-testid="conversation-starters-section"]')
    this.conversationStarters = page.locator('[data-testid="conversation-starter"]')
    this.noStartersMessage = page.locator('[data-testid="no-starters-message"]')

    // Knowledge base section
    this.knowledgeSection = page.locator('[data-testid="knowledge-section"]')
    this.filesCount = page.locator('[data-testid="knowledge-files-count"]')
    this.urlsCount = page.locator('[data-testid="knowledge-urls-count"]')

    // Model configuration
    this.modelConfiguration = page.locator('[data-testid="model-configuration"]')

    // Loading state
    this.loadingSkeleton = page.locator('[data-testid="showcase-skeleton"]')

    // Error state
    this.errorCard = page.locator('[data-testid="error-card"]')
    this.errorMessage = page.locator('[data-testid="error-message"]')
    this.returnToLibraryButton = page.getByRole('button', {name: /Return to Library/i})
  }

  /**
   * Navigate to the showcase page for a specific GPT
   */
  async navigateTo(gptId: string): Promise<void> {
    await this.goto(`/gpt/${gptId}`)
    await this.waitForLoad()
  }

  /**
   * Check if the showcase page is loaded (not in loading state)
   */
  async isLoaded(): Promise<boolean> {
    // Wait for loading to complete
    await this.page.waitForTimeout(500)

    // Check if we're showing the GPT name or an error
    const hasName = await this.gptName.isVisible().catch(() => false)
    const hasError = await this.errorCard.isVisible().catch(() => false)
    return hasName || hasError
  }

  /**
   * Check if the page is showing the loading skeleton
   */
  async isLoading(): Promise<boolean> {
    return this.loadingSkeleton.isVisible()
  }

  /**
   * Check if the page is showing an error state
   */
  async hasError(): Promise<boolean> {
    return this.errorCard.isVisible()
  }

  /**
   * Get the displayed GPT name
   */
  async getGPTName(): Promise<string | null> {
    await this.waitForElement(this.gptName)
    return this.getTextContent(this.gptName)
  }

  /**
   * Get the displayed GPT description
   */
  async getDescription(): Promise<string | null> {
    return this.getTextContent(this.gptDescription)
  }

  /**
   * Get the error message text
   */
  async getErrorMessage(): Promise<string | null> {
    return this.getTextContent(this.errorMessage)
  }

  /**
   * Get all displayed tags
   */
  async getTags(): Promise<string[]> {
    const count = await this.gptTags.count()
    const tags: string[] = []

    for (let i = 0; i < count; i++) {
      const tag = this.gptTags.nth(i)
      const text = await this.getTextContent(tag)
      if (text != null && text.trim() !== '') {
        tags.push(text.trim())
      }
    }

    return tags
  }

  /**
   * Get all conversation starters
   */
  async getConversationStarters(): Promise<string[]> {
    const count = await this.conversationStarters.count()
    const starters: string[] = []

    for (let i = 0; i < count; i++) {
      const starter = this.conversationStarters.nth(i)
      const text = await this.getTextContent(starter)
      if (text != null && text.trim() !== '') {
        starters.push(text.trim())
      }
    }

    return starters
  }

  /**
   * Click on a conversation starter by index
   */
  async clickConversationStarter(index: number): Promise<void> {
    const starter = this.conversationStarters.nth(index)
    await this.clickElement(starter)
  }

  /**
   * Click on a conversation starter by text
   */
  async clickConversationStarterByText(text: string): Promise<void> {
    const starter = this.conversationStarters.filter({hasText: text}).first()
    await this.clickElement(starter)
  }

  /**
   * Get all capability labels
   */
  async getCapabilities(): Promise<string[]> {
    const count = await this.capabilityBadges.count()
    const capabilities: string[] = []

    for (let i = 0; i < count; i++) {
      const badge = this.capabilityBadges.nth(i)
      const text = await this.getTextContent(badge)
      if (text != null && text.trim() !== '') {
        capabilities.push(text.trim())
      }
    }

    return capabilities
  }

  /**
   * Check if capabilities section is visible
   */
  async hasCapabilities(): Promise<boolean> {
    const count = await this.capabilityBadges.count()
    return count > 0
  }

  /**
   * Check if knowledge section is visible
   */
  async hasKnowledgeSection(): Promise<boolean> {
    return this.knowledgeSection.isVisible()
  }

  /**
   * Get the files count from knowledge section
   */
  async getFilesCount(): Promise<number> {
    const text = await this.getTextContent(this.filesCount)
    if (text == null) return 0
    const match = text.match(/\d+/)
    return match ? Number.parseInt(match[0], 10) : 0
  }

  /**
   * Get the URLs count from knowledge section
   */
  async getUrlsCount(): Promise<number> {
    const text = await this.getTextContent(this.urlsCount)
    if (text == null) return 0
    const match = text.match(/\d+/)
    return match ? Number.parseInt(match[0], 10) : 0
  }

  /**
   * Click the "Start Chatting" button
   */
  async clickStartChatting(): Promise<void> {
    await this.clickElement(this.startChattingButton)
  }

  /**
   * Click the "Edit" button (bordered button in hero section)
   */
  async clickEdit(): Promise<void> {
    await this.clickElement(this.editButton)
  }

  /**
   * Click the back button (top navigation)
   */
  async clickBack(): Promise<void> {
    await this.clickElement(this.backButton)
  }

  /**
   * Click the edit icon button (top navigation)
   */
  async clickEditIcon(): Promise<void> {
    await this.clickElement(this.editIconButton)
  }

  /**
   * Click "Return to Library" on error page
   */
  async clickReturnToLibrary(): Promise<void> {
    await this.clickElement(this.returnToLibraryButton)
  }

  /**
   * Wait for the showcase page to fully load (past loading skeleton)
   */
  async waitForShowcaseLoad(): Promise<void> {
    // Wait for skeleton to disappear or be gone
    try {
      await this.loadingSkeleton.waitFor({state: 'hidden', timeout: 10000})
    } catch {
      // Skeleton might already be gone
    }

    // Now wait for either the GPT name or error card to appear
    await this.page.waitForSelector('[data-testid="gpt-showcase-name"], [data-testid="error-card"]', {
      state: 'visible',
      timeout: 10000,
    })
  }
}
