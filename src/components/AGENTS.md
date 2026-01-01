# src/components/AGENTS.md

Reusable React UI components. HeroUI + TailwindCSS design tokens.

## Conventions

- Use HeroUI primitives (`@heroui/react`)
- Use `cn`, `ds` from `@/lib/design-system` — never hardcode colors
- Async handlers: `.catch(console.error)` to avoid floating promises
- Buttons with icons: add `className="flex items-center gap-2"`
- Inputs with icons: add `classNames={{ inputWrapper: 'flex items-center' }}`
- Modals: always `placement="center" backdrop="opaque"`

## Tests

- Component tests: `__tests__/*.test.tsx`
- No AGENTS.md in `__tests__/` directories

## Subdirectories

| Directory                                     | Purpose                   |
| --------------------------------------------- | ------------------------- |
| [chat/](chat/AGENTS.md)                       | Chat interface components |
| [docs/](docs/AGENTS.md)                       | In-app documentation UI   |
| [file-upload/](file-upload/AGENTS.md)         | File upload components    |
| [forms/](forms/AGENTS.md)                     | Form primitives           |
| [gpt-editor-tabs/](gpt-editor-tabs/AGENTS.md) | GPT editor tab components |
| [mcp/](mcp/AGENTS.md)                         | MCP server management UI  |
| [settings/](settings/AGENTS.md)               | Settings panels           |

## Deprecated

- `gpt-editor.tsx` — Use `GPTEditorPage` + tab components instead
- `gpt-test-pane.tsx` — Use `ChatInterface` instead
