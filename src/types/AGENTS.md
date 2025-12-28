# src/types/AGENTS.md

This directory contains TypeScript types and Zod schemas for core domain objects.

## Conventions

- Define Zod schemas first (e.g., `SomethingSchema`), then export inferred types via `z.infer<typeof SomethingSchema>`.
- Keep schemas focused and reusable across services and UI.

## Tests

- Schema/type tests live under `types/__tests__/`.
- Do not add `AGENTS.md` to any `__tests__/` directory.

## References

- Project-wide rules: [../../docs/RULES.md](../../docs/RULES.md)
- Services layer (primary consumer): [../services/AGENTS.md](../services/AGENTS.md)
