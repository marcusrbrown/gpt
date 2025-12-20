# AGENTS.md

React 19 + TypeScript + Vite | HeroUI + TailwindCSS 4 | Local-first (localStorage + Zod validation)

## Commands

- `pnpm install` - Install dependencies
- `pnpm dev` - Start dev server (localhost:5173)
- `pnpm lint` - ESLint with auto-fix
- `pnpm test` - Run all unit tests (Vitest)
- `pnpm test -t "pattern"` - Run single test by name
- `pnpm test:e2e` - Playwright E2E tests
- `pnpm test:accessibility` - WCAG 2.1 AA audit

## Code Style

- **Imports**: Use `@/` alias for src/ (e.g., `import {cn} from '@/lib/design-system'`)
- **Types**: Define Zod schemas first, infer types with `z.infer<typeof Schema>`
- **Handlers**: Prefix with "handle" (e.g., `handleSubmit`)
- **State**: Access via hooks (`useStorage()`, `useOpenAIService()`) - never access localStorage directly
- **Errors**: Wrap in try/catch, re-throw for component handling, use `error_` variable name
- **UI**: Use HeroUI components (`@heroui/react`) and design system (`cn`, `ds`, `compose` from `@/lib/design-system`)
- **Style tokens**: Use semantic colors (`surface-primary`, `content-primary`) - never hardcode colors
- **Flow**: Prefer early returns over nested conditions; minimal changes only
