/**
 * MCP Context - React context for MCP server management
 * Provides reactive access to MCP servers, connections, and tool calls.
 */

import type {MCPServerConfig, MCPToolCall} from '@/types/mcp'
import {
  getMCPClientService,
  type ConnectionStatus,
  type MCPClientService,
  type MCPDiscoveredCapabilities,
  type MCPToolCallResult,
} from '@/services/mcp-client-service'
import {createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode} from 'react'

export interface MCPContextType {
  // Service instance
  service: MCPClientService

  // Servers (cached state)
  servers: MCPServerConfig[]
  isLoadingServers: boolean
  refreshServers: () => Promise<void>

  // Connection status (reactive)
  connectionStatus: Map<string, ConnectionStatus>
  getConnectionStatus: (serverId: string) => ConnectionStatus

  // Capabilities (cached after connect)
  capabilities: Map<string, MCPDiscoveredCapabilities>
  getCapabilities: (serverId: string) => MCPDiscoveredCapabilities | undefined

  // Operations
  addServer: (config: Omit<MCPServerConfig, 'id' | 'createdAt' | 'updatedAt'>) => Promise<MCPServerConfig>
  updateServer: (id: string, updates: Partial<MCPServerConfig>) => Promise<MCPServerConfig>
  removeServer: (id: string) => Promise<void>
  connect: (serverId: string) => Promise<MCPDiscoveredCapabilities>
  disconnect: (serverId: string) => Promise<void>
  callTool: (serverId: string, toolName: string, args: Record<string, unknown>) => Promise<MCPToolCallResult>

  // Active tool calls (for visualization)
  activeToolCalls: MCPToolCall[]

  // Error state
  error: Error | null
  clearError: () => void
}

export const MCPContext = createContext<MCPContextType | undefined>(undefined)

interface MCPProviderProps {
  children: ReactNode
}

export function MCPProvider({children}: MCPProviderProps) {
  const service = useMemo(() => getMCPClientService(), [])

  // Server list state
  const [servers, setServers] = useState<MCPServerConfig[]>([])
  const [isLoadingServers, setIsLoadingServers] = useState(true)

  // Connection status (reactive copy from service)
  const [connectionStatus, setConnectionStatus] = useState<Map<string, ConnectionStatus>>(() => new Map())

  // Capabilities cache
  const [capabilities, setCapabilities] = useState<Map<string, MCPDiscoveredCapabilities>>(() => new Map())

  // Active tool calls
  const [activeToolCalls, setActiveToolCalls] = useState<MCPToolCall[]>([])

  // Error state
  const [error, setError] = useState<Error | null>(null)

  // Load servers on mount
  const refreshServers = useCallback(async () => {
    setIsLoadingServers(true)
    try {
      const list = await service.listServers()
      setServers(list)
    } catch (error_) {
      setError(error_ instanceof Error ? error_ : new Error('Failed to load servers'))
    } finally {
      setIsLoadingServers(false)
    }
  }, [service])

  useEffect(() => {
    refreshServers().catch(console.error)
  }, [refreshServers])

  // Subscribe to connection changes
  useEffect(() => {
    return service.onConnectionChange((serverId, status) => {
      setConnectionStatus(prev => {
        const next = new Map(prev)
        next.set(serverId, status)
        return next
      })
    })
  }, [service])

  // Track cleanup timeouts for completed tool calls
  const cleanupTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Subscribe to tool calls
  useEffect(() => {
    const timeouts = cleanupTimeoutsRef.current
    const unsubscribe = service.onToolCall(call => {
      setActiveToolCalls(prev => {
        // Update or add the call
        const existing = prev.findIndex(c => c.id === call.id)
        if (existing !== -1) {
          const next = [...prev]
          next[existing] = call
          // Remove completed calls after a delay
          if (call.status === 'success' || call.status === 'error') {
            const timeoutId = setTimeout(() => {
              setActiveToolCalls(current => current.filter(c => c.id !== call.id))
              timeouts.delete(call.id)
            }, 5000)
            timeouts.set(call.id, timeoutId)
          }
          return next
        }
        return [...prev, call]
      })
    })

    return () => {
      unsubscribe()
      for (const timeoutId of timeouts.values()) {
        clearTimeout(timeoutId)
      }
      timeouts.clear()
    }
  }, [service])

  // Getters
  const getConnectionStatus = useCallback(
    (serverId: string): ConnectionStatus => {
      return connectionStatus.get(serverId) ?? service.getConnectionStatus(serverId)
    },
    [connectionStatus, service],
  )

  const getCapabilities = useCallback(
    (serverId: string): MCPDiscoveredCapabilities | undefined => {
      return capabilities.get(serverId) ?? service.getCachedCapabilities(serverId)
    },
    [capabilities, service],
  )

  // Operations with state sync
  const addServer = useCallback(
    async (config: Omit<MCPServerConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const server = await service.addServer(config)
        setServers(prev => [...prev, server])
        return server
      } catch (error_) {
        setError(error_ instanceof Error ? error_ : new Error('Failed to add server'))
        throw error_
      }
    },
    [service],
  )

  const updateServer = useCallback(
    async (id: string, updates: Partial<MCPServerConfig>) => {
      try {
        const server = await service.updateServer(id, updates)
        setServers(prev => prev.map(s => (s.id === id ? server : s)))
        return server
      } catch (error_) {
        setError(error_ instanceof Error ? error_ : new Error('Failed to update server'))
        throw error_
      }
    },
    [service],
  )

  const removeServer = useCallback(
    async (id: string) => {
      try {
        await service.removeServer(id)
        setServers(prev => prev.filter(s => s.id !== id))
        setConnectionStatus(prev => {
          const next = new Map(prev)
          next.delete(id)
          return next
        })
        setCapabilities(prev => {
          const next = new Map(prev)
          next.delete(id)
          return next
        })
      } catch (error_) {
        setError(error_ instanceof Error ? error_ : new Error('Failed to remove server'))
        throw error_
      }
    },
    [service],
  )

  const connect = useCallback(
    async (serverId: string) => {
      try {
        const caps = await service.connect(serverId)
        setCapabilities(prev => {
          const next = new Map(prev)
          next.set(serverId, caps)
          return next
        })
        return caps
      } catch (error_) {
        setError(error_ instanceof Error ? error_ : new Error('Failed to connect'))
        throw error_
      }
    },
    [service],
  )

  const disconnect = useCallback(
    async (serverId: string) => {
      try {
        await service.disconnect(serverId)
      } catch (error_) {
        setError(error_ instanceof Error ? error_ : new Error('Failed to disconnect'))
        throw error_
      }
    },
    [service],
  )

  const callTool = useCallback(
    async (serverId: string, toolName: string, args: Record<string, unknown>) => {
      try {
        return await service.callTool(serverId, toolName, args)
      } catch (error_) {
        setError(error_ instanceof Error ? error_ : new Error('Tool call failed'))
        throw error_
      }
    },
    [service],
  )

  const clearError = useCallback(() => setError(null), [])

  const value = useMemo<MCPContextType>(
    () => ({
      service,
      servers,
      isLoadingServers,
      refreshServers,
      connectionStatus,
      getConnectionStatus,
      capabilities,
      getCapabilities,
      addServer,
      updateServer,
      removeServer,
      connect,
      disconnect,
      callTool,
      activeToolCalls,
      error,
      clearError,
    }),
    [
      service,
      servers,
      isLoadingServers,
      refreshServers,
      connectionStatus,
      getConnectionStatus,
      capabilities,
      getCapabilities,
      addServer,
      updateServer,
      removeServer,
      connect,
      disconnect,
      callTool,
      activeToolCalls,
      error,
      clearError,
    ],
  )

  return <MCPContext value={value}>{children}</MCPContext>
}
