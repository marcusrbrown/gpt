# src/components/file-upload/AGENTS.md

File upload UI and validation.

## Conventions

- Validate file type/size early, surface clear errors
- Never assume uploaded content is safe
- Use storage/services for persistence, not direct browser APIs
