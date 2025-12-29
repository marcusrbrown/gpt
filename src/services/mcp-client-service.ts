/**
 * MCP Client Service - SDK wrapper for MCP server connections
 * Wraps @modelcontextprotocol/sdk Client with application-specific
 * connection management, persistence, and event handling.
 */

import type {Prompt, Resource, ServerCapabilities, Tool} from '@modelcontextprotocol/sdk/types.js'
import {db, nowISO} from '@/lib/database'
import {MCPServerConfigSchema, type MCPServerConfig, type MCPToolCall} from '@/types/mcp'
import {Client} from '@modelcontextprotocol/sdk/client/index.js'
import {SSEClientTransport} from '@modelcontextprotocol/sdk/client/sse.js'
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface MCPConnection {
  client: Client
  transport: StreamableHTTPClientTransport | SSEClientTransport
  serverCapabilities: ServerCapabilities
}

export interface MCPDiscoveredCapabilities {
  tools: Tool[]
  resources: Resource[]
  prompts: Prompt[]
}

// Tool call result type (compatible with SDK)
export interface MCPToolCallResult {
  content: unknown[]
  structuredContent?: Record<string, unknown>
  isError?: boolean
}

type ConnectionChangeCallback = (serverId: string, status: ConnectionStatus, error?: Error) => void
type ToolCallCallback = (call: MCPToolCall) => void

export interface MCPClientService {
  // Server management (persisted to IndexedDB)
  addServer: (config: Omit<MCPServerConfig, 'id' | 'createdAt' | 'updatedAt'>) => Promise<MCPServerConfig>
  updateServer: (id: string, updates: Partial<MCPServerConfig>) => Promise<MCPServerConfig>
  removeServer: (id: string) => Promise<void>
  getServer: (id: string) => Promise<MCPServerConfig | undefined>
  listServers: () => Promise<MCPServerConfig[]>

  // Connection management (uses SDK Client)
  connect: (serverId: string) => Promise<MCPDiscoveredCapabilities>
  disconnect: (serverId: string) => Promise<void>
  disconnectAll: () => Promise<void>
  getConnectionStatus: (serverId: string) => ConnectionStatus
  getConnection: (serverId: string) => MCPConnection | undefined

  // Tool operations (delegates to SDK)
  discoverTools: (serverId: string) => Promise<Tool[]>
  callTool: (serverId: string, toolName: string, args: Record<string, unknown>) => Promise<MCPToolCallResult>

  // Resource operations (delegates to SDK)
  listResources: (serverId: string) => Promise<Resource[]>
  readResource: (serverId: string, uri: string) => Promise<{contents: unknown[]}>

  // Prompt operations
  listPrompts: (serverId: string) => Promise<Prompt[]>

  // Events
  onConnectionChange: (callback: ConnectionChangeCallback) => () => void
  onToolCall: (callback: ToolCallCallback) => () => void

  // OAuth handling
  handleOAuthCallback: (serverId: string, code: string) => Promise<void>

  // Capabilities cache
  getCachedCapabilities: (serverId: string) => MCPDiscoveredCapabilities | undefined
}

class MCPClientServiceImpl implements MCPClientService {
  private readonly connections: Map<string, MCPConnection> = new Map()
  private readonly connectionStatus: Map<string, ConnectionStatus> = new Map()
  private readonly capabilities: Map<string, MCPDiscoveredCapabilities> = new Map()
  private readonly connectionCallbacks: Set<ConnectionChangeCallback> = new Set()
  private readonly toolCallCallbacks: Set<ToolCallCallback> = new Set()

  // Server CRUD operations

  async addServer(config: Omit<MCPServerConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<MCPServerConfig> {
    const now = nowISO()
    const server: MCPServerConfig = {
      ...config,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    }

    // Validate with Zod
    const validated = MCPServerConfigSchema.parse(server)
    await db.mcpServers.add(validated)

    return validated
  }

  async updateServer(id: string, updates: Partial<MCPServerConfig>): Promise<MCPServerConfig> {
    const existing = await db.mcpServers.get(id)
    if (!existing) {
      throw new Error(`Server ${id} not found`)
    }

    const updated: MCPServerConfig = {
      ...existing,
      ...updates,
      id, // Prevent ID change
      createdAt: existing.createdAt, // Prevent createdAt change
      updatedAt: nowISO(),
    }

    const validated = MCPServerConfigSchema.parse(updated)
    await db.mcpServers.put(validated)

    return validated
  }

  async removeServer(id: string): Promise<void> {
    // Disconnect if connected
    await this.disconnect(id)

    // Delete related data
    await db.transaction('rw', [db.mcpServers, db.mcpToolCalls, db.mcpTasks, db.mcpOAuthTokens], async () => {
      await db.mcpServers.delete(id)
      await db.mcpToolCalls.where('serverId').equals(id).delete()
      await db.mcpTasks.where('serverId').equals(id).delete()
      await db.mcpOAuthTokens.delete(id)
    })
  }

  async getServer(id: string): Promise<MCPServerConfig | undefined> {
    return db.mcpServers.get(id)
  }

  async listServers(): Promise<MCPServerConfig[]> {
    return db.mcpServers.toArray()
  }

  // Connection management

  async connect(serverId: string): Promise<MCPDiscoveredCapabilities> {
    const server = await db.mcpServers.get(serverId)
    if (!server) {
      throw new Error(`Server ${serverId} not found`)
    }

    // Already connected?
    if (this.connections.has(serverId)) {
      const cached = this.capabilities.get(serverId)
      if (cached) return cached
    }

    this.emitConnectionChange(serverId, 'connecting')

    try {
      // Create SDK Client with our app info
      const client = new Client(
        {
          name: 'gpt-platform',
          version: '1.0.0',
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

      // Connect (SDK handles initialize/initialized handshake)
      await client.connect(transport)

      // Store connection
      const connection: MCPConnection = {
        client,
        transport,
        serverCapabilities: client.getServerCapabilities() ?? {},
      }
      this.connections.set(serverId, connection)

      // Discover capabilities
      const discovered = await this.discoverCapabilities(client)
      this.capabilities.set(serverId, discovered)

      // Update server record with session info
      const sessionId = 'sessionId' in transport ? (transport as {sessionId?: string}).sessionId : undefined
      await db.mcpServers.update(serverId, {
        lastConnectedAt: nowISO(),
        sessionId,
        updatedAt: nowISO(),
      })

      this.emitConnectionChange(serverId, 'connected')
      return discovered
    } catch (error_) {
      this.emitConnectionChange(serverId, 'error', error_ instanceof Error ? error_ : new Error(String(error_)))
      throw error_
    }
  }

  async disconnect(serverId: string): Promise<void> {
    const connection = this.connections.get(serverId)
    if (!connection) return

    try {
      await connection.client.close()
    } catch {
      // Ignore close errors
    }

    this.connections.delete(serverId)
    this.capabilities.delete(serverId)
    this.connectionStatus.set(serverId, 'disconnected')
    this.emitConnectionChange(serverId, 'disconnected')
  }

  async disconnectAll(): Promise<void> {
    const serverIds = Array.from(this.connections.keys())
    await Promise.all(serverIds.map(async id => this.disconnect(id)))
  }

  getConnectionStatus(serverId: string): ConnectionStatus {
    return this.connectionStatus.get(serverId) ?? 'disconnected'
  }

  getConnection(serverId: string): MCPConnection | undefined {
    return this.connections.get(serverId)
  }

  // Tool operations

  async discoverTools(serverId: string): Promise<Tool[]> {
    const connection = this.connections.get(serverId)
    if (!connection) {
      throw new Error(`Not connected to server ${serverId}`)
    }

    const result = await connection.client.listTools()
    return result.tools ?? []
  }

  async callTool(serverId: string, toolName: string, args: Record<string, unknown>): Promise<MCPToolCallResult> {
    const connection = this.connections.get(serverId)
    if (!connection) {
      throw new Error(`Not connected to server ${serverId}`)
    }

    const callId = crypto.randomUUID()
    const call: MCPToolCall = {
      id: callId,
      serverId,
      toolName,
      arguments: args,
      status: 'pending',
      startedAt: nowISO(),
    }

    // Persist and emit
    await db.mcpToolCalls.add(call)
    this.emitToolCall(call)

    try {
      // Update to running
      call.status = 'running'
      await db.mcpToolCalls.update(callId, {status: 'running'})
      this.emitToolCall(call)

      // Execute via SDK
      const result = await connection.client.callTool({
        name: toolName,
        arguments: args,
      })

      // Update with results
      call.status = result.isError ? 'error' : 'success'
      call.content = result.content as unknown[] | undefined
      call.structuredContent = result.structuredContent as Record<string, unknown> | undefined
      call.isError = result.isError as boolean | undefined
      call.completedAt = nowISO()

      await db.mcpToolCalls.update(callId, {
        status: call.status,
        content: call.content,
        structuredContent: call.structuredContent,
        isError: call.isError,
        completedAt: call.completedAt,
      })

      this.emitToolCall(call)
      return {
        content: call.content ?? [],
        structuredContent: call.structuredContent,
        isError: call.isError,
      }
    } catch (error_) {
      call.status = 'error'
      call.error = error_ instanceof Error ? error_.message : 'Unknown error'
      call.completedAt = nowISO()

      await db.mcpToolCalls.update(callId, {
        status: 'error',
        error: call.error,
        completedAt: call.completedAt,
      })

      this.emitToolCall(call)
      throw error_
    }
  }

  // Resource operations

  async listResources(serverId: string): Promise<Resource[]> {
    const connection = this.connections.get(serverId)
    if (!connection) {
      throw new Error(`Not connected to server ${serverId}`)
    }

    const result = await connection.client.listResources()
    return result.resources ?? []
  }

  async readResource(serverId: string, uri: string): Promise<{contents: unknown[]}> {
    const connection = this.connections.get(serverId)
    if (!connection) {
      throw new Error(`Not connected to server ${serverId}`)
    }

    const result = await connection.client.readResource({uri})
    return {contents: result.contents ?? []}
  }

  // Prompt operations

  async listPrompts(serverId: string): Promise<Prompt[]> {
    const connection = this.connections.get(serverId)
    if (!connection) {
      throw new Error(`Not connected to server ${serverId}`)
    }

    const result = await connection.client.listPrompts()
    return result.prompts ?? []
  }

  // Event handling

  onConnectionChange(callback: ConnectionChangeCallback): () => void {
    this.connectionCallbacks.add(callback)
    return () => this.connectionCallbacks.delete(callback)
  }

  onToolCall(callback: ToolCallCallback): () => void {
    this.toolCallCallbacks.add(callback)
    return () => this.toolCallCallbacks.delete(callback)
  }

  getCachedCapabilities(serverId: string): MCPDiscoveredCapabilities | undefined {
    return this.capabilities.get(serverId)
  }

  async handleOAuthCallback(serverId: string, code: string): Promise<void> {
    // Get the server config
    const server = await this.getServer(serverId)
    if (!server) {
      throw new Error(`Server ${serverId} not found`)
    }

    if (server.authentication.type !== 'oauth2') {
      throw new Error('Server does not use OAuth authentication')
    }

    const auth = server.authentication
    if (!auth.tokenUrl || !auth.clientId) {
      throw new Error('OAuth configuration incomplete')
    }

    // Exchange the code for tokens
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: auth.clientId,
      redirect_uri: `${window.location.origin}/oauth/callback`,
    })

    // Add client secret if provided (confidential clients)
    if (auth.clientSecret) {
      params.append('client_secret', auth.clientSecret)
    }

    // Add PKCE code verifier if available
    const codeVerifier = sessionStorage.getItem(`mcp_pkce_${serverId}`)
    if (codeVerifier) {
      params.append('code_verifier', codeVerifier)
      sessionStorage.removeItem(`mcp_pkce_${serverId}`)
    }

    const response = await fetch(auth.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Token exchange failed: ${error}`)
    }

    const tokens = (await response.json()) as {
      access_token: string
      refresh_token?: string
      expires_in?: number
      token_type?: string
    }

    // Store the tokens encrypted in IndexedDB
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString() // Default 1 hour

    await db.mcpOAuthTokens.put({
      serverId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      tokenType: tokens.token_type ?? 'Bearer',
      createdAt: nowISO(),
      updatedAt: nowISO(),
    })

    // Try to connect with the new tokens
    await this.connect(serverId)
  }

  // Private helpers

  private async createTransport(server: MCPServerConfig): Promise<StreamableHTTPClientTransport | SSEClientTransport> {
    if (server.transport !== 'streamable-http') {
      throw new Error(`Transport ${server.transport} not supported in browser`)
    }

    if (!server.url) {
      throw new Error('Server URL is required for streamable-http transport')
    }

    const url = new URL(server.url)

    // Build transport options
    const headers = this.buildAuthHeaders(server)

    // Try StreamableHTTP first (modern)
    try {
      const transport = new StreamableHTTPClientTransport(url, {
        sessionId: server.sessionId,
        requestInit: headers ? {headers} : undefined,
      })
      return transport
    } catch {
      // Fall back to deprecated SSE transport for older servers
      console.warn('StreamableHTTP failed, falling back to SSE transport')
      return new SSEClientTransport(url, {
        requestInit: headers ? {headers} : undefined,
      })
    }
  }

  private buildAuthHeaders(server: MCPServerConfig): Record<string, string> | undefined {
    const headers: Record<string, string> = {...server.headers}
    const auth = server.authentication

    switch (auth.type) {
      case 'bearer':
        headers.Authorization = `Bearer ${auth.token}`
        break
      case 'api-key':
        headers[auth.header ?? 'x-api-key'] = auth.key
        break
      case 'basic':
        headers.Authorization = `Basic ${btoa(`${auth.username}:${auth.password}`)}`
        break
      case 'oauth2':
        // OAuth tokens are handled by the transport's authProvider
        break
      case 'none':
      default:
        break
    }

    return Object.keys(headers).length > 0 ? headers : undefined
  }

  private async discoverCapabilities(client: Client): Promise<MCPDiscoveredCapabilities> {
    const [toolsResult, resourcesResult, promptsResult] = await Promise.all([
      client.listTools().catch(() => ({tools: []})),
      client.listResources().catch(() => ({resources: []})),
      client.listPrompts().catch(() => ({prompts: []})),
    ])

    return {
      tools: toolsResult.tools ?? [],
      resources: resourcesResult.resources ?? [],
      prompts: promptsResult.prompts ?? [],
    }
  }

  private emitConnectionChange(serverId: string, status: ConnectionStatus, error?: Error): void {
    this.connectionStatus.set(serverId, status)
    for (const callback of this.connectionCallbacks) {
      try {
        callback(serverId, status, error)
      } catch {
        // Ignore callback errors
      }
    }
  }

  private emitToolCall(call: MCPToolCall): void {
    for (const callback of this.toolCallCallbacks) {
      try {
        callback(call)
      } catch {
        // Ignore callback errors
      }
    }
  }
}

// Singleton instance
let mcpClientServiceInstance: MCPClientService | null = null

export function getMCPClientService(): MCPClientService {
  if (!mcpClientServiceInstance) {
    mcpClientServiceInstance = new MCPClientServiceImpl()
  }
  return mcpClientServiceInstance
}

export function resetMCPClientServiceForTesting(): void {
  if (mcpClientServiceInstance) {
    mcpClientServiceInstance.disconnectAll().catch(console.error)
  }
  mcpClientServiceInstance = null
}
