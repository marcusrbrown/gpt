# tests/e2e/AGENTS.md

Playwright E2E tests. Full user flows, cross-browser, real DOM.

## Structure

```
e2e/
├── fixtures/       # base.ts extends Playwright
├── page-objects/   # One class per page
├── utils/          # Test data factories
└── *.spec.ts       # Test files
```

## Commands

```bash
pnpm test:e2e           # Run all
pnpm test:e2e --headed  # Watch browser
pnpm test:e2e --debug   # Debug mode
```

## Conventions

- **Page Objects**: One class per page in `page-objects/`
- **Fixtures**: Extend `base.ts` for custom fixtures
- **Selectors**: Use `data-testid`, not CSS classes
- **Waiting**: Playwright auto-waiting over explicit waits

## Anti-Patterns

- Never `page.waitForTimeout()` — use assertions
- Never hardcode test data — use `utils/test-data-factory.ts`
- Never test implementation — test user-visible behavior
