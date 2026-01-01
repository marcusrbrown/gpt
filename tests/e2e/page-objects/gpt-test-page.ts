import type {Locator, Page} from '@playwright/test'
import {BasePage} from './base-page'

/**
 * Page Object Model for the GPT Test page
 * Uses the ChatInterface component for chat functionality
 */
export class GPTTestPage extends BasePage {
  // Header elements
  readonly pageTitle: Locator
  readonly backButton: Locator
  readonly gptNameDisplay: Locator

  // Chat interface (ChatInterface component)
  readonly chatInterface: Locator
  readonly chatHeader: Locator
  readonly messageInput: Locator
  readonly sendButton: Locator
  readonly messages: Locator
  readonly userMessages: Locator
  readonly assistantMessages: Locator
  readonly loadingIndicator: Locator

  // Chat controls
  readonly clearChatButton: Locator
  readonly newChatButton: Locator
  readonly moreOptionsButton: Locator

  // Sidebar (desktop and mobile drawer)
  readonly sidebar: Locator
  readonly sidebarToggle: Locator
  readonly conversationList: Locator
  readonly conversationHistory: Locator

  // Empty state
  readonly emptyState: Locator
  readonly emptyStateTitle: Locator
  readonly emptyStateDescription: Locator

  // Message actions
  readonly copyButton: Locator
  readonly regenerateButton: Locator

  // Error display
  readonly errorMessage: Locator

  // Processing indicator
  readonly processingIndicator: Locator

  constructor(page: Page) {
    super(page)

    // Chat interface container - the main flex container
    this.chatInterface = page.locator('.flex.h-full.bg-surface-primary').first()

    // Chat header - specifically within the chat interface (h-14 header inside main chat area)
    this.chatHeader = page.locator('.flex-1.flex.flex-col.min-w-0 > header.h-14')

    // Header elements - h1 within the chat header
    this.pageTitle = this.chatHeader.locator('h1')
    this.backButton = page.locator('a[href="/"], button:has-text("Back")')
    this.gptNameDisplay = this.chatHeader.locator('h1')

    // Textarea with aria-label for accessibility
    this.messageInput = page.locator('textarea[aria-label="Enter your message to send to the GPT"]')
    // Send button with aria-label
    this.sendButton = page.locator('button[aria-label="Send message to GPT assistant"]')
    // Messages are wrapped in groups with user/assistant role styling
    this.messages = page.locator('.group:has(.whitespace-pre-wrap)')
    // User messages have specific styling (flex-row-reverse)
    this.userMessages = page.locator('.group.flex-row-reverse')
    // Assistant messages have normal flex direction
    this.assistantMessages = page.locator('.group:not(.flex-row-reverse):has(.whitespace-pre-wrap)')
    // Loading indicator shows animated dots
    this.loadingIndicator = page.locator('.animate-bounce').first()

    // Chat controls - Clear button in chat header with Trash2 icon
    this.clearChatButton = this.chatHeader.locator('button:has(svg.lucide-trash-2)')
    // New Chat button in sidebar
    this.newChatButton = page.locator('button:has-text("New Chat")')
    // More options button in chat header
    this.moreOptionsButton = this.chatHeader.locator('button:has(svg.lucide-more-vertical)')

    // Sidebar - desktop sidebar is hidden on mobile (lg:flex)
    this.sidebar = page.locator(String.raw`.hidden.lg\:flex.w-64`)
    // Mobile sidebar toggle button with Menu icon - inside the chat header specifically
    this.sidebarToggle = this.chatHeader.locator('button:has(svg.lucide-menu)')
    // Conversation list in sidebar
    this.conversationList = page.locator('.flex-1.overflow-y-auto.p-2')
    // Conversation history section
    this.conversationHistory = page.locator('h3:has-text("Today")').locator('..')

    // Empty state - shown when no messages
    this.emptyState = page.locator(String.raw`.flex.flex-col.items-center.justify-center.h-\[60vh\]`)
    this.emptyStateTitle = page.locator('h2:has-text("How can I help you?")')
    this.emptyStateDescription = page.locator('.text-content-secondary.max-w-md')

    // Message actions - visible on hover
    this.copyButton = page.locator('button[aria-label="Copy message"]')
    this.regenerateButton = page.locator('button[aria-label="Regenerate response"]')

    // Error message display
    this.errorMessage = page.locator(String.raw`.bg-danger-50\/50`)

    // Processing indicator with "Thinking..." text
    this.processingIndicator = page.locator('.text-xs.font-medium.text-content-secondary')
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
    // Wait for the message input to be visible as indicator that chat is ready
    try {
      await this.messageInput.waitFor({state: 'visible', timeout: 5000})
      return true
    } catch {
      return false
    }
  }

  /**
   * Get the displayed GPT name (conversation name from header)
   */
  async getGPTName(): Promise<string | null> {
    return this.getTextContent(this.gptNameDisplay)
  }

  /**
   * Get the conversation name displayed in the header
   */
  async getConversationName(): Promise<string | null> {
    return this.getTextContent(this.pageTitle)
  }

  /**
   * Send a message in the chat
   */
  async sendMessage(message: string): Promise<void> {
    await this.fillInput(this.messageInput, message)
    await this.clickElement(this.sendButton)
  }

  /**
   * Type a message without sending (for testing input behavior)
   */
  async typeMessage(message: string): Promise<void> {
    await this.messageInput.waitFor({state: 'visible'})
    await this.messageInput.fill(message)
  }

  /**
   * Check if send button is enabled
   */
  async isSendButtonEnabled(): Promise<boolean> {
    return this.sendButton.isEnabled()
  }

  /**
   * Wait for assistant response
   */
  async waitForResponse(timeoutMs = 30000): Promise<void> {
    // Wait for loading indicator to appear and then disappear
    try {
      await this.loadingIndicator.waitFor({state: 'visible', timeout: 5000})
      await this.loadingIndicator.waitFor({state: 'hidden', timeout: timeoutMs})
    } catch {
      // Loading might be too fast to catch
    }
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
   * Clear the chat history using the header clear button
   * Note: This triggers a browser confirm dialog
   */
  async clearChat(): Promise<void> {
    // Set up dialog handler before clicking
    this.page.once('dialog', dialog => {
      dialog.accept().catch(console.error)
    })
    await this.clickElement(this.clearChatButton)
  }

  /**
   * Navigate back to home or previous page
   */
  async backToHome(): Promise<void> {
    await this.clickElement(this.backButton)
  }

  /**
   * Check if chat is empty (shows empty state)
   */
  async isChatEmpty(): Promise<boolean> {
    return this.emptyState.isVisible()
  }

  /**
   * Check if empty state title is visible
   */
  async hasEmptyStateTitle(): Promise<boolean> {
    return this.emptyStateTitle.isVisible()
  }

  /**
   * Wait for chat to load
   */
  async waitForChatLoad(): Promise<void> {
    await this.messageInput.waitFor({state: 'visible'})
  }

  /**
   * Toggle sidebar (mobile only - button only visible on mobile)
   */
  async toggleSidebar(): Promise<void> {
    await this.clickElement(this.sidebarToggle)
  }

  /**
   * Check if sidebar toggle is visible (mobile only)
   */
  async isSidebarToggleVisible(): Promise<boolean> {
    return this.sidebarToggle.isVisible()
  }

  /**
   * Check if desktop sidebar is visible
   */
  async isDesktopSidebarVisible(): Promise<boolean> {
    return this.sidebar.isVisible()
  }

  /**
   * Start a new chat (clears current conversation)
   */
  async startNewChat(): Promise<void> {
    // Set up dialog handler before clicking
    this.page.once('dialog', dialog => {
      dialog.accept().catch(console.error)
    })
    await this.clickElement(this.newChatButton)
  }

  /**
   * Check if new chat button is visible
   */
  async isNewChatButtonVisible(): Promise<boolean> {
    return this.newChatButton.isVisible()
  }

  /**
   * Check if clear button is visible
   */
  async isClearButtonVisible(): Promise<boolean> {
    return this.clearChatButton.isVisible()
  }

  /**
   * Check if error message is displayed
   */
  async hasError(): Promise<boolean> {
    return this.errorMessage.isVisible()
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string | null> {
    if (await this.hasError()) {
      return this.getTextContent(this.errorMessage)
    }
    return null
  }

  /**
   * Check if processing/loading indicator is visible
   */
  async isProcessing(): Promise<boolean> {
    // Check for the animated dots or "Thinking..." text
    const dotsVisible = await this.loadingIndicator.isVisible()
    const textVisible = await this.processingIndicator.isVisible()
    return dotsVisible || textVisible
  }

  /**
   * Get the message input placeholder text
   */
  async getInputPlaceholder(): Promise<string | null> {
    return this.messageInput.getAttribute('placeholder')
  }

  /**
   * Check if message input is disabled
   */
  async isInputDisabled(): Promise<boolean> {
    return this.messageInput.isDisabled()
  }

  /**
   * Press Enter in the message input to send
   */
  async pressEnterToSend(): Promise<void> {
    await this.messageInput.press('Enter')
  }

  /**
   * Press Shift+Enter in the message input (for newline)
   */
  async pressShiftEnter(): Promise<void> {
    await this.messageInput.press('Shift+Enter')
  }

  /**
   * Hover over a message to reveal actions
   */
  async hoverOverMessage(index: number): Promise<void> {
    const message = this.messages.nth(index)
    await message.hover()
  }

  /**
   * Copy a message (hover first to reveal button)
   */
  async copyMessage(index: number): Promise<void> {
    await this.hoverOverMessage(index)
    await this.copyButton.nth(index).click()
  }

  /**
   * Check if mobile drawer is open
   */
  async isMobileDrawerOpen(): Promise<boolean> {
    // HeroUI Drawer renders as a dialog with "Menu" title
    const drawer = this.page.getByRole('dialog', {name: 'Menu'})
    return drawer.isVisible()
  }

  /**
   * Close mobile drawer if open
   */
  async closeMobileDrawer(): Promise<void> {
    if (await this.isMobileDrawerOpen()) {
      // Press Escape to close drawer
      await this.page.keyboard.press('Escape')
    }
  }

  /**
   * Wait for drawer animation to complete
   */
  async waitForDrawerAnimation(): Promise<void> {
    await this.page.waitForTimeout(300)
  }

  /**
   * Get the GPT model indicator text (e.g., "GPT-4o")
   */
  async getModelIndicator(): Promise<string | null> {
    const indicator = this.page.locator(String.raw`header .text-\[10px\].text-content-tertiary`)
    return this.getTextContent(indicator)
  }

  /**
   * Check if model status indicator shows "online" (green dot)
   */
  async isModelOnline(): Promise<boolean> {
    const statusDot = this.page.locator('header .bg-success-500.animate-pulse')
    return statusDot.isVisible()
  }
}
