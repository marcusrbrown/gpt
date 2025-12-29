# tests/accessibility/AGENTS.md

WCAG 2.1 AA compliance tests. axe-core + Playwright.

## Structure

```
accessibility/
├── fixtures/                     # A11y test fixtures
├── utils/
│   ├── accessibility-config.ts   # axe-core configs
│   └── accessibility-utils.ts    # Helpers
└── *.accessibility.spec.ts       # Tests
```

## Configurations

| Config                            | Use Case                        |
| --------------------------------- | ------------------------------- |
| `WCAG_2_1_AA_STANDARD`            | Default, includes best-practice |
| `WCAG_2_1_AA_STRICT`              | No exclusions                   |
| `FORM_ACCESSIBILITY_CONFIG`       | Form-specific                   |
| `NAVIGATION_ACCESSIBILITY_CONFIG` | Keyboard/focus                  |
| `SCREEN_READER_CONFIG`            | ARIA rules                      |

## Conventions

- File naming: `{component}.accessibility.spec.ts`
- Use `getAccessibilityConfig(type)` helper
- Document exclusions in `JUSTIFIED_RULE_EXCLUSIONS`

## Anti-Patterns

- Never disable rules without justification
- Never skip color-contrast checks
- Never ignore heading-order violations
