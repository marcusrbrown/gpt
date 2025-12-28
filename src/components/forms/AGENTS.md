# src/components/forms/AGENTS.md

This directory contains small, reusable form primitives and wrappers.

## Conventions

- Keep form components controlled and accessible.
- Prefer composable building blocks over large “do everything” form components.
- Validation rules should come from Zod schemas in `src/types/` and hooks in `src/hooks/`.

## Tests

- Form component tests live under `forms/__tests__/`.
- Do not add `AGENTS.md` to any `__tests__/` directory.

## References

- Components conventions: [../AGENTS.md](../AGENTS.md)
- Types and schemas: [../../types/AGENTS.md](../../types/AGENTS.md)
