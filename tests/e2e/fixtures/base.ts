import {test as base, expect, type Page} from '@playwright/test'

// Import page object models
import {GPTEditorPage, GPTShowcasePage, GPTTestPage, HomePage, SettingsPage} from '../page-objects'

// Test fixtures interface
interface TestFixtures {
  homePage: HomePage
  gptEditorPage: GPTEditorPage
  gptShowcasePage: GPTShowcasePage
  gptTestPage: GPTTestPage
  settingsPage: SettingsPage
}

// Worker fixtures interface
interface WorkerFixtures {
  // Worker-scoped fixtures can be added here
}

/**
 * Extended test with custom fixtures
 * Provides page object models and common test utilities
 */
export const test = base.extend<TestFixtures, WorkerFixtures>({
  // Home page fixture
  homePage: async ({page}: {page: Page}, use: (r: HomePage) => Promise<void>) => {
    const homePage = new HomePage(page)
    await use(homePage)
  },

  // GPT Editor page fixture
  gptEditorPage: async ({page}: {page: Page}, use: (r: GPTEditorPage) => Promise<void>) => {
    const gptEditorPage = new GPTEditorPage(page)
    await use(gptEditorPage)
  },

  // GPT Showcase page fixture
  gptShowcasePage: async ({page}: {page: Page}, use: (r: GPTShowcasePage) => Promise<void>) => {
    const gptShowcasePage = new GPTShowcasePage(page)
    await use(gptShowcasePage)
  },

  // GPT Test page fixture
  gptTestPage: async ({page}: {page: Page}, use: (r: GPTTestPage) => Promise<void>) => {
    const gptTestPage = new GPTTestPage(page)
    await use(gptTestPage)
  },

  // Settings page fixture
  settingsPage: async ({page}: {page: Page}, use: (r: SettingsPage) => Promise<void>) => {
    const settingsPage = new SettingsPage(page)
    await use(settingsPage)
  },
})

// Re-export expect
export {expect}
