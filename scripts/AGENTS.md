# scripts/AGENTS.md

This directory contains TypeScript/Node scripts used by local dev and CI to aggregate, format, and report test results.

## Scope

- Entry scripts live in `scripts/*.ts`.
- Shared helpers live in `scripts/lib/`.

## How Scripts Are Run

- Typical execution uses `tsx` via package scripts.
- Prefer running via `pnpm` scripts so CI and local usage match.

Useful commands (from repository root):

- `pnpm test:aggregate` (runs `tsx scripts/aggregate-test-results.ts`)

## Conventions

- Keep scripts deterministic (stable ordering, stable output) so CI diffs are meaningful.
- Avoid writing files outside the repo unless explicitly required; prefer printing to stdout or writing to a clearly named artifact path.
- Don’t log secrets or environment variables.
- If you add new scripts, also add a `package.json` script entry when it’s something others should run.

## References

- Project-wide agent guidance: [../AGENTS.md](../AGENTS.md)
- Engineering rules (testing, security, storage): [../docs/RULES.md](../docs/RULES.md)
