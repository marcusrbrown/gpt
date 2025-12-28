# tests/visual/

Visual regression testing with Playwright screenshots.

## Structure

```
tests/visual/
├── fixtures/
│   └── visual-test.ts          # VisualTestHelper fixture
├── utils/
│   └── visual-test-helper.ts   # Screenshot utilities
├── *-snapshots/                # Baseline screenshots (committed)
└── *.visual.spec.ts            # Test files
```

## Commands

```bash
pnpm test:visual                 # Run visual tests
pnpm test:visual:update          # Update baselines
pnpm test:visual:ui              # Interactive mode
```

## VisualTestHelper Methods

| Method                                   | Purpose                |
| ---------------------------------------- | ---------------------- |
| `takeFullPageScreenshot(name)`           | Full page capture      |
| `takeComponentScreenshot(locator, name)` | Element capture        |
| `takeResponsiveScreenshots(name)`        | Multi-viewport         |
| `disableAnimations()`                    | Auto-called by fixture |
| `setTheme(theme)`                        | Light/dark toggle      |

## Conventions

- **Animations**: Disabled automatically via fixture
- **Dynamic content**: Use `mask` option or `hideDynamicContent()`
- **Baselines**: Committed to repo, updated via `:update` command
- **Thresholds**: 0.25 diff threshold, 2000 max diff pixels

## Anti-Patterns

- **Never commit failing baselines** — investigate first
- **Never mask entire components** — defeats purpose
- **Never skip cross-browser** — runs Chromium/Firefox/WebKit
