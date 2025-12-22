import type {MCPTool} from '@/types/gpt'
import {cn, ds} from '@/lib/design-system'
import {Button, Input, Select, SelectItem} from '@heroui/react'

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
        <label className={cn(ds.form.label)}>Tools</label>
        <Button onPress={onAddTool} size="sm" color="primary">
          Add Tool
        </Button>
      </div>
      <div className={cn(ds.form.fieldGroup)}>
        {tools.map((tool, index) => (
          <div key={index} className="p-4 border rounded-lg space-y-4">
            <div className="flex justify-between items-start">
              <h4 className={cn(ds.text.heading.h4, 'text-content-primary')}>Tool {index + 1}</h4>
              <Button onPress={() => onRemoveTool(index)} size="sm" color="danger" variant="light">
                Remove
              </Button>
            </div>
            <div className={cn(ds.form.fieldRow, 'grid grid-cols-1 gap-4 sm:grid-cols-2')}>
              <div>
                <label className={cn(ds.form.label)}>Name</label>
                <Input
                  value={tool.name}
                  onChange={e => onToolChange(index, 'name', e.target.value)}
                  required
                  isInvalid={!!errors.tools[index]?.name}
                  errorMessage={errors.tools[index]?.name}
                  className={cn(ds.focus.ring, ds.animation.transition)}
                />
              </div>
              <div>
                <label className={cn(ds.form.label)}>Description</label>
                <Input
                  value={tool.description}
                  onChange={e => onToolChange(index, 'description', e.target.value)}
                  required
                  isInvalid={!!errors.tools[index]?.description}
                  errorMessage={errors.tools[index]?.description}
                  className={cn(ds.focus.ring, ds.animation.transition)}
                />
              </div>
              <div>
                <label className={cn(ds.form.label)}>Endpoint</label>
                <Input
                  value={tool.endpoint}
                  onChange={e => onToolChange(index, 'endpoint', e.target.value)}
                  required
                  isInvalid={!!errors.tools[index]?.endpoint}
                  errorMessage={errors.tools[index]?.endpoint}
                  className={cn(ds.focus.ring, ds.animation.transition)}
                />
              </div>
              <div>
                <label className={cn(ds.form.label)}>Authentication Type</label>
                <Select
                  selectedKeys={tool.authentication?.type ? [tool.authentication.type] : []}
                  onSelectionChange={keys => {
                    const value = Array.from(keys)[0] as string
                    onToolChange(index, 'authentication', {
                      type: value as 'bearer' | 'api_key',
                      value: tool.authentication?.value || '',
                    })
                  }}
                  placeholder="Select type..."
                  className={cn(ds.form.fieldGroup, ds.focus.ring, ds.animation.transition)}
                  isInvalid={!!errors.tools[index]?.authentication}
                  errorMessage={errors.tools[index]?.authentication}
                >
                  {AUTH_TYPES.map(type => (
                    <SelectItem key={type.value}>{type.label}</SelectItem>
                  ))}
                </Select>
              </div>
              {tool.authentication && (
                <div className="sm:col-span-2">
                  <label className={cn(ds.form.label)}>Authentication Value</label>
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
                    className={cn(ds.focus.ring, ds.animation.transition)}
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
