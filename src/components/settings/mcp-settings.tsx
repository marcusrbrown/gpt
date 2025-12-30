import type {MCPServerConfig} from '@/types/mcp'
import {MCPServerCard} from '@/components/mcp/mcp-server-card'
import {MCPServerForm} from '@/components/mcp/mcp-server-form'
import {MCPToolExplorer} from '@/components/mcp/mcp-tool-explorer'
import {useMCP} from '@/hooks/use-mcp'
import {cn, compose, ds, responsive, theme} from '@/lib/design-system'
import {addToast, Button, Modal, ModalBody, ModalContent, ModalHeader, Spinner, useDisclosure} from '@heroui/react'
import {useState} from 'react'

export function MCPSettings() {
  const {servers, isLoadingServers, addServer, updateServer, removeServer, error} = useMCP()

  // Add/Edit Modal
  const {isOpen, onOpen, onClose} = useDisclosure()
  const [editingServer, setEditingServer] = useState<MCPServerConfig | undefined>(undefined)

  // Tool Explorer Modal
  const {isOpen: isToolOpen, onOpen: onToolOpen, onClose: onToolClose} = useDisclosure()
  const [viewingServerId, setViewingServerId] = useState<string | null>(null)

  const handleAddServer = () => {
    setEditingServer(undefined)
    onOpen()
  }

  const handleEditServer = (server: MCPServerConfig) => {
    setEditingServer(server)
    onOpen()
  }

  const handleViewTools = (serverId: string) => {
    setViewingServerId(serverId)
    onToolOpen()
  }

  const handleSaveServer = async (config: Omit<MCPServerConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingServer) {
        await updateServer(editingServer.id, config)
        addToast({
          title: 'Server Updated',
          description: `MCP server "${config.name}" has been updated.`,
          color: 'success',
          timeout: 4000,
        })
      } else {
        await addServer(config)
        addToast({
          title: 'Server Added',
          description: `MCP server "${config.name}" has been added.`,
          color: 'success',
          timeout: 4000,
        })
      }
      onClose()
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to save MCP server configuration. Please try again.',
        color: 'danger',
        timeout: 5000,
      })
      console.error('Failed to save server:', error)
      throw error
    }
  }

  const handleDeleteServer = (serverId: string) => {
    // Using window.confirm for user confirmation before destructive action
    // eslint-disable-next-line no-alert
    if (window.confirm('Are you sure you want to delete this server configuration?')) {
      removeServer(serverId)
        .then(() => {
          addToast({
            title: 'Server Deleted',
            description: 'MCP server configuration has been removed.',
            color: 'success',
            timeout: 4000,
          })
        })
        .catch(error => {
          addToast({
            title: 'Error',
            description: 'Failed to delete MCP server. Please try again.',
            color: 'danger',
            timeout: 5000,
          })
          console.error('Failed to delete server:', error)
        })
    }
  }

  if (isLoadingServers) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className={cn(compose.card(), theme.surface(1))}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className={cn(responsive.heading.large)}>MCP Settings</h2>
          <p className={cn(ds.text.body.small, 'text-default-500 mt-1')}>
            Manage Model Context Protocol servers to extend AI capabilities with tools and resources.
          </p>
        </div>
        <Button color="primary" onPress={handleAddServer} startContent={<span>+</span>}>
          Add Server
        </Button>
      </div>

      {error && (
        <div className="p-4 mb-6 rounded-lg bg-danger-50 border border-danger-200 text-danger-800">
          <p className="font-medium">Error loading MCP configuration</p>
          <p className="text-sm">{error.message}</p>
        </div>
      )}

      {servers.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-default-200 rounded-xl bg-default-50">
          <p className={cn(ds.text.body.large, 'font-medium text-default-600')}>No servers configured</p>
          <p className={cn(ds.text.body.small, 'text-default-500 mt-2 mb-4')}>
            Add an MCP server to connect tools, resources, and prompts.
          </p>
          <Button variant="flat" color="primary" onPress={handleAddServer}>
            Add Your First Server
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {servers.map(server => (
            <MCPServerCard
              key={server.id}
              server={server}
              onEdit={handleEditServer}
              onDelete={handleDeleteServer}
              onViewTools={handleViewTools}
            />
          ))}
        </div>
      )}

      <MCPServerForm isOpen={isOpen} onClose={onClose} onSave={handleSaveServer} initialConfig={editingServer} />

      <Modal
        isOpen={isToolOpen}
        onClose={onToolClose}
        size="2xl"
        scrollBehavior="inside"
        classNames={{
          base: cn(theme.surface(1), 'border', theme.border()),
          header: 'border-b border-default-100',
        }}
      >
        <ModalContent>
          <ModalHeader>Server Tools</ModalHeader>
          <ModalBody className="py-6">{viewingServerId && <MCPToolExplorer serverId={viewingServerId} />}</ModalBody>
        </ModalContent>
      </Modal>
    </div>
  )
}
