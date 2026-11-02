import type {MCPTool} from '@/types/gpt'
import {cn, ds} from '@/lib/design-system'
import '@/styles/heroui-v3.css'
import {Button, FieldError, Input, Label, ListBox, Select, TextField} from '@heroui-v3/react'

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
        <Button onPress={onAddTool} size="sm" variant="primary">
          Add Tool
        </Button>
      </div>
      <div className={cn(ds.form.fieldGroup)}>
        {tools.map((tool, index) => (
          <div key={index} className="p-4 border rounded-lg space-y-4">
            <div className="flex justify-between items-start">
              <h4 className={cn(ds.text.heading.h4, 'text-content-primary')}>Tool {index + 1}</h4>
              <Button onPress={() => onRemoveTool(index)} size="sm" variant="danger-soft">
                Remove
              </Button>
            </div>
            <div className={cn(ds.form.fieldRow, 'grid grid-cols-1 gap-4 sm:grid-cols-2')}>
              <div>
                <TextField
                  value={tool.name}
                  onChange={value => onToolChange(index, 'name', value)}
                  isRequired
                  isInvalid={!!errors.tools[index]?.name}
                  fullWidth
                >
                  <Label className={cn(ds.form.label)}>Name</Label>
                  <Input />
                  <FieldError>{errors.tools[index]?.name}</FieldError>
                </TextField>
              </div>
              <div>
                <TextField
                  value={tool.description}
                  onChange={value => onToolChange(index, 'description', value)}
                  isRequired
                  isInvalid={!!errors.tools[index]?.description}
                  fullWidth
                >
                  <Label className={cn(ds.form.label)}>Description</Label>
                  <Input />
                  <FieldError>{errors.tools[index]?.description}</FieldError>
                </TextField>
              </div>
              <div>
                <TextField
                  value={tool.endpoint}
                  onChange={value => onToolChange(index, 'endpoint', value)}
                  isRequired
                  isInvalid={!!errors.tools[index]?.endpoint}
                  fullWidth
                >
                  <Label className={cn(ds.form.label)}>Endpoint</Label>
                  <Input />
                  <FieldError>{errors.tools[index]?.endpoint}</FieldError>
                </TextField>
              </div>
              <div>
                <label className={cn(ds.form.label)}>Authentication Type</label>
                <Select
                  aria-label="Authentication Type"
                  value={tool.authentication?.type ?? null}
                  onChange={key => {
                    if (typeof key !== 'string') return
                    onToolChange(index, 'authentication', {
                      type: key as 'bearer' | 'api_key',
                      value: tool.authentication?.value || '',
                    })
                  }}
                  placeholder="Select type..."
                  fullWidth
                  isInvalid={!!errors.tools[index]?.authentication}
                >
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <FieldError>{errors.tools[index]?.authentication}</FieldError>
                  <Select.Popover>
                    <ListBox>
                      {AUTH_TYPES.map(type => (
                        <ListBox.Item key={type.value} id={type.value} textValue={type.label}>
                          {type.label}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>
              {tool.authentication && (
                <div className="sm:col-span-2">
                  <TextField
                    type="password"
                    value={tool.authentication.value}
                    onChange={value =>
                      onToolChange(index, 'authentication', {
                        ...tool.authentication,
                        value,
                      })
                    }
                    isRequired
                    isInvalid={!!errors.tools[index]?.authentication}
                    fullWidth
                  >
                    <Label className={cn(ds.form.label)}>Authentication Value</Label>
                    <Input />
                    <FieldError>{errors.tools[index]?.authentication}</FieldError>
                  </TextField>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
