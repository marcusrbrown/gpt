# src/types/AGENTS.md

TypeScript types and Zod schemas for domain objects.

## Key Types

| File               | Contents                 |
| ------------------ | ------------------------ |
| `gpt.ts`           | GPT configuration schema |
| `agent.ts`         | Agent types              |
| `anthropic.ts`     | Anthropic-specific types |
| `export-import.ts` | Export/import schemas    |
| `provider.ts`      | Provider interfaces      |

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
