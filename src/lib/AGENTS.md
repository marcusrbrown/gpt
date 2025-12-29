# src/lib/AGENTS.md

Shared libraries and low-level utilities.

## Files

| File               | Purpose                                          |
| ------------------ | ------------------------------------------------ |
| `design-system.ts` | `cn`, `ds`, `compose` utilities, semantic tokens |
| `database.ts`      | Dexie/IndexedDB setup                            |
| `crypto.ts`        | Web Crypto helpers for encryption                |

## Conventions

- Keep dependency-light and broadly reusable
- Avoid importing React code here
- Follow encryption/storage rules for crypto and persistence

## Tests

- Utility tests: `__tests__/*.test.ts`
- No AGENTS.md in `__tests__/` directories
