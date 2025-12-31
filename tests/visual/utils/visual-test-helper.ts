import {expect, type Locator, type Page} from '@playwright/test'

/**
 * Visual testing utilities for consistent screenshot generation and comparison
 * Provides standardized methods for visual regression testing
 */
export class VisualTestHelper {
  private readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  /**
   * Wait for page to be fully loaded and stable for visual testing
   * Ensures consistent rendering before taking screenshots
   */
  async waitForPageStable(): Promise<void> {
    // Wait for network to be idle
    await this.page.waitForLoadState('networkidle')

    // Wait for any fonts to load
    await this.page.waitForFunction(async () => document.fonts.ready)

    // Wait for any CSS animations to complete and ensure layout stability
    await this.page.waitForTimeout(750) // Increased from 500ms for better stability

    // Double-check that layout is stable by waiting for no layout shifts
    await this.page.waitForFunction(async () => {
      return new Promise(resolve => {
        // Use requestAnimationFrame to ensure we're checking after layout
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve(true))
        })
      })
    })
  }

  /**
   * Disable animations and transitions for consistent visual testing
   * Reduces flakiness caused by timing differences in animations
   */
  async disableAnimations(): Promise<void> {
    await this.page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-delay: -1ms !important;
          animation-duration: 1ms !important;
          animation-iteration-count: 1 !important;
          background-attachment: initial !important;
          scroll-behavior: auto !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `,
    })
  }

  /**
   * Hide dynamic content that changes between test runs
   * Masks elements with time-based or variable content
   */
  async hideDynamicContent(): Promise<void> {
    await this.page.addStyleTag({
      content: `
        [data-testid*="timestamp"],
        [data-testid*="date"],
        .timestamp,
        .last-updated,
        .version-info {
          visibility: hidden !important;
        }
      `,
    })
  }

  /**
   * Take a full page screenshot with consistent settings
   * @param name - Screenshot name for baseline comparison
   * @param options - Additional screenshot options
   * @param options.mask - Array of locators to mask during screenshot
   * @param options.clip - Clipping region for the screenshot
   * @param options.clip.x - X coordinate of clip region
   * @param options.clip.y - Y coordinate of clip region
   * @param options.clip.width - Width of clip region
   * @param options.clip.height - Height of clip region
   */
  async takeFullPageScreenshot(
    name: string,
    options: {
      mask?: Locator[]
      clip?: {x: number; y: number; width: number; height: number}
    } = {},
  ): Promise<void> {
    await this.prepareForScreenshot()

    const screenshotOptions: {
      fullPage: boolean
      mask?: Locator[]
      clip?: {x: number; y: number; width: number; height: number}
    } = {
      fullPage: true,
    }

    if (options.mask) {
      screenshotOptions.mask = options.mask
    }

    if (options.clip) {
      screenshotOptions.clip = options.clip
    }

    await expect(this.page).toHaveScreenshot(`${name}-full-page.png`, screenshotOptions)
  }

  /**
   * Take a component screenshot with consistent settings
   * @param locator - Element to screenshot
   * @param name - Screenshot name for baseline comparison
   * @param options - Additional screenshot options
   * @param options.mask - Array of locators to mask during screenshot
   */
  async takeComponentScreenshot(
    locator: Locator,
    name: string,
    options: {
      mask?: Locator[]
    } = {},
  ): Promise<void> {
    await this.prepareForScreenshot()

    // Ensure element is visible and stable
    await locator.waitFor({state: 'visible'})
    await locator.scrollIntoViewIfNeeded()

    const screenshotOptions: {mask?: Locator[]} = {}
    if (options.mask) {
      screenshotOptions.mask = options.mask
    }

    await expect(locator).toHaveScreenshot(`${name}-component.png`, screenshotOptions)
  }

  /**
   * Take responsive screenshots at different viewport sizes
   * @param name - Base screenshot name
   * @param viewports - Array of viewport configurations
   */
  async takeResponsiveScreenshots(
    name: string,
    viewports: {name: string; width: number; height: number}[] = [
      {name: 'mobile', width: 375, height: 667},
      {name: 'tablet', width: 768, height: 1024},
      {name: 'desktop', width: 1280, height: 720},
      {name: 'large', width: 1920, height: 1080},
    ],
  ): Promise<void> {
    // Capture original viewport size to restore after responsive testing
    const originalViewport = this.page.viewportSize()

    try {
      for (const viewport of viewports) {
        await this.page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        })

        await this.prepareForScreenshot()

        await expect(this.page).toHaveScreenshot(`${name}-${viewport.name}.png`, {
          fullPage: true,
        })
      }
    } finally {
      // Always restore original viewport size to prevent state pollution
      if (originalViewport) {
        await this.page.setViewportSize(originalViewport)
        await this.prepareForScreenshot() // Re-stabilize after viewport change
      }
    }
  }

  /**
   * Prepare page for consistent screenshot capture
   * Private method that handles all preparation steps
   */
  private async prepareForScreenshot(): Promise<void> {
    await this.disableAnimations()
    await this.hideDynamicContent()
    await this.waitForPageStable()
  }

  /**
   * Set consistent theme for visual testing
   * @param theme - Theme to apply ('light' | 'dark')
   */
  async setTheme(theme: 'light' | 'dark'): Promise<void> {
    // Simulate theme preference
    await this.page.emulateMedia({colorScheme: theme})

    // Add theme class to html element if the app uses class-based theming
    await this.page.evaluate(theme => {
      document.documentElement.className = theme
      document.documentElement.dataset.theme = theme
    }, theme)

    // Wait for theme changes to apply
    await this.page.waitForTimeout(100)
  }

  /**
   * Generate baseline screenshots for a new component or page
   * This should be run once to establish the baseline
   * @param name - Base name for the screenshots
   * @param testCallback - Function that navigates to the component/page to test
   */
  async generateBaseline(name: string, testCallback: () => Promise<void>): Promise<void> {
    // Light theme baseline
    await this.setTheme('light')
    await testCallback()
    await this.takeFullPageScreenshot(`${name}-light`)

    // Dark theme baseline
    await this.setTheme('dark')
    await testCallback()
    await this.takeFullPageScreenshot(`${name}-dark`)

    // Responsive baselines
    await this.setTheme('light')
    await testCallback()
    await this.takeResponsiveScreenshots(`${name}-responsive`)
  }
}

/**
 * Mock data utilities for consistent visual testing
 */
export const VisualTestData = {
  /**
   * Create mock GPT configuration with consistent data
   */
  createMockGPT(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      id: 'test-gpt-001',
      name: 'Test GPT Assistant',
      description: 'A sample GPT configuration for visual testing purposes',
      systemPrompt: 'You are a helpful assistant designed for testing visual components.',
      tools: [],
      knowledge: {
        files: [],
        urls: [],
      },
      capabilities: {
        codeInterpreter: false,
        webBrowsing: false,
        imageGeneration: false,
        fileSearch: {
          enabled: false,
        },
      },
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-01T00:00:00.000Z'),
      version: 1,
      ...overrides,
    }
  },

  /**
   * Create multiple mock GPTs for testing card layouts
   */
  createMockGPTList(count = 3) {
    return Array.from({length: count}, (_, index) =>
      this.createMockGPT({
        id: `test-gpt-${String(index + 1).padStart(3, '0')}`,
        name: `Test GPT ${index + 1}`,
        description: `Mock GPT configuration ${index + 1} for visual regression testing`,
      }),
    )
  },
} as const
