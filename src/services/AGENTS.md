# src/services/AGENTS.md

This directory contains business logic and integration code (storage, encryption, import/export, provider orchestration).

## Conventions

- Treat this layer as the boundary between UI and external systems (IndexedDB, crypto, LLM SDKs).
- Follow the local-first storage rules: persist structured data via IndexedDB/Dexie.
- Use explicit error handling (`catch (error_)`) and re-throw when callers need to surface failures.
- Avoid leaking secrets into logs.

## Tests

- Service tests live under `services/__tests__/`.
- Do not add `AGENTS.md` to any `__tests__/` directory.

## Providers

- Provider implementations live under: [providers/AGENTS.md](providers/AGENTS.md)

## References

- Storage/security rules: [../../docs/RULES.md](../../docs/RULES.md)
- Shared utilities: [../lib/AGENTS.md](../lib/AGENTS.md)
