import type {Page} from '@playwright/test'
import type {VisualTestHelper} from './utils/visual-test-helper'
import {visualTest, VisualTestData} from './fixtures'

visualTest.describe('Chat Interface Visual Tests', () => {
  visualTest.beforeEach(async ({page}: {page: Page}) => {
    // Create a mock GPT and navigate to test page
    const mockGPT = VisualTestData.createMockGPT({
      id: 'chat-interface-gpt',
      name: 'Chat Interface GPT',
      description: 'GPT for testing the chat interface UI',
      systemPrompt: 'You are a test assistant.',
    })

    await page.evaluate((gpt: any) => {
      localStorage.setItem('gpt-configurations', JSON.stringify([gpt]))
    }, mockGPT)

    await page.goto('/gpt/test/chat-interface-gpt')
    await page.waitForLoadState('networkidle')
  })

  visualTest(
    'Chat interface - initial empty state',
    async ({visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
      await visualHelper.takeFullPageScreenshot('chat-interface-empty')
    },
  )

  visualTest(
    'Chat interface - with conversation',
    async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
      // Start a conversation
      const messageInput = page.locator('textarea[placeholder*="message"], input[placeholder*="message"]')
      await messageInput.fill('Hello, can you help me test this interface?')

      // Send message
      await page.click('button[type="submit"]')

      // Wait for message to appear in conversation
      await page.waitForTimeout(2000)

      await visualHelper.takeFullPageScreenshot('chat-interface-with-conversation')
    },
  )

  visualTest(
    'Chat interface - conversation history',
    async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
      const messageInput = page.locator('textarea[placeholder*="message"], input[placeholder*="message"]')

      // Send multiple messages to create conversation history
      const messages = [
        'First test message',
        'Second test message with more content',
        'Third message to show conversation flow',
      ]

      for (const message of messages) {
        await messageInput.fill(message)
        await page.click('button[type="submit"]')
        await page.waitForTimeout(1000) // Wait between messages
      }

      await visualHelper.takeFullPageScreenshot('chat-interface-conversation-history')
    },
  )

  visualTest(
    'Chat interface - responsive layout',
    async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
      // Add a message to show the interface in use
      const messageInput = page.locator('textarea[placeholder*="message"], input[placeholder*="message"]')
      await messageInput.fill('Testing responsive layout')
      await page.click('button[type="submit"]')
      await page.waitForTimeout(1000)

      await visualHelper.takeResponsiveScreenshots('chat-interface-responsive')
    },
  )

  visualTest(
    'Chat interface - dark theme',
    async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
      // Add a conversation
      const messageInput = page.locator('textarea[placeholder*="message"], input[placeholder*="message"]')
      await messageInput.fill('Testing dark theme')
      await page.click('button[type="submit"]')
      await page.waitForTimeout(1000)

      await visualHelper.setTheme('dark')
      await visualHelper.takeFullPageScreenshot('chat-interface-dark-theme')
    },
  )

  visualTest(
    'Chat interface - message bubbles',
    async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
      // Create conversation to screenshot individual message components
      const messageInput = page.locator('textarea[placeholder*="message"], input[placeholder*="message"]')
      await messageInput.fill('Test message for component screenshot')
      await page.click('button[type="submit"]')
      await page.waitForTimeout(2000)

      // Screenshot message components
      const messages = page.locator('[data-testid*="message"], .message, .chat-message')
      const messageCount = await messages.count()

      for (let i = 0; i < messageCount && i < 3; i++) {
        const message = messages.nth(i)
        if (await message.isVisible()) {
          await visualHelper.takeComponentScreenshot(message, `chat-interface-message-${i + 1}`)
        }
      }
    },
  )

  visualTest(
    'Chat interface - input area',
    async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
      // Screenshot the input area
      const inputArea = page.locator('[data-testid="chat-input"], .chat-input, form')
      await visualHelper.takeComponentScreenshot(inputArea.first(), 'chat-interface-input-area')
    },
  )

  visualTest(
    'Chat interface - loading state',
    async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
      // Send a message and try to capture loading state
      const messageInput = page.locator('textarea[placeholder*="message"], input[placeholder*="message"]')
      await messageInput.fill('Show loading state')

      // Click send and immediately take screenshot to catch loading state
      await page.click('button[type="submit"]')
      await page.waitForTimeout(100) // Brief wait to catch loading state

      await visualHelper.takeFullPageScreenshot('chat-interface-loading')
    },
  )

  visualTest(
    'Chat interface - error state',
    async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
      // Mock API error by intercepting the request
      await page.route('**/api/**', async route => {
        await route.fulfill({
          status: 500,
          body: JSON.stringify({error: 'Test error for visual testing'}),
        })
      })

      const messageInput = page.locator('textarea[placeholder*="message"], input[placeholder*="message"]')
      await messageInput.fill('This should trigger an error')
      await page.click('button[type="submit"]')

      // Wait for error to appear
      await page.waitForTimeout(2000)

      await visualHelper.takeFullPageScreenshot('chat-interface-error-state')
    },
  )

  visualTest(
    'Chat interface - sidebar toggle (mobile)',
    async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
      // Set mobile viewport
      await page.setViewportSize({width: 375, height: 667})
      await page.waitForTimeout(500)

      // Try to toggle sidebar/drawer
      const sidebarToggle = page.locator('button[aria-label*="sidebar"], button[aria-label*="menu"]')
      if ((await sidebarToggle.count()) > 0) {
        await sidebarToggle.first().click()
        await page.waitForTimeout(300)
      }

      await visualHelper.takeFullPageScreenshot('chat-interface-mobile-sidebar')
    },
  )
})
