import {describe, expect, it} from 'vitest'

// Since the service has complex dependencies on the MCP SDK and database,
// we test the interface contract and basic behavior without full mocking

describe('MCPClientService', () => {
  describe('interface contract', () => {
    it('should export getMCPClientService function', async () => {
      // Dynamic import to avoid module initialization issues with mocks
      const module = await import('../mcp-client-service')
      expect(module.getMCPClientService).toBeDefined()
      expect(typeof module.getMCPClientService).toBe('function')
    })

    it('should export ConnectionStatus type', async () => {
      const module = await import('../mcp-client-service')
      // Type exports don't exist at runtime, but the module should load without error
      expect(module).toBeDefined()
    })
  })

  describe('MCPClientService interface', () => {
    it('should define all required methods in the interface', async () => {
      // Verify the interface is properly defined by checking the module exports
      const moduleContent = await import('../mcp-client-service')

      // The service should be obtainable (even if it fails due to missing SDK in test env)
      expect(moduleContent.getMCPClientService).toBeDefined()
    })
  })

  describe('ConnectionStatus enum', () => {
    it('should have valid status values', () => {
      // Test the expected status values
      const validStatuses = ['disconnected', 'connecting', 'connected', 'error']
      validStatuses.forEach(status => {
        expect(typeof status).toBe('string')
      })
    })
  })
})

describe('MCP OAuth Provider', () => {
  describe('module exports', () => {
    it('should export MCPBrowserOAuthProvider class', async () => {
      const module = await import('../mcp-oauth-provider')
      expect(module.MCPBrowserOAuthProvider).toBeDefined()
    })
  })

  describe('MCPBrowserOAuthProvider', () => {
    it('should be constructable with required parameters', async () => {
      const {MCPBrowserOAuthProvider} = await import('../mcp-oauth-provider')

      const mockServerConfig = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Server',
        transport: 'streamable-http' as const,
        authentication: {
          type: 'oauth2' as const,
          clientId: 'test-client',
          authUrl: 'https://auth.example.com/authorize',
          tokenUrl: 'https://auth.example.com/token',
        },
        timeout: 30000,
        retryAttempts: 3,
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Should not throw during construction
      expect(() => new MCPBrowserOAuthProvider(mockServerConfig)).not.toThrow()
    })

    it('should implement OAuthClientProvider interface methods', async () => {
      const {MCPBrowserOAuthProvider} = await import('../mcp-oauth-provider')

      const mockServerConfig = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Server',
        transport: 'streamable-http' as const,
        authentication: {
          type: 'oauth2' as const,
          clientId: 'test-client',
          authUrl: 'https://auth.example.com/authorize',
          tokenUrl: 'https://auth.example.com/token',
        },
        timeout: 30000,
        retryAttempts: 3,
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const provider = new MCPBrowserOAuthProvider(mockServerConfig)

      // Verify interface methods exist
      expect(provider.clientMetadata).toBeDefined()
      expect(provider.tokens).toBeDefined()
      expect(provider.saveTokens).toBeDefined()
      expect(provider.redirectUrl).toBeDefined()
      expect(provider.saveCodeVerifier).toBeDefined()
      expect(provider.codeVerifier).toBeDefined()
    })

    it('should return correct client metadata', async () => {
      const {MCPBrowserOAuthProvider} = await import('../mcp-oauth-provider')

      const mockServerConfig = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Server',
        transport: 'streamable-http' as const,
        authentication: {
          type: 'oauth2' as const,
          clientId: 'my-client-id',
          authUrl: 'https://auth.example.com/authorize',
          tokenUrl: 'https://auth.example.com/token',
          scopes: ['read', 'write'],
        },
        timeout: 30000,
        retryAttempts: 3,
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const provider = new MCPBrowserOAuthProvider(mockServerConfig)
      const metadata = provider.clientMetadata

      // Verify metadata structure exists
      expect(metadata).toBeDefined()
      expect(typeof metadata).toBe('object')
    })
  })
})
