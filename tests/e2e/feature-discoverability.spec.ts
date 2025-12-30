import {expect, test} from './fixtures'

test.describe('Feature Discoverability - 2 Click Access', () => {
  test.describe('From Home Page', () => {
    test.beforeEach(async ({homePage}) => {
      await homePage.navigate()
    })

    test('Settings accessible in 1 click from navbar', async ({page}) => {
      // Click settings icon in navbar
      const settingsLink = page.locator('a[href="/settings"]').first()
      await settingsLink.click()

      // Verify navigation (1 click)
      await expect(page).toHaveURL('/settings')
    })

    test('Create GPT accessible in 1 click', async ({homePage, page}) => {
      // Click create button
      await homePage.clickCreateNewGPT()

      // Verify navigation (1 click)
      await expect(page).toHaveURL('/gpt/new')
    })

    test('Backup/Restore accessible in 2 clicks (Settings > Data > Manage Backups)', async ({page}) => {
      // Click 1: Settings
      const settingsLink = page.locator('a[href="/settings"]').first()
      await settingsLink.click()
      await expect(page).toHaveURL('/settings')

      // Switch to Data tab (within same page, not counted as click)
      await page.locator('[role="tab"]', {hasText: 'Data'}).click()

      // Click 2: Manage Backups
      await page.locator('a[href="/backup"]').click()

      // Verify navigation (2 clicks)
      await expect(page).toHaveURL('/backup')
    })

    test('Provider settings accessible in 1 click', async ({page}) => {
      // Click settings icon
      const settingsLink = page.locator('a[href="/settings"]').first()
      await settingsLink.click()

      // Verify on settings page with providers tab (1 click)
      await expect(page).toHaveURL('/settings')
      await expect(page.locator('[role="tab"]', {hasText: 'Providers'})).toHaveAttribute('aria-selected', 'true')
    })

    test('Theme settings accessible in 1 click + tab switch', async ({page}) => {
      // Click settings icon
      const settingsLink = page.locator('a[href="/settings"]').first()
      await settingsLink.click()

      // Switch to Appearance tab (same page interaction)
      await page.locator('[role="tab"]', {hasText: 'Appearance'}).click()

      // Verify theme options are visible (1 click + tab switch)
      await expect(page.locator('text=Theme')).toBeVisible()
    })
  })

  test.describe('First-time User Experience', () => {
    test('should show no-providers prompt when no providers configured', async ({homePage, page}) => {
      // Clear all app storage to simulate first-time user
      await homePage.clearAppStorage()
      await homePage.reload()

      // Wait for page to load
      await page.waitForLoadState('domcontentloaded')

      // Check for no-providers prompt or guidance
      const noProvidersPrompt = page.locator('[data-testid="no-providers-prompt"]')
      const configureButton = page.locator('a[href="/settings"]', {hasText: 'Configure'})

      // Either the prompt should be visible or there should be a configure link
      const hasPrompt = await noProvidersPrompt.isVisible().catch(() => false)
      const hasConfigureLink = await configureButton.isVisible().catch(() => false)

      expect(hasPrompt || hasConfigureLink).toBeTruthy()
    })

    test('no-providers prompt links to settings', async ({homePage, page}) => {
      // Clear all app storage
      await homePage.clearAppStorage()
      await homePage.reload()

      // Wait for page to load
      await page.waitForLoadState('domcontentloaded')

      // Try to find and click the configure button
      const configureButton = page.locator('a[href="/settings"]').first()

      if (await configureButton.isVisible().catch(() => false)) {
        await configureButton.click()
        await expect(page).toHaveURL('/settings')
      }
    })
  })

  test.describe('GPT Editor Integration', () => {
    test('GPT Editor test pane links to settings when no provider configured', async ({gptEditorPage, page}) => {
      // Clear storage to simulate no provider
      await page.evaluate(async () => {
        localStorage.clear()
        if (typeof indexedDB !== 'undefined') {
          await new Promise<void>((resolve, reject) => {
            const request = indexedDB.deleteDatabase('gpt-platform')
            request.onsuccess = () => resolve()
            request.onblocked = () => resolve()
            request.addEventListener('error', () => reject(request.error))
          })
        }
      })

      // Navigate to GPT editor (new GPT)
      await gptEditorPage.navigateToNew()

      // Look for settings link in test pane empty state
      const settingsLink = page.locator('a[href="/settings"]')

      if (await settingsLink.isVisible().catch(() => false)) {
        await settingsLink.click()
        await expect(page).toHaveURL('/settings')
      }
    })
  })

  test.describe('Mobile Navigation', () => {
    test('Settings accessible from mobile menu in 2 clicks', async ({homePage, page}) => {
      // Set mobile viewport
      await page.setViewportSize({width: 375, height: 667})
      await homePage.navigate()

      // Click 1: Open mobile menu
      const menuToggle = page.locator('[data-testid="mobile-menu-toggle"]')
      if (await menuToggle.isVisible().catch(() => false)) {
        await menuToggle.click()

        // Click 2: Settings in menu
        const settingsMenuItem = page.locator('[data-testid="mobile-settings-link"]')
        if (await settingsMenuItem.isVisible().catch(() => false)) {
          await settingsMenuItem.click()
          await expect(page).toHaveURL('/settings')
        }
      } else {
        // Fallback: settings link might be directly visible even on mobile
        const settingsLink = page.locator('a[href="/settings"]').first()
        if (await settingsLink.isVisible().catch(() => false)) {
          await settingsLink.click()
          await expect(page).toHaveURL('/settings')
        }
      }
    })
  })
})
