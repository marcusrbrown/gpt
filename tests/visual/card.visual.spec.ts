import type {Page} from '@playwright/test'
import type {VisualTestHelper} from './utils/visual-test-helper'
import {visualTest} from './fixtures'

visualTest.describe('Generic Card Visual Tests', () => {
  visualTest.beforeEach(async ({page}: {page: Page}) => {
    // Navigate to a test page for card components
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  visualTest(
    'Card - basic layout with string URL',
    async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Card Test</title>
            <link rel="stylesheet" href="/src/index.css">
            <script type="module">
              import { createRoot } from 'react-dom/client';
              import { Card } from '/src/components/card.tsx';

              const App = () => {
                return (
                  <div style={{ padding: '2rem', backgroundColor: 'hsl(var(--background))', minHeight: '100vh' }}>
                    <div data-testid="basic-card" style={{ maxWidth: '400px' }}>
                      <Card
                        name="Basic Card Example"
                        description="This is a basic card component demonstrating standard layout and styling with a string URL."
                        url="https://example.com"
                      />
                    </div>
                  </div>
                );
              };

              const root = createRoot(document.getElementById('root'));
              root.render(<App />);
            </script>
          </head>
          <body>
            <div id="root"></div>
          </body>
        </html>
      `)

      const basicCard = page.locator('[data-testid="basic-card"]')
      await basicCard.waitFor({state: 'visible'})

      await visualHelper.takeComponentScreenshot(basicCard, 'card-basic-string-url')
    },
  )

  visualTest(
    'Card - with URL object and avatar',
    async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Card Test</title>
            <link rel="stylesheet" href="/src/index.css">
            <script type="module">
              import { createRoot } from 'react-dom/client';
              import { Card } from '/src/components/card.tsx';

              const App = () => {
                const urlObject = new URL('https://github.com/example/repo');

                return (
                  <div style={{ padding: '2rem', backgroundColor: 'hsl(var(--background))', minHeight: '100vh' }}>
                    <div data-testid="url-object-card" style={{ maxWidth: '400px' }}>
                      <Card
                        name="GitHub Repository"
                        description="A card showcasing URL object handling with avatar display for external GPT links."
                        url={urlObject}
                        avatar="https://github.com/example.png"
                      />
                    </div>
                  </div>
                );
              };

              const root = createRoot(document.getElementById('root'));
              root.render(<App />);
            </script>
          </head>
          <body>
            <div id="root"></div>
          </body>
        </html>
      `)

      const urlObjectCard = page.locator('[data-testid="url-object-card"]')
      await urlObjectCard.waitFor({state: 'visible'})

      await visualHelper.takeComponentScreenshot(urlObjectCard, 'card-url-object-with-avatar')
    },
  )

  visualTest(
    'Card - hover interactions',
    async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Card Test</title>
            <link rel="stylesheet" href="/src/index.css">
            <script type="module">
              import { createRoot } from 'react-dom/client';
              import { Card } from '/src/components/card.tsx';

              const App = () => {
                return (
                  <div style={{ padding: '2rem', backgroundColor: 'hsl(var(--background))', minHeight: '100vh' }}>
                    <div data-testid="hover-card" style={{ maxWidth: '400px' }}>
                      <Card
                        name="Hover Test Card"
                        description="This card demonstrates hover interactions and visual feedback states."
                        url="https://hover-test.com"
                      />
                    </div>
                  </div>
                );
              };

              const root = createRoot(document.getElementById('root'));
              root.render(<App />);
            </script>
          </head>
          <body>
            <div id="root"></div>
          </body>
        </html>
      `)

      const hoverCard = page.locator('[data-testid="hover-card"]')
      await hoverCard.waitFor({state: 'visible'})

      // Take screenshot in default state
      await visualHelper.takeComponentScreenshot(hoverCard, 'card-default-state')

      // Hover and take screenshot of hover state
      await hoverCard.hover()
      await page.waitForTimeout(300)

      await visualHelper.takeComponentScreenshot(hoverCard, 'card-hover-state')
    },
  )

  visualTest('Card - loading state', async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
    await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Card Test</title>
            <link rel="stylesheet" href="/src/index.css">
            <script type="module">
              import { createRoot } from 'react-dom/client';
              import { Card } from '/src/components/card.tsx';

              const App = () => {
                return (
                  <div style={{ padding: '2rem', backgroundColor: 'hsl(var(--background))', minHeight: '100vh' }}>
                    <div data-testid="loading-card" style={{ maxWidth: '400px' }}>
                      <Card
                        name="Loading Card"
                        description="This card demonstrates the loading state with disabled interactions."
                        url="https://loading-test.com"
                        isLoading={true}
                      />
                    </div>
                  </div>
                );
              };

              const root = createRoot(document.getElementById('root'));
              root.render(<App />);
            </script>
          </head>
          <body>
            <div id="root"></div>
          </body>
        </html>
      `)

    const loadingCard = page.locator('[data-testid="loading-card"]')
    await loadingCard.waitFor({state: 'visible'})

    await visualHelper.takeComponentScreenshot(loadingCard, 'card-loading-state')
  })

  visualTest('Card - error state', async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
    await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Card Test</title>
            <link rel="stylesheet" href="/src/index.css">
            <script type="module">
              import { createRoot } from 'react-dom/client';
              import { Card } from '/src/components/card.tsx';

              const App = () => {
                return (
                  <div style={{ padding: '2rem', backgroundColor: 'hsl(var(--background))', minHeight: '100vh' }}>
                    <div data-testid="error-card" style={{ maxWidth: '400px' }}>
                      <Card
                        name="Error Card"
                        description="This card demonstrates the error state with appropriate visual indicators."
                        url="https://error-test.com"
                        error="Failed to load external GPT data"
                      />
                    </div>
                  </div>
                );
              };

              const root = createRoot(document.getElementById('root'));
              root.render(<App />);
            </script>
          </head>
          <body>
            <div id="root"></div>
          </body>
        </html>
      `)

    const errorCard = page.locator('[data-testid="error-card"]')
    await errorCard.waitFor({state: 'visible'})

    await visualHelper.takeComponentScreenshot(errorCard, 'card-error-state')
  })

  visualTest(
    'Card - long content text wrapping',
    async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Card Test</title>
            <link rel="stylesheet" href="/src/index.css">
            <script type="module">
              import { createRoot } from 'react-dom/client';
              import { Card } from '/src/components/card.tsx';

              const App = () => {
                return (
                  <div style={{ padding: '2rem', backgroundColor: 'hsl(var(--background))', minHeight: '100vh' }}>
                    <div data-testid="long-content-card" style={{ maxWidth: '400px' }}>
                      <Card
                        name="Card with Extremely Long Name That Should Wrap Properly and Maintain Layout Integrity"
                        description="This is a comprehensive test description that contains a substantial amount of text to verify how the card component handles text wrapping, maintains proper spacing, ensures consistent layout proportions, and demonstrates responsive behavior when content significantly exceeds typical lengths. It should showcase the component's ability to handle edge cases gracefully while preserving visual hierarchy and readability."
                        url="https://long-content-example.com/very/deep/path/structure"
                        avatar="https://example.com/avatar.png"
                      />
                    </div>
                  </div>
                );
              };

              const root = createRoot(document.getElementById('root'));
              root.render(<App />);
            </script>
          </head>
          <body>
            <div id="root"></div>
          </body>
        </html>
      `)

      const longContentCard = page.locator('[data-testid="long-content-card"]')
      await longContentCard.waitFor({state: 'visible'})

      await visualHelper.takeComponentScreenshot(longContentCard, 'card-long-content')
    },
  )

  visualTest(
    'Card - responsive layout variations',
    async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Card Test</title>
            <link rel="stylesheet" href="/src/index.css">
            <script type="module">
              import { createRoot } from 'react-dom/client';
              import { Card } from '/src/components/card.tsx';

              const App = () => {
                return (
                  <div style={{ padding: '1rem', backgroundColor: 'hsl(var(--background))', minHeight: '100vh' }}>
                    <div data-testid="responsive-card">
                      <Card
                        name="Responsive Card Test"
                        description="This card demonstrates responsive behavior across different viewport sizes and screen resolutions."
                        url="https://responsive-test.com"
                        avatar="https://example.com/avatar.png"
                      />
                    </div>
                  </div>
                );
              };

              const root = createRoot(document.getElementById('root'));
              root.render(<App />);
            </script>
          </head>
          <body>
            <div id="root"></div>
          </body>
        </html>
      `)

      const responsiveCard = page.locator('[data-testid="responsive-card"]')
      await responsiveCard.waitFor({state: 'visible'})

      // Test different viewport sizes
      await visualHelper.takeResponsiveScreenshots('card-responsive', [
        {width: 320, height: 568, name: 'mobile'},
        {width: 480, height: 854, name: 'mobile-large'},
        {width: 768, height: 1024, name: 'tablet'},
        {width: 1024, height: 768, name: 'desktop'},
        {width: 1440, height: 900, name: 'large-desktop'},
      ])
    },
  )

  visualTest(
    'Card - multiple cards layout',
    async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Card Test</title>
            <link rel="stylesheet" href="/src/index.css">
            <script type="module">
              import { createRoot } from 'react-dom/client';
              import { Card } from '/src/components/card.tsx';

              const App = () => {
                return (
                  <div style={{ padding: '2rem', backgroundColor: 'hsl(var(--background))', minHeight: '100vh' }}>
                    <div data-testid="cards-grid" style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                      gap: '1.5rem',
                      maxWidth: '1200px'
                    }}>
                      <Card
                        name="First Card"
                        description="Standard card with basic content."
                        url="https://first-card.com"
                      />
                      <Card
                        name="Second Card"
                        description="Card with avatar image for visual variety."
                        url="https://second-card.com"
                        avatar="https://example.com/avatar1.png"
                      />
                      <Card
                        name="Third Card with Longer Name"
                        description="This card has a longer description to test how cards maintain consistent heights in a grid layout."
                        url="https://third-card.com"
                      />
                      <Card
                        name="Error Card"
                        description="This card shows error state styling."
                        url="https://error-card.com"
                        error="Connection failed"
                      />
                      <Card
                        name="Loading Card"
                        description="This card demonstrates loading state."
                        url="https://loading-card.com"
                        isLoading={true}
                      />
                    </div>
                  </div>
                );
              };

              const root = createRoot(document.getElementById('root'));
              root.render(<App />);
            </script>
          </head>
          <body>
            <div id="root"></div>
          </body>
        </html>
      `)

      const cardsGrid = page.locator('[data-testid="cards-grid"]')
      await cardsGrid.waitFor({state: 'visible'})

      await visualHelper.takeComponentScreenshot(cardsGrid, 'card-multiple-layout')
    },
  )

  visualTest('Card - theme variations', async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
    await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Card Test</title>
            <link rel="stylesheet" href="/src/index.css">
            <script type="module">
              import { createRoot } from 'react-dom/client';
              import { Card } from '/src/components/card.tsx';

              const App = () => {
                return (
                  <div style={{ padding: '2rem', backgroundColor: 'hsl(var(--background))', minHeight: '100vh' }}>
                    <div data-testid="theme-card" style={{ maxWidth: '400px' }}>
                      <Card
                        name="Theme Test Card"
                        description="This card demonstrates appearance in different theme modes and color schemes."
                        url="https://theme-test.com"
                        avatar="https://example.com/avatar.png"
                      />
                    </div>
                  </div>
                );
              };

              const root = createRoot(document.getElementById('root'));
              root.render(<App />);
            </script>
          </head>
          <body>
            <div id="root"></div>
          </body>
        </html>
      `)

    const themeCard = page.locator('[data-testid="theme-card"]')
    await themeCard.waitFor({state: 'visible'})

    // Take screenshot in light theme
    await visualHelper.takeComponentScreenshot(themeCard, 'card-light-theme')

    // Switch to dark theme
    await page.evaluate(() => {
      document.documentElement.classList.add('dark')
    })
    await page.waitForTimeout(300)

    // Take screenshot in dark theme
    await visualHelper.takeComponentScreenshot(themeCard, 'card-dark-theme')
  })
})
