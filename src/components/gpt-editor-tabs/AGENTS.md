# src/components/gpt-editor-tabs/AGENTS.md

Modular tab components for GPT configuration. Used by `GPTEditorPage`.

## Tabs

| Tab                   | Purpose                                    |
| --------------------- | ------------------------------------------ |
| `GeneralTab`          | Name, description, system prompt, starters |
| `KnowledgeTab`        | File/URL knowledge sources, vector config  |
| `ToolsTab`            | Tool selection (code, web, DALL-E, MCP)    |
| `AdvancedSettingsTab` | Model params, temperature, response format |

## Patterns

- Shared `gpt` state passed from parent `GPTEditorPage`
- Each tab receives `gpt` + `onUpdate` callback
- Use `Accordion` for collapsible sections within tabs
- Conversation starters: editable list with add/remove

## Conventions

- Tab changes: validate current tab before switching
- Auto-save: parent handles debounced persistence
- Form validation: inline errors, Zod schemas
