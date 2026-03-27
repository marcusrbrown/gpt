import process from 'node:process'
import {defineConfig, devices} from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: '**/tests/**/*.spec.ts',

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,

  // Global timeout to prevent suite from hanging indefinitely (30 min in CI)
  globalTimeout: process.env.CI ? 30 * 60 * 1000 : undefined,

  reporter: [
    ['html', {open: 'never'}],
    ['json', {outputFile: 'test-results/results.json'}],
    process.env.CI ? ['github'] : ['list'],
  ],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: true,
    locale: 'en-US',
    timezoneId: 'America/Phoenix',
    colorScheme: 'light',
    // Action and navigation timeouts to prevent slow operations from hanging tests
    actionTimeout: 10000,
    navigationTimeout: 20000,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: {width: 1280, height: 720},
      },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
    // Explicit timeout for dev server startup (2 minutes)
    timeout: 120 * 1000,
  },

  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',

  // Per-test timeout (45s in CI for slower environments, 30s locally)
  timeout: process.env.CI ? 45 * 1000 : 30 * 1000,
  expect: {
    // Assertion timeout (15s in CI, 10s locally)
    timeout: process.env.CI ? 15000 : 10000,
    toMatchSnapshot: {
      threshold: 0.2,
      maxDiffPixels: 1000,
    },
  },

  outputDir: 'test-results/',
})
