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
 * Get available resources for a connected server.
 */
export function useMCPResources(serverId: string) {
  const {getCapabilities} = useMCP()
  const capabilities = getCapabilities(serverId)
  return useMemo(() => capabilities?.resources ?? [], [capabilities])
}

/**
 * Get available prompts for a connected server.
 */
export function useMCPPrompts(serverId: string) {
  const {getCapabilities} = useMCP()
  const capabilities = getCapabilities(serverId)
  return useMemo(() => capabilities?.prompts ?? [], [capabilities])
}

/**
 * Get all enabled servers.
 */
export function useEnabledMCPServers() {
  const {servers} = useMCP()
  return useMemo(() => servers.filter(s => s.enabled), [servers])
}

/**
 * Get connected servers (status === 'connected').
 */
export function useConnectedMCPServers() {
  const {servers, connectionStatus} = useMCP()
  return useMemo(() => servers.filter(s => connectionStatus.get(s.id) === 'connected'), [servers, connectionStatus])
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

/**
 * Check if any MCP servers are configured.
 */
export function useHasMCPServers() {
  const {servers} = useMCP()
  return servers.length > 0
}

/**
 * Get active tool calls (for visualization in chat).
 */
export function useActiveToolCalls() {
  const {activeToolCalls} = useMCP()
  return activeToolCalls
}
