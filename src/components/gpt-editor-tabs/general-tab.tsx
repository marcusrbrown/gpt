import type {GPTCapabilities, GPTConfiguration} from '@/types/gpt'
import {CapabilitiesConfiguration} from '@/components/capabilities-configuration'
import {cn, ds, responsive} from '@/lib/design-system'
import '@/styles/heroui-v3.css'
import {Button, FieldError, Input, Label, TextArea, TextField} from '@heroui-v3/react'
import {useState} from 'react'

interface GeneralTabProps {
  gpt: GPTConfiguration
  onUpdate: (updates: Partial<GPTConfiguration>) => void
  errors: Record<string, string | undefined>
  handleFieldValidation: (field: string, value: any, gpt: GPTConfiguration, timing: 'blur' | 'change') => void
  hasFieldSuccess: (field: string) => boolean
}

const fieldRowClass = 'flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4'

export function GeneralTab({gpt, onUpdate, errors, handleFieldValidation, hasFieldSuccess}: GeneralTabProps) {
  const handleFieldChange = (name: 'name' | 'description' | 'systemPrompt', value: string) => {
    onUpdate({[name]: value})
    // Clear validation errors on change
    handleFieldValidation(name, value, {...gpt, [name]: value}, 'change')
  }

  const handleCapabilityChange = (capability: keyof GPTCapabilities) => {
    onUpdate({
      capabilities: {
        ...gpt.capabilities,
        [capability]: !gpt.capabilities[capability],
      },
    })
  }

  // Starters are persisted as plain strings, so keep a parallel array of stable ids for React keys.
  const [starterIds, setStarterIds] = useState(() => (gpt.conversationStarters || []).map(() => crypto.randomUUID()))
  const startersLength = (gpt.conversationStarters || []).length
  if (starterIds.length !== startersLength) {
    // Starters changed outside this tab (e.g. GPT loaded): resync ids to the list length.
    setStarterIds(Array.from({length: startersLength}, (_, i) => starterIds[i] ?? crypto.randomUUID()))
  }

  const handleAddStarter = () => {
    const starters = gpt.conversationStarters || []
    setStarterIds([...starterIds, crypto.randomUUID()])
    onUpdate({conversationStarters: [...starters, '']})
  }

  const handleRemoveStarter = (index: number) => {
    const starters = gpt.conversationStarters || []
    setStarterIds(starterIds.filter((_, i) => i !== index))
    onUpdate({conversationStarters: starters.filter((_, i) => i !== index)})
  }

  const handleStarterChange = (index: number, value: string) => {
    const starters = gpt.conversationStarters || []
    const newStarters = [...starters]
    newStarters[index] = value
    onUpdate({conversationStarters: newStarters})
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4">
      <div className="space-y-4">
        <h2 className={responsive.heading.medium}>Basic Information</h2>

        <TextField
          name="name"
          value={gpt.name}
          onChange={value => handleFieldChange('name', value)}
          onBlur={() => handleFieldValidation('name', gpt.name, gpt, 'blur')}
          isInvalid={!!errors.name}
          isRequired
          className={fieldRowClass}
        >
          <Label className={cn(ds.form.label, 'sm:w-32 sm:pt-3 shrink-0')}>Name</Label>
          <div
            className={cn(
              'flex-1 flex flex-col gap-1',
              hasFieldSuccess('name') && !errors.name && ds.state.success,
              ds.animation.transition,
              ds.animation.formFocus,
            )}
          >
            <Input type="text" fullWidth />
            <FieldError>{errors.name}</FieldError>
          </div>
        </TextField>

        <TextField
          name="description"
          value={gpt.description}
          onChange={value => handleFieldChange('description', value)}
          onBlur={() => handleFieldValidation('description', gpt.description, gpt, 'blur')}
          isInvalid={!!errors.description}
          isRequired
          className={fieldRowClass}
        >
          <Label className={cn(ds.form.label, 'sm:w-32 sm:pt-3 shrink-0')}>Description</Label>
          <div
            className={cn(
              'flex-1 flex flex-col gap-1',
              hasFieldSuccess('description') && !errors.description && ds.state.success,
              ds.animation.transition,
              ds.animation.formFocus,
            )}
          >
            <TextArea rows={3} fullWidth />
            <FieldError>{errors.description}</FieldError>
          </div>
        </TextField>
      </div>

      <div className="space-y-4">
        <h2 className={responsive.heading.medium}>Instructions</h2>

        <TextField
          name="systemPrompt"
          value={gpt.systemPrompt}
          onChange={value => handleFieldChange('systemPrompt', value)}
          onBlur={() => handleFieldValidation('systemPrompt', gpt.systemPrompt, gpt, 'blur')}
          isInvalid={!!errors.systemPrompt}
          isRequired
          className={fieldRowClass}
        >
          <div className="sm:w-32 shrink-0">
            <Label className={cn(ds.form.label)}>System Prompt</Label>
            <p className={cn(ds.text.caption, 'text-content-secondary mt-1')}>Define behavior and persona.</p>
          </div>
          <div
            className={cn(
              'flex-1 flex flex-col gap-1',
              hasFieldSuccess('systemPrompt') && !errors.systemPrompt && ds.state.success,
              ds.animation.transition,
              ds.animation.formFocus,
            )}
          >
            <TextArea rows={5} fullWidth />
            <FieldError>{errors.systemPrompt}</FieldError>
          </div>
        </TextField>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
          <div className="sm:w-32 shrink-0">
            <label className={cn(ds.form.label)}>Conversation Starters</label>
            <p className={cn(ds.text.caption, 'text-content-secondary mt-1')}>Example questions.</p>
          </div>
          <div className="flex-1 space-y-2">
            {(gpt.conversationStarters || []).map((starter, index) => (
              <div key={starterIds[index]} className="flex gap-2">
                <TextField
                  value={starter}
                  onChange={value => handleStarterChange(index, value)}
                  aria-label={`Conversation starter ${index + 1}`}
                  className={cn('flex-1', ds.animation.formFocus)}
                >
                  <Input placeholder="e.g. Help me write a blog post..." fullWidth />
                </TextField>
                <Button
                  isIconOnly
                  variant="danger-soft"
                  onPress={() => handleRemoveStarter(index)}
                  aria-label="Remove conversation starter"
                >
                  ✕
                </Button>
              </div>
            ))}
            <Button size="sm" variant="tertiary" onPress={handleAddStarter}>
              + Add Starter
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-default-200">
        <h2 className={responsive.heading.medium}>Capabilities</h2>
        <CapabilitiesConfiguration capabilities={gpt.capabilities} onCapabilityChange={handleCapabilityChange} />
      </div>
    </div>
  )
}
