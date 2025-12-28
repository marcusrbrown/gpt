# src/components/AGENTS.md

This directory contains reusable React UI components (HeroUI + TailwindCSS design tokens).

## Conventions

- Use HeroUI primitives (`@heroui/react`) for standard UI building blocks.
- Use `cn`, `ds`, and related utilities from `@/lib/design-system` rather than hard-coding colors/typography.
- Prefer self-explanatory code; avoid comments unless explaining non-obvious constraints.

## Async Event Handlers (Important)

When triggering async logic from UI events (e.g. `onPress`, `onClick`), terminate the call with `.catch(...)` to avoid floating promises.

## Tests

- Component unit tests live under `components/__tests__/`.
- Do not add `AGENTS.md` to any `__tests__/` directory.

## Subdirectories

- Docs UI: [docs/AGENTS.md](docs/AGENTS.md)
- File upload UI: [file-upload/AGENTS.md](file-upload/AGENTS.md)
- Form primitives: [forms/AGENTS.md](forms/AGENTS.md)
- Settings panels: [settings/AGENTS.md](settings/AGENTS.md)

## References

- App rules and patterns: [../../docs/RULES.md](../../docs/RULES.md)
- Design system: [../lib/AGENTS.md](../lib/AGENTS.md)
