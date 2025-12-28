# src/components/file-upload/AGENTS.md

This directory contains the file upload UI and related constants.

## Conventions

- Keep the UI resilient: validate file type/size early and surface clear errors.
- Never assume uploaded content is safe; parsing and processing must happen in services with proper validation.
- Avoid reading/writing persisted data directly; use storage/services layers.

## References

- Components conventions: [../AGENTS.md](../AGENTS.md)
- Storage/security rules: [../../../docs/RULES.md](../../../docs/RULES.md)
- Services layer: [../../services/AGENTS.md](../../services/AGENTS.md)
