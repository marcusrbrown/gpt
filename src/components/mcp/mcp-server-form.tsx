import type {AuthType, MCPServerConfig} from '@/types/mcp'
import {cn, ds, theme} from '@/lib/design-system'
import {Button, Checkbox, Input, ListBox, ListBoxItem, Modal, Select, TextField, Label} from '@heroui/react'
import {useEffect, useState} from 'react'

interface MCPServerFormProps {
  isOpen: boolean
  onClose: () => void
  onSave: (config: Omit<MCPServerConfig, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  initialConfig?: MCPServerConfig
}

const DEFAULT_CONFIG: Omit<MCPServerConfig, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  transport: 'streamable-http',
  url: '',
  enabled: true,
  authType: 'none',
}

export function MCPServerForm({isOpen, onClose, onSave, initialConfig}: MCPServerFormProps) {
  const [formState, setFormState] = useState(DEFAULT_CONFIG)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setFormState(initialConfig || DEFAULT_CONFIG)
      setError(null)
    }
  }, [isOpen, initialConfig])

  const updateField = <K extends keyof typeof formState>(field: K, value: (typeof formState)[K]) => {
    setFormState(prev => ({...prev, [field]: value}))
  }

  const handleSave = async () => {
    if (!formState.name.trim()) {
      setError('Server name is required')
      return
    }

    if (formState.transport === 'streamable-http' && !formState.url.trim()) {
      setError('Server URL is required for HTTP transport')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      await onSave(formState)
    } catch (error_) {
      console.error('Failed to save MCP server:', error_)
      setError('Failed to save configuration')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop />
      <Modal.Container
        placement="center"
        scroll="inside"
        className={cn(theme.surface(1), 'border', theme.border(), 'max-w-2xl')}
      >
        <Modal.Dialog>
          <Modal.Header className="flex flex-col gap-1 border-b border-default-100">
            {initialConfig ? 'Edit MCP Server' : 'Add MCP Server'}
            <span className={cn(ds.text.body.small, 'font-normal text-default-500')}>
              Configure a Model Context Protocol server connection.
            </span>
          </Modal.Header>
          <Modal.Body className="py-6 gap-6">
            <div className="grid gap-4">
              <TextField className="flex flex-col gap-1">
                <Label>Server Name</Label>
                <Input
                  placeholder="e.g. Memory Service"
                  value={formState.name}
                  onChange={e => updateField('name', e.target.value)}
                  className={cn(ds.focus.ring)}
                />
              </TextField>

              <div className="grid grid-cols-2 gap-4">
                <Select
                  selectedKey={formState.transport}
                  onSelectionChange={key =>
                    key && updateField('transport', String(key) as 'stdio' | 'streamable-http')
                  }
                  className="flex flex-col gap-1"
                >
                  <Label>Transport</Label>
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBoxItem id="streamable-http" textValue="SSE / HTTP">
                        SSE / HTTP (Remote)
                      </ListBoxItem>
                      <ListBoxItem id="stdio" textValue="Stdio">
                        Stdio (Local Process)
                      </ListBoxItem>
                    </ListBox>
                  </Select.Popover>
                </Select>

                <div className="flex items-end pb-2">
                  <Checkbox isSelected={formState.enabled} onChange={v => updateField('enabled', v)}>
                    Enabled
                  </Checkbox>
                </div>
              </div>

              {formState.transport === 'streamable-http' && (
                <TextField className="flex flex-col gap-1">
                  <Label>Server URL</Label>
                  <Input
                    placeholder="http://localhost:3000/sse"
                    value={formState.url}
                    onChange={e => updateField('url', e.target.value)}
                    className={cn(ds.focus.ring)}
                    type="url"
                  />
                </TextField>
              )}

              {formState.transport === 'stdio' && (
                <div className={cn('p-3 rounded-lg bg-warning-50 text-warning-800 text-sm')}>
                  Stdio transport requires a desktop environment (Tauri). Not currently supported in web mode.
                </div>
              )}

              <div className="border-t border-default-100 my-2" />

              <Select
                selectedKey={formState.authType}
                onSelectionChange={key => key && updateField('authType', String(key) as AuthType)}
                className="flex flex-col gap-1"
              >
                <Label>Authentication</Label>
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBoxItem id="none" textValue="None">
                      None
                    </ListBoxItem>
                    <ListBoxItem id="api-key" textValue="API Key">
                      API Key
                    </ListBoxItem>
                    <ListBoxItem id="bearer" textValue="Bearer Token">
                      Bearer Token
                    </ListBoxItem>
                    <ListBoxItem id="basic" textValue="Basic Auth">
                      Basic Auth
                    </ListBoxItem>
                    <ListBoxItem id="oauth2" textValue="OAuth 2.0">
                      OAuth 2.0
                    </ListBoxItem>
                  </ListBox>
                </Select.Popover>
              </Select>

              {formState.authType === 'api-key' && (
                <div className="grid grid-cols-3 gap-4">
                  <TextField className="col-span-1 flex flex-col gap-1">
                    <Label>Header Name</Label>
                    <Input
                      value={formState.authKeyHeader}
                      onChange={e => updateField('authKeyHeader', e.target.value)}
                      placeholder="x-api-key"
                    />
                  </TextField>
                  <TextField className="col-span-2 flex flex-col gap-1">
                    <Label>Key</Label>
                    <Input
                      value={formState.authKey}
                      onChange={e => updateField('authKey', e.target.value)}
                      type="password"
                      placeholder="sk-..."
                    />
                  </TextField>
                </div>
              )}

              {formState.authType === 'bearer' && (
                <TextField className="flex flex-col gap-1">
                  <Label>Token</Label>
                  <Input
                    value={formState.authToken}
                    onChange={e => updateField('authToken', e.target.value)}
                    type="password"
                    placeholder="eyJ..."
                  />
                </TextField>
              )}

              {formState.authType === 'basic' && (
                <div className="grid grid-cols-2 gap-4">
                  <TextField className="flex flex-col gap-1">
                    <Label>Username</Label>
                    <Input
                      value={formState.authUsername}
                      onChange={e => updateField('authUsername', e.target.value)}
                    />
                  </TextField>
                  <TextField className="flex flex-col gap-1">
                    <Label>Password</Label>
                    <Input
                      value={formState.authPassword}
                      onChange={e => updateField('authPassword', e.target.value)}
                      type="password"
                    />
                  </TextField>
                </div>
              )}

              {formState.authType === 'oauth2' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <TextField className="flex flex-col gap-1">
                      <Label>Client ID</Label>
                      <Input
                        value={formState.oauthClientId}
                        onChange={e => updateField('oauthClientId', e.target.value)}
                      />
                    </TextField>
                    <TextField className="flex flex-col gap-1">
                      <Label>Client Secret</Label>
                      <Input
                        value={formState.oauthClientSecret}
                        onChange={e => updateField('oauthClientSecret', e.target.value)}
                        type="password"
                      />
                    </TextField>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <TextField className="flex flex-col gap-1">
                      <Label>Auth URL</Label>
                      <Input
                        value={formState.oauthAuthUrl}
                        onChange={e => updateField('oauthAuthUrl', e.target.value)}
                        placeholder="https://.../authorize"
                      />
                    </TextField>
                    <TextField className="flex flex-col gap-1">
                      <Label>Token URL</Label>
                      <Input
                        value={formState.oauthTokenUrl}
                        onChange={e => updateField('oauthTokenUrl', e.target.value)}
                        placeholder="https://.../token"
                      />
                    </TextField>
                  </div>
                  <TextField className="flex flex-col gap-1">
                    <Label>Scopes (comma separated)</Label>
                    <Input
                      value={formState.oauthScopes}
                      onChange={e => updateField('oauthScopes', e.target.value)}
                      placeholder="read,write"
                    />
                  </TextField>
                  <div className="p-2 bg-default-50 rounded text-xs text-default-500">
                    Note: Full OAuth flow configuration is not yet implemented in this UI.
                  </div>
                </div>
              )}
            </div>

            {error && <div className={cn(ds.form.errorText, 'text-center')}>{error}</div>}
          </Modal.Body>
          <Modal.Footer className="border-t border-default-100">
            <Button variant="secondary" onPress={onClose} isDisabled={isSaving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onPress={() => {
                handleSave().catch(console.error)
              }}
              isPending={isSaving}
            >
              Save Server
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal>
  )
}
