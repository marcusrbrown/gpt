# Copilot Instructions

Local-first GPT creation platform. React 19 + TypeScript 5.9 + Vite 7 + HeroUI + TailwindCSS 4 + IndexedDB (Dexie) + Web Crypto.

## Canonical References

Read these before making changes — they are the source of truth:

- [AGENTS.md](../AGENTS.md) — Root project guide, commands, conventions, anti-patterns
- [src/AGENTS.md](../src/AGENTS.md) — Source architecture, routes, provider hierarchy
- [docs/RULES.md](../docs/RULES.md) — Comprehensive coding standards (894 lines)
- [docs/design-system.md](../docs/design-system.md) — UI tokens and component patterns

Each `src/` subdirectory has its own AGENTS.md with module-specific conventions.

## Verification Commands

Run these before marking any work complete:

```bash
pnpm lint                   # ESLint — 0 errors required
pnpm test                   # Vitest unit tests — all passing
pnpm build                  # tsgo type-check + Vite production build
pnpm test:accessibility     # WCAG 2.1 AA — axe-core via Playwright
pnpm test:e2e               # Full user flows — Playwright (auto-starts dev server)
```

## Do / Don't

### Types

- ✅ Zod schema first, infer type: `type GPTConfig = z.infer<typeof GPTConfigSchema>`
- ❌ No manual `interface` without backing Zod schema
- ❌ Never `as any`, `@ts-ignore`, or `@ts-expect-error`

### Imports

- ✅ Use `@/` alias: `import { cn } from '@/lib/design-system'`
- ❌ No relative paths from src/: `../../lib/design-system`

### Async Handlers

- ✅ `onPress={() => handleSave().catch(console.error)}`
- ❌ Never `void` operator: `onPress={() => void handleSave()}`

### Error Handling

- ✅ `catch (error_)` naming, re-throw for error boundaries
- ❌ No empty catch blocks, no generic `catch (e) {}`

### Storage

- ✅ IndexedDB via Dexie through `useStorage()` hook
- ❌ Never `localStorage` for structured or sensitive data

### Styling

- ✅ Semantic design tokens: `ds.surface.primary`, `ds.content.secondary`
- ❌ Never hardcoded colors: `bg-gray-800`, `text-white`, `#1a1a2e`

### HeroUI Components

- ✅ Icon buttons: `className="flex items-center gap-2"` + `startContent`
- ✅ Input icons: `classNames={{ inputWrapper: 'flex items-center' }}` + `startContent`
- ✅ Modals: `placement="center" backdrop="opaque"`

### Provider Abstraction

- ✅ Access LLM through hooks: `useAIProvider()`, `useOpenAIService()`
- ❌ Never import SDKs directly in components (`@anthropic-ai/sdk`, `openai`)

## Architecture Rules

- **Provider hierarchy**: `NextThemesProvider → HeroUIProvider → ToastProvider → StorageProvider → SessionProvider → AIProvider → MCPProvider → ConversationProvider`
- **Routes**: `/`, `/gpt/:gptId`, `/gpt/new`, `/gpt/edit/:gptId`, `/gpt/test/:gptId`, `/backup`, `/settings`, `/oauth/callback`, `/docs/*`
- **State**: Access via hooks only (`useStorage`, `useAIProvider`, `useConversationContext`, etc.)
- **Security**: API keys encrypted with AES-GCM via PBKDF2. Never log, display, or include keys in error messages.

## Testing Conventions

- **Unit tests**: `src/**/__tests__/*.test.ts` — Vitest with jsdom, fake-indexeddb
- **E2E tests**: `tests/e2e/*.spec.ts` — Playwright with page objects in `tests/e2e/page-objects/`
- **Selectors**: Use `data-testid`, roles, labels — never CSS classes
- **Waiting**: Playwright auto-waiting — never `page.waitForTimeout()`
- **Test data**: Use `tests/e2e/utils/test-data-factory.ts` — never hardcode
- **Do NOT** manually start the dev server before E2E tests — Playwright handles it

## Commit Conventions

Semantic commits: `type(scope): description`

Types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `ci`, `style`, `perf`, `build`

## File Organization

- Components: `src/components/` — HeroUI-based, subdirectories for feature groups
- Services: `src/services/` — Business logic, one file per domain (no catch-all `utils.ts`)
- Hooks: `src/hooks/` — One hook per file, focused and composable
- Types: `src/types/` — Zod schemas, one file per domain
- Pages: `src/pages/` — Route-level only, delegate logic to hooks/services
- 200 LOC hard limit per file (excluding prompt strings)
