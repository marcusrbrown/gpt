# src/hooks/AGENTS.md

Custom React hooks for state access and services.

## Key Hooks

| Hook                       | Purpose                            |
| -------------------------- | ---------------------------------- |
| `useStorage()`             | GPT CRUD, conversation persistence |
| `useAIProvider()`          | LLM provider access                |
| `useConversationContext()` | Active conversation state          |
| `useGptValidation()`       | GPT config validation              |
| `useAutoSave()`            | Debounced auto-save for editor     |
| `useMCP()`                 | MCP server state and connections   |
| `useOllamaStatus()`        | Ollama local server availability   |
| `useOpenAIService()`       | OpenAI service instance access     |
| `useReducedMotion()`       | Prefers-reduced-motion media query |
| `useSession()`             | Session context (auth, timeout)    |
| `useStorageQuota()`        | IndexedDB storage usage monitoring |

## Conventions

- Focused and composable
- Access data via `useStorage()` — never localStorage directly
- Return stable callbacks and memoized values for hot paths

## Tests

- Hook tests: `__tests__/*.test.ts`
- No AGENTS.md in `__tests__/` directories
