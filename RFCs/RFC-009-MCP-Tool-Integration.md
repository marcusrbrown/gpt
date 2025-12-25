# RFC-009: MCP Tool Integration

| Field            | Value                                              |
| ---------------- | -------------------------------------------------- |
| **Status**       | Pending                                            |
| **Priority**     | SHOULD                                             |
| **Complexity**   | High                                               |
| **Effort**       | 3 weeks                                            |
| **Dependencies** | RFC-002 (Security), RFC-003 (Provider Abstraction) |

## Summary

Implement Model Context Protocol (MCP) support enabling GPTs to connect to external tool servers. This RFC covers MCP client implementation, tool discovery, execution, and a UI for managing server connections.

## Prerequisites

| Prerequisite               | RFC     | Status       |
| -------------------------- | ------- | ------------ |
| Security Infrastructure    | RFC-002 | ✅ Completed |
| Provider Abstraction Layer | RFC-003 | ✅ Completed |

## Features Addressed

| Feature ID | Feature Name                 | Coverage |
| ---------- | ---------------------------- | -------- |
| F-301      | MCP Server Connection        | Full     |
| F-302      | Tool Discovery               | Full     |
| F-303      | Tool Execution Visualization | Full     |
| F-304      | Custom Tool Endpoints        | Full     |

## Technical Specification

### MCP Protocol Overview

The Model Context Protocol (MCP) is an open standard for connecting AI assistants to external tools and data sources. It supports:

- **Transports**: stdio (local processes) and HTTP/SSE (remote servers)
- **Resources**: Read-only data sources
- **Tools**: Executable functions with JSON Schema parameters
- **Prompts**: Pre-defined prompt templates

### Zod Schemas

```typescript
import {z} from "zod"

// MCP Transport types
export const MCPTransportTypeSchema = z.enum(["stdio", "http", "sse"])

// Server configuration
export const MCPServerConfigSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  transport: MCPTransportTypeSchema,

  // For stdio transport
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),

  // For HTTP/SSE transport
  url: z.string().url().optional(),
  headers: z.record(z.string()).optional(),

  // Authentication
  authentication: z
    .discriminatedUnion("type", [
      z.object({type: z.literal("none")}),
      z.object({type: z.literal("bearer"), token: z.string()}),
      z.object({type: z.literal("api-key"), key: z.string(), header: z.string().default("x-api-key")}),
      z.object({type: z.literal("basic"), username: z.string(), password: z.string()}),
    ])
    .default({type: "none"}),

  // Connection settings
  timeout: z.number().min(1000).max(300000).default(30000),
  retryAttempts: z.number().min(0).max(5).default(3),

  // Status
  enabled: z.boolean().default(true),
  lastConnectedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

// Tool JSON Schema (subset)
export const JSONSchemaPropertySchema: z.ZodType<JSONSchemaProperty> = z.lazy(() =>
  z.object({
    type: z.enum(["string", "number", "integer", "boolean", "array", "object"]),
    description: z.string().optional(),
    enum: z.array(z.unknown()).optional(),
    default: z.unknown().optional(),
    items: JSONSchemaPropertySchema.optional(),
    properties: z.record(JSONSchemaPropertySchema).optional(),
    required: z.array(z.string()).optional(),
  }),
)

export const MCPToolSchema = z.object({
  name: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_-]*$/),
  description: z.string().optional(),
  inputSchema: z.object({
    type: z.literal("object"),
    properties: z.record(JSONSchemaPropertySchema).optional(),
    required: z.array(z.string()).optional(),
  }),
})

// MCP Resource
export const MCPResourceSchema = z.object({
  uri: z.string(),
  name: z.string(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
})

// MCP Prompt
export const MCPPromptSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  arguments: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        required: z.boolean().optional(),
      }),
    )
    .optional(),
})

// Server capabilities (discovered at connection)
export const MCPServerCapabilitiesSchema = z.object({
  tools: z.array(MCPToolSchema).default([]),
  resources: z.array(MCPResourceSchema).default([]),
  prompts: z.array(MCPPromptSchema).default([]),
})

// Tool call request
export const MCPToolCallSchema = z.object({
  id: z.string(),
  serverId: z.string().uuid(),
  toolName: z.string(),
  arguments: z.record(z.unknown()),
  status: z.enum(["pending", "running", "success", "error"]),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  result: z.unknown().optional(),
  error: z.string().optional(),
})

// MCP Messages
export const MCPRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]),
  method: z.string(),
  params: z.record(z.unknown()).optional(),
})

export const MCPResponseSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]),
  result: z.unknown().optional(),
  error: z
    .object({
      code: z.number(),
      message: z.string(),
      data: z.unknown().optional(),
    })
    .optional(),
})

// Type exports
export type MCPServerConfig = z.infer<typeof MCPServerConfigSchema>
export type MCPTool = z.infer<typeof MCPToolSchema>
export type MCPResource = z.infer<typeof MCPResourceSchema>
export type MCPServerCapabilities = z.infer<typeof MCPServerCapabilitiesSchema>
export type MCPToolCall = z.infer<typeof MCPToolCallSchema>
```

### Database Schema Extension

```typescript
// Add to database.ts
interface GPTDatabase extends Dexie {
  // ... existing tables
  mcpServers: Dexie.Table<MCPServerConfig, string>
  mcpToolCalls: Dexie.Table<MCPToolCall, string>
}

// Indexes
db.version(X).stores({
  mcpServers: "id, name, transport, enabled, updatedAt",
  mcpToolCalls: "id, serverId, toolName, status, startedAt, [serverId+status]",
})
```

### MCP Client Service

```typescript
export interface IMCPClientService {
  // Server management
  addServer(config: Omit<MCPServerConfig, "id" | "createdAt" | "updatedAt">): Promise<MCPServerConfig>
  updateServer(id: string, updates: Partial<MCPServerConfig>): Promise<MCPServerConfig>
  removeServer(id: string): Promise<void>
  listServers(): Promise<MCPServerConfig[]>

  // Connection management
  connect(serverId: string): Promise<MCPServerCapabilities>
  disconnect(serverId: string): Promise<void>
  getConnectionStatus(serverId: string): ConnectionStatus

  // Tool operations
  discoverTools(serverId: string): Promise<MCPTool[]>
  callTool(serverId: string, toolName: string, args: Record<string, unknown>): Promise<unknown>

  // Resource operations
  listResources(serverId: string): Promise<MCPResource[]>
  readResource(serverId: string, uri: string): Promise<{content: string; mimeType?: string}>

  // Events
  onConnectionChange(callback: (serverId: string, status: ConnectionStatus) => void): () => void
  onToolCall(callback: (call: MCPToolCall) => void): () => void
}

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error"

export class MCPClientService implements IMCPClientService {
  private connections: Map<string, MCPConnection> = new Map()
  private capabilities: Map<string, MCPServerCapabilities> = new Map()
  private eventEmitter = new EventTarget()

  async connect(serverId: string): Promise<MCPServerCapabilities> {
    const server = await db.mcpServers.get(serverId)
    if (!server) throw new Error("Server not found")

    this.emitStatus(serverId, "connecting")

    try {
      const connection = await this.createConnection(server)
      this.connections.set(serverId, connection)

      // Initialize and discover capabilities
      const capabilities = await this.initialize(connection)
      this.capabilities.set(serverId, capabilities)

      // Update last connected timestamp
      await db.mcpServers.update(serverId, {
        lastConnectedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      this.emitStatus(serverId, "connected")
      return capabilities
    } catch (error) {
      this.emitStatus(serverId, "error")
      throw error
    }
  }

  private async createConnection(server: MCPServerConfig): Promise<MCPConnection> {
    switch (server.transport) {
      case "http":
        return new HTTPMCPConnection(server)
      case "sse":
        return new SSEMCPConnection(server)
      case "stdio":
        throw new Error("stdio transport not supported in browser")
      default:
        throw new Error(`Unknown transport: ${server.transport}`)
    }
  }

  private async initialize(connection: MCPConnection): Promise<MCPServerCapabilities> {
    // Send initialize request
    const initResult = await connection.request("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {},
        resources: {},
      },
      clientInfo: {
        name: "gpt-platform",
        version: "1.0.0",
      },
    })

    // Send initialized notification
    await connection.notify("notifications/initialized", {})

    // Discover tools
    const toolsResult = await connection.request("tools/list", {})
    const tools = MCPToolSchema.array().parse(toolsResult.tools || [])

    // Discover resources
    const resourcesResult = await connection.request("resources/list", {})
    const resources = MCPResourceSchema.array().parse(resourcesResult.resources || [])

    return {tools, resources, prompts: []}
  }

  async callTool(serverId: string, toolName: string, args: Record<string, unknown>): Promise<unknown> {
    const connection = this.connections.get(serverId)
    if (!connection) throw new Error("Not connected to server")

    const callId = crypto.randomUUID()
    const call: MCPToolCall = {
      id: callId,
      serverId,
      toolName,
      arguments: args,
      status: "pending",
      startedAt: new Date().toISOString(),
    }

    await db.mcpToolCalls.add(call)
    this.emitToolCall(call)

    try {
      call.status = "running"
      await db.mcpToolCalls.update(callId, {status: "running"})
      this.emitToolCall(call)

      const result = await connection.request("tools/call", {
        name: toolName,
        arguments: args,
      })

      call.status = "success"
      call.result = result.content
      call.completedAt = new Date().toISOString()

      await db.mcpToolCalls.update(callId, {
        status: "success",
        result: result.content,
        completedAt: call.completedAt,
      })

      this.emitToolCall(call)
      return result.content
    } catch (error) {
      call.status = "error"
      call.error = error instanceof Error ? error.message : "Unknown error"
      call.completedAt = new Date().toISOString()

      await db.mcpToolCalls.update(callId, {
        status: "error",
        error: call.error,
        completedAt: call.completedAt,
      })

      this.emitToolCall(call)
      throw error
    }
  }
}
```

### HTTP/SSE Connection Implementation

```typescript
abstract class MCPConnection {
  protected server: MCPServerConfig
  protected requestId = 0

  constructor(server: MCPServerConfig) {
    this.server = server
  }

  abstract request(method: string, params?: Record<string, unknown>): Promise<unknown>
  abstract notify(method: string, params?: Record<string, unknown>): Promise<void>
  abstract close(): void
}

class HTTPMCPConnection extends MCPConnection {
  private headers: HeadersInit

  constructor(server: MCPServerConfig) {
    super(server)
    this.headers = this.buildHeaders()
  }

  private buildHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.server.headers,
    }

    const auth = this.server.authentication
    if (auth.type === "bearer") {
      headers["Authorization"] = `Bearer ${auth.token}`
    } else if (auth.type === "api-key") {
      headers[auth.header] = auth.key
    } else if (auth.type === "basic") {
      headers["Authorization"] = `Basic ${btoa(`${auth.username}:${auth.password}`)}`
    }

    return headers
  }

  async request(method: string, params?: Record<string, unknown>): Promise<unknown> {
    const id = ++this.requestId

    const response = await fetch(this.server.url!, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id,
        method,
        params,
      }),
      signal: AbortSignal.timeout(this.server.timeout),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = MCPResponseSchema.parse(await response.json())

    if (data.error) {
      throw new Error(`MCP Error ${data.error.code}: ${data.error.message}`)
    }

    return data.result
  }

  async notify(method: string, params?: Record<string, unknown>): Promise<void> {
    await fetch(this.server.url!, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        method,
        params,
      }),
    })
  }

  close(): void {
    // No persistent connection to close
  }
}

class SSEMCPConnection extends MCPConnection {
  private eventSource: EventSource | null = null
  private pendingRequests: Map<number, {resolve: Function; reject: Function}> = new Map()

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = new URL(this.server.url!)

      // Add auth as query param for SSE (headers not supported)
      const auth = this.server.authentication
      if (auth.type === "bearer") {
        url.searchParams.set("token", auth.token)
      }

      this.eventSource = new EventSource(url.toString())

      this.eventSource.onopen = () => resolve()
      this.eventSource.onerror = () => reject(new Error("SSE connection failed"))

      this.eventSource.onmessage = event => {
        try {
          const data = JSON.parse(event.data)
          if (data.id && this.pendingRequests.has(data.id)) {
            const {resolve, reject} = this.pendingRequests.get(data.id)!
            this.pendingRequests.delete(data.id)

            if (data.error) {
              reject(new Error(data.error.message))
            } else {
              resolve(data.result)
            }
          }
        } catch (e) {
          console.error("Failed to parse SSE message", e)
        }
      }
    })
  }

  async request(method: string, params?: Record<string, unknown>): Promise<unknown> {
    const id = ++this.requestId

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, {resolve, reject})

      // Send request via POST (SSE is receive-only)
      fetch(this.server.url!, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({jsonrpc: "2.0", id, method, params}),
      }).catch(reject)

      // Timeout
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id)
          reject(new Error("Request timeout"))
        }
      }, this.server.timeout)
    })
  }

  async notify(method: string, params?: Record<string, unknown>): Promise<void> {
    await fetch(this.server.url!, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({jsonrpc: "2.0", method, params}),
    })
  }

  close(): void {
    this.eventSource?.close()
    this.eventSource = null
    this.pendingRequests.clear()
  }
}
```

### GPT Integration

```typescript
// Extend GPT configuration to include MCP servers
export const GPTMCPConfigSchema = z.object({
  serverIds: z.array(z.string().uuid()).default([]),
  toolApproval: z.enum(["auto", "always-ask", "trusted-only"]).default("always-ask"),
  trustedTools: z.array(z.string()).default([]),
})

// Tool call formatting for LLM providers
export function formatToolsForProvider(tools: MCPTool[], provider: "openai" | "anthropic"): unknown[] {
  if (provider === "openai") {
    return tools.map(tool => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }))
  } else if (provider === "anthropic") {
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    }))
  }
  return []
}
```

## UI Components

### MCPServerManager

```typescript
interface MCPServerManagerProps {
  onServerChange?: () => void
}

// Features:
// - List all configured MCP servers
// - Add new server (HTTP or SSE)
// - Edit server configuration
// - Test connection
// - View discovered tools
// - Enable/disable servers
```

### MCPServerForm

```typescript
interface MCPServerFormProps {
  server?: MCPServerConfig
  onSave: (config: MCPServerConfig) => void
  onCancel: () => void
}

// Fields:
// - Name, description
// - Transport type selector (HTTP/SSE)
// - URL input
// - Authentication type selector
// - Timeout setting
// - Test connection button
```

### MCPToolExplorer

```typescript
interface MCPToolExplorerProps {
  serverId: string
}

// Features:
// - List all tools from server
// - Show tool description and parameters
// - Try tool with test inputs
// - Copy tool schema
```

### ToolCallVisualization

```typescript
interface ToolCallVisualizationProps {
  call: MCPToolCall
}

// Features:
// - Show tool name and arguments
// - Status indicator (pending/running/success/error)
// - Expandable result/error details
// - Duration display
```

### GPTToolSelector

```typescript
interface GPTToolSelectorProps {
  gptId: string
  selectedServers: string[]
  onChange: (serverIds: string[]) => void
}

// Features:
// - Multi-select server list
// - Show tool count per server
// - Connection status indicator
// - Tool approval settings
```

## Acceptance Criteria

```gherkin
Feature: MCP Tool Integration

Scenario: Add MCP server
  Given I am on the MCP settings page
  When I click "Add Server"
  And I enter a valid server URL
  And I select HTTP transport
  And I click "Test Connection"
  Then the connection should succeed
  And I should see discovered tools
  When I click "Save"
  Then the server should be added to my list

Scenario: Connect GPT to MCP server
  Given I have an MCP server configured
  And I am editing a GPT
  When I go to the Tools section
  And I select the MCP server
  Then the server's tools should be available to the GPT

Scenario: Execute MCP tool during chat
  Given I have a GPT with MCP tools enabled
  And I am chatting with the GPT
  When the LLM decides to call a tool
  Then I should see a tool call confirmation dialog
  When I approve the tool call
  Then the tool should execute
  And I should see the result in the chat
  And the LLM should continue with the result

Scenario: Handle tool execution failure
  Given a tool call is in progress
  When the tool execution fails
  Then I should see an error message
  And the error should be sent to the LLM
  And the LLM should handle the failure gracefully

Scenario: Manage tool approval settings
  Given I am editing a GPT with MCP tools
  When I set tool approval to "auto"
  Then tools should execute without confirmation
  When I set tool approval to "always-ask"
  Then each tool call should require confirmation
  When I set tool approval to "trusted-only"
  Then only trusted tools should auto-execute
```

## Testing Requirements

| Test Type         | Coverage Target | Focus Areas                           |
| ----------------- | --------------- | ------------------------------------- |
| Unit Tests        | 90%             | Schema validation, message formatting |
| Integration Tests | 80%             | Connection lifecycle, tool execution  |
| E2E Tests         | Key flows       | Full tool call cycle                  |

### Key Test Cases

1. **Server connection**: HTTP and SSE transports work correctly
2. **Tool discovery**: Tools parsed and validated from server response
3. **Tool execution**: Arguments validated, results returned correctly
4. **Error handling**: Network errors, timeouts, MCP errors handled
5. **Authentication**: All auth types work (bearer, API key, basic)
6. **GPT integration**: Tools formatted correctly for each provider

## Security Considerations

### Credential Storage

- Server credentials encrypted via RFC-002 encryption service
- Credentials never exposed in logs or error messages
- Bearer tokens and API keys stored securely

### Tool Execution

- User approval required by default for tool execution
- Tool arguments validated against schema before execution
- Results sanitized before display

### Network Security

- HTTPS required for remote servers
- Request timeouts prevent hanging
- Rate limiting per server

## Browser Limitations

**Note**: The `stdio` transport (local process execution) is NOT supported in browser environments. This transport is only available in:

- Tauri desktop app (RFC-012)
- Electron-based deployments
- Server-side execution

Browser deployments are limited to HTTP and SSE transports.

## Future Enhancements

| Enhancement            | Description                       | Target RFC |
| ---------------------- | --------------------------------- | ---------- |
| stdio transport        | Local process execution in Tauri  | RFC-012    |
| Tool marketplace       | Discover and install tool servers | RFC-013    |
| Tool chaining          | Sequential tool execution         | RFC-013    |
| Resource subscriptions | Real-time resource updates        | RFC-013    |
