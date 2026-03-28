import type {MCPTool} from '@/types/gpt'
import {cn, ds} from '@/lib/design-system'
import {Button, Input, Select, TextField, Label, FieldError, ListBox, ListBoxItem} from '@heroui/react'

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
              <Button onPress={() => onRemoveTool(index)} size="sm" variant="danger">
                Remove
              </Button>
            </div>
            <div className={cn(ds.form.fieldRow, 'grid grid-cols-1 gap-4 sm:grid-cols-2')}>
              <TextField isInvalid={!!errors.tools[index]?.name} className="flex flex-col gap-1">
                <Label className={cn(ds.form.label)}>Name</Label>
                <Input
                  value={tool.name}
                  onChange={e => onToolChange(index, 'name', e.target.value)}
                  required
                  className={cn(ds.focus.ring, ds.animation.transition)}
                />
                <FieldError>{errors.tools[index]?.name}</FieldError>
              </TextField>
              <TextField isInvalid={!!errors.tools[index]?.description} className="flex flex-col gap-1">
                <Label className={cn(ds.form.label)}>Description</Label>
                <Input
                  value={tool.description}
                  onChange={e => onToolChange(index, 'description', e.target.value)}
                  required
                  className={cn(ds.focus.ring, ds.animation.transition)}
                />
                <FieldError>{errors.tools[index]?.description}</FieldError>
              </TextField>
              <TextField isInvalid={!!errors.tools[index]?.endpoint} className="flex flex-col gap-1">
                <Label className={cn(ds.form.label)}>Endpoint</Label>
                <Input
                  value={tool.endpoint}
                  onChange={e => onToolChange(index, 'endpoint', e.target.value)}
                  required
                  className={cn(ds.focus.ring, ds.animation.transition)}
                />
                <FieldError>{errors.tools[index]?.endpoint}</FieldError>
              </TextField>
              <div className="flex flex-col gap-1">
                <Label className={cn(ds.form.label)}>Authentication Type</Label>
                <Select
                  selectedKey={tool.authentication?.type}
                  onSelectionChange={key => {
                    if (!key) return
                    onToolChange(index, 'authentication', {
                      type: String(key) as 'bearer' | 'api_key',
                      value: tool.authentication?.value || '',
                    })
                  }}
                  placeholder="Select type..."
                  className={cn(ds.form.fieldGroup, ds.focus.ring, ds.animation.transition)}
                >
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {AUTH_TYPES.map(type => (
                        <ListBoxItem id={type.value} key={type.value} textValue={type.label}>
                          {type.label}
                        </ListBoxItem>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
                {errors.tools[index]?.authentication && (
                  <div className="text-danger text-sm mt-1">{errors.tools[index]?.authentication}</div>
                )}
              </div>
              {tool.authentication && (
                <TextField
                  isInvalid={!!errors.tools[index]?.authentication}
                  className="sm:col-span-2 flex flex-col gap-1"
                >
                  <Label className={cn(ds.form.label)}>Authentication Value</Label>
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
                    className={cn(ds.focus.ring, ds.animation.transition)}
                  />
                  <FieldError>{errors.tools[index]?.authentication}</FieldError>
                </TextField>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
