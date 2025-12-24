import {expect, test} from './fixtures'

test.describe('Card Components Responsive Behavior', () => {
  const viewports = [
    {name: 'Mobile', width: 375, height: 667},
    {name: 'Tablet', width: 768, height: 1024},
    {name: 'Desktop', width: 1280, height: 800},
  ]

  test.beforeEach(async ({homePage}) => {
    await homePage.navigate()
    await homePage.waitForGPTCards()
  })

  for (const viewport of viewports) {
    test(`should display cards correctly on ${viewport.name}`, async ({homePage}) => {
      await homePage.setViewportSize({width: viewport.width, height: viewport.height})

      await expect(homePage.pageTitle).toBeVisible()
      await expect(homePage.gptLibrary).toBeVisible()
      await expect(homePage.createNewGPTButton).toBeVisible()

      const userCardCount = await homePage.getUserGPTCount()
      if (userCardCount > 0) {
        const firstCard = homePage.userGPTCards.first()
        await expect(firstCard).toBeVisible()

        const cardBox = await firstCard.boundingBox()
        if (cardBox) {
          expect(cardBox.width).toBeLessThanOrEqual(viewport.width)
        }
      }

      if (viewport.width <= 768) {
        const bodyWidth = await homePage.getPage().evaluate(() => document.body.scrollWidth)
        expect(bodyWidth).toBeLessThanOrEqual(viewport.width + 20)
      }
    })
  }

  test('should maintain grid layout across breakpoints', async ({homePage}) => {
    const gridTests = [
      {width: 375, minColumns: 1},
      {width: 768, minColumns: 2},
      {width: 1280, minColumns: 3},
    ]

    for (const {width, minColumns} of gridTests) {
      await homePage.setViewportSize({width, height: 900})

      const cardCount = await homePage.getUserGPTCount()
      if (cardCount >= minColumns) {
        const cards = homePage.userGPTCards
        const cardBoxes = []

        for (let i = 0; i < Math.min(minColumns, cardCount); i++) {
          const box = await cards.nth(i).boundingBox()
          if (box) cardBoxes.push(box)
        }

        if (cardBoxes.length >= minColumns && minColumns > 1) {
          const firstRowY = cardBoxes[0]?.y ?? 0
          cardBoxes.forEach(box => {
            expect(Math.abs(box.y - firstRowY)).toBeLessThan(150)
          })
        }
      }
    }
  })

  test('should maintain touch targets on mobile', async ({homePage}) => {
    await homePage.setViewportSize({width: 375, height: 667})

    const cardCount = await homePage.getUserGPTCount()
    if (cardCount > 0) {
      const firstCard = homePage.userGPTCards.first()
      const interactiveElements = await firstCard.locator('button, a, [role="button"]').all()

      for (const element of interactiveElements) {
        const box = await element.boundingBox()
        if (box) {
          expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(20)
        }
      }
    }
  })
})
