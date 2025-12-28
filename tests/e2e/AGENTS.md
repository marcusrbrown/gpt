# tests/e2e/

Playwright E2E tests. Full user flows, cross-browser, real DOM.

## Structure

```
tests/e2e/
├── fixtures/           # Test fixtures (base.ts extends Playwright)
├── page-objects/       # POM classes for each page
├── utils/              # Test data factories
├── global-setup.ts     # Pre-test setup
├── global-teardown.ts  # Post-test cleanup
└── *.spec.ts           # Test files
```

## Commands

```bash
pnpm test:e2e              # Run all E2E tests
pnpm test:e2e --headed     # Watch browser
pnpm test:e2e --debug      # Debug mode
```

## Conventions

- **Page Objects**: One class per page in `page-objects/`
- **Fixtures**: Extend `base.ts` for custom fixtures
- **Selectors**: Use `data-testid` attributes, not CSS classes
- **Waiting**: Prefer Playwright auto-waiting over explicit waits

## Test File Naming

`{feature}.spec.ts` — e.g., `gpt-crud.spec.ts`, `export-import.spec.ts`

## Anti-Patterns

- **Never use `page.waitForTimeout()`** — use proper assertions
- **Never hardcode test data** — use `utils/test-data-factory.ts`
- **Never test implementation details** — test user-visible behavior
