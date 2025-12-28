# tests/performance/

Lighthouse-based performance testing with budget enforcement.

## Structure

```
tests/performance/
├── config/
│   └── performance-budgets.ts   # Per-page metric thresholds
├── fixtures/                    # Performance test fixtures
├── utils/
│   └── lighthouse-utils.ts      # Lighthouse runner helpers
└── *.performance.spec.ts        # Test files
```

## Commands

```bash
pnpm test:performance            # Run performance tests
```

## Budgets (Core Web Vitals)

| Page       | LCP    | FCP    | CLS | TBT   | Perf Score |
| ---------- | ------ | ------ | --- | ----- | ---------- |
| Homepage   | 2500ms | 1800ms | 0.1 | 200ms | 0.90       |
| GPT Editor | 3000ms | 2000ms | 0.1 | 300ms | 0.85       |
| Settings   | 2300ms | 1700ms | 0.1 | 200ms | 0.92       |

## Conventions

- **Budgets**: Define in `performance-budgets.ts`
- **Validation**: Use `validateAgainstBudget()` helper
- **CI**: Runs on PR via `test-performance.yaml`

## Anti-Patterns

- **Never raise budgets** without performance investigation
- **Never skip Lighthouse audits** in CI
