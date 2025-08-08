import type {Page} from '@playwright/test'
import type {VisualTestHelper} from './utils/visual-test-helper'
import {visualTest} from './fixtures'

/**
 * Card Components Visual Regression Tests
 * Tests hover states, animations, and responsive behavior for refactored card components
 * Validates design system integration and visual consistency
 */
visualTest.describe('Card Components - Visual Regression Tests', () => {
  visualTest.beforeEach(async ({page}: {page: Page}) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  visualTest.describe('UserGPTCard Visual Tests', () => {
    visualTest(
      'UserGPTCard - default state with design system styling',
      async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
        // Find existing UserGPTCard on the page
        const gptCards = page.locator('[data-testid="user-gpt-card"]')
        const cardCount = await gptCards.count()

        if (cardCount > 0) {
          // Test the first card in its default state
          const firstCard = gptCards.first()
          await visualHelper.takeComponentScreenshot(firstCard, 'user-gpt-card-default-state')
        } else {
          // If no cards exist, skip test
          visualTest.skip()
        }
      },
    )

    visualTest(
      'UserGPTCard - hover state with design system transitions',
      async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
        const gptCards = page.locator('[data-testid="user-gpt-card"]')
        const cardCount = await gptCards.count()

        if (cardCount > 0) {
          const firstCard = gptCards.first()

          // Test hover state
          await firstCard.hover()
          await page.waitForTimeout(300) // Allow transition to complete
          await visualHelper.takeComponentScreenshot(firstCard, 'user-gpt-card-hover-state')
        } else {
          visualTest.skip()
        }
      },
    )

    visualTest(
      'UserGPTCard - focused state with focus ring',
      async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
        const gptCards = page.locator('[data-testid="user-gpt-card"]')
        const cardCount = await gptCards.count()

        if (cardCount > 0) {
          const firstCard = gptCards.first()

          // Test focus state
          await firstCard.focus()
          await visualHelper.takeComponentScreenshot(firstCard, 'user-gpt-card-focused-state')
        } else {
          visualTest.skip()
        }
      },
    )

    visualTest(
      'UserGPTCard - button interactions',
      async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
        const gptCards = page.locator('[data-testid="user-gpt-card"]')
        const cardCount = await gptCards.count()

        if (cardCount > 0) {
          const firstCard = gptCards.first()

          // Test edit button hover
          const editButton = firstCard.locator('a[href*="/gpt/edit/"]')
          if ((await editButton.count()) > 0) {
            await editButton.hover()
            await page.waitForTimeout(200)
            await visualHelper.takeComponentScreenshot(firstCard, 'user-gpt-card-edit-button-hover')
          }

          // Test test button hover
          const testButton = firstCard.locator('a[href*="/gpt/test/"]')
          if ((await testButton.count()) > 0) {
            await testButton.hover()
            await page.waitForTimeout(200)
            await visualHelper.takeComponentScreenshot(firstCard, 'user-gpt-card-test-button-hover')
          }
        } else {
          visualTest.skip()
        }
      },
    )

    visualTest(
      'UserGPTCard - loading state',
      async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
        // Create a test page with loading state
        await page.setContent(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>UserGPTCard Loading Test</title>
              <link rel="stylesheet" href="/src/index.css">
              <script type="module">
                import { createRoot } from 'react-dom/client';
                import { UserGPTCard } from '/src/components/user-gpt-card.tsx';

                const mockGPT = {
                  id: 'test-loading',
                  name: 'Loading GPT',
                  description: 'A test GPT in loading state',
                  systemPrompt: 'You are a test assistant',
                  capabilities: {
                    codeInterpreter: false,
                    webBrowsing: false,
                    imageGeneration: false,
                    fileSearch: { enabled: false }
                  },
                  tools: [],
                  knowledge: { files: [], urls: [], vectorStores: [] },
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  version: 1
                };

                const App = () => {
                  return (
                    <div style={{ padding: '2rem', backgroundColor: 'hsl(var(--background))', minHeight: '100vh' }}>
                      <div style={{ maxWidth: '400px' }}>
                        <UserGPTCard gpt={mockGPT} isLoading={true} />
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

        await page.waitForLoadState('networkidle')
        const card = page.locator('[data-testid="user-gpt-card"]')
        await visualHelper.takeComponentScreenshot(card, 'user-gpt-card-loading-state')
      },
    )

    visualTest(
      'UserGPTCard - error state',
      async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
        // Create a test page with error state
        await page.setContent(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>UserGPTCard Error Test</title>
              <link rel="stylesheet" href="/src/index.css">
              <script type="module">
                import { createRoot } from 'react-dom/client';
                import { UserGPTCard } from '/src/components/user-gpt-card.tsx';

                const mockGPT = {
                  id: 'test-error',
                  name: 'Error GPT',
                  description: 'A test GPT in error state',
                  systemPrompt: 'You are a test assistant',
                  capabilities: {
                    codeInterpreter: false,
                    webBrowsing: false,
                    imageGeneration: false,
                    fileSearch: { enabled: false }
                  },
                  tools: [],
                  knowledge: { files: [], urls: [], vectorStores: [] },
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  version: 1
                };

                const App = () => {
                  return (
                    <div style={{ padding: '2rem', backgroundColor: 'hsl(var(--background))', minHeight: '100vh' }}>
                      <div style={{ maxWidth: '400px' }}>
                        <UserGPTCard gpt={mockGPT} error="Failed to load GPT data" />
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

        await page.waitForLoadState('networkidle')
        const card = page.locator('[data-testid="user-gpt-card"]')
        await visualHelper.takeComponentScreenshot(card, 'user-gpt-card-error-state')
      },
    )
  })

  visualTest.describe('FeatureCard Visual Tests', () => {
    visualTest(
      'FeatureCard - default state with HeroUI integration',
      async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
        // Create a test page with FeatureCard
        await page.setContent(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>FeatureCard Test</title>
              <link rel="stylesheet" href="/src/index.css">
              <script type="module">
                import { createRoot } from 'react-dom/client';
                import { FeatureCard } from '/src/components/feature-card.tsx';
                import { BrowserRouter } from 'react-router-dom';
                import { Lightbulb } from 'lucide-react';

                const App = () => {
                  return (
                    <BrowserRouter>
                      <div style={{ padding: '2rem', backgroundColor: 'hsl(var(--background))', minHeight: '100vh' }}>
                        <div style={{ maxWidth: '400px' }}>
                          <FeatureCard
                            title="Example Feature"
                            description="This is an example feature card demonstrating the new design system integration with HeroUI components."
                            icon={Lightbulb}
                            href="/docs/example"
                            domain="Local Link"
                          />
                        </div>
                      </div>
                    </BrowserRouter>
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

        await page.waitForLoadState('networkidle')
        const card = page.locator('.compose-card').first()
        await visualHelper.takeComponentScreenshot(card, 'feature-card-default-state')
      },
    )

    visualTest(
      'FeatureCard - hover state with design system transitions',
      async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
        // Create a test page with FeatureCard
        await page.setContent(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>FeatureCard Hover Test</title>
              <link rel="stylesheet" href="/src/index.css">
              <script type="module">
                import { createRoot } from 'react-dom/client';
                import { FeatureCard } from '/src/components/feature-card.tsx';
                import { BrowserRouter } from 'react-router-dom';
                import { ExternalLink } from 'lucide-react';

                const App = () => {
                  return (
                    <BrowserRouter>
                      <div style={{ padding: '2rem', backgroundColor: 'hsl(var(--background))', minHeight: '100vh' }}>
                        <div style={{ maxWidth: '400px' }}>
                          <FeatureCard
                            title="Hover Test Feature"
                            description="This feature card will demonstrate hover interactions with the new design system."
                            icon={ExternalLink}
                            href="https://external-link.com"
                            domain="external-link.com"
                          />
                        </div>
                      </div>
                    </BrowserRouter>
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

        await page.waitForLoadState('networkidle')
        const card = page.locator('.compose-card').first()

        // Test hover state
        await card.hover()
        await page.waitForTimeout(300) // Allow transition to complete
        await visualHelper.takeComponentScreenshot(card, 'feature-card-hover-state')
      },
    )

    visualTest(
      'FeatureCard - pressed state interaction',
      async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
        // Create a test page with FeatureCard
        await page.setContent(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>FeatureCard Press Test</title>
              <link rel="stylesheet" href="/src/index.css">
              <script type="module">
                import { createRoot } from 'react-dom/client';
                import { FeatureCard } from '/src/components/feature-card.tsx';
                import { BrowserRouter } from 'react-router-dom';
                import { Mouse } from 'lucide-react';

                const App = () => {
                  return (
                    <BrowserRouter>
                      <div style={{ padding: '2rem', backgroundColor: 'hsl(var(--background))', minHeight: '100vh' }}>
                        <div style={{ maxWidth: '400px' }}>
                          <FeatureCard
                            title="Press Test Feature"
                            description="This feature card demonstrates the pressed state interaction patterns."
                            icon={Mouse}
                            href="/docs/press-test"
                          />
                        </div>
                      </div>
                    </BrowserRouter>
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

        await page.waitForLoadState('networkidle')
        const card = page.locator('.compose-card').first()

        // Test focus state first
        await card.focus()
        await visualHelper.takeComponentScreenshot(card, 'feature-card-focused-state')

        // Test pressed state (simulate mouse down)
        await page.mouse.move(200, 200)
        await page.mouse.down()
        await page.waitForTimeout(100)
        await visualHelper.takeComponentScreenshot(card, 'feature-card-pressed-state')
        await page.mouse.up()
      },
    )

    visualTest(
      'FeatureCard - external link styling',
      async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
        // Create a test page with external FeatureCard
        await page.setContent(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>FeatureCard External Link Test</title>
              <link rel="stylesheet" href="/src/index.css">
              <script type="module">
                import { createRoot } from 'react-dom/client';
                import { FeatureCard } from '/src/components/feature-card.tsx';
                import { BrowserRouter } from 'react-router-dom';
                import { Globe } from 'lucide-react';

                const App = () => {
                  return (
                    <BrowserRouter>
                      <div style={{ padding: '2rem', backgroundColor: 'hsl(var(--background))', minHeight: '100vh' }}>
                        <div style={{ maxWidth: '400px' }}>
                          <FeatureCard
                            title="External Resource"
                            description="This card links to an external resource and shows the 'Open in ChatGPT' action text."
                            icon={Globe}
                            href="https://chatgpt.com/g/example"
                            domain="chatgpt.com"
                          />
                        </div>
                      </div>
                    </BrowserRouter>
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

        await page.waitForLoadState('networkidle')
        const card = page.locator('.compose-card').first()
        await visualHelper.takeComponentScreenshot(card, 'feature-card-external-link')
      },
    )
  })

  visualTest.describe('Generic Card Visual Tests', () => {
    visualTest(
      'Generic Card - with avatar and external link',
      async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
        // Create a test page with generic Card
        await page.setContent(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Generic Card Test</title>
              <link rel="stylesheet" href="/src/index.css">
              <script type="module">
                import { createRoot } from 'react-dom/client';
                import { Card } from '/src/components/card.tsx';

                const App = () => {
                  return (
                    <div style={{ padding: '2rem', backgroundColor: 'hsl(var(--background))', minHeight: '100vh' }}>
                      <div style={{ maxWidth: '400px' }}>
                        <Card
                          name="Example External Resource"
                          description="This is a generic card component with an avatar and external link functionality."
                          url="https://example.external.com"
                          avatar="https://via.placeholder.com/40x40/0066cc/ffffff?text=EX"
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

        await page.waitForLoadState('networkidle')
        const card = page.locator('.compose-card').first()
        await visualHelper.takeComponentScreenshot(card, 'generic-card-with-avatar')
      },
    )

    visualTest(
      'Generic Card - hover state',
      async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
        // Create a test page with generic Card
        await page.setContent(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Generic Card Hover Test</title>
              <link rel="stylesheet" href="/src/index.css">
              <script type="module">
                import { createRoot } from 'react-dom/client';
                import { Card } from '/src/components/card.tsx';

                const App = () => {
                  return (
                    <div style={{ padding: '2rem', backgroundColor: 'hsl(var(--background))', minHeight: '100vh' }}>
                      <div style={{ maxWidth: '400px' }}>
                        <Card
                          name="Hover Test Card"
                          description="This card demonstrates hover interactions with the design system styling."
                          url="/internal/test"
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

        await page.waitForLoadState('networkidle')
        const card = page.locator('.compose-card').first()

        // Test hover state
        await card.hover()
        await page.waitForTimeout(300) // Allow transition to complete
        await visualHelper.takeComponentScreenshot(card, 'generic-card-hover-state')
      },
    )
  })

  visualTest.describe('Responsive Design Tests', () => {
    visualTest(
      'Card components - mobile viewport (375px)',
      async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
        await page.setViewportSize({width: 375, height: 667})

        // Test existing cards on home page
        const gptCards = page.locator('[data-testid="user-gpt-card"]')
        const cardCount = await gptCards.count()

        if (cardCount > 0) {
          const firstCard = gptCards.first()
          await visualHelper.takeComponentScreenshot(firstCard, 'user-gpt-card-mobile-375px')
        } else {
          visualTest.skip()
        }
      },
    )

    visualTest(
      'Card components - tablet viewport (768px)',
      async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
        await page.setViewportSize({width: 768, height: 1024})

        // Test existing cards on home page
        const gptCards = page.locator('[data-testid="user-gpt-card"]')
        const cardCount = await gptCards.count()

        if (cardCount > 0) {
          const firstCard = gptCards.first()
          await visualHelper.takeComponentScreenshot(firstCard, 'user-gpt-card-tablet-768px')
        } else {
          visualTest.skip()
        }
      },
    )

    visualTest(
      'Card components - desktop viewport (1440px)',
      async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
        await page.setViewportSize({width: 1440, height: 900})

        // Test existing cards on home page
        const gptCards = page.locator('[data-testid="user-gpt-card"]')
        const cardCount = await gptCards.count()

        if (cardCount > 0) {
          const firstCard = gptCards.first()
          await visualHelper.takeComponentScreenshot(firstCard, 'user-gpt-card-desktop-1440px')
        } else {
          visualTest.skip()
        }
      },
    )
  })

  visualTest.describe('Theme Consistency Tests', () => {
    visualTest(
      'Card components - light theme consistency',
      async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
        // Ensure light theme
        await page.evaluate(() => {
          document.documentElement.classList.remove('dark')
          document.documentElement.classList.add('light')
        })

        await page.waitForTimeout(100) // Allow theme transition

        const gptCards = page.locator('[data-testid="user-gpt-card"]')
        const cardCount = await gptCards.count()

        if (cardCount > 0) {
          const firstCard = gptCards.first()
          await visualHelper.takeComponentScreenshot(firstCard, 'user-gpt-card-light-theme')
        } else {
          visualTest.skip()
        }
      },
    )

    visualTest(
      'Card components - dark theme consistency',
      async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
        // Ensure dark theme
        await page.evaluate(() => {
          document.documentElement.classList.remove('light')
          document.documentElement.classList.add('dark')
        })

        await page.waitForTimeout(100) // Allow theme transition

        const gptCards = page.locator('[data-testid="user-gpt-card"]')
        const cardCount = await gptCards.count()

        if (cardCount > 0) {
          const firstCard = gptCards.first()
          await visualHelper.takeComponentScreenshot(firstCard, 'user-gpt-card-dark-theme')
        } else {
          visualTest.skip()
        }
      },
    )
  })
})
