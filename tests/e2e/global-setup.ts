import type {FullConfig} from '@playwright/test'
import process from 'node:process'

/**
 * Global setup for Playwright tests
 * Runs once before all tests
 */
async function globalSetup(config: FullConfig) {
  // Log test configuration
  console.log('🚀 Starting Playwright tests...')
  console.log(`Base URL: ${config.projects[0]?.use?.baseURL}`)
  console.log(`Workers: ${config.workers}`)
  console.log(`Projects: ${config.projects.map(p => p.name).join(', ')}`)

  // Set up test environment
  process.env.NODE_ENV = 'test'

  // Additional setup can be added here:
  // - Database seeding
  // - Authentication setup
  // - Service mocking
}

export default globalSetup
