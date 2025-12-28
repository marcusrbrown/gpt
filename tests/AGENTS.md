# tests/AGENTS.md

This directory contains higher-level Playwright suites: end-to-end, accessibility, performance, and visual regression tests.

## What Lives Here

- `tests/e2e/`: user flows and app-level behavior.
- `tests/accessibility/`: WCAG 2.1 AA audits.
- `tests/performance/`: performance/lighthouse-style checks.
- `tests/visual/`: visual regression tests.

Unit tests for app code typically live under `src/**/__tests__/` and run with Vitest.

## Commands

Run from the repository root:

- `pnpm test:e2e`
- `pnpm test:accessibility`
- `pnpm test:performance`
- `pnpm test:visual`

## Conventions

- Prefer stable selectors and user-visible roles/labels.
- Avoid sleep-based timing; prefer Playwright’s auto-waiting and explicit expectations.
- Keep test data isolated and repeatable (use fixtures/page-objects where appropriate).

## References

- Project-wide agent guidance: [../AGENTS.md](../AGENTS.md)
- Testing and accessibility requirements: [../docs/RULES.md](../docs/RULES.md)
- Playwright configs: [../playwright.config.ts](../playwright.config.ts)
