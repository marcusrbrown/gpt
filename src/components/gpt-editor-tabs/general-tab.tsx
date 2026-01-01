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
        <h3 className={responsive.heading.medium}>Basic Information</h3>

        <div>
          <Input
            type="text"
            label="Name"
            name="name"
            id="name"
            aria-label="GPT Name"
            value={gpt.name}
            onChange={handleInputChange}
            onBlur={() => handleFieldValidation('name', gpt.name, gpt, 'blur')}
            isInvalid={!!errors.name}
            errorMessage={errors.name}
            isRequired
            className={cn(
              hasFieldSuccess('name') && !errors.name && ds.state.success,
              ds.animation.transition,
              ds.animation.formFocus,
            )}
          />
        </div>

        <div>
          <label htmlFor="description" className={cn(ds.form.label)}>
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
              ds.form.fieldGroup,
              hasFieldSuccess('description') && !errors.description && ds.state.success,
              ds.animation.transition,
              ds.animation.formFocus,
            )}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className={responsive.heading.medium}>Instructions</h3>

        <div>
          <label htmlFor="systemPrompt" className={cn(ds.form.label)}>
            System Prompt
          </label>
          <p className={cn(ds.text.caption, 'text-content-secondary mb-2')}>
            Define how the GPT should behave and interact with users.
          </p>
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
              ds.form.fieldGroup,
              hasFieldSuccess('systemPrompt') && !errors.systemPrompt && ds.state.success,
              ds.animation.transition,
              ds.animation.formFocus,
            )}
          />
        </div>

        <div>
          <label className={cn(ds.form.label)}>Conversation Starters</label>
          <p className={cn(ds.text.caption, 'text-content-secondary mb-2')}>
            Example questions or prompts to help users get started.
          </p>
          <div className="space-y-2">
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
        <h3 className={responsive.heading.medium}>Capabilities</h3>
        <CapabilitiesConfiguration capabilities={gpt.capabilities} onCapabilityChange={handleCapabilityChange} />
      </div>
    </div>
  )
}
