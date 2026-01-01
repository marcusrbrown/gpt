# src/AGENTS.md

React 19 application source. All product code lives here.

## Entry Points

- `main.tsx` → `App.tsx` → `providers.tsx`: Bootstrap, routing, provider hierarchy
- Routes: `/` (Home), `/gpt/:gptId` (Showcase), `/gpt/new`, `/gpt/edit/:id`, `/gpt/test/:id`, `/backup`, `/docs/*`

## Provider Hierarchy

```
NextThemesProvider → HeroUIProvider → StorageProvider → SessionProvider → AIProvider → ConversationProvider
```

## Architecture Rules

- **Local-first**: IndexedDB via Dexie — never localStorage for structured/sensitive data
- **Provider abstraction**: Never call LLM SDKs directly from components
- **Validation**: Zod schemas first, infer types

## Conventions

- Imports: `@/` alias for src/
- UI: HeroUI + design system (`cn`, `ds` from `@/lib/design-system`)
- Styling: Semantic tokens only (no hardcoded colors)
- Async handlers: `.catch(console.error)` in onPress/onClick
- Errors: `catch (error_)`, re-throw for boundaries

## Where to Look

| Task           | Location                                                                     |
| -------------- | ---------------------------------------------------------------------------- |
| UI components  | [components/AGENTS.md](components/AGENTS.md)                                 |
| State/hooks    | [hooks/AGENTS.md](hooks/AGENTS.md), [contexts/AGENTS.md](contexts/AGENTS.md) |
| Business logic | [services/AGENTS.md](services/AGENTS.md)                                     |
| Types/schemas  | [types/AGENTS.md](types/AGENTS.md)                                           |
| Utilities      | [lib/AGENTS.md](lib/AGENTS.md)                                               |
