/**
 * MCP Hooks - React hooks for MCP functionality
 */

import type {ConnectionStatus} from '@/services/mcp-client-service'
import {MCPContext, type MCPContextType} from '@/contexts/mcp-context'
import {use, useMemo} from 'react'

/**
 * Access the MCP context.
 * Must be used within an MCPProvider.
 */
export function useMCP(): MCPContextType {
  const context = use(MCPContext)
  if (!context) {
    throw new Error('useMCP must be used within an MCPProvider')
  }
  return context
}

/**
 * Get the connection status for a specific server.
 */
export function useMCPConnectionStatus(serverId: string): ConnectionStatus {
  const {getConnectionStatus} = useMCP()
  return getConnectionStatus(serverId)
}

/**
 * Get available tools for a connected server.
 */
export function useMCPTools(serverId: string) {
  const {getCapabilities} = useMCP()
  const capabilities = getCapabilities(serverId)
  return useMemo(() => capabilities?.tools ?? [], [capabilities])
}

/**
 * Get all tools from all connected servers.
 * Returns a flat list with server info attached.
 */
export function useAllConnectedTools() {
  const {servers, connectionStatus, capabilities} = useMCP()

  return useMemo(() => {
    const tools: {
      serverId: string
      serverName: string
      tool: {name: string; description?: string; inputSchema?: unknown}
    }[] = []

    for (const server of servers) {
      if (connectionStatus.get(server.id) !== 'connected') continue
      const caps = capabilities.get(server.id)
      if (!caps) continue

      for (const tool of caps.tools) {
        tools.push({
          serverId: server.id,
          serverName: server.name,
          tool,
        })
      }
    }

    return tools
  }, [servers, connectionStatus, capabilities])
}
