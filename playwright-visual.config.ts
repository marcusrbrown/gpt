import process from 'node:process'
import {defineConfig, devices} from '@playwright/test'

/**
 * Playwright configuration specifically for visual regression testing
 * Optimized settings for consistent screenshot comparison across browsers
 *
 * @see https://playwright.dev/docs/test-snapshots
 */
export default defineConfig({
  // Visual test directory
  testDir: './tests/visual',
  testMatch: '**/*.visual.spec.ts',

  // Sequential execution for visual tests to avoid resource conflicts
  fullyParallel: false,
  workers: 1,

  // Retries for visual tests - important for consistency
  retries: process.env.CI ? 3 : 1,

  // Reporter configuration optimized for visual testing
  reporter: [
    ['html', {open: 'never', outputFolder: 'test-results/visual-report'}],
    ['json', {outputFile: 'test-results/visual-results.json'}],
    process.env.CI ? ['github'] : ['list'],
  ],

  // Shared settings optimized for visual testing
  use: {
    // Base URL for tests
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',

    // Always collect traces for visual tests
    trace: 'retain-on-failure',

    // Screenshot settings for visual tests
    screenshot: 'only-on-failure',

    // Video for debugging visual failures
    video: 'retain-on-failure',

    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,

    // Visual testing optimizations
    locale: 'en-US',
    timezoneId: 'America/Phoenix',
    colorScheme: 'light',

    // Disable animations by default for consistent visuals
    hasTouch: false,
    isMobile: false,
  },

  // Visual comparison settings
  expect: {
    // Longer timeout for visual operations
    timeout: 10000,

    // Visual comparison settings optimized for cross-platform consistency
    toMatchSnapshot: {
      // Higher threshold for visual tests to handle cross-platform rendering differences
      threshold: 0.25,

      // Maximum different pixels allowed (helps with font rendering differences)
      maxDiffPixels: 2000,
    },
  },

  // Browser projects optimized for visual testing
  projects: [
    // Desktop browsers with consistent viewports
    {
      name: 'chromium-visual',
      use: {
        ...devices['Desktop Chrome'],
        viewport: {width: 1280, height: 720},
        // Disable web security for consistent font rendering
        launchOptions: {
          args: ['--disable-web-security', '--disable-features=TranslateUI'],
        },
      },
    },

    {
      name: 'firefox-visual',
      use: {
        ...devices['Desktop Firefox'],
        viewport: {width: 1280, height: 720},
      },
    },

    {
      name: 'webkit-visual',
      use: {
        ...devices['Desktop Safari'],
        viewport: {width: 1280, height: 720},
      },
    },

    // Mobile visual testing with consistent devices
    {
      name: 'mobile-chrome-visual',
      use: {
        ...devices['Pixel 7'],
        // Override viewport for consistent mobile testing
        viewport: {width: 375, height: 667},
      },
    },

    {
      name: 'mobile-safari-visual',
      use: {
        ...devices['iPhone 14'],
        viewport: {width: 375, height: 812},
      },
    },
  ],

  // Web server configuration
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
    timeout: 120 * 1000, // Longer timeout for visual tests
  },

  // Global setup for visual tests
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',

  // Longer timeout for visual operations
  timeout: 60 * 1000,

  // Output directory for visual artifacts
  outputDir: 'test-results/visual-artifacts/',
})
