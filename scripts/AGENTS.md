# scripts/AGENTS.md

TypeScript scripts for local dev and CI. Test result aggregation and reporting.

## Structure

```
scripts/
├── lib/
│   ├── formatters/   # Output formatters
│   └── parsers/      # Result parsers
├── aggregate-test-results.ts
└── report-test-results.ts
```

## Commands

```bash
pnpm test:aggregate   # Aggregate test results
```

## Conventions

- Run via `pnpm` scripts for consistency
- Keep output deterministic (stable ordering)
- Don't log secrets or env vars
- Add `package.json` script entry for new scripts
