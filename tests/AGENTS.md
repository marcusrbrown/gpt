# tests/AGENTS.md

Playwright test suites: E2E, accessibility, performance, visual regression.

## Structure

| Directory        | Purpose                   | Command                   |
| ---------------- | ------------------------- | ------------------------- |
| `e2e/`           | User flows, cross-browser | `pnpm test:e2e`           |
| `accessibility/` | WCAG 2.1 AA audits        | `pnpm test:accessibility` |
| `performance/`   | Lighthouse budgets        | `pnpm test:performance`   |
| `visual/`        | Screenshot regression     | `pnpm test:visual`        |

Unit tests live in `src/**/__tests__/` and run with Vitest (`pnpm test`).

## Conventions

- Stable selectors: `data-testid`, roles, labels
- No sleep-based timing — use Playwright auto-waiting
- Isolated, repeatable test data (fixtures/page-objects)

## Directory Guides

- [e2e/AGENTS.md](e2e/AGENTS.md)
- [accessibility/AGENTS.md](accessibility/AGENTS.md)
- [visual/AGENTS.md](visual/AGENTS.md)
- [performance/AGENTS.md](performance/AGENTS.md)
