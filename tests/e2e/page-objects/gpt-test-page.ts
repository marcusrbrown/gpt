import type {Locator, Page} from '@playwright/test'
import {BasePage} from './base-page'

/**
 * Page Object Model for the GPT Test page
 * Handles interactions with GPT testing functionality
 */
export class GPTTestPage extends BasePage {
  // Header elements
  readonly pageTitle: Locator
  readonly backToEditorButton: Locator
  readonly gptNameDisplay: Locator

  // Chat interface
  readonly chatContainer: Locator
  readonly messageInput: Locator
  readonly sendButton: Locator
  readonly messages: Locator
  readonly userMessages: Locator
  readonly assistantMessages: Locator
  readonly loadingIndicator: Locator

  // Chat controls
  readonly clearChatButton: Locator
  readonly exportChatButton: Locator

  // Configuration display
  readonly configurationPanel: Locator
  readonly systemPromptDisplay: Locator
  readonly capabilitiesDisplay: Locator
  readonly toolsDisplay: Locator

  constructor(page: Page) {
    super(page)

    // Header elements
    this.pageTitle = page.locator('h1')
    this.backToEditorButton = page.locator('button', {hasText: 'Back to Editor'})
    this.gptNameDisplay = page.locator('[data-testid="gpt-name-display"]')

    // Chat interface
    this.chatContainer = page.locator('[data-testid="chat-container"]')
    this.messageInput = page.locator('textarea[placeholder*="message"]')
    this.sendButton = page.locator('button[aria-label="Send message"]')
    this.messages = page.locator('[data-testid="chat-message"]')
    this.userMessages = page.locator('[data-testid="user-message"]')
    this.assistantMessages = page.locator('[data-testid="assistant-message"]')
    this.loadingIndicator = page.locator('[data-testid="message-loading"]')

    // Chat controls
    this.clearChatButton = page.locator('button', {hasText: 'Clear Chat'})
    this.exportChatButton = page.locator('button', {hasText: 'Export'})

    // Configuration display
    this.configurationPanel = page.locator('[data-testid="configuration-panel"]')
    this.systemPromptDisplay = page.locator('[data-testid="system-prompt-display"]')
    this.capabilitiesDisplay = page.locator('[data-testid="capabilities-display"]')
    this.toolsDisplay = page.locator('[data-testid="tools-display"]')
  }

  /**
   * Navigate to GPT test page
   */
  async navigateTo(gptId: string): Promise<void> {
    await this.goto(`/gpt/test/${gptId}`)
    await this.waitForLoad()
  }

  /**
   * Check if the test page is loaded
   */
  async isLoaded(): Promise<boolean> {
    return this.isVisible(this.chatContainer)
  }

  /**
   * Get the displayed GPT name
   */
  async getGPTName(): Promise<string | null> {
    return this.getTextContent(this.gptNameDisplay)
  }

  /**
   * Send a message in the chat
   */
  async sendMessage(message: string): Promise<void> {
    await this.fillInput(this.messageInput, message)
    await this.clickElement(this.sendButton)
  }

  /**
   * Wait for assistant response
   */
  async waitForResponse(timeoutMs = 30000): Promise<void> {
    // Wait for loading indicator to appear and then disappear
    await this.page.waitForSelector('[data-testid="message-loading"]', {state: 'visible', timeout: 5000})
    await this.page.waitForSelector('[data-testid="message-loading"]', {state: 'hidden', timeout: timeoutMs})
  }

  /**
   * Get total message count
   */
  async getMessageCount(): Promise<number> {
    return this.messages.count()
  }

  /**
   * Get user message count
   */
  async getUserMessageCount(): Promise<number> {
    return this.userMessages.count()
  }

  /**
   * Get assistant message count
   */
  async getAssistantMessageCount(): Promise<number> {
    return this.assistantMessages.count()
  }

  /**
   * Get the last message content
   */
  async getLastMessage(): Promise<string | null> {
    const lastMessage = this.messages.last()
    return this.getTextContent(lastMessage)
  }

  /**
   * Get the last assistant message content
   */
  async getLastAssistantMessage(): Promise<string | null> {
    const lastMessage = this.assistantMessages.last()
    return this.getTextContent(lastMessage)
  }

  /**
   * Get all message contents
   */
  async getAllMessages(): Promise<string[]> {
    const count = await this.getMessageCount()
    const messages: string[] = []

    for (let i = 0; i < count; i++) {
      const message = this.messages.nth(i)
      const content = await this.getTextContent(message)
      // Explicitly handle null/undefined/empty (and ignore whitespace-only)
      if (content != null && content.trim() !== '') {
        messages.push(content)
      }
    }

    return messages
  }

  /**
   * Clear the chat history
   */
  async clearChat(): Promise<void> {
    await this.clickElement(this.clearChatButton)
    // Wait for confirmation dialog and confirm
    const confirmButton = this.page.locator('button', {hasText: 'Confirm'})
    if (await confirmButton.isVisible()) {
      await this.clickElement(confirmButton)
    }
  }

  /**
   * Export chat history
   */
  async exportChat(): Promise<void> {
    await this.clickElement(this.exportChatButton)
  }

  /**
   * Navigate back to editor
   */
  async backToEditor(): Promise<void> {
    await this.clickElement(this.backToEditorButton)
  }

  /**
   * Check if chat is empty
   */
  async isChatEmpty(): Promise<boolean> {
    const count = await this.getMessageCount()
    return count === 0
  }

  /**
   * Wait for chat to load
   */
  async waitForChatLoad(): Promise<void> {
    await this.waitForElement(this.chatContainer)
    // Wait a bit for any initial messages to load
    await this.page.waitForTimeout(1000)
  }

  /**
   * Check if system prompt is displayed correctly
   */
  async getDisplayedSystemPrompt(): Promise<string | null> {
    return this.getTextContent(this.systemPromptDisplay)
  }

  /**
   * Get displayed capabilities
   */
  async getDisplayedCapabilities(): Promise<string[]> {
    const capabilities = await this.capabilitiesDisplay.locator('li').allTextContents()
    return capabilities
  }

  /**
   * Get displayed tools
   */
  async getDisplayedTools(): Promise<string[]> {
    const tools = await this.toolsDisplay.locator('li').allTextContents()
    return tools
  }
}
