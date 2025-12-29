# RFC-009: MCP Tool Integration

| Field            | Value                                              |
| ---------------- | -------------------------------------------------- |
| **Status**       | Pending                                            |
| **Priority**     | SHOULD                                             |
| **Complexity**   | High                                               |
| **Effort**       | 2 weeks                                            |
| **Dependencies** | RFC-002 (Security), RFC-003 (Provider Abstraction) |
| **MCP Version**  | 2025-11-25                                         |
| **SDK Version**  | @modelcontextprotocol/sdk ^1.x                     |

## Summary

Implement Model Context Protocol (MCP) support enabling GPTs to connect to external tool servers. This RFC leverages the official `@modelcontextprotocol/sdk` TypeScript package for protocol handling, transport management, and OAuth authentication. Updated to align with MCP specification version 2025-11-25.

## SDK Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.25.0"
  }
}
```

**Note**: The SDK requires `zod` as a peer dependency and uses `zod/v4` internally (compatible with Zod v3.25+). A v2 SDK is in development that splits into `@modelcontextprotocol/client` and `@modelcontextprotocol/server` packages, but v1.x is recommended for production until Q1 2026.

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

### SDK Imports

```typescript
// Core client
import {Client} from "@modelcontextprotocol/sdk/client/index.js"

// Transports
import {StreamableHTTPClientTransport} from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import {SSEClientTransport} from "@modelcontextprotocol/sdk/client/sse.js" // deprecated, fallback only
import {StdioClientTransport} from "@modelcontextprotocol/sdk/client/stdio.js" // Node.js/Tauri only

// OAuth authentication
import {OAuthClientProvider} from "@modelcontextprotocol/sdk/client/auth.js"
import {
  ClientCredentialsProvider,
  PrivateKeyJwtProvider,
  StaticPrivateKeyJwtProvider,
} from "@modelcontextprotocol/sdk/client/auth-extensions.js"

// Types and schemas
import type {
  Tool,
  Resource,
  Prompt,
  CallToolResult,
  ClientCapabilities,
  ServerCapabilities,
} from "@modelcontextprotocol/sdk/types.js"
```

### MCP Protocol Overview

The Model Context Protocol (MCP) is an open standard for connecting AI assistants to external tools and data sources. Based on the 2025-11-25 specification, it supports:

- **Transports**: stdio (local processes) and Streamable HTTP (remote servers, replaces deprecated HTTP+SSE)
- **Resources**: Read-only data sources with optional subscriptions
- **Tools**: Executable functions with JSON Schema 2020-12 parameters and optional output schemas
- **Prompts**: Pre-defined prompt templates with argument support
- **Tasks**: Durable async operations for long-running tool executions (experimental)

### Zod Schemas

The SDK exports Zod schemas for validation. We extend them with application-specific fields:

```typescript
import {z} from "zod"

// Re-export SDK types (these come from the SDK's types.js)
// Tool, Resource, Prompt, CallToolResult, etc. are available as TypeScript types

// MCP Protocol version (2025-11-25)
export const MCP_PROTOCOL_VERSION = "2025-11-25"

// Application-specific server configuration (extends beyond SDK)
export const MCPTransportTypeSchema = z.enum(["stdio", "streamable-http"])

// Icon schema (matches SDK's Icon type)
export const MCPIconSchema = z.object({
  url: z.string().url(),
  mediaType: z.string().optional(),
})

// OAuth 2.1 configuration for our server config storage
export const MCPOAuthConfigSchema = z.object({
  type: z.literal("oauth2"),
  clientId: z.string(),
  clientSecret: z.string().optional(), // For client_credentials flow
  privateKey: z.string().optional(), // For private_key_jwt flow
  algorithm: z.enum(["RS256", "RS384", "RS512", "ES256", "ES384", "ES512"]).optional(),
  scopes: z.array(z.string()).optional(),
})

// Server configuration (application-level, not SDK)
export const MCPServerConfigSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  transport: MCPTransportTypeSchema,

  // For stdio transport (Tauri/Node.js only)
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  cwd: z.string().optional(),

  // For Streamable HTTP transport
  url: z.string().url().optional(),
  headers: z.record(z.string()).optional(),

  // Authentication
  authentication: z
    .discriminatedUnion("type", [
      z.object({type: z.literal("none")}),
      z.object({type: z.literal("bearer"), token: z.string()}),
      z.object({type: z.literal("api-key"), key: z.string(), header: z.string().default("x-api-key")}),
      z.object({type: z.literal("basic"), username: z.string(), password: z.string()}),
      MCPOAuthConfigSchema,
    ])
    .default({type: "none"}),

  // Connection settings
  timeout: z.number().min(1000).max(300000).default(30000),
  retryAttempts: z.number().min(0).max(5).default(3),

  // Session tracking (populated by SDK)
  sessionId: z.string().optional(),

  // Status
  enabled: z.boolean().default(true),
  lastConnectedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

// Tool call tracking (application-level)
export const MCPToolCallSchema = z.object({
  id: z.string(),
  serverId: z.string().uuid(),
  toolName: z.string(),
  arguments: z.record(z.unknown()),
  status: z.enum(["pending", "running", "success", "error", "cancelled"]),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  // Results from SDK's CallToolResult
  content: z.array(z.unknown()).optional(),
  structuredContent: z.record(z.unknown()).optional(),
  isError: z.boolean().optional(),
  error: z.string().optional(),
  // Task support (experimental)
  taskId: z.string().optional(),
  taskStatus: z.enum(["running", "completed", "failed", "cancelled"]).optional(),
})

// Task tracking (application-level)
export const MCPTaskSchema = z.object({
  id: z.string(),
  serverId: z.string().uuid(),
  toolCallId: z.string(),
  status: z.enum(["running", "completed", "failed", "cancelled"]),
  progress: z.number().min(0).max(100).optional(),
  progressMessage: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
})

// Type exports
export type MCPServerConfig = z.infer<typeof MCPServerConfigSchema>
export type MCPToolCall = z.infer<typeof MCPToolCallSchema>
export type MCPTask = z.infer<typeof MCPTaskSchema>
export type MCPIcon = z.infer<typeof MCPIconSchema>
```

### Database Schema Extension

```typescript
// Add to database.ts
interface GPTDatabase extends Dexie {
  // ... existing tables
  mcpServers: Dexie.Table<MCPServerConfig, string>
  mcpToolCalls: Dexie.Table<MCPToolCall, string>
  mcpTasks: Dexie.Table<MCPTask, string>
  mcpOAuthTokens: Dexie.Table<MCPOAuthTokens, string> // Encrypted token storage
}

// OAuth token storage (encrypted via RFC-002)
interface MCPOAuthTokens {
  serverId: string
  accessToken: string // Encrypted
  refreshToken?: string // Encrypted
  expiresAt: string // ISO datetime
  scope?: string
}

// Indexes
db.version(X).stores({
  mcpServers: "id, name, transport, enabled, updatedAt",
  mcpToolCalls: "id, serverId, toolName, status, startedAt, [serverId+status], taskId",
  mcpTasks: "id, serverId, toolCallId, status, createdAt, [serverId+status]",
  mcpOAuthTokens: "serverId",
})
```

### MCP Client Service (SDK Wrapper)

The service wraps the SDK's `Client` class with application-specific connection management and persistence:

```typescript
import {Client} from "@modelcontextprotocol/sdk/client/index.js"
import {StreamableHTTPClientTransport} from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import {SSEClientTransport} from "@modelcontextprotocol/sdk/client/sse.js"
import type {Tool, Resource, Prompt, CallToolResult} from "@modelcontextprotocol/sdk/types.js"

// Connection state per server
interface MCPConnection {
  client: Client
  transport: StreamableHTTPClientTransport | SSEClientTransport
  serverCapabilities: ServerCapabilities
}

// Discovered capabilities from server
interface MCPDiscoveredCapabilities {
  tools: Tool[]
  resources: Resource[]
  prompts: Prompt[]
}

export interface IMCPClientService {
  // Server management (persisted to IndexedDB)
  addServer(config: Omit<MCPServerConfig, "id" | "createdAt" | "updatedAt">): Promise<MCPServerConfig>
  updateServer(id: string, updates: Partial<MCPServerConfig>): Promise<MCPServerConfig>
  removeServer(id: string): Promise<void>
  listServers(): Promise<MCPServerConfig[]>

  // Connection management (uses SDK Client)
  connect(serverId: string): Promise<MCPDiscoveredCapabilities>
  disconnect(serverId: string): Promise<void>
  getConnectionStatus(serverId: string): ConnectionStatus

  // Tool operations (delegates to SDK)
  discoverTools(serverId: string): Promise<Tool[]>
  callTool(serverId: string, toolName: string, args: Record<string, unknown>): Promise<CallToolResult>

  // Resource operations (delegates to SDK)
  listResources(serverId: string): Promise<Resource[]>
  readResource(serverId: string, uri: string): Promise<{contents: unknown[]}>

  // Events
  onConnectionChange(callback: (serverId: string, status: ConnectionStatus) => void): () => void
  onToolCall(callback: (call: MCPToolCall) => void): () => void
}

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error"

export class MCPClientService implements IMCPClientService {
  private connections: Map<string, MCPConnection> = new Map()
  private capabilities: Map<string, MCPDiscoveredCapabilities> = new Map()
  private eventEmitter = new EventTarget()

  async connect(serverId: string): Promise<MCPDiscoveredCapabilities> {
    const server = await db.mcpServers.get(serverId)
    if (!server) throw new Error("Server not found")

    this.emitStatus(serverId, "connecting")

    try {
      // Create SDK Client
      const client = new Client(
        {
          name: "gpt-platform",
          version: "1.0.0",
        },
        {
          capabilities: {
            roots: {listChanged: true},
            sampling: {},
          },
        },
      )

      // Create transport based on server config
      const transport = await this.createTransport(server)

      // Connect using SDK (handles initialize/initialized handshake)
      await client.connect(transport)

      // Store connection
      const connection: MCPConnection = {
        client,
        transport,
        serverCapabilities: client.getServerCapabilities() || {},
      }
      this.connections.set(serverId, connection)

      // Discover capabilities using SDK methods
      const discovered = await this.discoverCapabilities(client)
      this.capabilities.set(serverId, discovered)

      // Update server record with session ID
      await db.mcpServers.update(serverId, {
        lastConnectedAt: new Date().toISOString(),
        sessionId: transport.sessionId,
        updatedAt: new Date().toISOString(),
      })

      this.emitStatus(serverId, "connected")
      return discovered
    } catch (error) {
      this.emitStatus(serverId, "error")
      throw error
    }
  }

  private async createTransport(server: MCPServerConfig): Promise<StreamableHTTPClientTransport | SSEClientTransport> {
    if (server.transport !== "streamable-http") {
      throw new Error(`Transport ${server.transport} not supported in browser`)
    }

    const url = new URL(server.url!)

    // Build transport options
    const options: StreamableHTTPClientTransportOptions = {
      sessionId: server.sessionId, // Resume existing session if available
    }

    // Add authentication via OAuth provider or custom headers
    if (server.authentication.type === "oauth2") {
      options.authProvider = await this.createOAuthProvider(server)
    } else if (server.authentication.type !== "none") {
      // For bearer/api-key/basic, use requestInit headers
      options.requestInit = {
        headers: this.buildAuthHeaders(server),
      }
    }

    // Try Streamable HTTP first (modern)
    try {
      const transport = new StreamableHTTPClientTransport(url, options)
      return transport
    } catch (error) {
      // Fall back to deprecated SSE transport for older servers
      console.warn("Streamable HTTP failed, falling back to SSE transport")
      return new SSEClientTransport(url, {
        authProvider: options.authProvider,
        requestInit: options.requestInit,
      })
    }
  }

  private buildAuthHeaders(server: MCPServerConfig): Record<string, string> {
    const headers: Record<string, string> = {...server.headers}
    const auth = server.authentication

    if (auth.type === "bearer") {
      headers["Authorization"] = `Bearer ${auth.token}`
    } else if (auth.type === "api-key") {
      headers[auth.header] = auth.key
    } else if (auth.type === "basic") {
      headers["Authorization"] = `Basic ${btoa(`${auth.username}:${auth.password}`)}`
    }

    return headers
  }

  private async discoverCapabilities(client: Client): Promise<MCPDiscoveredCapabilities> {
    // Use SDK's high-level methods
    const [toolsResult, resourcesResult, promptsResult] = await Promise.all([
      client.listTools().catch(() => ({tools: []})),
      client.listResources().catch(() => ({resources: []})),
      client.listPrompts().catch(() => ({prompts: []})),
    ])

    return {
      tools: toolsResult.tools || [],
      resources: resourcesResult.resources || [],
      prompts: promptsResult.prompts || [],
    }
  }

  async callTool(serverId: string, toolName: string, args: Record<string, unknown>): Promise<CallToolResult> {
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

      // Use SDK's callTool method
      const result = await connection.client.callTool({
        name: toolName,
        arguments: args,
      })

      // Update call record with results
      call.status = result.isError ? "error" : "success"
      call.content = result.content
      call.structuredContent = result.structuredContent
      call.isError = result.isError
      call.completedAt = new Date().toISOString()

      await db.mcpToolCalls.update(callId, {
        status: call.status,
        content: result.content,
        structuredContent: result.structuredContent,
        isError: result.isError,
        completedAt: call.completedAt,
      })

      this.emitToolCall(call)
      return result
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

  async disconnect(serverId: string): Promise<void> {
    const connection = this.connections.get(serverId)
    if (!connection) return

    // Use SDK's close method
    await connection.client.close()
    this.connections.delete(serverId)
    this.capabilities.delete(serverId)
    this.emitStatus(serverId, "disconnected")
  }

  // ... other methods delegate to SDK similarly
}
```

### Transport Usage Notes

The SDK provides production-ready transport implementations. We use them directly:

- **`StreamableHTTPClientTransport`** - Modern transport for HTTP-based MCP servers (recommended)
- **`SSEClientTransport`** - Legacy transport for older servers (deprecated but available for fallback)
- **`StdioClientTransport`** - For local process spawning (Node.js/Tauri only, not browser)

Key features provided by SDK transports:

- Automatic session management via `MCP-Session-Id` header
- Protocol version headers (`MCP-Protocol-Version`)
- Reconnection with exponential backoff
- Last-Event-ID tracking for stream resumption
- OAuth integration via `authProvider` option

```typescript
// Example: Creating transports with SDK
import {StreamableHTTPClientTransport} from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import {SSEClientTransport} from "@modelcontextprotocol/sdk/client/sse.js"

// Modern transport (recommended)
const transport = new StreamableHTTPClientTransport(new URL(serverUrl), {
  authProvider: oauthProvider, // Optional: SDK OAuth provider
  sessionId: existingSessionId, // Optional: Resume session
  requestInit: {
    headers: customHeaders, // Optional: Additional headers
  },
  reconnectionOptions: {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
  },
})

// Access session ID after connection
const sessionId = transport.sessionId

// Terminate session explicitly
await transport.terminateSession()
```

### OAuth Authentication (SDK Providers)

The SDK provides built-in OAuth providers. We create a factory to select the appropriate provider:

```typescript
import {OAuthClientProvider} from "@modelcontextprotocol/sdk/client/auth.js"
import {ClientCredentialsProvider, PrivateKeyJwtProvider} from "@modelcontextprotocol/sdk/client/auth-extensions.js"

/**
 * Creates an OAuth provider based on server configuration.
 * Uses SDK's built-in providers for standard flows.
 */
async function createOAuthProvider(server: MCPServerConfig): Promise<OAuthClientProvider> {
  const auth = server.authentication
  if (auth.type !== "oauth2") {
    throw new Error("Server not configured for OAuth")
  }

  // Client credentials with client_secret (most common for M2M)
  if (auth.clientSecret) {
    return new ClientCredentialsProvider({
      clientId: auth.clientId,
      clientSecret: auth.clientSecret,
      clientName: server.name,
    })
  }

  // Private key JWT authentication (more secure for M2M)
  if (auth.privateKey && auth.algorithm) {
    return new PrivateKeyJwtProvider({
      clientId: auth.clientId,
      privateKey: auth.privateKey,
      algorithm: auth.algorithm,
      clientName: server.name,
    })
  }

  // Interactive OAuth flow (authorization code + PKCE)
  return new InteractiveOAuthProvider(server)
}

/**
 * Interactive OAuth provider for browser-based authorization code flow.
 * Implements OAuthClientProvider interface from SDK.
 */
class InteractiveOAuthProvider implements OAuthClientProvider {
  private server: MCPServerConfig
  private _tokens?: OAuthTokens
  private _codeVerifier?: string

  constructor(server: MCPServerConfig) {
    this.server = server
  }

  get redirectUrl(): string {
    return `${window.location.origin}/oauth/callback`
  }

  get clientMetadata(): OAuthClientMetadata {
    const auth = this.server.authentication as z.infer<typeof MCPOAuthConfigSchema>
    return {
      client_name: this.server.name,
      redirect_uris: [this.redirectUrl],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      scope: auth.scopes?.join(" "),
    }
  }

  async clientInformation(): Promise<OAuthClientInformationMixed | undefined> {
    const auth = this.server.authentication as z.infer<typeof MCPOAuthConfigSchema>
    return {client_id: auth.clientId}
  }

  async tokens(): Promise<OAuthTokens | undefined> {
    // Load from encrypted storage (RFC-002)
    const stored = await db.mcpOAuthTokens.get(this.server.id)
    if (!stored) return undefined

    // Decrypt tokens
    const decrypted = await encryptionService.decrypt(stored.accessToken)
    return {
      access_token: decrypted,
      refresh_token: stored.refreshToken ? await encryptionService.decrypt(stored.refreshToken) : undefined,
      token_type: "Bearer",
    }
  }

  async saveTokens(tokens: OAuthTokens): Promise<void> {
    // Encrypt and store tokens (RFC-002)
    const encrypted: MCPOAuthTokens = {
      serverId: this.server.id,
      accessToken: await encryptionService.encrypt(tokens.access_token),
      refreshToken: tokens.refresh_token ? await encryptionService.encrypt(tokens.refresh_token) : undefined,
      expiresAt: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
      scope: tokens.scope,
    }
    await db.mcpOAuthTokens.put(encrypted)
  }

  redirectToAuthorization(authorizationUrl: URL): void {
    // Open authorization URL (could be popup or redirect)
    window.location.href = authorizationUrl.toString()
  }

  saveCodeVerifier(codeVerifier: string): void {
    this._codeVerifier = codeVerifier
    // Also persist to sessionStorage for page reload survival
    sessionStorage.setItem(`mcp_verifier_${this.server.id}`, codeVerifier)
  }

  codeVerifier(): string {
    return this._codeVerifier || sessionStorage.getItem(`mcp_verifier_${this.server.id}`) || ""
  }
}
```

### OAuth Callback Handler

```typescript
/**
 * Handle OAuth callback after user authorization.
 * Call this from your /oauth/callback route.
 */
async function handleOAuthCallback(code: string, state: string): Promise<void> {
  // The SDK's transport.finishAuth() handles the token exchange
  const serverId = sessionStorage.getItem("mcp_oauth_server")
  if (!serverId) throw new Error("No OAuth flow in progress")

  const service = getMCPClientService()
  const connection = service.getConnection(serverId)

  if (connection?.transport instanceof StreamableHTTPClientTransport) {
    await connection.transport.finishAuth(code)
    // Reconnect with new tokens
    await service.connect(serverId)
  }

  sessionStorage.removeItem("mcp_oauth_server")
}
```

### GPT Integration

```typescript
// Extend GPT configuration to include MCP servers
export const GPTMCPConfigSchema = z.object({
  serverIds: z.array(z.string().uuid()).default([]),
  toolApproval: z.enum(["auto", "always-ask", "trusted-only"]).default("always-ask"),
  trustedTools: z.array(z.string()).default([]),
  // Task handling preferences
  taskPollingInterval: z.number().min(1000).max(60000).default(5000),
  enableAsyncTasks: z.boolean().default(true),
})

// Tool call formatting for LLM providers (enhanced with icons and annotations)
export function formatToolsForProvider(tools: MCPTool[], provider: "openai" | "anthropic"): unknown[] {
  if (provider === "openai") {
    return tools.map(tool => ({
      type: "function",
      function: {
        name: tool.name,
        description: buildToolDescription(tool),
        parameters: tool.inputSchema,
      },
    }))
  } else if (provider === "anthropic") {
    return tools.map(tool => ({
      name: tool.name,
      description: buildToolDescription(tool),
      input_schema: tool.inputSchema,
    }))
  }
  return []
}

// Build enhanced description including annotations
function buildToolDescription(tool: MCPTool): string {
  let description = tool.description || ""

  // Add annotation hints to description for LLM awareness
  if (tool.annotations) {
    const hints: string[] = []
    if (tool.annotations.destructiveHint) hints.push("⚠️ May have side effects")
    if (tool.annotations.openWorldHint) hints.push("🌐 Interacts with external systems")
    if (tool.annotations.idempotentHint) hints.push("♻️ Safe to retry")
    if (hints.length > 0) {
      description += `\n\n${hints.join(" | ")}`
    }
  }

  return description
}

// Format tool result for conversation (handles structured content)
export function formatToolResultForProvider(
  result: MCPToolResult,
  outputSchema?: JSONSchemaProperty,
  provider: "openai" | "anthropic",
): unknown {
  // If we have structured content and it matches the schema, use it
  if (result.structuredContent && outputSchema) {
    return JSON.stringify(result.structuredContent)
  }

  // Otherwise, format content items
  const textContent = result.content
    .filter(c => c.type === "text")
    .map(c => (c as {type: "text"; text: string}).text)
    .join("\n")

  return textContent
}
```

## SDK Usage Examples

### Basic Connection Flow

```typescript
import {Client} from "@modelcontextprotocol/sdk/client/index.js"
import {StreamableHTTPClientTransport} from "@modelcontextprotocol/sdk/client/streamableHttp.js"

// 1. Create client with app info
const client = new Client(
  {name: "gpt-platform", version: "1.0.0"},
  {
    capabilities: {
      roots: {listChanged: true},
      sampling: {}, // Enable if server needs LLM access
    },
  },
)

// 2. Create transport
const transport = new StreamableHTTPClientTransport(new URL("https://mcp-server.example.com/mcp"), {
  sessionId: previousSessionId, // Optional: resume session
})

// 3. Connect (handles initialize/initialized handshake)
await client.connect(transport)

// 4. Discover and use tools
const {tools} = await client.listTools()
const result = await client.callTool({
  name: "search",
  arguments: {query: "example"},
})

// 5. Clean up
await client.close()
```

### Handling List Changed Notifications

```typescript
// Subscribe to tool list changes
client.setNotificationHandler(ListToolsResultSchema, async () => {
  const {tools} = await client.listTools()
  updateToolsUI(tools)
})

// Subscribe to resource changes
client.setNotificationHandler(ListResourcesResultSchema, async () => {
  const {resources} = await client.listResources()
  updateResourcesUI(resources)
})
```

### Error Handling

```typescript
import {McpError, ErrorCode} from "@modelcontextprotocol/sdk/types.js"

try {
  const result = await client.callTool({name: "risky-tool", arguments: {}})
} catch (error) {
  if (error instanceof McpError) {
    switch (error.code) {
      case ErrorCode.InvalidRequest:
        // Handle invalid request
        break
      case ErrorCode.MethodNotFound:
        // Tool doesn't exist
        break
      case ErrorCode.InternalError:
        // Server error
        break
    }
  }
  throw error
}
```

### Session Resumption

```typescript
// Store session ID when connecting
const sessionId = transport.sessionId
await saveSessionId(serverId, sessionId)

// Resume later with same session
const transport = new StreamableHTTPClientTransport(url, {
  sessionId: await loadSessionId(serverId),
  reconnectionOptions: {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
  },
})
```

## UI Components

### MCPServerManager

```typescript
interface MCPServerManagerProps {
  onServerChange?: () => void
}

// Features:
// - List all configured MCP servers with icons and status
// - Add new server (Streamable HTTP)
// - Edit server configuration
// - Test connection and view server capabilities
// - View discovered tools with icons
// - Enable/disable servers
// - OAuth 2.1 authorization flow integration
// - Session management display
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
// - Transport type selector (Streamable HTTP for browser)
// - URL input with validation
// - Authentication type selector (none, bearer, api-key, basic, oauth2)
// - OAuth 2.1 configuration (client ID, endpoints, scopes)
// - Timeout setting
// - Test connection button with capability display
```

### MCPToolExplorer

```typescript
interface MCPToolExplorerProps {
  serverId: string
}

// Features:
// - List all tools from server with icons
// - Show tool title, description, and parameters
// - Display tool annotations (destructive, idempotent, open-world hints)
// - Show output schema if available
// - Try tool with test inputs
// - Copy tool schema
```

### ToolCallVisualization

```typescript
interface ToolCallVisualizationProps {
  call: MCPToolCall
}

// Features:
// - Show tool name, title, and arguments
// - Status indicator (pending/running/success/error/cancelled)
// - Task progress display for async operations
// - Expandable result/error details
// - Structured content display
// - Duration display
// - Cancel button for running tasks
```

### MCPTaskMonitor

```typescript
interface MCPTaskMonitorProps {
  serverId: string
}

// Features (new for 2025-11-25):
// - List active and recent tasks
// - Real-time status updates
// - Progress bar for tasks with progress info
// - Cancel task button
// - View task result
// - Poll/refresh controls
```

### GPTToolSelector

```typescript
interface GPTToolSelectorProps {
  gptId: string
  selectedServers: string[]
  onChange: (serverIds: string[]) => void
}

// Features:
// - Multi-select server list with icons
// - Show tool count per server
// - Connection status indicator
// - Tool approval settings
// - Async task preferences
```

## Acceptance Criteria

```gherkin
Feature: MCP Tool Integration

Scenario: Add MCP server with Streamable HTTP
  Given I am on the MCP settings page
  When I click "Add Server"
  And I enter a valid server URL
  And I select Streamable HTTP transport
  And I click "Test Connection"
  Then the connection should succeed
  And I should see discovered tools with icons
  And I should see the MCP-Session-Id
  When I click "Save"
  Then the server should be added to my list

Scenario: Configure OAuth 2.1 authentication
  Given I am adding an MCP server
  When I select OAuth 2.1 authentication
  And I enter the client ID
  And I configure the authorization endpoints
  And I click "Authorize"
  Then I should be redirected to the authorization server
  When I complete authorization
  Then the OAuth tokens should be stored securely
  And the server should connect successfully

Scenario: Connect GPT to MCP server
  Given I have an MCP server configured
  And I am editing a GPT
  When I go to the Tools section
  And I select the MCP server
  Then the server's tools should be available to the GPT
  And I should see tool icons and annotations

Scenario: Execute MCP tool during chat
  Given I have a GPT with MCP tools enabled
  And I am chatting with the GPT
  When the LLM decides to call a tool
  Then I should see a tool call confirmation dialog
  And I should see any destructive/open-world warnings from annotations
  When I approve the tool call
  Then the tool should execute
  And I should see the result in the chat
  And the LLM should continue with the result

Scenario: Execute long-running tool as async task
  Given I have a GPT with MCP tools enabled
  And the tool supports async task execution
  When the LLM calls a long-running tool
  Then a task should be created
  And I should see task progress in the UI
  And I can continue the conversation
  When the task completes
  Then the result should be delivered to the conversation

Scenario: Cancel running task
  Given a tool is executing as an async task
  When I click "Cancel Task"
  Then the task should be cancelled
  And the tool call should show cancelled status
  And the LLM should be notified of the cancellation

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

Scenario: Handle session expiration
  Given I am connected to an MCP server
  When the session expires
  Then the client should reconnect
  And a new MCP-Session-Id should be established
  And pending operations should be retried
```

## Testing Requirements

| Test Type         | Coverage Target | Focus Areas                                            |
| ----------------- | --------------- | ------------------------------------------------------ |
| Unit Tests        | 90%             | Schema validation, message formatting, PKCE generation |
| Integration Tests | 80%             | Connection lifecycle, tool execution, task polling     |
| E2E Tests         | Key flows       | Full tool call cycle, OAuth flow, async tasks          |

### Key Test Cases

1. **Server connection**: Streamable HTTP transport with session management
2. **Protocol headers**: MCP-Protocol-Version and MCP-Session-Id handling
3. **Tool discovery**: Tools parsed with icons, annotations, and output schemas
4. **Tool execution**: Arguments validated, results returned with structured content
5. **Async tasks**: Task creation, polling, result retrieval, cancellation
6. **Error handling**: Network errors, timeouts, MCP errors, task failures
7. **Authentication**: All auth types (bearer, API key, basic, OAuth 2.1)
8. **OAuth 2.1 flow**: PKCE S256, authorization server discovery, token refresh
9. **GPT integration**: Tools formatted correctly for each provider
10. **Session resumption**: Reconnection with Last-Event-ID

## Security Considerations

### Credential Storage

- Server credentials encrypted via RFC-002 encryption service
- OAuth 2.1 tokens stored securely with encryption
- Credentials never exposed in logs or error messages
- Bearer tokens and API keys stored securely
- PKCE verifiers stored only in memory during authorization flow

### OAuth 2.1 Security (2025-11-25)

- **PKCE Required**: All authorization flows MUST use S256 code challenge
- **Token Audience Binding**: Tokens validated via resource parameter (RFC 8707)
- **No Token Passthrough**: Client tokens never forwarded to upstream APIs
- **Scope Challenges**: Handle incremental consent via WWW-Authenticate header
- **Client ID Metadata Documents**: Recommended for client registration

### Tool Execution

- User approval required by default for tool execution
- Tool arguments validated against input schema before execution
- Results sanitized before display
- Destructive tool warnings shown based on annotations
- Structured content validated against output schema

### Network Security

- HTTPS required for remote servers (except localhost)
- Request timeouts prevent hanging
- Rate limiting per server
- Session management via MCP-Session-Id
- Origin header validation (DNS rebinding protection)
- Protocol version header required on all HTTP requests

## Browser Limitations

**Note**: The `stdio` transport (local process execution) is NOT supported in browser environments. This transport is only available in:

- Tauri desktop app (RFC-012)
- Electron-based deployments
- Server-side execution

Browser deployments are limited to Streamable HTTP transport.

## Future Enhancements

| Enhancement            | Description                                   | Target RFC |
| ---------------------- | --------------------------------------------- | ---------- |
| stdio transport        | Local process execution in Tauri              | RFC-012    |
| Tool marketplace       | Discover and install tool servers             | RFC-013    |
| Tool chaining          | Sequential tool execution                     | RFC-013    |
| Resource subscriptions | Real-time resource updates                    | RFC-013    |
| Multi-model sampling   | Let MCP servers request LLM sampling          | RFC-013    |
| Elicitation support    | User input requests from tools                | RFC-013    |
| Task notifications     | WebSocket/push notifications for task updates | RFC-013    |

## References

- [MCP Specification 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25)
- [MCP Changelog](https://modelcontextprotocol.io/specification/2025-11-25/changelog)
- [Streamable HTTP Transport](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports#streamable-http)
- [MCP Authorization](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)
- [MCP Tasks (Experimental)](https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/tasks)
- [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
