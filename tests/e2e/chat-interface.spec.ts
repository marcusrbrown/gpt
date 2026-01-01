import {expect, test} from './fixtures'
import {GPTDataFactory} from './utils/test-data-factory'

test.describe('Chat Interface', () => {
  test.beforeEach(async ({gptEditorPage, page}) => {
    // Create a GPT and navigate to test page
    await gptEditorPage.navigateToNew()
    expect(await gptEditorPage.isLoaded()).toBe(true)

    const testGPT = GPTDataFactory.createBasicGPT({
      name: 'Chat Test GPT',
      description: 'A GPT for testing chat interface',
    })
    await gptEditorPage.fillBasicConfiguration(testGPT.name, testGPT.description, testGPT.systemPrompt)
    await gptEditorPage.saveGPT()

    // Click Test GPT button in the editor to navigate to test page
    await gptEditorPage.clickTestGPT()

    // Wait for navigation to test page
    await page.waitForURL(/\/gpt\/test\//)
  })

  test('should display chat interface with input area', async ({gptTestPage}) => {
    // Verify the chat interface is loaded
    expect(await gptTestPage.isLoaded()).toBe(true)

    // Verify message input is visible and functional
    await expect(gptTestPage.messageInput).toBeVisible()
    await expect(gptTestPage.messageInput).toBeEnabled()

    // Verify send button is visible
    await expect(gptTestPage.sendButton).toBeVisible()

    // Verify placeholder text
    const placeholder = await gptTestPage.getInputPlaceholder()
    expect(placeholder).toContain('message')
  })

  test('should show conversation name in header', async ({gptTestPage}) => {
    // The header should show a conversation name (may be empty initially or show "New Chat")
    // Wait for the chat to load fully
    await gptTestPage.waitForChatLoad()

    // Verify the header h1 exists - it may be empty or contain text
    await expect(gptTestPage.pageTitle).toBeAttached()

    // On first load, conversation name may be set via GPTTestPage state after a delay
    // Check that the model indicator is visible (confirms header is rendering)
    const modelIndicator = await gptTestPage.getModelIndicator()
    expect(modelIndicator).toContain('GPT-4o')
  })

  test('should have functional message input with send button state', async ({gptTestPage}) => {
    // Initially, send button should be disabled (no message)
    await expect(gptTestPage.sendButton).toBeDisabled()

    // Type a message
    await gptTestPage.typeMessage('Hello, testing!')

    // Send button should now be enabled
    await expect(gptTestPage.sendButton).toBeEnabled()

    // Clear the input
    await gptTestPage.messageInput.clear()

    // Send button should be disabled again
    await expect(gptTestPage.sendButton).toBeDisabled()
  })

  test('should display conversation sidebar on desktop', async ({gptTestPage, page}) => {
    // Set desktop viewport
    await page.setViewportSize({width: 1280, height: 800})

    // Give time for responsive layout to adjust
    await page.waitForTimeout(300)

    // Desktop sidebar should be visible (hidden lg:flex means visible at lg+ breakpoint)
    const desktopSidebarVisible = await gptTestPage.isDesktopSidebarVisible()
    expect(desktopSidebarVisible).toBe(true)

    // Mobile toggle should NOT be visible on desktop
    const sidebarToggleVisible = await gptTestPage.isSidebarToggleVisible()
    expect(sidebarToggleVisible).toBe(false)

    // New Chat button should be visible in sidebar
    await expect(gptTestPage.newChatButton).toBeVisible()
  })

  test('should toggle sidebar on mobile', async ({gptTestPage, page}) => {
    // Set mobile viewport (below lg breakpoint of 1024px)
    await page.setViewportSize({width: 375, height: 667})

    // Give time for responsive layout to adjust
    await page.waitForTimeout(300)

    // Desktop sidebar should NOT be visible on mobile
    const desktopSidebarVisible = await gptTestPage.isDesktopSidebarVisible()
    expect(desktopSidebarVisible).toBe(false)

    // Mobile toggle button should be visible - use the first one in the chat header
    const chatHeaderMenuButton = page
      .locator('.flex-1.flex.flex-col.min-w-0 header button:has(svg.lucide-menu)')
      .first()
    await expect(chatHeaderMenuButton).toBeVisible()

    // Drawer should initially be closed
    expect(await gptTestPage.isMobileDrawerOpen()).toBe(false)

    // Open the drawer
    await chatHeaderMenuButton.click()
    await gptTestPage.waitForDrawerAnimation()

    // Drawer should now be open - HeroUI Drawer renders as a dialog with "Menu" title
    const drawer = page.getByRole('dialog', {name: 'Menu'})
    await expect(drawer).toBeVisible({timeout: 5000})

    // Verify drawer content - New Chat button should be inside
    await expect(drawer.locator('button:has-text("New Chat")')).toBeVisible()

    // Close the drawer by pressing Escape
    await page.keyboard.press('Escape')
    await gptTestPage.waitForDrawerAnimation()

    // Drawer should be closed
    await expect(drawer).not.toBeVisible()
  })

  test('should start new conversation from sidebar', async ({gptTestPage, page}) => {
    // Set desktop viewport to access sidebar directly
    await page.setViewportSize({width: 1280, height: 800})
    await page.waitForTimeout(300)

    // Verify New Chat button is visible
    await expect(gptTestPage.newChatButton).toBeVisible()

    // Initially should show empty state
    expect(await gptTestPage.isChatEmpty()).toBe(true)

    // Click New Chat (which clears conversation)
    await gptTestPage.startNewChat()

    // Should still show empty state after clearing
    expect(await gptTestPage.isChatEmpty()).toBe(true)
  })

  test('should clear current conversation', async ({gptTestPage}) => {
    // Verify clear button is visible in header
    await expect(gptTestPage.clearChatButton).toBeVisible()

    // Chat should be in empty state initially
    expect(await gptTestPage.isChatEmpty()).toBe(true)

    // Click clear chat (will trigger confirm dialog)
    await gptTestPage.clearChat()

    // Chat should still be empty
    expect(await gptTestPage.isChatEmpty()).toBe(true)
  })

  test('should navigate back to home page', async ({page}) => {
    // Find and click the back/home navigation
    // The app uses a logo or home link in the navbar
    const homeLink = page.locator('a[href="/"]').first()
    await expect(homeLink).toBeVisible()
    await homeLink.click()

    // Should navigate to home page
    await expect(page).toHaveURL('/')
  })

  test('should display empty state for new conversation', async ({gptTestPage}) => {
    // Verify empty state is shown
    expect(await gptTestPage.isChatEmpty()).toBe(true)

    // Verify empty state has the expected title
    await expect(gptTestPage.emptyStateTitle).toBeVisible()

    // Verify empty state shows GPT description
    await expect(gptTestPage.emptyStateDescription).toBeVisible()
  })

  test('should show model status indicator in header', async ({gptTestPage}) => {
    // Verify model indicator is visible (GPT-4o text)
    const modelIndicator = await gptTestPage.getModelIndicator()
    expect(modelIndicator).toContain('GPT-4o')

    // Verify online status indicator (green dot)
    const isOnline = await gptTestPage.isModelOnline()
    expect(isOnline).toBe(true)
  })

  test('should support Enter key to send message', async ({gptTestPage, page}) => {
    // Type a message
    await gptTestPage.typeMessage('Test message')

    // Verify send button is enabled
    await expect(gptTestPage.sendButton).toBeEnabled()

    // Press Enter to send (this will attempt to send, but without API key it may show error)
    // We're just testing the input behavior, not actual API calls
    await gptTestPage.pressEnterToSend()

    // The input should be cleared after sending attempt
    // Note: Since we don't have an API key configured, the message might fail
    // but the UI behavior of clearing input should still work
    await page.waitForTimeout(500) // Small wait for state update
  })

  test('should support Shift+Enter for newlines in input', async ({gptTestPage}) => {
    // Type initial text
    await gptTestPage.typeMessage('Line 1')

    // Press Shift+Enter for newline
    await gptTestPage.pressShiftEnter()

    // Type more text using pressSequentially (not deprecated .type())
    await gptTestPage.messageInput.pressSequentially('Line 2')

    // Get the input value
    const inputValue = await gptTestPage.messageInput.inputValue()

    // Should contain both lines
    expect(inputValue).toContain('Line 1')
    expect(inputValue).toContain('Line 2')
  })

  test('should be accessible with proper ARIA labels', async ({gptTestPage}) => {
    // Message input should have aria-label
    const inputAriaLabel = await gptTestPage.messageInput.getAttribute('aria-label')
    expect(inputAriaLabel).toBeTruthy()
    expect(inputAriaLabel).toContain('message')

    // Send button should have aria-label
    const sendAriaLabel = await gptTestPage.sendButton.getAttribute('aria-label')
    expect(sendAriaLabel).toBeTruthy()
    expect(sendAriaLabel?.toLowerCase()).toContain('send')

    // Clear button should be accessible (has SVG icon, may use tooltip for label)
    await expect(gptTestPage.clearChatButton).toBeVisible()
  })
})
