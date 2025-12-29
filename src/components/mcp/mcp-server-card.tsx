import type {ConnectionStatus} from '@/services/mcp-client-service'
import type {MCPServerConfig} from '@/types/mcp'
import {useMCP} from '@/hooks/use-mcp'
import {cn, compose, ds, theme} from '@/lib/design-system'
import {Button, Chip, Spinner, Tooltip} from '@heroui/react'
import {useState} from 'react'

interface MCPServerCardProps {
  server: MCPServerConfig
  onEdit: (server: MCPServerConfig) => void
  onDelete: (serverId: string) => void
  onViewTools: (serverId: string) => void
}

export function MCPServerCard({server, onEdit, onDelete, onViewTools}: MCPServerCardProps) {
  const {connect, disconnect, getConnectionStatus} = useMCP()
  const status = getConnectionStatus(server.id)
  const [isToggling, setIsToggling] = useState(false)

  const handleToggleConnection = async () => {
    setIsToggling(true)
    try {
      if (status === 'connected') {
        await disconnect(server.id)
      } else {
        await connect(server.id)
      }
    } catch (error) {
      console.error('Failed to toggle connection:', error)
    } finally {
      setIsToggling(false)
    }
  }

  const getStatusColor = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return 'success'
      case 'connecting':
        return 'warning'
      case 'error':
        return 'danger'
      default:
        return 'default'
    }
  }

  const getStatusLabel = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return 'Connected'
      case 'connecting':
        return 'Connecting...'
      case 'error':
        return 'Error'
      case 'disconnected':
        return 'Disconnected'
    }
  }

  return (
    <div
      className={cn(
        compose.card(),
        theme.surface(1),
        'flex flex-col gap-4 p-4',
        !server.enabled && 'opacity-60 grayscale-[0.5]',
      )}
    >
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h3 className={cn(ds.text.heading.h4, 'font-medium')}>{server.name}</h3>
            <Chip
              size="sm"
              variant="flat"
              color={getStatusColor(status)}
              className="capitalize h-6"
              startContent={status === 'connecting' || isToggling ? <Spinner size="sm" color="current" /> : undefined}
            >
              {getStatusLabel(status)}
            </Chip>
          </div>
          <div className={cn(ds.text.body.small, 'text-default-500 font-mono text-xs truncate max-w-[300px]')}>
            {server.transport === 'streamable-http' ? server.url : 'stdio (local)'}
          </div>
        </div>

        <div className="flex gap-2">
          <Tooltip content={status === 'connected' ? 'Disconnect' : 'Connect'}>
            <Button
              isIconOnly
              size="sm"
              variant={status === 'connected' ? 'flat' : 'solid'}
              color={status === 'connected' ? 'danger' : 'primary'}
              onPress={() => {
                handleToggleConnection().catch(console.error)
              }}
              isLoading={isToggling}
              isDisabled={!server.enabled}
              className="min-w-8 w-8 h-8"
            >
              <div
                className={cn(
                  'w-3 h-3 rounded-full',
                  status === 'connected' ? 'bg-current' : 'border-2 border-current',
                )}
              />
            </Button>
          </Tooltip>

          <Button size="sm" variant="bordered" onPress={() => onEdit(server)} className="h-8">
            Edit
          </Button>
        </div>
      </div>

      <div className="flex justify-between items-center pt-2 border-t border-default-100">
        <div className="flex gap-2">
          <Chip size="sm" variant="dot" className="border-none pl-0">
            {server.authentication.type === 'none' ? 'No Auth' : server.authentication.type}
          </Chip>
          {server.enabled ? (
            <Chip size="sm" color="success" variant="dot" className="border-none pl-0">
              Enabled
            </Chip>
          ) : (
            <Chip size="sm" color="default" variant="dot" className="border-none pl-0">
              Disabled
            </Chip>
          )}
        </div>

        <div className="flex gap-2">
          {status === 'connected' && (
            <Button size="sm" variant="light" color="primary" onPress={() => onViewTools(server.id)} className="h-8">
              View Tools
            </Button>
          )}
          <Button size="sm" variant="light" color="danger" onPress={() => onDelete(server.id)} className="h-8">
            Delete
          </Button>
        </div>
      </div>
    </div>
  )
}
