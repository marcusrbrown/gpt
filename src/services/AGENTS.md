# src/services/AGENTS.md

Business logic layer. Boundary between UI and external systems.

## Key Services

| Service                          | Purpose                                         |
| -------------------------------- | ----------------------------------------------- |
| `storage.ts`                     | Dexie wrapper, LRU cache, BroadcastChannel sync |
| `encryption.ts`                  | Web Crypto AES-GCM + PBKDF2 for secrets         |
| `openai-service.ts`              | OpenAI API calls, streaming, tool execution     |
| `mcp-client-service.ts`          | MCP server connection, tool discovery           |
| `mcp-oauth-provider.ts`          | OAuth flow for MCP server auth                  |
| `knowledge-service.ts`           | Knowledge base file/URL processing              |
| `import-service.ts`              | GPT config import with validation               |
| `export-service.ts`              | GPT config + conversation export                |
| `conversation-export-service.ts` | Conversation-specific export formats            |
| `conversation-search-service.ts` | Full-text conversation search                   |
| `cross-tab-sync.ts`              | BroadcastChannel cross-tab state sync           |
| `folder-service.ts`              | GPT folder organization                         |
| `version-history.ts`             | GPT config version tracking                     |
| `migration.ts`                   | IndexedDB schema migrations                     |
| `session.ts`                     | User session management                         |

## Conventions

- Persist structured data via IndexedDB/Dexie only
- Error handling: `catch (error_)`, re-throw when callers need it
- Never log secrets (API keys, auth headers)

## Tests

- Service tests: `__tests__/*.test.ts`
- No AGENTS.md in `__tests__/` directories

## Subdirectory

- [providers/AGENTS.md](providers/AGENTS.md) — LLM provider implementations
