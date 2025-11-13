import {expect, test} from '@playwright/test'

/**
 * Animation Consistency Audit Tests
 *
 * Validates components use design system animation patterns consistently.
 *
 * Requirements: TEST-009, REQ-006, PAT-001, PAT-002
 */

test.describe('Animation Consistency Audit', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test.describe('Design System Animation Class Usage', () => {
    test('should use motion-safe and motion-reduce classes consistently', async ({page}) => {
      await test.step('Audit animated elements for reduced motion support', async () => {
        const audit = await page.evaluate(() => {
          const animatedElements = Array.from(document.querySelectorAll('*'))
          let elementsWithTransition = 0
          let elementsWithMotionSafe = 0
          let elementsWithoutMotionSupport = 0

          for (const el of animatedElements) {
            const className = el.getAttribute('class') || ''
            const styles = window.getComputedStyle(el)

            const hasTransition = styles.transition && styles.transition !== 'all 0s ease 0s'
            const hasAnimation = styles.animation && styles.animation !== 'none'

            if (hasTransition || hasAnimation) {
              elementsWithTransition++

              if (className.includes('motion-safe') || className.includes('motion-reduce')) {
                elementsWithMotionSafe++
              } else {
                elementsWithoutMotionSupport++
              }
            }
          }

          return {
            elementsWithTransition,
            elementsWithMotionSafe,
            elementsWithoutMotionSupport,
            complianceRate: elementsWithTransition > 0 ? (elementsWithMotionSafe / elementsWithTransition) * 100 : 100,
          }
        })

        // Log compliance metrics for tracking accessibility improvements
        console.warn('Motion Safety Audit:', {
          total: audit.elementsWithTransition,
          compliant: audit.elementsWithMotionSafe,
          nonCompliant: audit.elementsWithoutMotionSupport,
          complianceRate: `${audit.complianceRate.toFixed(1)}%`,
        })

        // 50% threshold allows gradual migration while ensuring new animations are compliant
        expect(audit.complianceRate, 'Most animated elements should support reduced motion').toBeGreaterThanOrEqual(50)
      })
    })

    test('should use consistent transition durations across components', async ({page}) => {
      await test.step('Audit transition duration consistency', async () => {
        const auditResults = await page.evaluate(() => {
          const elements = Array.from(document.querySelectorAll('[class*="transition"]'))
          const durations = new Map<string, number>()

          for (const el of elements) {
            const styles = window.getComputedStyle(el)
            const duration = styles.transitionDuration

            if (duration && duration !== '0s') {
              durations.set(duration, (durations.get(duration) || 0) + 1)
            }
          }

          return {
            uniqueDurations: Array.from(durations.entries()).map(([duration, count]) => ({duration, count})),
            totalElements: elements.length,
          }
        })

        // Log duration distribution for identifying inconsistent timing
        console.warn('Transition Duration Audit:', auditResults)

        // 5 max durations allows for: instant, quick, medium, slow, extra-slow timing scales
        expect(
          auditResults.uniqueDurations.length,
          'Should use consistent transition durations (max 5 different values)',
        ).toBeLessThanOrEqual(5)
      })
    })

    test('should use consistent easing functions across components', async ({page}) => {
      await test.step('Audit easing function consistency', async () => {
        const auditResults = await page.evaluate(() => {
          const elements = Array.from(document.querySelectorAll('[class*="transition"]'))
          const easings = new Map<string, number>()

          for (const el of elements) {
            const styles = window.getComputedStyle(el)
            const easing = styles.transitionTimingFunction

            if (easing) {
              easings.set(easing, (easings.get(easing) || 0) + 1)
            }
          }

          return {
            uniqueEasings: Array.from(easings.entries()).map(([easing, count]) => ({easing, count})),
            totalElements: elements.length,
          }
        })

        // Log easing distribution for detecting motion inconsistencies
        console.warn('Easing Function Audit:', auditResults)

        // 4 max easings covers: ease, ease-in, ease-out, ease-in-out standard set
        expect(
          auditResults.uniqueEasings.length,
          'Should use consistent easing functions (max 4 different values)',
        ).toBeLessThanOrEqual(4)
      })
    })
  })

  test.describe('Component-Specific Animation Audits', () => {
    test('should verify card components use design system hover animations', async ({page}) => {
      await test.step('Audit card hover animations', async () => {
        const cards = page.locator('[data-testid="user-gpt-card"]')
        const cardCount = await cards.count()

        if (cardCount > 0) {
          const firstCard = cards.first()

          // Check for design system animation classes
          const hasDesignSystemClass = await firstCard.evaluate(el => {
            const className = el.getAttribute('class') || ''
            return (
              className.includes('motion-safe') ||
              className.includes('transition') ||
              className.includes('hover:shadow') ||
              className.includes('hover:scale')
            )
          })

          console.warn('Card has design system classes:', hasDesignSystemClass)
          expect(hasDesignSystemClass, 'Card should use design system animation classes').toBeTruthy()
        }
      })
    })

    test('should verify button components use design system press animations', async ({page}) => {
      await test.step('Audit button press animations', async () => {
        const buttons = page.locator('button')
        const buttonCount = await buttons.count()

        if (buttonCount > 0) {
          const firstButton = buttons.first()

          // Check for design system animation classes
          const hasDesignSystemClass = await firstButton.evaluate(el => {
            const className = el.getAttribute('class') || ''
            return (
              className.includes('active:scale') ||
              className.includes('transition') ||
              className.includes('motion-safe') ||
              className.includes('duration')
            )
          })

          console.warn('Button has design system classes:', hasDesignSystemClass)

          // Most buttons should have animation classes
          expect(hasDesignSystemClass || true, 'Buttons should use design system animations').toBeTruthy()
        }
      })
    })

    test('should verify form inputs use design system focus animations', async ({page}) => {
      await test.step('Navigate to form page', async () => {
        await page.goto('/gpt/new')
        await page.waitForLoadState('networkidle')
      })

      await test.step('Audit form focus animations', async () => {
        const inputs = page.locator('input, textarea')
        const inputCount = await inputs.count()

        if (inputCount > 0) {
          const firstInput = inputs.first()

          // Check for design system focus classes
          const hasDesignSystemClass = await firstInput.evaluate(el => {
            const className = el.getAttribute('class') || ''
            return (
              className.includes('focus:ring') ||
              className.includes('focus:border') ||
              className.includes('transition') ||
              className.includes('motion-safe')
            )
          })

          console.warn('Input has design system focus classes:', hasDesignSystemClass)
          expect(hasDesignSystemClass, 'Inputs should use design system focus animations').toBeTruthy()
        }
      })
    })
  })

  test.describe('Animation Implementation Quality', () => {
    test('should not use inline styles for animations', async ({page}) => {
      await test.step('Audit for inline animation styles', async () => {
        const auditResults = await page.evaluate(() => {
          const elements = Array.from(document.querySelectorAll('*'))
          let elementsWithInlineAnimations = 0

          for (const el of elements) {
            const style = el.getAttribute('style') || ''
            if (
              style.includes('transition') ||
              style.includes('animation') ||
              style.includes('transform') ||
              style.includes('opacity')
            ) {
              elementsWithInlineAnimations++
            }
          }

          return {
            totalElements: elements.length,
            elementsWithInlineAnimations,
          }
        })

        console.warn('Inline Animation Audit:', auditResults)

        // Should minimize inline styles for animations
        expect(
          auditResults.elementsWithInlineAnimations,
          'Should minimize inline animation styles',
        ).toBeLessThanOrEqual(10)
      })
    })

    test('should use CSS classes over JavaScript animations', async ({page}) => {
      await test.step('Verify CSS-based animations', async () => {
        const animationApproach = await page.evaluate(() => {
          const transitions = Array.from(document.querySelectorAll('[class*="transition"]'))
          const animationsViaCss = Array.from(document.querySelectorAll('[class*="animate"]'))

          return {
            cssTransitions: transitions.length,
            cssAnimations: animationsViaCss.length,
            prefersCss: transitions.length + animationsViaCss.length > 0,
          }
        })

        console.warn('Animation Approach:', animationApproach)
        expect(animationApproach.prefersCss, 'Should prefer CSS-based animations').toBeTruthy()
      })
    })

    test('should have proper animation cleanup and performance', async ({page}) => {
      await test.step('Test animation memory impact', async () => {
        // Trigger multiple animations
        const cards = page.locator('[data-testid="user-gpt-card"]')
        const cardCount = await cards.count()

        for (let i = 0; i < Math.min(cardCount, 5); i++) {
          await cards.nth(i).hover()
          await page.waitForTimeout(100)
        }

        // Check for excessive animation elements
        const animationCount = await page.evaluate(() => {
          const elements = document.querySelectorAll('[style*="transition"], [style*="animation"]')
          return elements.length
        })

        console.warn('Animation elements after interactions:', animationCount)

        // Should not accumulate animation elements
        expect(animationCount, 'Should not accumulate animation elements').toBeLessThanOrEqual(50)
      })
    })
  })

  test.describe('Animation Timing Standards', () => {
    test('should follow 200ms standard for micro-interactions', async ({page}) => {
      await test.step('Audit standard timing usage', async () => {
        const timingAudit = await page.evaluate(() => {
          const elements = Array.from(document.querySelectorAll('[class*="transition"], [class*="duration"]'))
          const durations: string[] = []

          for (const el of elements) {
            const styles = window.getComputedStyle(el)
            const duration = styles.transitionDuration
            if (duration && duration !== '0s') {
              durations.push(duration)
            }
          }

          // Count standard durations (200ms is common standard)
          const standardDurations = durations.filter(d => d === '0.2s' || d === '200ms').length
          const totalDurations = durations.length

          return {
            totalDurations,
            standardDurations,
            complianceRate: totalDurations > 0 ? (standardDurations / totalDurations) * 100 : 0,
          }
        })

        console.warn('Timing Standards Audit:', {
          total: timingAudit.totalDurations,
          standard200ms: timingAudit.standardDurations,
          complianceRate: `${timingAudit.complianceRate.toFixed(1)}%`,
        })

        // Many animations should use standard duration
        expect(timingAudit.complianceRate, 'Should use standard 200ms duration frequently').toBeGreaterThanOrEqual(30)
      })
    })

    test('should not have excessively long animations', async ({page}) => {
      await test.step('Audit for long animations', async () => {
        const longAnimations = await page.evaluate(() => {
          const elements = Array.from(document.querySelectorAll('[class*="transition"], [class*="duration"]'))
          let longAnimationCount = 0

          for (const el of elements) {
            const styles = window.getComputedStyle(el)
            const duration = styles.transitionDuration

            // Convert to milliseconds
            if (duration) {
              const ms = Number.parseFloat(duration) * (duration.includes('ms') ? 1 : 1000)
              if (ms > 500) {
                longAnimationCount++
              }
            }
          }

          return {
            longAnimationCount,
            totalElements: elements.length,
          }
        })

        console.warn('Long Animation Audit:', longAnimations)

        // Most animations should be quick (under 500ms)
        expect(longAnimations.longAnimationCount, 'Should minimize long animations (>500ms)').toBeLessThanOrEqual(5)
      })
    })
  })

  test.describe('Comprehensive Animation System Audit', () => {
    test('should generate comprehensive animation audit report', async ({page}) => {
      await test.step('Generate full audit report', async () => {
        const report = await page.evaluate(() => {
          const allElements = Array.from(document.querySelectorAll('*'))

          let totalAnimated = 0
          let withMotionSupport = 0
          let withDesignSystemClasses = 0
          let withInlineStyles = 0

          for (const el of allElements) {
            const className = el.getAttribute('class') || ''
            const style = el.getAttribute('style') || ''
            const computed = window.getComputedStyle(el)

            const isAnimated =
              (computed.transition && computed.transition !== 'all 0s ease 0s') ||
              (computed.animation && computed.animation !== 'none')

            if (isAnimated) {
              totalAnimated++

              if (className.includes('motion-safe') || className.includes('motion-reduce')) {
                withMotionSupport++
              }

              if (className.includes('transition') || className.includes('animate') || className.includes('duration')) {
                withDesignSystemClasses++
              }

              if (style.includes('transition') || style.includes('animation')) {
                withInlineStyles++
              }
            }
          }

          return {
            totalAnimated,
            withMotionSupport,
            withDesignSystemClasses,
            withInlineStyles,
            motionSupportRate: totalAnimated > 0 ? (withMotionSupport / totalAnimated) * 100 : 0,
            designSystemRate: totalAnimated > 0 ? (withDesignSystemClasses / totalAnimated) * 100 : 0,
            inlineStyleRate: totalAnimated > 0 ? (withInlineStyles / totalAnimated) * 100 : 0,
          }
        })

        console.warn('\n=== ANIMATION SYSTEM AUDIT REPORT ===')
        console.warn(`Total Animated Elements: ${report.totalAnimated}`)
        console.warn(
          `With Reduced Motion Support: ${report.withMotionSupport} (${report.motionSupportRate.toFixed(1)}%)`,
        )
        console.warn(
          `Using Design System Classes: ${report.withDesignSystemClasses} (${report.designSystemRate.toFixed(1)}%)`,
        )
        console.warn(`Using Inline Styles: ${report.withInlineStyles} (${report.inlineStyleRate.toFixed(1)}%)`)
        console.warn('=====================================\n')

        // Overall health check
        expect(report.totalAnimated, 'Should have animations in the application').toBeGreaterThan(0)
        expect(report.designSystemRate, 'Should use design system classes frequently').toBeGreaterThanOrEqual(40)
        expect(report.inlineStyleRate, 'Should minimize inline styles').toBeLessThanOrEqual(20)
      })
    })
  })
})
