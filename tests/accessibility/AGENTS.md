# tests/accessibility/

WCAG 2.1 AA compliance tests using axe-core + Playwright.

## Structure

```
tests/accessibility/
├── fixtures/           # A11y test fixtures
├── utils/
│   ├── accessibility-config.ts   # axe-core rule configs
│   └── accessibility-utils.ts    # Helper functions
└── *.accessibility.spec.ts       # Test files
```

## Commands

```bash
pnpm test:accessibility           # Run all a11y tests
```

## Configurations

| Config                            | Use Case                        |
| --------------------------------- | ------------------------------- |
| `WCAG_2_1_AA_STANDARD`            | Default, includes best-practice |
| `WCAG_2_1_AA_STRICT`              | No exclusions, comprehensive    |
| `FORM_ACCESSIBILITY_CONFIG`       | Form-specific rules             |
| `NAVIGATION_ACCESSIBILITY_CONFIG` | Keyboard/focus rules            |
| `SCREEN_READER_CONFIG`            | ARIA/screen reader rules        |

## Conventions

- **File naming**: `{component}.accessibility.spec.ts`
- **Rule selection**: Use `getAccessibilityConfig(type)` helper
- **Exclusions**: Document in `JUSTIFIED_RULE_EXCLUSIONS` with reason

## Anti-Patterns

- **Never disable rules without justification** in config
- **Never skip color-contrast** checks
- **Never ignore heading-order** violations
