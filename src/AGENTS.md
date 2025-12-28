# src/AGENTS.md

This directory contains the React application (React 19 + TypeScript + Vite) and all product code.

## Architecture Notes

- **Local-first**: persisted data must use IndexedDB (Dexie). Avoid `localStorage` for anything sensitive or structured.
- **Provider abstraction**: AI providers are implemented behind a service/provider layer; avoid calling SDKs directly from components.
- **Validation**: define Zod schemas first, then infer types from schemas.

## Key Entry Points

- `main.tsx`, `App.tsx`: app bootstrap and top-level routing/layout.
- `providers.tsx` and `contexts/`: global providers and app state.

## Cross-Cutting Conventions

- Imports: use `@/` alias for `src/`.
- UI: use HeroUI components (`@heroui/react`) and the design system utilities in `lib/design-system.ts`.
- Styling: only use semantic Tailwind tokens (no hard-coded colors).
- Async UI handlers: in event callbacks (e.g. HeroUI `onPress`), call async functions and terminate with `.catch(...)`.
- Error handling: use `catch (error_)` and re-throw when the caller needs to surface it.

## Where To Look

- UI components: [components/AGENTS.md](components/AGENTS.md)
- Hooks and state access: [hooks/AGENTS.md](hooks/AGENTS.md), [contexts/AGENTS.md](contexts/AGENTS.md)
- Storage/crypto/provider logic: [services/AGENTS.md](services/AGENTS.md), [lib/AGENTS.md](lib/AGENTS.md)
- Schemas/types: [types/AGENTS.md](types/AGENTS.md)

## References

- Project-wide agent guidance: [../AGENTS.md](../AGENTS.md)
- Comprehensive rules (storage, security, tests, patterns): [../docs/RULES.md](../docs/RULES.md)
