# src/components/mcp/AGENTS.md

Model Context Protocol (MCP) UI components. Server management and tool visualization.

## Components

| File                              | Purpose                              |
| --------------------------------- | ------------------------------------ |
| `mcp-server-card.tsx`             | Server status card with connect/edit |
| `mcp-server-form.tsx`             | Server configuration form (add/edit) |
| `mcp-tool-explorer.tsx`           | Browse available tools from a server |
| `mcp-tool-call-visualization.tsx` | Render tool call results in chat     |

## Conventions

- Access MCP state via `useMCP()` and `useMCPTools()` hooks
- Types from `@/types/mcp` (`MCPServerConfig`, `ConnectionStatus`)
- Service logic in `@/services/mcp-client-service.ts`
- Follow standard HeroUI patterns (see parent AGENTS.md)

## Patterns

```tsx
// Connection toggle with proper error handling
const handleToggleConnection = async () => {
  setIsToggling(true)
  try {
    status === "connected" ? await disconnect(id) : await connect(id)
  } catch (error) {
    console.error("Failed to toggle connection:", error)
  } finally {
    setIsToggling(false)
  }
}
```

## Anti-Patterns

- Never import MCP SDK directly — use hooks/services
- Never store server credentials in component state
