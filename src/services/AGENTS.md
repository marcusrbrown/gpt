# src/services/AGENTS.md

Business logic layer. Boundary between UI and external systems.

## Key Services

| Service                   | Purpose                                         |
| ------------------------- | ----------------------------------------------- |
| `IndexedDBStorageService` | Dexie wrapper, LRU cache, BroadcastChannel sync |
| `EncryptionService`       | Web Crypto AES-GCM + PBKDF2 for secrets         |
| `ProviderRegistryImpl`    | LLM provider registration and lookup            |
| `conversation-*.ts`       | Export, search, management                      |

## Conventions

- Persist structured data via IndexedDB/Dexie only
- Error handling: `catch (error_)`, re-throw when callers need it
- Never log secrets (API keys, auth headers)

## Tests

- Service tests: `__tests__/*.test.ts`
- No AGENTS.md in `__tests__/` directories

## Subdirectory

- [providers/AGENTS.md](providers/AGENTS.md) — LLM provider implementations
