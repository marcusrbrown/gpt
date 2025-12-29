# src/hooks/AGENTS.md

Custom React hooks for state access and services.

## Key Hooks

| Hook                       | Purpose                            |
| -------------------------- | ---------------------------------- |
| `useStorage()`             | GPT CRUD, conversation persistence |
| `useAIProvider()`          | LLM provider access                |
| `useConversationContext()` | Active conversation state          |
| `useGptValidation()`       | GPT config validation              |

## Conventions

- Focused and composable
- Access data via `useStorage()` — never localStorage directly
- Return stable callbacks and memoized values for hot paths

## Tests

- Hook tests: `__tests__/*.test.ts`
- No AGENTS.md in `__tests__/` directories
