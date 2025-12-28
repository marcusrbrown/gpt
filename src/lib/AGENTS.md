# src/lib/AGENTS.md

This directory contains shared libraries and low-level utilities.

## What Lives Here

- Design system helpers (`design-system.ts`).
- Dexie/IndexedDB database wiring (`database.ts`).
- Cryptography helpers (`crypto.ts`) used by services.

## Conventions

- Keep these modules dependency-light and broadly reusable.
- Avoid importing React code here.
- Be careful with crypto and storage: follow the rules for encryption, secrets handling, and persistence.

## Tests

- Unit tests live under `lib/__tests__/`.
- Do not add `AGENTS.md` to any `__tests__/` directory.

## References

- Storage architecture rules: [../../docs/RULES.md](../../docs/RULES.md)
- Services layer: [../services/AGENTS.md](../services/AGENTS.md)
