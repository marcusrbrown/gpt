# src/components/settings/AGENTS.md

This directory contains settings panels and UI for configuring providers and app behavior.

## Conventions

- Never log or display secrets in a way that could leak via console output.
- Persist settings via the storage/services layer rather than direct browser APIs.
- Keep provider-specific logic out of components; use hooks and services.

## References

- Components conventions: [../AGENTS.md](../AGENTS.md)
- Storage/services layer: [../../services/AGENTS.md](../../services/AGENTS.md)
- Security/storage rules: [../../../docs/RULES.md](../../../docs/RULES.md)
