# src/types/AGENTS.md

TypeScript types and Zod schemas for domain objects.

## Key Types

| File                | Contents                                |
| ------------------- | --------------------------------------- |
| `gpt.ts`            | GPT configuration schema                |
| `gpt-extensions.ts` | Extended GPT config (folders, versions) |
| `agent.ts`          | Agent types                             |
| `anthropic.ts`      | Anthropic-specific types                |
| `export-import.ts`  | Export/import schemas                   |
| `knowledge.ts`      | Knowledge base types (files, URLs)      |
| `mcp.ts`            | MCP server config, connection types     |
| `ollama.ts`         | Ollama model/provider types             |
| `provider.ts`       | Provider interfaces                     |

## Pattern

```typescript
// 1. Define Zod schema
const GPTConfigSchema = z.object({ ... })

// 2. Infer type
type GPTConfig = z.infer<typeof GPTConfigSchema>
```

## Tests

- Schema tests: `__tests__/*.test.ts`
- No AGENTS.md in `__tests__/` directories
