import process from 'node:process'
import {defineConfig, devices} from '@playwright/test'

/**
 * Playwright configuration for end-to-end testing
 * Supports multiple browsers and environments (local, staging, CI)
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory structure - include both e2e and visual tests
  testDir: './tests',
  testMatch: ['**/tests/e2e/**/*.spec.ts', '**/tests/visual/**/*.spec.ts'],

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    ['html', {open: 'never'}],
    ['json', {outputFile: 'test-results/results.json'}],
    process.env.CI ? ['github'] : ['list'],
  ],

  // Shared settings for all tests
  use: {
    // Base URL for tests - configurable per environment
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Record screenshots on failure
    screenshot: 'only-on-failure',

    // Record video on failure
    video: 'retain-on-failure',

    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,

    // Visual testing optimizations
    locale: 'en-US',
    timezoneId: 'America/Phoenix',
    colorScheme: 'light',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use viewport that matches our responsive breakpoints
        viewport: {width: 1280, height: 720},
      },
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: {width: 1280, height: 720},
      },
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: {width: 1280, height: 720},
      },
    },

    // Mobile testing
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 7'],
      },
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 14'],
      },
    },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
  },

  // Global setup and teardown
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',

  // Test timeout
  timeout: 30 * 1000,
  expect: {
    // Maximum time expect() should wait for the condition to be met
    timeout: 5000,

    // Visual comparison settings
    toMatchSnapshot: {
      // Pixel difference threshold for cross-platform rendering differences
      threshold: 0.2,

      // Maximum different pixels allowed before test fails
      maxDiffPixels: 1000,
    },
  },

  // Output directory for test artifacts
  outputDir: 'test-results/',
})
