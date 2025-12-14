import process from 'node:process'
import {defineConfig, devices} from '@playwright/test'

const DEFAULT_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4173'

/**
 * Playwright configuration for performance testing with Lighthouse integration
 * Focuses on Core Web Vitals and performance benchmarks
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory for performance tests
  testDir: './tests/performance',
  testMatch: ['**/*.performance.spec.ts'],

  // Run tests sequentially for consistent performance measurements
  fullyParallel: false,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry once on CI for flaky performance tests
  retries: process.env.CI ? 2 : 0,

  // Single worker for consistent performance measurements
  workers: 1,

  // Reporter configuration
  reporter: [
    ['html', {outputFolder: 'playwright-report/performance', open: 'never'}],
    ['json', {outputFile: 'test-results/performance-results.json'}],
    process.env.CI ? ['github'] : ['list'],
  ],

  // Shared settings for all performance tests
  use: {
    // Base URL for tests
    baseURL: DEFAULT_BASE_URL,

    // Collect trace for all tests to analyze performance
    trace: 'on',

    // Record screenshots for performance reports
    screenshot: 'on',

    // Record video for performance analysis
    video: 'on',

    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,

    // Consistent locale and timezone for reproducible results
    locale: 'en-US',
    timezoneId: 'America/Phoenix',
    colorScheme: 'light',
  },

  // Configure projects for performance testing across different contexts
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: {width: 1920, height: 1080},
        // Simulate fast 3G for performance testing
        launchOptions: {
          args: ['--disable-blink-features=AutomationControlled', '--disable-web-security'],
        },
      },
    },
    {
      name: 'chromium-mobile',
      use: {
        ...devices['Pixel 7'],
        // Mobile viewport for performance testing
        launchOptions: {
          args: ['--disable-blink-features=AutomationControlled', '--disable-web-security'],
        },
      },
    },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: 'pnpm build && pnpm preview -- --host --port 4173',
    url: DEFAULT_BASE_URL,
    reuseExistingServer: false,
    stdout: 'ignore',
    stderr: 'pipe',
    timeout: 180 * 1000,
  },

  // Global setup and teardown
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',

  timeout: 60 * 1000,
  expect: {
    timeout: 10000,
  },

  // Output directory for test artifacts
  outputDir: 'test-results/performance/',
})
