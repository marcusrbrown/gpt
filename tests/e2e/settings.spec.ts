import {expect, test} from './fixtures'

test.describe('Settings Page', () => {
  test.beforeEach(async ({settingsPage}) => {
    await settingsPage.navigate()
  })

  test('should load settings page correctly', async ({settingsPage}) => {
    // Verify page is loaded
    await expect(settingsPage.pageTitle).toBeVisible()

    // Verify tabs are present
    await expect(settingsPage.tabsContainer).toBeVisible()
    await expect(settingsPage.providersTab).toBeVisible()
    await expect(settingsPage.integrationsTab).toBeVisible()
    await expect(settingsPage.appearanceTab).toBeVisible()
    await expect(settingsPage.dataTab).toBeVisible()
  })

  test('should navigate to settings from navbar (1 click)', async ({homePage, page}) => {
    await homePage.navigate()

    // Click settings icon in navbar
    const settingsLink = page.locator('a[href="/settings"]').first()
    await settingsLink.click()

    // Verify navigation to settings page
    await expect(page).toHaveURL('/settings')
    await expect(page.locator('h1', {hasText: 'Settings'})).toBeVisible()
  })

  test('should switch between tabs', async ({settingsPage}) => {
    // Default should be providers tab
    await expect(settingsPage.providersTab).toHaveAttribute('aria-selected', 'true')

    // Switch to Appearance tab
    await settingsPage.switchToAppearanceTab()
    await expect(settingsPage.appearanceTab).toHaveAttribute('aria-selected', 'true')

    // Switch to Data tab
    await settingsPage.switchToDataTab()
    await expect(settingsPage.dataTab).toHaveAttribute('aria-selected', 'true')

    // Switch to Integrations tab
    await settingsPage.switchToIntegrationsTab()
    await expect(settingsPage.integrationsTab).toHaveAttribute('aria-selected', 'true')

    // Switch back to Providers tab
    await settingsPage.switchToProvidersTab()
    await expect(settingsPage.providersTab).toHaveAttribute('aria-selected', 'true')
  })

  test('should navigate tabs with keyboard', async ({settingsPage, page}) => {
    // Focus on tabs
    await settingsPage.providersTab.focus()

    // Press right arrow to move to next tab
    await page.keyboard.press('ArrowRight')
    await expect(settingsPage.integrationsTab).toBeFocused()

    // Press right arrow again
    await page.keyboard.press('ArrowRight')
    await expect(settingsPage.appearanceTab).toBeFocused()

    // Press Enter to select
    await page.keyboard.press('Enter')
    await expect(settingsPage.appearanceTab).toHaveAttribute('aria-selected', 'true')
  })

  test('should display providers tab content', async ({settingsPage, page}) => {
    await settingsPage.switchToProvidersTab()

    // Verify provider settings are displayed
    const providerContent = page.locator('[role="tabpanel"]')
    await expect(providerContent).toBeVisible()

    // Verify provider sections exist - use heading for specificity
    await expect(page.getByRole('heading', {name: 'AI Provider Configuration'})).toBeVisible()
  })

  test('should display appearance tab content', async ({settingsPage, page}) => {
    await settingsPage.switchToAppearanceTab()

    // Verify appearance settings are displayed
    await expect(page.locator('text=Theme')).toBeVisible()
    await expect(page.locator('text=Reduce Motion')).toBeVisible()
  })

  test('should display data tab content', async ({settingsPage, page}) => {
    await settingsPage.switchToDataTab()

    // Verify data settings are displayed
    await expect(page.locator('text=Storage Usage')).toBeVisible()
    await expect(page.locator('text=Manage Backups')).toBeVisible()
  })

  test('should be responsive on mobile viewport', async ({settingsPage, page}) => {
    // Set mobile viewport
    await page.setViewportSize({width: 375, height: 667})

    // Reload to apply responsive styles
    await settingsPage.navigate()

    // Verify page elements are still visible
    await expect(settingsPage.pageTitle).toBeVisible()
    await expect(settingsPage.tabsContainer).toBeVisible()
  })

  // Note: URL tab persistence is not implemented yet - tracked as future enhancement
  test.skip('should persist tab selection in URL', async ({settingsPage, page}) => {
    // Navigate to appearance tab
    await settingsPage.switchToAppearanceTab()

    // Verify URL contains tab parameter
    await expect(page).toHaveURL(/tab=appearance/)

    // Reload page
    await page.reload()

    // Verify appearance tab is still selected
    await expect(settingsPage.appearanceTab).toHaveAttribute('aria-selected', 'true')
  })
})

test.describe('Settings Page - Theme', () => {
  test('should switch to dark theme', async ({settingsPage, page}) => {
    await settingsPage.navigate()
    await settingsPage.switchToAppearanceTab()

    // Open theme dropdown and select dark
    await page.getByRole('button', {name: 'Theme selection'}).click()
    await page.getByRole('option', {name: 'Dark'}).click()

    // Verify theme is applied
    const htmlElement = page.locator('html')
    await expect(htmlElement).toHaveClass(/dark/)
  })

  test('should switch to light theme', async ({settingsPage, page}) => {
    await settingsPage.navigate()
    await settingsPage.switchToAppearanceTab()

    // Open theme dropdown and select light
    await page.getByRole('button', {name: 'Theme selection'}).click()
    await page.getByRole('option', {name: 'Light'}).click()

    // Verify theme is applied
    const htmlElement = page.locator('html')
    await expect(htmlElement).toHaveClass(/light/)
  })
})

test.describe('Settings Page - Data Management', () => {
  test('should navigate to backup page from data tab', async ({settingsPage, page}) => {
    await settingsPage.navigate()
    await settingsPage.switchToDataTab()

    // Click manage backups button within the data tab panel
    await page.getByRole('button', {name: 'Manage Backups'}).click()

    // Verify navigation to backup page
    await expect(page).toHaveURL('/backup')
  })
})

test.describe('Settings Page - Mobile Swipe Navigation', () => {
  test.beforeEach(async ({page}) => {
    // Set mobile viewport for touch testing
    await page.setViewportSize({width: 375, height: 667})
  })

  test('should have swipeable container with correct data attribute', async ({settingsPage, page}) => {
    await settingsPage.navigate()

    // Verify swipeable container exists
    const swipeableContainer = page.locator('[data-swipeable="true"]')
    await expect(swipeableContainer).toBeVisible()

    // Verify it contains the tabs
    const tabs = swipeableContainer.locator('[role="tablist"]')
    await expect(tabs).toBeVisible()
  })

  test('should show mobile swipe hint on small screens', async ({settingsPage, page}) => {
    await settingsPage.navigate()

    // Verify swipe hint is visible on mobile
    const swipeHint = page.locator('text=Swipe left or right to navigate tabs')
    await expect(swipeHint).toBeVisible()
  })

  test('should hide swipe hint on larger screens', async ({settingsPage, page}) => {
    // Set larger viewport
    await page.setViewportSize({width: 1024, height: 768})
    await settingsPage.navigate()

    // Swipe hint should be hidden on larger screens
    const swipeHint = page.locator('text=Swipe left or right to navigate tabs')
    await expect(swipeHint).not.toBeVisible()
  })

  test('keyboard navigation still works with swipe enabled', async ({settingsPage, page}) => {
    await settingsPage.navigate()

    // Focus on tabs
    await settingsPage.providersTab.focus()
    await expect(settingsPage.providersTab).toBeFocused()

    // Press right arrow to move to next tab
    await page.keyboard.press('ArrowRight')
    await expect(settingsPage.integrationsTab).toBeFocused()

    // Press Enter to select
    await page.keyboard.press('Enter')
    await expect(settingsPage.integrationsTab).toHaveAttribute('aria-selected', 'true')
  })

  test('touch-pan-y class allows vertical scrolling', async ({settingsPage, page}) => {
    await settingsPage.navigate()

    // Verify swipeable container has touch-pan-y class for vertical scroll
    const swipeableContainer = page.locator('[data-swipeable="true"]')
    await expect(swipeableContainer).toHaveClass(/touch-pan-y/)
  })
})
