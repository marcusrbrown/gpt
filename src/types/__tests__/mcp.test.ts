import {describe, expect, it} from 'vitest'
import {
  MCPAuthenticationSchema,
  MCPOAuthTokensSchema,
  MCPServerConfigSchema,
  MCPTaskSchema,
  MCPToolCallSchema,
} from '../mcp'

describe('MCP Type Schemas', () => {
  describe('MCPAuthenticationSchema', () => {
    it('should validate none auth type', () => {
      const auth = {type: 'none' as const}
      expect(() => MCPAuthenticationSchema.parse(auth)).not.toThrow()
    })

    it('should validate bearer auth type', () => {
      const auth = {type: 'bearer' as const, token: 'my-token'}
      expect(() => MCPAuthenticationSchema.parse(auth)).not.toThrow()
    })

    it('should validate api-key auth type', () => {
      const auth = {type: 'api-key' as const, key: 'my-api-key', header: 'x-api-key'}
      expect(() => MCPAuthenticationSchema.parse(auth)).not.toThrow()
    })

    it('should validate basic auth type', () => {
      const auth = {type: 'basic' as const, username: 'user', password: 'pass'}
      expect(() => MCPAuthenticationSchema.parse(auth)).not.toThrow()
    })

    it('should validate oauth2 auth type', () => {
      const auth = {
        type: 'oauth2' as const,
        clientId: 'client-id',
        clientSecret: 'client-secret',
        authUrl: 'https://auth.example.com/authorize',
        tokenUrl: 'https://auth.example.com/token',
        scopes: ['read', 'write'],
      }
      expect(() => MCPAuthenticationSchema.parse(auth)).not.toThrow()
    })

    it('should reject invalid auth type', () => {
      const auth = {type: 'invalid'}
      expect(() => MCPAuthenticationSchema.parse(auth)).toThrow()
    })

    it('should reject bearer without token', () => {
      const auth = {type: 'bearer'}
      expect(() => MCPAuthenticationSchema.parse(auth)).toThrow()
    })
  })

  describe('MCPServerConfigSchema', () => {
    it('should validate valid server configuration', () => {
      const validServer = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Server',
        url: 'https://mcp.example.com',
        transport: 'streamable-http' as const,
        authentication: {type: 'none' as const},
        timeout: 30000,
        retryAttempts: 3,
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      expect(() => MCPServerConfigSchema.parse(validServer)).not.toThrow()
    })

    it('should validate server with stdio transport', () => {
      const validServer = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Stdio Server',
        transport: 'stdio' as const,
        command: '/usr/bin/mcp-server',
        args: ['--port', '8080'],
        authentication: {type: 'bearer' as const, token: 'token123'},
        timeout: 30000,
        retryAttempts: 3,
        enabled: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      expect(() => MCPServerConfigSchema.parse(validServer)).not.toThrow()
    })

    it('should validate server with OAuth2 auth', () => {
      const validServer = {
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'OAuth Server',
        url: 'https://oauth-mcp.example.com',
        transport: 'streamable-http' as const,
        authentication: {
          type: 'oauth2' as const,
          clientId: 'client-123',
          authUrl: 'https://auth.example.com/authorize',
          tokenUrl: 'https://auth.example.com/token',
        },
        timeout: 30000,
        retryAttempts: 3,
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      expect(() => MCPServerConfigSchema.parse(validServer)).not.toThrow()
    })

    it('should reject invalid transport type', () => {
      const invalidServer = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Server',
        url: 'https://mcp.example.com',
        transport: 'invalid',
        authentication: {type: 'none'},
        timeout: 30000,
        retryAttempts: 3,
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      expect(() => MCPServerConfigSchema.parse(invalidServer)).toThrow()
    })

    it('should reject missing required fields', () => {
      const invalidServer = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Server',
      }
      expect(() => MCPServerConfigSchema.parse(invalidServer)).toThrow()
    })

    it('should reject invalid URL', () => {
      const invalidServer = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Server',
        url: 'not-a-url',
        transport: 'streamable-http',
        authentication: {type: 'none'},
        timeout: 30000,
        retryAttempts: 3,
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      expect(() => MCPServerConfigSchema.parse(invalidServer)).toThrow()
    })
  })

  describe('MCPToolCallSchema', () => {
    it('should validate valid tool call', () => {
      const validToolCall = {
        id: 'call-1',
        serverId: '550e8400-e29b-41d4-a716-446655440000',
        toolName: 'test-tool',
        arguments: {query: 'test'},
        status: 'pending' as const,
        startedAt: new Date().toISOString(),
      }
      expect(() => MCPToolCallSchema.parse(validToolCall)).not.toThrow()
    })

    it('should validate completed tool call with result', () => {
      const completedToolCall = {
        id: 'call-2',
        serverId: '550e8400-e29b-41d4-a716-446655440000',
        toolName: 'test-tool',
        arguments: {query: 'test'},
        content: [{type: 'text', text: 'result'}],
        status: 'success' as const,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      }
      expect(() => MCPToolCallSchema.parse(completedToolCall)).not.toThrow()
    })

    it('should validate failed tool call with error', () => {
      const failedToolCall = {
        id: 'call-3',
        serverId: '550e8400-e29b-41d4-a716-446655440000',
        toolName: 'test-tool',
        arguments: {},
        status: 'error' as const,
        isError: true,
        error: 'Tool execution failed',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      }
      expect(() => MCPToolCallSchema.parse(failedToolCall)).not.toThrow()
    })

    it('should validate all status types', () => {
      const statuses = ['pending', 'running', 'success', 'error', 'cancelled'] as const
      for (const status of statuses) {
        const toolCall = {
          id: `call-${status}`,
          serverId: '550e8400-e29b-41d4-a716-446655440000',
          toolName: 'test-tool',
          arguments: {},
          status,
          startedAt: new Date().toISOString(),
        }
        expect(() => MCPToolCallSchema.parse(toolCall)).not.toThrow()
      }
    })

    it('should reject invalid status', () => {
      const invalidToolCall = {
        id: 'call-1',
        serverId: '550e8400-e29b-41d4-a716-446655440000',
        toolName: 'test-tool',
        arguments: {},
        status: 'invalid',
        startedAt: new Date().toISOString(),
      }
      expect(() => MCPToolCallSchema.parse(invalidToolCall)).toThrow()
    })
  })

  describe('MCPTaskSchema', () => {
    it('should validate valid task', () => {
      const validTask = {
        id: 'task-1',
        serverId: '550e8400-e29b-41d4-a716-446655440000',
        toolCallId: 'call-1',
        status: 'running' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      expect(() => MCPTaskSchema.parse(validTask)).not.toThrow()
    })

    it('should validate completed task', () => {
      const completedTask = {
        id: 'task-2',
        serverId: '550e8400-e29b-41d4-a716-446655440000',
        toolCallId: 'call-2',
        status: 'completed' as const,
        progress: 100,
        progressMessage: 'Done',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      }
      expect(() => MCPTaskSchema.parse(completedTask)).not.toThrow()
    })

    it('should validate all task statuses', () => {
      const statuses = ['running', 'completed', 'failed', 'cancelled'] as const
      for (const status of statuses) {
        const task = {
          id: `task-${status}`,
          serverId: '550e8400-e29b-41d4-a716-446655440000',
          toolCallId: 'call-1',
          status,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        expect(() => MCPTaskSchema.parse(task)).not.toThrow()
      }
    })

    it('should reject invalid task status', () => {
      const invalidTask = {
        id: 'task-1',
        serverId: '550e8400-e29b-41d4-a716-446655440000',
        toolCallId: 'call-1',
        status: 'invalid',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      expect(() => MCPTaskSchema.parse(invalidTask)).toThrow()
    })
  })

  describe('MCPOAuthTokensSchema', () => {
    it('should validate valid OAuth tokens', () => {
      const validTokens = {
        serverId: '550e8400-e29b-41d4-a716-446655440000',
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        scope: 'read write',
      }
      expect(() => MCPOAuthTokensSchema.parse(validTokens)).not.toThrow()
    })

    it('should validate tokens without refresh token', () => {
      const tokensWithoutRefresh = {
        serverId: '550e8400-e29b-41d4-a716-446655440000',
        accessToken: 'access-token-123',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      }
      expect(() => MCPOAuthTokensSchema.parse(tokensWithoutRefresh)).not.toThrow()
    })

    it('should reject missing access token', () => {
      const invalidTokens = {
        serverId: '550e8400-e29b-41d4-a716-446655440000',
        expiresAt: new Date().toISOString(),
      }
      expect(() => MCPOAuthTokensSchema.parse(invalidTokens)).toThrow()
    })

    it('should reject missing server ID', () => {
      const invalidTokens = {
        accessToken: 'access-token-123',
        expiresAt: new Date().toISOString(),
      }
      expect(() => MCPOAuthTokensSchema.parse(invalidTokens)).toThrow()
    })
  })
})
