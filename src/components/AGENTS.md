# src/components/AGENTS.md

Reusable React UI components. HeroUI + TailwindCSS design tokens.

## Conventions

- Use HeroUI primitives (`@heroui/react`)
- Use `cn`, `ds` from `@/lib/design-system` — never hardcode colors
- Async handlers: `.catch(console.error)` to avoid floating promises
- Buttons: `Button` comes from `@heroui-v3/react` (see `docs/design-system.md`, "Button (v3)"); icons go in as children, no `startContent`
- Inputs with icons: add `classNames={{ inputWrapper: 'flex items-center' }}`
- Modals: `Modal` comes from `@heroui-v3/react` (see `docs/design-system.md`, "Modal (v3)"): always `<Modal.Container placement="center">` inside `<Modal.Backdrop variant="opaque">`. `Select` comes from `@heroui-v3/react` too ("Select (v3)"): never put a v2 overlay inside a v3 `Modal`

## Tests

- Component tests: `__tests__/*.test.tsx`
- No AGENTS.md in `__tests__/` directories

## Subdirectories

| Directory                                     | Purpose                        |
| --------------------------------------------- | ------------------------------ |
| [chat/](chat/AGENTS.md)                       | Chat interface components      |
| [docs/](docs/AGENTS.md)                       | In-app documentation UI        |
| `empty-states/`                               | Placeholder UIs (no providers) |
| [file-upload/](file-upload/AGENTS.md)         | File upload components         |
| [forms/](forms/AGENTS.md)                     | Form primitives                |
| [gpt-editor-tabs/](gpt-editor-tabs/AGENTS.md) | GPT editor tab components      |
| [layouts/](layouts/AGENTS.md)                 | Page layout shells             |
| [mcp/](mcp/AGENTS.md)                         | MCP server management UI       |
| [settings/](settings/AGENTS.md)               | Settings panels                |
