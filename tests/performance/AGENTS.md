# tests/performance/AGENTS.md

Performance testing with budgets. Metrics come from the browser Performance API (FCP, LCP, CLS, approximate TBT) — not Lighthouse.

## Structure

```
performance/
├── config/performance-budgets.ts  # Metric thresholds
├── fixtures/                      # Test fixtures
├── utils/performance-utils.ts     # Browser Performance API metrics
└── *.performance.spec.ts          # Tests
```

## Budgets (Core Web Vitals)

| Page       | LCP    | FCP    | CLS | TBT   |
| ---------- | ------ | ------ | --- | ----- |
| Homepage   | 2500ms | 1800ms | 0.1 | 200ms |
| GPT Editor | 3000ms | 2000ms | 0.1 | 300ms |
| Settings   | 2300ms | 1700ms | 0.1 | 200ms |

## Conventions

- Define budgets in `performance-budgets.ts`
- Use `validateAgainstBudget()` helper

## Anti-Patterns

- Never raise budgets without investigation
- Never assert on values that are not measured (no hardcoded scores)
