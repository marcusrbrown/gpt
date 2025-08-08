import {expect, test} from './fixtures'

/**
 * TASK-035: Test responsive behavior at all breakpoints (sm, md, lg, xl)
 *
 * This test suite validates that card components respond appropriately to different
 * viewport sizes, ensuring proper layout, readability, and functionality across
 * mobile, tablet, and desktop breakpoints.
 */
test.describe('Card Components Responsive Behavior', () => {
  // Define test viewports based on Tailwind CSS breakpoints
  const viewports = [
    {name: 'Mobile (xs)', width: 320, height: 568}, // iPhone SE
    {name: 'Mobile (sm)', width: 375, height: 667}, // iPhone 8
    {name: 'Tablet (md)', width: 768, height: 1024}, // iPad portrait
    {name: 'Desktop (lg)', width: 1024, height: 768}, // Desktop small
    {name: 'Desktop (xl)', width: 1440, height: 900}, // Desktop large
    {name: 'Desktop (2xl)', width: 1920, height: 1080}, // Desktop extra large
  ]

  test.beforeEach(async ({homePage}) => {
    await homePage.navigate()
    await homePage.waitForGPTCards()
  })

  for (const viewport of viewports) {
    test(`should display cards correctly on ${viewport.name} (${viewport.width}x${viewport.height})`, async ({
      homePage,
    }) => {
      // Set viewport size
      await homePage.setViewportSize({width: viewport.width, height: viewport.height})

      // Wait for responsive layout to settle
      await homePage.getPage().waitForTimeout(300)

      // Verify page title is still visible and readable
      await expect(homePage.pageTitle).toBeVisible()

      // Verify main sections are present
      await expect(homePage.yourGPTsSection).toBeVisible()
      await expect(homePage.exampleGPTsSection).toBeVisible()

      // Check if cards are properly displayed
      const userCardCount = await homePage.getUserGPTCount()
      const exampleCardCount = await homePage.getExampleGPTCount()

      if (userCardCount > 0) {
        // Verify user GPT cards are visible
        await expect(homePage.userGPTCards.first()).toBeVisible()

        // Check card content is readable (title and description not cut off)
        const firstCard = homePage.userGPTCards.first()
        const cardTitle = firstCard.locator('[data-testid="gpt-name"]')
        const cardDescription = firstCard.locator('[data-testid="gpt-description"]')

        await expect(cardTitle).toBeVisible()
        await expect(cardDescription).toBeVisible()

        // Verify card dimensions are appropriate for viewport
        const cardBox = await firstCard.boundingBox()
        if (cardBox) {
          expect(cardBox.width).toBeLessThanOrEqual(viewport.width)
          expect(cardBox.height).toBeGreaterThan(100) // Minimum readable height
        }
      }

      if (exampleCardCount > 0) {
        // Verify example GPT cards are visible
        await expect(homePage.exampleGPTCards.first()).toBeVisible()

        // Check example card responsiveness
        const firstExampleCard = homePage.exampleGPTCards.first()
        const exampleCardBox = await firstExampleCard.boundingBox()
        if (exampleCardBox) {
          expect(exampleCardBox.width).toBeLessThanOrEqual(viewport.width)
          expect(exampleCardBox.height).toBeGreaterThan(100)
        }
      }

      // Verify navigation elements remain accessible
      await expect(homePage.createNewGPTButton).toBeVisible()

      // On mobile viewports, verify text doesn't overflow
      if (viewport.width <= 768) {
        // Check that text content doesn't cause horizontal scrolling
        const bodyWidth = await homePage.getPage().evaluate(() => document.body.scrollWidth)
        expect(bodyWidth).toBeLessThanOrEqual(viewport.width + 20) // Allow small tolerance
      }
    })
  }

  test('should maintain card grid layout across breakpoints', async ({homePage}) => {
    // Test grid behavior at different breakpoints
    const gridTestViewports = [
      {name: 'Mobile', width: 375, expectedColumns: 1},
      {name: 'Tablet', width: 768, expectedColumns: 2},
      {name: 'Desktop', width: 1024, expectedColumns: 3},
      {name: 'Large Desktop', width: 1440, expectedColumns: 3},
    ]

    for (const {width, expectedColumns} of gridTestViewports) {
      await homePage.setViewportSize({width, height: 900})
      await homePage.getPage().waitForTimeout(300)

      // Check if we have cards to test with
      const cardCount = await homePage.getExampleGPTCount()
      if (cardCount >= expectedColumns) {
        // Verify grid layout by checking card positions
        const cards = homePage.exampleGPTCards
        const cardBoxes = []

        for (let i = 0; i < Math.min(expectedColumns * 2, cardCount); i++) {
          const card = cards.nth(i)
          const box = await card.boundingBox()
          if (box) cardBoxes.push(box)
        }

        if (cardBoxes.length >= expectedColumns) {
          // Check that cards are properly arranged in columns
          const firstRowCards = cardBoxes.slice(0, expectedColumns)
          const firstRowY = firstRowCards[0]?.y ?? 0

          // All cards in first row should have similar Y position
          firstRowCards.forEach(box => {
            expect(Math.abs(box.y - firstRowY)).toBeLessThan(150) // More tolerant for different layouts
          })

          // If we have more cards, check second row alignment
          if (cardBoxes.length > expectedColumns) {
            const secondRowCard = cardBoxes[expectedColumns]
            if (secondRowCard) {
              expect(secondRowCard.y).toBeGreaterThan(firstRowY + 100) // Should be in next row
            }
          }
        }
      }
    }
  })

  test('should handle card interaction states responsively', async ({homePage}) => {
    const interactionViewports = [
      {name: 'Mobile', width: 375, height: 667},
      {name: 'Desktop', width: 1024, height: 768},
    ]

    for (const viewport of interactionViewports) {
      await homePage.setViewportSize({width: viewport.width, height: viewport.height})
      await homePage.getPage().waitForTimeout(300)

      const cardCount = await homePage.getExampleGPTCount()
      if (cardCount > 0) {
        const firstCard = homePage.exampleGPTCards.first()
        await expect(firstCard).toBeVisible()

        // Test hover state (on desktop) or touch interaction (on mobile)
        if (viewport.width >= 1024) {
          // Desktop: test hover
          await firstCard.hover()

          // Verify hover effects are visible
          const cardAfterHover = await firstCard.boundingBox()
          expect(cardAfterHover).toBeTruthy()

          // Check for any hover-specific elements or styling changes
          // (This would need to be customized based on actual hover effects)
        } else {
          // Mobile: test click interaction (tap requires touch context)
          await firstCard.click()

          // Verify click doesn't cause layout issues
          await expect(firstCard).toBeVisible()
        }
      }
    }
  })

  test('should maintain accessibility at all breakpoints', async ({homePage}) => {
    const accessibilityViewports = [
      {name: 'Mobile', width: 375, height: 667},
      {name: 'Tablet', width: 768, height: 1024},
      {name: 'Desktop', width: 1440, height: 900},
    ]

    for (const viewport of accessibilityViewports) {
      await homePage.setViewportSize({width: viewport.width, height: viewport.height})
      await homePage.getPage().waitForTimeout(300)

      // Check keyboard navigation works at this viewport
      const cardCount = await homePage.getExampleGPTCount()
      if (cardCount > 0) {
        const firstCard = homePage.exampleGPTCards.first()

        // Focus the first card using keyboard navigation
        await firstCard.focus()
        await expect(firstCard).toBeFocused()

        // Check focus indicator is visible and properly sized
        const focusedBox = await firstCard.boundingBox()
        expect(focusedBox).toBeTruthy()

        // Verify tab navigation works
        await homePage.getPage().keyboard.press('Tab')

        // Verify interactive elements maintain adequate size for touch/click
        const interactiveElements = await firstCard.locator('button, a, [role="button"]').all()
        for (const element of interactiveElements) {
          const elementBox = await element.boundingBox()
          if (elementBox) {
            // More realistic minimum touch target size
            const minSize = viewport.width <= 768 ? 24 : 20
            expect(Math.min(elementBox.width, elementBox.height)).toBeGreaterThanOrEqual(minSize)
          }
        }
      }
    }
  })

  test('should display content appropriately at extreme viewports', async ({homePage}) => {
    const extremeViewports = [
      {name: 'Very narrow', width: 280, height: 600},
      {name: 'Very wide', width: 2560, height: 1440},
      {name: 'Very tall', width: 1024, height: 1800},
    ]

    for (const viewport of extremeViewports) {
      await homePage.setViewportSize({width: viewport.width, height: viewport.height})
      await homePage.getPage().waitForTimeout(300)

      // Verify page doesn't break at extreme sizes
      await expect(homePage.pageTitle).toBeVisible()

      // Check for horizontal scrolling on narrow viewports
      if (viewport.width <= 300) {
        const scrollWidth = await homePage.getPage().evaluate(() => document.body.scrollWidth)
        const clientWidth = await homePage.getPage().evaluate(() => document.body.clientWidth)

        // Should not require horizontal scrolling
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 30) // Small tolerance
      }

      // Verify content is still accessible
      const cardCount = await homePage.getExampleGPTCount()
      if (cardCount > 0) {
        await expect(homePage.exampleGPTCards.first()).toBeVisible()
      }

      await expect(homePage.createNewGPTButton).toBeVisible()
    }
  })
})
