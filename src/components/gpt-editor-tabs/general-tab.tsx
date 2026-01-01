import type {GPTCapabilities, GPTConfiguration} from '@/types/gpt'
import {CapabilitiesConfiguration} from '@/components/capabilities-configuration'
import {cn, ds, responsive} from '@/lib/design-system'
import {Button, Input, Textarea} from '@heroui/react'

interface GeneralTabProps {
  gpt: GPTConfiguration
  onUpdate: (updates: Partial<GPTConfiguration>) => void
  errors: Record<string, string | undefined>
  handleFieldValidation: (field: string, value: any, gpt: GPTConfiguration, timing: 'blur' | 'change') => void
  hasFieldSuccess: (field: string) => boolean
}

export function GeneralTab({gpt, onUpdate, errors, handleFieldValidation, hasFieldSuccess}: GeneralTabProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const {name, value} = e.target
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

  const handleAddStarter = () => {
    const starters = gpt.conversationStarters || []
    onUpdate({conversationStarters: [...starters, '']})
  }

  const handleRemoveStarter = (index: number) => {
    const starters = gpt.conversationStarters || []
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

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
          <label htmlFor="name" className={cn(ds.form.label, 'sm:w-32 sm:pt-3 shrink-0')}>
            Name
          </label>
          <Input
            type="text"
            name="name"
            id="name"
            value={gpt.name}
            onChange={handleInputChange}
            onBlur={() => handleFieldValidation('name', gpt.name, gpt, 'blur')}
            isInvalid={!!errors.name}
            errorMessage={errors.name}
            isRequired
            className={cn(
              'flex-1',
              hasFieldSuccess('name') && !errors.name && ds.state.success,
              ds.animation.transition,
              ds.animation.formFocus,
            )}
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
          <label htmlFor="description" className={cn(ds.form.label, 'sm:w-32 sm:pt-3 shrink-0')}>
            Description
          </label>
          <Textarea
            name="description"
            id="description"
            value={gpt.description}
            onChange={handleInputChange}
            onBlur={() => handleFieldValidation('description', gpt.description, gpt, 'blur')}
            minRows={3}
            isInvalid={!!errors.description}
            errorMessage={errors.description}
            isRequired
            className={cn(
              'flex-1',
              hasFieldSuccess('description') && !errors.description && ds.state.success,
              ds.animation.transition,
              ds.animation.formFocus,
            )}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className={responsive.heading.medium}>Instructions</h2>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
          <div className="sm:w-32 shrink-0">
            <label htmlFor="systemPrompt" className={cn(ds.form.label)}>
              System Prompt
            </label>
            <p className={cn(ds.text.caption, 'text-content-secondary mt-1')}>Define behavior and persona.</p>
          </div>
          <Textarea
            name="systemPrompt"
            id="systemPrompt"
            value={gpt.systemPrompt}
            onChange={handleInputChange}
            onBlur={() => handleFieldValidation('systemPrompt', gpt.systemPrompt, gpt, 'blur')}
            minRows={5}
            isInvalid={!!errors.systemPrompt}
            errorMessage={errors.systemPrompt}
            isRequired
            className={cn(
              'flex-1',
              hasFieldSuccess('systemPrompt') && !errors.systemPrompt && ds.state.success,
              ds.animation.transition,
              ds.animation.formFocus,
            )}
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
          <div className="sm:w-32 shrink-0">
            <label className={cn(ds.form.label)}>Conversation Starters</label>
            <p className={cn(ds.text.caption, 'text-content-secondary mt-1')}>Example questions.</p>
          </div>
          <div className="flex-1 space-y-2">
            {(gpt.conversationStarters || []).map((starter, index) => (
              <div key={`starter-${starter || `empty-${index}`}`} className="flex gap-2">
                <Input
                  value={starter}
                  onChange={e => handleStarterChange(index, e.target.value)}
                  placeholder="e.g. Help me write a blog post..."
                  className={cn('flex-1', ds.animation.formFocus)}
                />
                <Button
                  isIconOnly
                  color="danger"
                  variant="light"
                  onPress={() => handleRemoveStarter(index)}
                  className={ds.animation.buttonPress}
                >
                  ✕
                </Button>
              </div>
            ))}
            <Button size="sm" variant="flat" onPress={handleAddStarter} className={cn(ds.animation.buttonPress)}>
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
