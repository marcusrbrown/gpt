import type {MCPAuthentication, MCPServerConfig} from '@/types/mcp'
import {cn, ds, theme} from '@/lib/design-system'
import {
  Button,
  Checkbox,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
} from '@heroui/react'
import {useMemo, useState} from 'react'
import {z} from 'zod'

interface MCPServerFormProps {
  isOpen: boolean
  onClose: () => void
  onSave: (config: Omit<MCPServerConfig, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  initialConfig?: MCPServerConfig
}

type AuthType = 'none' | 'bearer' | 'api-key' | 'basic' | 'oauth2'

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
  // Compute initial state only when modal opens or initialConfig changes
  const initialFormState = useMemo(
    () => (initialConfig ? createFormStateFromConfig(initialConfig) : createDefaultFormState()),
    // Only recompute when isOpen changes or initialConfig reference changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isOpen, initialConfig],
  )

  const [formState, setFormState] = useState<FormState>(initialFormState)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when modal opens with fresh initial state
  useMemo(() => {
    if (isOpen) {
      setFormState(initialFormState)
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      placement="center"
      backdrop="opaque"
      scrollBehavior="inside"
      classNames={{
        base: cn(theme.surface(1), 'border', theme.border(), 'max-w-2xl'),
        wrapper: 'bg-black/50',
        header: 'border-b border-default-100',
        footer: 'border-t border-default-100',
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          {initialConfig ? 'Edit MCP Server' : 'Add MCP Server'}
          <span className={cn(ds.text.body.small, 'font-normal text-default-500')}>
            Configure a Model Context Protocol server connection.
          </span>
        </ModalHeader>
        <ModalBody className="py-6 gap-6">
          <div className="grid gap-4">
            <Input
              label="Server Name"
              placeholder="e.g. Memory Service"
              value={formState.name}
              onChange={e => updateField('name', e.target.value)}
              variant="bordered"
              labelPlacement="outside"
              className={cn(ds.focus.ring)}
            />

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Transport"
                selectedKeys={[formState.transport]}
                onChange={e =>
                  e.target.value && updateField('transport', e.target.value as 'stdio' | 'streamable-http')
                }
                variant="bordered"
                labelPlacement="outside"
                disallowEmptySelection
              >
                <SelectItem key="streamable-http" textValue="SSE / HTTP">
                  SSE / HTTP (Remote)
                </SelectItem>
                <SelectItem key="stdio" textValue="Stdio">
                  Stdio (Local Process)
                </SelectItem>
              </Select>

              <div className="flex items-end pb-2">
                <Checkbox isSelected={formState.enabled} onValueChange={v => updateField('enabled', v)} size="sm">
                  Enabled
                </Checkbox>
              </div>
            </div>

            {formState.transport === 'streamable-http' && (
              <Input
                label="Server URL"
                placeholder="http://localhost:3000/sse"
                value={formState.url}
                onChange={e => updateField('url', e.target.value)}
                variant="bordered"
                labelPlacement="outside"
                className={cn(ds.focus.ring)}
                type="url"
              />
            )}

            {formState.transport === 'stdio' && (
              <div className={cn('p-3 rounded-lg bg-warning-50 text-warning-800 text-sm')}>
                Stdio transport requires a desktop environment (Tauri). Not currently supported in web mode.
              </div>
            )}

            <div className="border-t border-default-100 my-2" />

            <Select
              label="Authentication"
              selectedKeys={[formState.authType]}
              onChange={e => e.target.value && updateField('authType', e.target.value as AuthType)}
              variant="bordered"
              labelPlacement="outside"
              disallowEmptySelection
            >
              <SelectItem key="none" textValue="None">
                None
              </SelectItem>
              <SelectItem key="api-key" textValue="API Key">
                API Key
              </SelectItem>
              <SelectItem key="bearer" textValue="Bearer Token">
                Bearer Token
              </SelectItem>
              <SelectItem key="basic" textValue="Basic Auth">
                Basic Auth
              </SelectItem>
              <SelectItem key="oauth2" textValue="OAuth 2.0">
                OAuth 2.0
              </SelectItem>
            </Select>

            {formState.authType === 'api-key' && (
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Header Name"
                  value={formState.authKeyHeader}
                  onChange={e => updateField('authKeyHeader', e.target.value)}
                  placeholder="x-api-key"
                  variant="bordered"
                  labelPlacement="outside"
                  className="col-span-1"
                />
                <Input
                  label="Key"
                  value={formState.authKey}
                  onChange={e => updateField('authKey', e.target.value)}
                  type="password"
                  placeholder="sk-..."
                  variant="bordered"
                  labelPlacement="outside"
                  className="col-span-2"
                />
              </div>
            )}

            {formState.authType === 'bearer' && (
              <Input
                label="Token"
                value={formState.authToken}
                onChange={e => updateField('authToken', e.target.value)}
                type="password"
                placeholder="eyJ..."
                variant="bordered"
                labelPlacement="outside"
              />
            )}

            {formState.authType === 'basic' && (
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Username"
                  value={formState.authUsername}
                  onChange={e => updateField('authUsername', e.target.value)}
                  variant="bordered"
                  labelPlacement="outside"
                />
                <Input
                  label="Password"
                  value={formState.authPassword}
                  onChange={e => updateField('authPassword', e.target.value)}
                  type="password"
                  variant="bordered"
                  labelPlacement="outside"
                />
              </div>
            )}

            {formState.authType === 'oauth2' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Client ID"
                    value={formState.oauthClientId}
                    onChange={e => updateField('oauthClientId', e.target.value)}
                    variant="bordered"
                    labelPlacement="outside"
                  />
                  <Input
                    label="Client Secret"
                    value={formState.oauthClientSecret}
                    onChange={e => updateField('oauthClientSecret', e.target.value)}
                    type="password"
                    variant="bordered"
                    labelPlacement="outside"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Auth URL"
                    value={formState.oauthAuthUrl}
                    onChange={e => updateField('oauthAuthUrl', e.target.value)}
                    placeholder="https://.../authorize"
                    variant="bordered"
                    labelPlacement="outside"
                  />
                  <Input
                    label="Token URL"
                    value={formState.oauthTokenUrl}
                    onChange={e => updateField('oauthTokenUrl', e.target.value)}
                    placeholder="https://.../token"
                    variant="bordered"
                    labelPlacement="outside"
                  />
                </div>
                <Input
                  label="Scopes (comma separated)"
                  value={formState.oauthScopes}
                  onChange={e => updateField('oauthScopes', e.target.value)}
                  placeholder="read,write"
                  variant="bordered"
                  labelPlacement="outside"
                />
                <div className="p-2 bg-default-50 rounded text-xs text-default-500">
                  Note: Full OAuth flow configuration is not yet implemented in this UI.
                </div>
              </div>
            )}
          </div>

          {error && <div className={cn(ds.form.errorText, 'text-center')}>{error}</div>}
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onClose} isDisabled={isSaving}>
            Cancel
          </Button>
          <Button
            color="primary"
            onPress={() => {
              handleSave().catch(console.error)
            }}
            isLoading={isSaving}
          >
            Save Server
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
