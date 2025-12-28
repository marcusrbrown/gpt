# src/services/providers/AGENTS.md

This directory contains per-provider implementations and the provider registry.

## Conventions

- Keep provider implementations isolated; the UI should not import SDKs directly.
- Normalize provider behavior through shared interfaces and the registry.
- Never log API keys, auth headers, or user secrets.
- If you touch provider SDK usage, prefer consulting current vendor docs and keep changes minimal.

## Tests

- Provider tests live under `providers/__tests__/`.
- Do not add `AGENTS.md` to any `__tests__/` directory.

## References

- Services layer: [../AGENTS.md](../AGENTS.md)
- App rules: [../../../docs/RULES.md](../../../docs/RULES.md)
