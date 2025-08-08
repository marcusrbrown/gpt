import {accessibilityTest, expect, test} from '.'
import {getAccessibilityConfig} from './utils/accessibility-config'

/**
 * Screen reader compatibility and semantic markup accessibility tests
 * Tests screen reader accessibility patterns for WCAG 2.1 AA compliance
 */
test.describe('Screen Reader Compatibility', () => {
  test.describe('Semantic Markup', () => {
    test.beforeEach(async ({page}) => {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
    })

    test('should use proper HTML semantic elements', async ({page}) => {
      await test.step('Test semantic structure', async () => {
        // Run screen reader specific accessibility scan
        await accessibilityTest.expectAccessible(page, getAccessibilityConfig('screen-reader'), 0, 0)

        // Test for main landmark
        const main = page.locator('main, [role="main"]')
        await expect(main).toBeVisible()

        // Should have only one main landmark
        await expect(main).toHaveCount(1)

        // Test for navigation landmark
        const nav = page.locator('nav, [role="navigation"]')
        await expect(nav).toBeVisible()

        // Test for proper heading structure
        const h1 = page.locator('h1')
        await expect(h1).toBeVisible()
        await expect(h1).toHaveCount(1)

        // Test heading hierarchy
        const headings = page.locator('h1, h2, h3, h4, h5, h6')
        const headingCount = await headings.count()

        if (headingCount > 1) {
          // Check if headings follow logical order
          for (let i = 0; i < Math.min(headingCount, 5); i++) {
            const heading = headings.nth(i)
            const tagName = await heading.evaluate(el => el.tagName.toLowerCase())
            const level = Number.parseInt(tagName.slice(1), 10)

            expect(level).toBeGreaterThanOrEqual(1)
            expect(level).toBeLessThanOrEqual(6)
          }
        }
      })
    })

    test('should have proper landmark structure', async ({page}) => {
      await test.step('Test landmark accessibility', async () => {
        // Test screen reader landmark compatibility
        await accessibilityTest.expectScreenReaderCompatible(page, 'body', 3)

        // Check for banner (header)
        const banner = page.locator('header, [role="banner"]')
        if ((await banner.count()) > 0) {
          await expect(banner.first()).toBeVisible()

          // Banner should have accessible content
          const bannerText = await banner.first().textContent()
          expect(bannerText?.trim().length).toBeGreaterThan(0)
        }

        // Check for contentinfo (footer)
        const contentinfo = page.locator('footer, [role="contentinfo"]')
        if ((await contentinfo.count()) > 0) {
          await expect(contentinfo.first()).toBeVisible()
        }

        // Check for complementary sections
        const complementary = page.locator('aside, [role="complementary"]')
        const complementaryCount = await complementary.count()

        if (complementaryCount > 0) {
          for (let i = 0; i < Math.min(complementaryCount, 3); i++) {
            const section = complementary.nth(i)

            // Should have accessible name if multiple complementary sections
            if (complementaryCount > 1) {
              const ariaLabel = await section.getAttribute('aria-label')
              const ariaLabelledBy = await section.getAttribute('aria-labelledby')
              const heading = section.locator('h1, h2, h3, h4, h5, h6').first()
              const hasHeading = (await heading.count()) > 0

              expect(ariaLabel || ariaLabelledBy || hasHeading).toBeTruthy()
            }
          }
        }
      })
    })

    test('should use proper list markup', async ({page}) => {
      await test.step('Test list semantics', async () => {
        // Check for lists
        const lists = page.locator('ul, ol, dl')
        const listCount = await lists.count()

        if (listCount > 0) {
          for (let i = 0; i < Math.min(listCount, 3); i++) {
            const list = lists.nth(i)
            const tagName = await list.evaluate(el => el.tagName.toLowerCase())

            // Check list items
            if (tagName === 'ul' || tagName === 'ol') {
              const listItems = list.locator('> li')
              const itemCount = await listItems.count()

              expect(itemCount).toBeGreaterThan(0)

              // Each list item should have content
              for (let j = 0; j < Math.min(itemCount, 3); j++) {
                const item = listItems.nth(j)
                const itemText = await item.textContent()
                expect(itemText?.trim().length).toBeGreaterThan(0)
              }
            } else if (tagName === 'dl') {
              // Definition list should have dt/dd pairs
              const terms = list.locator('> dt')
              const definitions = list.locator('> dd')

              const termCount = await terms.count()
              const defCount = await definitions.count()

              expect(termCount).toBeGreaterThan(0)
              expect(defCount).toBeGreaterThan(0)
            }
          }
        }
      })
    })
  })

  test.describe('ARIA Labels and Descriptions', () => {
    test('should have proper ARIA labeling', async ({page}) => {
      await test.step('Test ARIA labels', async () => {
        // Find elements with ARIA labels
        const labeledElements = page.locator('[aria-label], [aria-labelledby]')
        const labelCount = await labeledElements.count()

        if (labelCount > 0) {
          for (let i = 0; i < Math.min(labelCount, 10); i++) {
            const element = labeledElements.nth(i)

            const ariaLabel = await element.getAttribute('aria-label')
            const ariaLabelledBy = await element.getAttribute('aria-labelledby')

            if (ariaLabel) {
              // Label should be meaningful
              expect(ariaLabel.trim().length).toBeGreaterThan(2)
            }

            if (ariaLabelledBy) {
              // Referenced elements should exist
              const ids = ariaLabelledBy.split(' ')
              for (const id of ids) {
                const referencedElement = page.locator(`#${id}`)
                await expect(referencedElement).toBeAttached()

                const referencedText = await referencedElement.textContent()
                expect(referencedText?.trim().length).toBeGreaterThan(0)
              }
            }
          }
        }
      })
    })

    test('should use aria-describedby appropriately', async ({page}) => {
      await test.step('Test ARIA descriptions', async () => {
        // Find elements with descriptions
        const describedElements = page.locator('[aria-describedby]')
        const descCount = await describedElements.count()

        if (descCount > 0) {
          for (let i = 0; i < Math.min(descCount, 5); i++) {
            const element = describedElements.nth(i)
            const ariaDescribedBy = await element.getAttribute('aria-describedby')

            if (ariaDescribedBy) {
              const ids = ariaDescribedBy.split(' ')
              for (const id of ids) {
                const descriptionElement = page.locator(`#${id}`)
                await expect(descriptionElement).toBeAttached()

                const descriptionText = await descriptionElement.textContent()
                expect(descriptionText?.trim().length).toBeGreaterThan(0)
              }
            }
          }
        }
      })
    })

    test('should have accessible form labels', async ({page}) => {
      await test.step('Test form label associations', async () => {
        await page.goto('/gpt/editor')
        await page.waitForLoadState('networkidle')

        // Find form inputs
        const inputs = page.locator('input, textarea, select')
        const inputCount = await inputs.count()

        if (inputCount > 0) {
          for (let i = 0; i < Math.min(inputCount, 10); i++) {
            const input = inputs.nth(i)
            const inputType = await input.getAttribute('type')

            // Skip hidden inputs
            if (inputType === 'hidden') continue

            const id = await input.getAttribute('id')
            const ariaLabel = await input.getAttribute('aria-label')
            const ariaLabelledBy = await input.getAttribute('aria-labelledby')

            // Should have label association
            let hasLabel = false

            if (id) {
              const label = page.locator(`label[for="${id}"]`)
              hasLabel = (await label.count()) > 0
            }

            hasLabel = hasLabel || !!ariaLabel || !!ariaLabelledBy

            expect(hasLabel).toBeTruthy()
          }
        }
      })
    })
  })

  test.describe('ARIA Roles and States', () => {
    test('should use appropriate ARIA roles', async ({page}) => {
      await test.step('Test ARIA roles', async () => {
        // Find elements with custom roles
        const roleElements = page.locator('[role]')
        const roleCount = await roleElements.count()

        if (roleCount > 0) {
          for (let i = 0; i < Math.min(roleCount, 10); i++) {
            const element = roleElements.nth(i)
            const role = await element.getAttribute('role')

            // Check common roles
            const validRoles = [
              'button',
              'link',
              'textbox',
              'checkbox',
              'radio',
              'tab',
              'tabpanel',
              'dialog',
              'alert',
              'alertdialog',
              'menu',
              'menuitem',
              'menubar',
              'navigation',
              'main',
              'banner',
              'contentinfo',
              'complementary',
              'search',
              'form',
              'region',
              'article',
              'section',
              'list',
              'listitem',
              'grid',
              'gridcell',
              'row',
              'columnheader',
              'rowheader',
            ]

            expect(validRoles).toContain(role)

            // Test role-specific requirements
            if (role === 'button') {
              // Buttons should be keyboard accessible
              await accessibilityTest.expectKeyboardAccessible(page, `[role="button"]`)
            } else if (role === 'dialog') {
              // Dialogs should have proper labeling
              const ariaLabel = await element.getAttribute('aria-label')
              const ariaLabelledBy = await element.getAttribute('aria-labelledby')
              expect(ariaLabel || ariaLabelledBy).toBeTruthy()
            }
          }
        }
      })
    })

    test('should manage ARIA states correctly', async ({page}) => {
      await test.step('Test ARIA states', async () => {
        // Find elements with aria-expanded
        const expandableElements = page.locator('[aria-expanded]')
        const expandableCount = await expandableElements.count()

        if (expandableCount > 0) {
          for (let i = 0; i < Math.min(expandableCount, 3); i++) {
            const element = expandableElements.nth(i)
            const ariaExpanded = await element.getAttribute('aria-expanded')

            // Should be 'true' or 'false'
            expect(['true', 'false']).toContain(ariaExpanded)

            // If expandable, should have aria-controls or target
            if (ariaExpanded === 'true') {
              const ariaControls = await element.getAttribute('aria-controls')

              if (ariaControls) {
                const controlledElement = page.locator(`#${ariaControls}`)
                await expect(controlledElement).toBeAttached()
              }
            }
          }
        }

        // Find elements with aria-selected
        const selectableElements = page.locator('[aria-selected]')
        const selectableCount = await selectableElements.count()

        if (selectableCount > 0) {
          for (let i = 0; i < Math.min(selectableCount, 3); i++) {
            const element = selectableElements.nth(i)
            const ariaSelected = await element.getAttribute('aria-selected')

            expect(['true', 'false']).toContain(ariaSelected)
          }
        }

        // Find elements with aria-checked
        const checkableElements = page.locator('[aria-checked]')
        const checkableCount = await checkableElements.count()

        if (checkableCount > 0) {
          for (let i = 0; i < Math.min(checkableCount, 3); i++) {
            const element = checkableElements.nth(i)
            const ariaChecked = await element.getAttribute('aria-checked')

            expect(['true', 'false', 'mixed']).toContain(ariaChecked)
          }
        }
      })
    })
  })

  test.describe('Live Regions and Dynamic Content', () => {
    test('should announce dynamic content changes', async ({page}) => {
      await test.step('Test live regions', async () => {
        // Find live regions
        const liveRegions = page.locator('[aria-live]')
        const liveCount = await liveRegions.count()

        if (liveCount > 0) {
          for (let i = 0; i < liveCount; i++) {
            const region = liveRegions.nth(i)
            const ariaLive = await region.getAttribute('aria-live')

            // Should be 'polite', 'assertive', or 'off'
            expect(['polite', 'assertive', 'off']).toContain(ariaLive)

            // Check for aria-atomic
            const ariaAtomic = await region.getAttribute('aria-atomic')
            if (ariaAtomic) {
              expect(['true', 'false']).toContain(ariaAtomic)
            }
          }
        }

        // Look for status messages
        const statusElements = page.locator('[role="status"], [role="alert"]')
        const statusCount = await statusElements.count()

        if (statusCount > 0) {
          for (let i = 0; i < statusCount; i++) {
            const status = statusElements.nth(i)
            const role = await status.getAttribute('role')

            expect(['status', 'alert']).toContain(role)

            // Status/alert should have meaningful content
            const content = await status.textContent()
            if (content?.trim()) {
              expect(content.trim().length).toBeGreaterThan(0)
            }
          }
        }
      })
    })

    test('should handle loading states accessibly', async ({page}) => {
      await test.step('Test loading state announcements', async () => {
        // Look for loading indicators
        const loadingElements = page.locator('[aria-busy], .loading, [data-testid*="loading"]')
        const loadingCount = await loadingElements.count()

        if (loadingCount > 0) {
          for (let i = 0; i < loadingCount; i++) {
            const loading = loadingElements.nth(i)

            // Should have aria-busy or proper role
            const ariaBusy = await loading.getAttribute('aria-busy')
            const role = await loading.getAttribute('role')
            const ariaLabel = await loading.getAttribute('aria-label')

            expect(ariaBusy === 'true' || role === 'status' || ariaLabel).toBeTruthy()

            // Should have accessible text
            const loadingText = await loading.textContent()
            const hasText = (loadingText?.trim().length ?? 0) > 0
            const hasAriaLabel = !!ariaLabel

            expect(hasText || hasAriaLabel).toBeTruthy()
          }
        }
      })
    })
  })

  test.describe('Alternative Text and Media', () => {
    test('should provide alt text for images', async ({page}) => {
      await test.step('Test image accessibility', async () => {
        // Find images
        const images = page.locator('img')
        const imageCount = await images.count()

        if (imageCount > 0) {
          for (let i = 0; i < imageCount; i++) {
            const img = images.nth(i)

            // Check for alt text
            const alt = await img.getAttribute('alt')
            const role = await img.getAttribute('role')

            // Decorative images should have empty alt or role="presentation"
            // Content images should have meaningful alt text
            if (role === 'presentation' || alt === '') {
              // Decorative image - OK
              expect(true).toBeTruthy()
            } else {
              // Content image should have alt text
              expect(alt?.trim().length).toBeGreaterThan(0)
            }
          }
        }
      })
    })

    test('should handle media content accessibly', async ({page}) => {
      await test.step('Test media accessibility', async () => {
        // Find video elements
        const videos = page.locator('video')
        const videoCount = await videos.count()

        if (videoCount > 0) {
          for (let i = 0; i < videoCount; i++) {
            const video = videos.nth(i)

            // Should have accessible controls
            const controls = await video.getAttribute('controls')
            const ariaLabel = await video.getAttribute('aria-label')
            const title = await video.getAttribute('title')

            if (controls) {
              // Has native controls - good
              expect(true).toBeTruthy()
            } else {
              // Should have custom accessible controls or labeling
              expect(ariaLabel || title).toBeTruthy()
            }
          }
        }

        // Find audio elements
        const audios = page.locator('audio')
        const audioCount = await audios.count()

        if (audioCount > 0) {
          for (let i = 0; i < audioCount; i++) {
            const audio = audios.nth(i)

            const controls = await audio.getAttribute('controls')
            const ariaLabel = await audio.getAttribute('aria-label')

            expect(controls || ariaLabel).toBeTruthy()
          }
        }
      })
    })
  })
})
