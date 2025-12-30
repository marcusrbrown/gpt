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

      // Click 2: Manage Backups button in the Data tab panel
      await page.getByRole('button', {name: 'Manage Backups'}).click()

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
    // Note: These tests require special browser context setup to clear storage
    // Skipping due to SecurityError when accessing localStorage from about:blank
    test.skip('should show no-providers prompt when no providers configured', async ({homePage, page}) => {
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

    test.skip('no-providers prompt links to settings', async ({homePage, page}) => {
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
    // Note: Test requires special browser context setup to clear storage
    // Skipping due to SecurityError when accessing localStorage from about:blank
    test.skip('GPT Editor test pane links to settings when no provider configured', async ({gptEditorPage, page}) => {
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
    test.beforeEach(async ({page}) => {
      // Set mobile viewport
      await page.setViewportSize({width: 375, height: 667})
    })

    test('Settings quick-access in mobile menu header (1 tap from menu)', async ({homePage, page}) => {
      await homePage.navigate()

      // Open mobile menu
      const menuToggle = page.locator('button[aria-label="Open menu"]')
      await expect(menuToggle).toBeVisible()
      await menuToggle.click()

      // Verify mobile menu is open with header
      const menuHeader = page.locator('h2', {hasText: 'Menu'})
      await expect(menuHeader).toBeVisible()

      // Verify Settings quick-access button in header (not in list)
      const settingsQuickAccess = page.locator(
        'button[aria-label="Settings (Quick Access)"], a[aria-label="Settings (Quick Access)"]',
      )
      await expect(settingsQuickAccess).toBeVisible()

      // Verify touch target size meets WCAG 2.1 AA (44x44px minimum)
      const box = await settingsQuickAccess.boundingBox()
      expect(box).toBeTruthy()
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(44)
        expect(box.height).toBeGreaterThanOrEqual(44)
      }

      // Click Settings quick-access
      await settingsQuickAccess.click()

      // Verify navigation to settings (1 tap from menu open)
      await expect(page).toHaveURL('/settings')
    })

    test('Settings not duplicated in mobile menu list', async ({homePage, page}) => {
      await homePage.navigate()

      // Open mobile menu
      const menuToggle = page.locator('button[aria-label="Open menu"]')
      await menuToggle.click()

      // Get navigation list items (excluding the header)
      const navItems = page.locator('nav[aria-label="Mobile navigation"] a, nav[aria-label="Mobile navigation"] button')
      const navTexts = await navItems.allTextContents()

      // Settings should NOT appear in the navigation list (it's in the header)
      const settingsInList = navTexts.filter(text => text.toLowerCase().includes('settings'))
      expect(settingsInList.length).toBe(0)
    })

    test('Mobile menu closes after Settings navigation', async ({homePage, page}) => {
      await homePage.navigate()

      // Open mobile menu
      const menuToggle = page.locator('button[aria-label="Open menu"]')
      await menuToggle.click()

      // Click Settings quick-access
      const settingsQuickAccess = page.locator(
        'button[aria-label="Settings (Quick Access)"], a[aria-label="Settings (Quick Access)"]',
      )
      await settingsQuickAccess.click()

      // Verify we're on settings and menu is closed
      await expect(page).toHaveURL('/settings')
      const menuDialog = page.locator('[role="dialog"][aria-label="Mobile navigation menu"]')
      await expect(menuDialog).not.toBeVisible()
    })
  })
})
