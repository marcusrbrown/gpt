# src/hooks/AGENTS.md

This directory contains custom React hooks that provide access to app state and services.

## Conventions

- Hooks should be focused and composable.
- Access persisted data via `useStorage()` and service abstractions; do not read/write `localStorage` directly.
- Prefer returning stable callbacks and memoized values when hooks are used in hot render paths.

## Tests

- Hook tests live under `hooks/__tests__/`.
- Do not add `AGENTS.md` to any `__tests__/` directory.

## References

- Contexts: [../contexts/AGENTS.md](../contexts/AGENTS.md)
- Services: [../services/AGENTS.md](../services/AGENTS.md)
- Rules: [../../docs/RULES.md](../../docs/RULES.md)
