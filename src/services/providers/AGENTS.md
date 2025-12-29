# src/services/providers/AGENTS.md

LLM provider implementations and registry.

## Architecture

- `BaseLLMProvider` — Abstract base class for all providers
- `ProviderRegistryImpl` — Registration and lookup
- Per-provider files: `openai-provider.ts`, `anthropic-provider.ts`, etc.

## Conventions

- Keep implementations isolated; UI never imports SDKs directly
- Normalize behavior through shared interfaces
- Never log API keys, auth headers, or secrets
- Consult current vendor docs for SDK changes

## Tests

- Provider tests: `__tests__/*.test.ts`
- No AGENTS.md in `__tests__/` directories
