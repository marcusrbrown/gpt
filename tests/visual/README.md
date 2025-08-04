# Visual Regression Testing

This directory contains visual regression tests for the GPT Research Platform using Playwright's screenshot comparison capabilities.

## Overview

Visual regression testing ensures UI consistency across updates and releases by comparing screenshots of components and pages against approved baselines.

## Directory Structure

```text
tests/visual/
├── fixtures/           # Test fixtures and utilities
│   ├── index.ts        # Exports for easy importing
│   └── visual-test.ts  # Custom test fixture with visual helpers
├── utils/              # Visual testing utilities
│   └── visual-test-helper.ts  # Core visual testing helper class
├── homepage.visual.spec.ts     # Home page visual tests
├── gpt-editor.visual.spec.ts   # GPT Editor component tests
├── gpt-test-pane.visual.spec.ts # GPT Test Pane component tests
└── README.md           # This file
```

## Running Visual Tests

### Local Development

```bash
# Run all visual tests
pnpm run test:visual

# Run visual tests with UI (recommended for development)
pnpm run test:visual:ui

# Run visual tests in headed mode (see browser)
pnpm run test:visual:headed

# Debug visual tests
pnpm run test:visual:debug

# Update visual baselines (after approving changes)
pnpm run test:visual:update
```

### Configuration

Visual tests use `playwright-visual.config.ts` which provides:

- **Consistent viewport settings** across browsers
- **Cross-browser testing** (Chromium, Firefox, WebKit)
- **Mobile and desktop testing**
- **Optimized pixel difference thresholds**
- **Animation disabling** for consistent screenshots

## Visual Test Structure

### Test Organization

Visual tests are organized by page/component:

- `homepage.visual.spec.ts` - Home page layouts and components
- `gpt-editor.visual.spec.ts` - GPT Editor form and interactions
- `gpt-test-pane.visual.spec.ts` - GPT Test interface and conversations

### Test Types

1. **Full Page Screenshots** - Complete page layouts
2. **Component Screenshots** - Individual UI components
3. **Responsive Screenshots** - Multiple viewport sizes
4. **Theme Testing** - Light and dark themes
5. **State Testing** - Different component states (empty, filled, error, loading)

### Example Test

```typescript
import type {Page} from '@playwright/test'
import type {VisualTestHelper} from './utils/visual-test-helper'
import {visualTest, VisualTestData} from './fixtures'

visualTest.describe('Component Visual Tests', () => {
  visualTest('component layout', async ({page, visualHelper}: {page: Page; visualHelper: VisualTestHelper}) => {
    // Navigate to component
    await page.goto('/component')

    // Take full page screenshot
    await visualHelper.takeFullPageScreenshot('component-layout')

    // Take component screenshot
    const component = page.locator('[data-testid="component"]')
    await visualHelper.takeComponentScreenshot(component, 'component-detail')

    // Test responsive layouts
    await visualHelper.takeResponsiveScreenshots('component-responsive')
  })
})
```

## Visual Test Helpers

### VisualTestHelper Class

The `VisualTestHelper` class provides utilities for consistent screenshot generation:

#### Key Methods

- `takeFullPageScreenshot(name, options?)` - Full page screenshots
- `takeComponentScreenshot(locator, name, options?)` - Component screenshots
- `takeResponsiveScreenshots(name, viewports?)` - Multiple viewport sizes
- `setTheme(theme)` - Switch between light/dark themes
- `disableAnimations()` - Disable animations for consistency
- `hideDynamicContent()` - Hide time-based content
- `waitForPageStable()` - Wait for page to be ready for screenshots

#### Screenshot Options

```typescript
// Full page with masking
await visualHelper.takeFullPageScreenshot('page-name', {
  mask: [page.locator('.dynamic-content')],
  clip: {x: 0, y: 0, width: 1280, height: 720}
})

// Component with masking
await visualHelper.takeComponentScreenshot(component, 'component-name', {
  mask: [page.locator('.timestamp')]
})
```

### Mock Data

The `VisualTestData` utility provides consistent test data:

```typescript
// Single mock GPT
const mockGPT = VisualTestData.createMockGPT({
  name: 'Custom Test GPT',
  description: 'Custom description'
})

// Multiple mock GPTs
const mockGPTs = VisualTestData.createMockGPTList(5)
```

## Best Practices

### 1. Consistent Test Data

Always use `VisualTestData` utilities to create predictable, consistent test data:

```typescript
const mockGPTs = VisualTestData.createMockGPTList(3)
await page.evaluate((gpts: any) => {
  localStorage.setItem('gpt-configurations', JSON.stringify(gpts))
}, mockGPTs)
```

### 2. Handle Dynamic Content

Mask or hide content that changes between test runs:

```typescript
// Hide timestamps and dynamic content
await visualHelper.hideDynamicContent()

// Or mask specific elements
await visualHelper.takeFullPageScreenshot('page-name', {
  mask: [page.locator('[data-testid="timestamp"]')]
})
```

### 3. Wait for Stability

Always wait for page to be stable before taking screenshots:

```typescript
await visualHelper.waitForPageStable()
// or it's called automatically by screenshot methods
```

### 4. Test Multiple States

Test different component states to catch visual regressions:

```typescript
// Empty state
await visualHelper.takeFullPageScreenshot('component-empty')

// Filled state
// ... add content ...
await visualHelper.takeFullPageScreenshot('component-filled')

// Error state
// ... trigger error ...
await visualHelper.takeFullPageScreenshot('component-error')
```

### 5. Cross-Browser Testing

Visual tests run on multiple browsers automatically. Handle browser-specific differences with appropriate thresholds in the config.

## Baseline Management

### Updating Baselines

When UI changes are intentional and approved:

```bash
# Update all baselines
pnpm run test:visual:update

# Update specific test baselines
pnpm run test:visual:update -- --grep "homepage"
```

### Reviewing Changes

1. **Local Development**: Use `pnpm run test:visual:ui` to see visual diffs
2. **CI/CD**: Review uploaded artifacts in GitHub Actions
3. **Approval**: Update baselines after confirming changes are correct

### Baseline Storage

- Screenshots are stored alongside test files
- Organized by browser and viewport size
- Committed to version control for comparison

## CI/CD Integration

### GitHub Actions

Visual tests run automatically on:

- Pull requests (comparison mode)
- Main branch pushes (regression detection)

### Artifacts

CI uploads test artifacts including:

- HTML reports
- Diff images (actual vs expected)
- Test results JSON

### PR Comments

Automated comments show visual test results with:

- Pass/fail summary
- Failed test details
- Links to detailed reports

## Troubleshooting

### Common Issues

1. **Flaky Tests**
   - Increase `threshold` in config
   - Add more wait time for dynamic content
   - Mask problematic elements

2. **Font Rendering Differences**
   - Tests account for cross-platform font differences
   - Use consistent fonts in test environment
   - Adjust `maxDiffPixels` if needed

3. **Animation Issues**
   - `disableAnimations()` is called automatically
   - Add manual waits for complex animations
   - Use CSS to disable specific animations

4. **Viewport Inconsistencies**
   - Fixed viewport sizes in config
   - Test responsive designs explicitly
   - Use consistent device settings

### Debugging

```bash
# Debug with UI
pnpm run test:visual:debug

# Run with browser visible
pnpm run test:visual:headed

# Generate verbose output
DEBUG=pw:test pnpm run test:visual
```

## Visual Configuration

### Pixel Difference Thresholds

```txt
// In playwright-visual.config.ts
toMatchSnapshot: {
  threshold: 0.25,        // 25% difference threshold
  maxDiffPixels: 2000     // Max different pixels allowed
}
```

### Browser Settings

```json5
// Consistent browser configuration
{
  name: 'chromium-visual',
  use: {
    viewport: {width: 1280, height: 720},
    launchOptions: {
      args: ['--disable-web-security', '--disable-features=TranslateUI']
    }
  }
}
```

## Contributing

When adding new visual tests:

1. Follow existing patterns and naming conventions
2. Use `VisualTestHelper` utilities
3. Test multiple states and viewports
4. Add appropriate documentation
5. Generate baselines locally before committing
6. Ensure tests are deterministic and stable
