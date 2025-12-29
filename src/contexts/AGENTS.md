# src/contexts/AGENTS.md

React Contexts and Providers for cross-app state.

## Provider Order (in providers.tsx)

```
NextThemesProvider → HeroUIProvider → StorageProvider → SessionProvider → AIProvider → ConversationProvider
```

## Conventions

- Expose small, stable API (hooks + provider components)
- Keep heavy logic in services/hooks, not providers
- Provider composition order documented in `src/providers.tsx`

## Tests

- Context tests: `__tests__/*.test.tsx`
- No AGENTS.md in `__tests__/` directories
