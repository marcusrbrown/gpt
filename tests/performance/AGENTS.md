# tests/performance/AGENTS.md

Lighthouse-based performance testing with budgets.

## Structure

```
performance/
├── config/performance-budgets.ts  # Metric thresholds
├── fixtures/                      # Test fixtures
├── utils/lighthouse-utils.ts      # Runner helpers
└── *.performance.spec.ts          # Tests
```

## Budgets (Core Web Vitals)

| Page       | LCP    | FCP    | CLS | TBT   | Score |
| ---------- | ------ | ------ | --- | ----- | ----- |
| Homepage   | 2500ms | 1800ms | 0.1 | 200ms | 0.90  |
| GPT Editor | 3000ms | 2000ms | 0.1 | 300ms | 0.85  |
| Settings   | 2300ms | 1700ms | 0.1 | 200ms | 0.92  |

## Conventions

- Define budgets in `performance-budgets.ts`
- Use `validateAgainstBudget()` helper

## Anti-Patterns

- Never raise budgets without investigation
- Never skip Lighthouse in CI
