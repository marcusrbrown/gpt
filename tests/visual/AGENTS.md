# tests/visual/AGENTS.md

Visual regression testing. Playwright screenshots.

## Structure

```
visual/
├── fixtures/visual-test.ts      # VisualTestHelper fixture
├── utils/visual-test-helper.ts  # Screenshot utilities
├── *-snapshots/                 # Baselines (committed)
└── *.visual.spec.ts             # Tests
```

## Commands

```bash
pnpm test:visual         # Run tests
pnpm test:visual:update  # Update baselines
pnpm test:visual:ui      # Interactive mode
```

## VisualTestHelper

| Method                               | Purpose        |
| ------------------------------------ | -------------- |
| `takeFullPageScreenshot(name)`       | Full page      |
| `takeComponentScreenshot(loc, name)` | Element        |
| `takeResponsiveScreenshots(name)`    | Multi-viewport |
| `setTheme(theme)`                    | Light/dark     |

## Conventions

- Animations disabled automatically
- Dynamic content: use `mask` or `hideDynamicContent()`
- Thresholds: 0.25 diff, 2000 max diff pixels
- Cross-browser: Chromium/Firefox/WebKit

## Anti-Patterns

- Never commit failing baselines without investigation
- Never mask entire components
