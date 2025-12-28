# src/contexts/AGENTS.md

This directory contains React Contexts and Providers for cross-app state.

## Conventions

- Contexts should expose a small, stable API (hooks and provider components).
- Keep heavy business logic out of context providers; delegate to services and hooks.
- Ensure provider composition order is intentional and documented in `src/providers.tsx`.

## Tests

- Context tests live under `contexts/__tests__/`.
- Do not add `AGENTS.md` to any `__tests__/` directory.

## References

- App architecture: [../AGENTS.md](../AGENTS.md)
- Services layer: [../services/AGENTS.md](../services/AGENTS.md)
- Project rules: [../../docs/RULES.md](../../docs/RULES.md)
