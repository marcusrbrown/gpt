/**
 * Global teardown for Playwright tests
 * Runs once after all tests
 */
async function globalTeardown() {
  console.log('✅ Playwright tests completed')

  // Cleanup tasks can be added here:
  // - Database cleanup
  // - Service cleanup
  // - File cleanup
}

export default globalTeardown
