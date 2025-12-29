import {z} from 'zod'

/**
 * MCP (Model Context Protocol) types for RFC-009.
 * Uses official @modelcontextprotocol/sdk for protocol handling.
 */

export const MCP_PROTOCOL_VERSION = '2025-11-25'

export const MCPTransportTypeSchema = z.enum(['stdio', 'streamable-http'])
export type MCPTransportType = z.infer<typeof MCPTransportTypeSchema>

export const MCPIconSchema = z.object({
  url: z.string().url(),
  mediaType: z.string().optional(),
})
export type MCPIcon = z.infer<typeof MCPIconSchema>

export const MCPOAuthConfigSchema = z.object({
  type: z.literal('oauth2'),
  clientId: z.string(),
  clientSecret: z.string().optional(),
  authUrl: z.string().url(),
  tokenUrl: z.string().url(),
  privateKey: z.string().optional(),
  algorithm: z.enum(['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512']).optional(),
  scopes: z.array(z.string()).optional(),
})
export type MCPOAuthConfig = z.infer<typeof MCPOAuthConfigSchema>

export const MCPAuthenticationSchema = z.discriminatedUnion('type', [
  z.object({type: z.literal('none')}),
  z.object({type: z.literal('bearer'), token: z.string()}),
  z.object({type: z.literal('api-key'), key: z.string(), header: z.string().default('x-api-key')}),
  z.object({type: z.literal('basic'), username: z.string(), password: z.string()}),
  MCPOAuthConfigSchema,
])
export type MCPAuthentication = z.infer<typeof MCPAuthenticationSchema>

export const MCPServerConfigSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  transport: MCPTransportTypeSchema,

  // For stdio transport (Tauri/Node.js only)
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
  cwd: z.string().optional(),

  // For Streamable HTTP transport
  url: z.string().url().optional(),
  headers: z.record(z.string(), z.string()).optional(),

  // Authentication
  authentication: MCPAuthenticationSchema.default({type: 'none'}),

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
export type MCPServerConfig = z.infer<typeof MCPServerConfigSchema>

export const MCPToolCallStatusSchema = z.enum(['pending', 'running', 'success', 'error', 'cancelled'])
export type MCPToolCallStatus = z.infer<typeof MCPToolCallStatusSchema>

export const MCPToolCallSchema = z.object({
  id: z.string(),
  serverId: z.string().uuid(),
  toolName: z.string(),
  arguments: z.record(z.string(), z.unknown()),
  status: MCPToolCallStatusSchema,
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  content: z.array(z.unknown()).optional(),
  structuredContent: z.record(z.string(), z.unknown()).optional(),
  isError: z.boolean().optional(),
  error: z.string().optional(),
  taskId: z.string().optional(),
  taskStatus: z.enum(['running', 'completed', 'failed', 'cancelled']).optional(),
})
export type MCPToolCall = z.infer<typeof MCPToolCallSchema>

export const MCPTaskStatusSchema = z.enum(['running', 'completed', 'failed', 'cancelled'])
export type MCPTaskStatus = z.infer<typeof MCPTaskStatusSchema>

export const MCPTaskSchema = z.object({
  id: z.string(),
  serverId: z.string().uuid(),
  toolCallId: z.string(),
  status: MCPTaskStatusSchema,
  progress: z.number().min(0).max(100).optional(),
  progressMessage: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
})
export type MCPTask = z.infer<typeof MCPTaskSchema>

export const MCPOAuthTokensSchema = z.object({
  serverId: z.string().uuid(),
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().datetime(),
  scope: z.string().optional(),
})
export type MCPOAuthTokens = z.infer<typeof MCPOAuthTokensSchema>

export const MCPConnectionStatusSchema = z.enum(['disconnected', 'connecting', 'connected', 'error'])
export type MCPConnectionStatus = z.infer<typeof MCPConnectionStatusSchema>

export const MCPToolApprovalModeSchema = z.enum(['auto', 'always-ask', 'trusted-only'])
export type MCPToolApprovalMode = z.infer<typeof MCPToolApprovalModeSchema>

export const GPTMCPConfigSchema = z.object({
  serverIds: z.array(z.string().uuid()).default([]),
  toolApproval: MCPToolApprovalModeSchema.default('always-ask'),
  trustedTools: z.array(z.string()).default([]),
  taskPollingInterval: z.number().min(1000).max(60000).default(5000),
  enableAsyncTasks: z.boolean().default(true),
})
export type GPTMCPConfig = z.infer<typeof GPTMCPConfigSchema>

// Database interfaces (for Dexie table definitions)
export interface MCPServerConfigDB {
  id: string
  name: string
  description?: string
  transport: MCPTransportType
  command?: string
  args?: string[]
  env?: Record<string, string>
  cwd?: string
  url?: string
  headers?: Record<string, string>
  authentication: MCPAuthentication
  timeout: number
  retryAttempts: number
  sessionId?: string
  enabled: boolean
  lastConnectedAt?: string
  createdAt: string
  updatedAt: string
}

export interface MCPToolCallDB {
  id: string
  serverId: string
  toolName: string
  arguments: Record<string, unknown>
  status: MCPToolCallStatus
  startedAt: string
  completedAt?: string
  content?: unknown[]
  structuredContent?: Record<string, unknown>
  isError?: boolean
  error?: string
  taskId?: string
  taskStatus?: 'running' | 'completed' | 'failed' | 'cancelled'
}

export interface MCPTaskDB {
  id: string
  serverId: string
  toolCallId: string
  status: MCPTaskStatus
  progress?: number
  progressMessage?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface MCPOAuthTokensDB {
  serverId: string
  accessToken: string
  refreshToken?: string
  expiresAt: string
  tokenType?: string
  scope?: string
  createdAt: string
  updatedAt: string
}

// SDK type re-exports for convenience
export interface MCPDiscoveredCapabilities {
  tools: MCPDiscoveredTool[]
  resources: MCPDiscoveredResource[]
  prompts: MCPDiscoveredPrompt[]
}

export interface MCPDiscoveredTool {
  name: string
  description?: string
  inputSchema: Record<string, unknown>
  outputSchema?: Record<string, unknown>
  annotations?: {
    title?: string
    readOnlyHint?: boolean
    destructiveHint?: boolean
    idempotentHint?: boolean
    openWorldHint?: boolean
  }
}

export interface MCPDiscoveredResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

export interface MCPDiscoveredPrompt {
  name: string
  description?: string
  arguments?: {
    name: string
    description?: string
    required?: boolean
  }[]
}
