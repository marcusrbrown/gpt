import type {MCPAuthentication, MCPServerConfig} from '@/types/mcp'
import {cn, ds, theme} from '@/lib/design-system'
import '@/styles/heroui-v3.css'
import {Button, Checkbox, Input, Label, ListBox, Modal, Select, Spinner, TextField} from '@heroui-v3/react'
import {useState} from 'react'
import {z} from 'zod'

interface MCPServerFormProps {
  isOpen: boolean
  onClose: () => void
  onSave: (config: Omit<MCPServerConfig, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  initialConfig?: MCPServerConfig
}

const AUTH_TYPE_OPTIONS = [
  {id: 'none', label: 'None'},
  {id: 'api-key', label: 'API Key'},
  {id: 'bearer', label: 'Bearer Token'},
  {id: 'basic', label: 'Basic Auth'},
  {id: 'oauth2', label: 'OAuth 2.0'},
] as const

type AuthType = (typeof AUTH_TYPE_OPTIONS)[number]['id']

interface FormState {
  name: string
  url: string
  transport: 'stdio' | 'streamable-http'
  authType: AuthType
  enabled: boolean
  authToken: string
  authKey: string
  authKeyHeader: string
  authUsername: string
  authPassword: string
  oauthClientId: string
  oauthClientSecret: string
  oauthAuthUrl: string
  oauthTokenUrl: string
  oauthScopes: string
}

function createDefaultFormState(): FormState {
  return {
    name: '',
    url: '',
    transport: 'streamable-http',
    authType: 'none',
    enabled: true,
    authToken: '',
    authKey: '',
    authKeyHeader: 'x-api-key',
    authUsername: '',
    authPassword: '',
    oauthClientId: '',
    oauthClientSecret: '',
    oauthAuthUrl: '',
    oauthTokenUrl: '',
    oauthScopes: '',
  }
}

function createFormStateFromConfig(config: MCPServerConfig): FormState {
  const state = createDefaultFormState()
  state.name = config.name
  state.url = config.url || ''
  state.transport = config.transport
  state.enabled = config.enabled

  const auth = config.authentication
  if (auth.type === 'oauth2') {
    state.authType = 'oauth2'
    state.oauthClientId = auth.clientId
    state.oauthClientSecret = auth.clientSecret || ''
  } else if (auth.type === 'bearer') {
    state.authType = 'bearer'
    state.authToken = auth.token
  } else if (auth.type === 'api-key') {
    state.authType = 'api-key'
    state.authKey = auth.key
    state.authKeyHeader = auth.header
  } else if (auth.type === 'basic') {
    state.authType = 'basic'
    state.authUsername = auth.username
    state.authPassword = auth.password
  }

  return state
}

export function MCPServerForm({isOpen, onClose, onSave, initialConfig}: MCPServerFormProps) {
  const [formState, setFormState] = useState<FormState>(() =>
    initialConfig ? createFormStateFromConfig(initialConfig) : createDefaultFormState(),
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)

  // Reset form with fresh initial state each time the modal opens (adjusting state during render, not in an effect)
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen)
    if (isOpen) {
      setFormState(initialConfig ? createFormStateFromConfig(initialConfig) : createDefaultFormState())
      setError(null)
    }
  }

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]): void => {
    setFormState(prev => ({...prev, [field]: value}))
  }

  const constructAuthConfig = (): MCPAuthentication => {
    switch (formState.authType) {
      case 'bearer':
        return {type: 'bearer', token: formState.authToken}
      case 'api-key':
        return {type: 'api-key', key: formState.authKey, header: formState.authKeyHeader}
      case 'basic':
        return {type: 'basic', username: formState.authUsername, password: formState.authPassword}
      case 'oauth2':
        return {
          type: 'oauth2',
          clientId: formState.oauthClientId,
          authUrl: formState.oauthAuthUrl || 'https://example.com/oauth/authorize',
          tokenUrl: formState.oauthTokenUrl || 'https://example.com/oauth/token',
          clientSecret: formState.oauthClientSecret || undefined,
          scopes: formState.oauthScopes ? formState.oauthScopes.split(',').map(s => s.trim()) : undefined,
        }
      case 'none':
      default:
        return {type: 'none'}
    }
  }

  const handleSave = async () => {
    setError(null)
    if (!formState.name.trim()) {
      setError('Server name is required')
      return
    }

    if (formState.transport === 'streamable-http') {
      try {
        z.string().url().parse(formState.url)
      } catch {
        setError('Valid URL is required for HTTP transport')
        return
      }
    }

    setIsSaving(true)
    try {
      await onSave({
        name: formState.name,
        transport: formState.transport,
        url: formState.transport === 'streamable-http' ? formState.url : undefined,
        authentication: constructAuthConfig(),
        enabled: formState.enabled,
        timeout: 30000,
        retryAttempts: 3,
      })
      onClose()
    } catch (error_) {
      console.error('Failed to save MCP server:', error_)
      setError('Failed to save configuration')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal.Backdrop
      isOpen={isOpen}
      onOpenChange={open => {
        if (!open) onClose()
      }}
      variant="opaque"
    >
      <Modal.Container size="lg" placement="center" scroll="inside">
        <Modal.Dialog className={cn(theme.surface(1), 'border', theme.border(), 'max-w-2xl')}>
          <Modal.CloseTrigger />
          <Modal.Header className="gap-1 border-b border-default-100 pb-4 pr-8">
            <Modal.Heading className="text-lg font-semibold">
              {initialConfig ? 'Edit MCP Server' : 'Add MCP Server'}
            </Modal.Heading>
            <span className={cn(ds.text.body.small, 'font-normal text-default-500')}>
              Configure a Model Context Protocol server connection.
            </span>
          </Modal.Header>
          <Modal.Body className="flex flex-col gap-6 py-6 text-base text-foreground">
            <div className="grid gap-4">
              <TextField value={formState.name} onChange={value => updateField('name', value)} fullWidth>
                <Label>Server Name</Label>
                <Input placeholder="e.g. Memory Service" />
              </TextField>

              <div className="grid grid-cols-2 gap-4">
                <Select
                  value={formState.transport}
                  onChange={key => {
                    if (key === 'stdio' || key === 'streamable-http') updateField('transport', key)
                  }}
                  fullWidth
                >
                  <Label>Transport</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBox.Item id="streamable-http" textValue="SSE / HTTP">
                        SSE / HTTP (Remote)
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                      <ListBox.Item id="stdio" textValue="Stdio">
                        Stdio (Local Process)
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    </ListBox>
                  </Select.Popover>
                </Select>

                <div className="flex items-end pb-2">
                  <Checkbox isSelected={formState.enabled} onChange={v => updateField('enabled', v)}>
                    <Checkbox.Content>
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <Label className="font-normal">Enabled</Label>
                    </Checkbox.Content>
                  </Checkbox>
                </div>
              </div>

              {formState.transport === 'streamable-http' && (
                <TextField value={formState.url} onChange={value => updateField('url', value)} type="url" fullWidth>
                  <Label>Server URL</Label>
                  <Input placeholder="http://localhost:3000/sse" />
                </TextField>
              )}

              {formState.transport === 'stdio' && (
                <div className={cn('p-3 rounded-lg bg-warning-50 text-warning-800 text-sm')}>
                  Stdio transport requires a desktop environment (Tauri). Not currently supported in web mode.
                </div>
              )}

              <div className="border-t border-default-100 my-2" />

              <Select
                value={formState.authType}
                onChange={key => {
                  const authType = AUTH_TYPE_OPTIONS.find(option => option.id === key)
                  if (authType) updateField('authType', authType.id)
                }}
                fullWidth
              >
                <Label>Authentication</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {AUTH_TYPE_OPTIONS.map(option => (
                      <ListBox.Item key={option.id} id={option.id} textValue={option.label}>
                        {option.label}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>

              {formState.authType === 'api-key' && (
                <div className="grid grid-cols-3 gap-4">
                  <TextField
                    value={formState.authKeyHeader}
                    onChange={value => updateField('authKeyHeader', value)}
                    className="col-span-1"
                    fullWidth
                  >
                    <Label>Header Name</Label>
                    <Input placeholder="x-api-key" />
                  </TextField>
                  <TextField
                    value={formState.authKey}
                    onChange={value => updateField('authKey', value)}
                    type="password"
                    className="col-span-2"
                    fullWidth
                  >
                    <Label>Key</Label>
                    <Input placeholder="sk-..." />
                  </TextField>
                </div>
              )}

              {formState.authType === 'bearer' && (
                <TextField
                  value={formState.authToken}
                  onChange={value => updateField('authToken', value)}
                  type="password"
                  fullWidth
                >
                  <Label>Token</Label>
                  <Input placeholder="eyJ..." />
                </TextField>
              )}

              {formState.authType === 'basic' && (
                <div className="grid grid-cols-2 gap-4">
                  <TextField
                    value={formState.authUsername}
                    onChange={value => updateField('authUsername', value)}
                    fullWidth
                  >
                    <Label>Username</Label>
                    <Input />
                  </TextField>
                  <TextField
                    value={formState.authPassword}
                    onChange={value => updateField('authPassword', value)}
                    type="password"
                    fullWidth
                  >
                    <Label>Password</Label>
                    <Input />
                  </TextField>
                </div>
              )}

              {formState.authType === 'oauth2' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <TextField
                      value={formState.oauthClientId}
                      onChange={value => updateField('oauthClientId', value)}
                      fullWidth
                    >
                      <Label>Client ID</Label>
                      <Input />
                    </TextField>
                    <TextField
                      value={formState.oauthClientSecret}
                      onChange={value => updateField('oauthClientSecret', value)}
                      type="password"
                      fullWidth
                    >
                      <Label>Client Secret</Label>
                      <Input />
                    </TextField>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <TextField
                      value={formState.oauthAuthUrl}
                      onChange={value => updateField('oauthAuthUrl', value)}
                      fullWidth
                    >
                      <Label>Auth URL</Label>
                      <Input placeholder="https://.../authorize" />
                    </TextField>
                    <TextField
                      value={formState.oauthTokenUrl}
                      onChange={value => updateField('oauthTokenUrl', value)}
                      fullWidth
                    >
                      <Label>Token URL</Label>
                      <Input placeholder="https://.../token" />
                    </TextField>
                  </div>
                  <TextField
                    value={formState.oauthScopes}
                    onChange={value => updateField('oauthScopes', value)}
                    fullWidth
                  >
                    <Label>Scopes (comma separated)</Label>
                    <Input placeholder="read,write" />
                  </TextField>
                  <div className="p-2 bg-default-50 rounded text-xs text-default-500">
                    Note: Full OAuth flow configuration is not yet implemented in this UI.
                  </div>
                </div>
              )}
            </div>

            {error && <div className={cn(ds.form.errorText, 'text-center')}>{error}</div>}
          </Modal.Body>
          <Modal.Footer className="border-t border-default-100 pt-4">
            <Button variant="tertiary" onPress={onClose} isDisabled={isSaving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onPress={() => {
                handleSave().catch(console.error)
              }}
              isPending={isSaving}
            >
              {({isPending}) => (
                <>
                  {isPending && <Spinner size="sm" color="current" />}
                  Save Server
                </>
              )}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}
