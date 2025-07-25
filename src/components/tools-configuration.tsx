import {Button, Input} from '@heroui/react'
import {type MCPTool} from '../types/gpt'

interface FormErrors {
  tools: {
    [key: number]: {
      name?: string
      description?: string
      endpoint?: string
      authentication?: string
    }
  }
}

interface ToolsConfigurationProps {
  tools: MCPTool[]
  errors: FormErrors
  onAddTool: () => void
  onRemoveTool: (index: number) => void
  onToolChange: (index: number, field: keyof MCPTool, value: MCPTool[keyof MCPTool]) => void
}

const AUTH_TYPES = [
  {label: 'Bearer Token', value: 'bearer'},
  {label: 'API Key', value: 'api_key'},
]

export function ToolsConfiguration({tools, errors, onAddTool, onRemoveTool, onToolChange}: ToolsConfigurationProps) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">Tools</label>
        <Button onPress={onAddTool} size="sm" color="primary">
          Add Tool
        </Button>
      </div>
      <div className="mt-4 space-y-4">
        {tools.map((tool, index) => (
          <div key={index} className="p-4 border rounded-lg space-y-4">
            <div className="flex justify-between items-start">
              <h4 className="text-sm font-medium text-gray-700">Tool {index + 1}</h4>
              <Button onPress={() => onRemoveTool(index)} size="sm" color="danger" variant="light">
                Remove
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <Input
                  value={tool.name}
                  onChange={e => onToolChange(index, 'name', e.target.value)}
                  required
                  isInvalid={!!errors.tools[index]?.name}
                  errorMessage={errors.tools[index]?.name}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <Input
                  value={tool.description}
                  onChange={e => onToolChange(index, 'description', e.target.value)}
                  required
                  isInvalid={!!errors.tools[index]?.description}
                  errorMessage={errors.tools[index]?.description}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Endpoint</label>
                <Input
                  value={tool.endpoint}
                  onChange={e => onToolChange(index, 'endpoint', e.target.value)}
                  required
                  isInvalid={!!errors.tools[index]?.endpoint}
                  errorMessage={errors.tools[index]?.endpoint}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Authentication Type</label>
                <select
                  value={tool.authentication?.type || ''}
                  onChange={e =>
                    onToolChange(index, 'authentication', {
                      type: e.target.value as 'bearer' | 'api_key',
                      value: tool.authentication?.value || '',
                    })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Select type...</option>
                  {AUTH_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              {tool.authentication && (
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Authentication Value</label>
                  <Input
                    type="password"
                    value={tool.authentication.value}
                    onChange={e =>
                      onToolChange(index, 'authentication', {
                        ...tool.authentication,
                        value: e.target.value,
                      })
                    }
                    required
                    isInvalid={!!errors.tools[index]?.authentication}
                    errorMessage={errors.tools[index]?.authentication}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
