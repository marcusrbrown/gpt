import type {GPTConfiguration} from '@/types/gpt'
import {cn, ds, responsive} from '@/lib/design-system'
import {Input, Slider} from '@heroui/react'

interface AdvancedSettingsTabProps {
  gpt: GPTConfiguration
  onUpdate: (updates: Partial<GPTConfiguration>) => void
}

export function AdvancedSettingsTab({gpt, onUpdate}: AdvancedSettingsTabProps) {
  const handleModelSettingsChange = (field: string, value: number) => {
    onUpdate({
      modelSettings: {
        ...gpt.modelSettings,
        [field]: value,
      },
    })
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto p-4">
      <div className="space-y-6">
        <h3 className={responsive.heading.medium}>Model Configuration</h3>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <Input
              label="Model Name"
              value={gpt.modelName || ''}
              onChange={e => onUpdate({modelName: e.target.value})}
              placeholder="e.g. gpt-4o"
              className={ds.animation.formFocus}
            />
            <p className={cn(ds.text.caption, 'mt-1 text-content-secondary')}>
              Specific model identifier to use (optional).
            </p>
          </div>

          <div>
            <Input
              type="number"
              label="Max Tokens"
              value={gpt.modelSettings?.maxTokens?.toString() || ''}
              onChange={e => handleModelSettingsChange('maxTokens', Number.parseInt(e.target.value) || 0)}
              placeholder="e.g. 4096"
              className={ds.animation.formFocus}
            />
          </div>
        </div>

        <div className="space-y-6 pt-4">
          <div>
            <div className="flex justify-between mb-2">
              <label className={ds.form.label}>Temperature</label>
              <span className={ds.text.body.small}>{gpt.modelSettings?.temperature ?? 0.7}</span>
            </div>
            <Slider
              size="sm"
              step={0.1}
              maxValue={2}
              minValue={0}
              defaultValue={0.7}
              value={gpt.modelSettings?.temperature ?? 0.7}
              onChange={value => handleModelSettingsChange('temperature', value as number)}
              className="max-w-md"
            />
            <p className={cn(ds.text.caption, 'mt-1 text-content-secondary')}>
              Controls randomness: Lowering results in less random completions.
            </p>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className={ds.form.label}>Top P</label>
              <span className={ds.text.body.small}>{gpt.modelSettings?.topP ?? 1}</span>
            </div>
            <Slider
              size="sm"
              step={0.1}
              maxValue={1}
              minValue={0}
              defaultValue={1}
              value={gpt.modelSettings?.topP ?? 1}
              onChange={value => handleModelSettingsChange('topP', value as number)}
              className="max-w-md"
            />
            <p className={cn(ds.text.caption, 'mt-1 text-content-secondary')}>
              Controls diversity via nucleus sampling.
            </p>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className={ds.form.label}>Frequency Penalty</label>
              <span className={ds.text.body.small}>{gpt.modelSettings?.frequencyPenalty ?? 0}</span>
            </div>
            <Slider
              size="sm"
              step={0.1}
              maxValue={2}
              minValue={0}
              defaultValue={0}
              value={gpt.modelSettings?.frequencyPenalty ?? 0}
              onChange={value => handleModelSettingsChange('frequencyPenalty', value as number)}
              className="max-w-md"
            />
            <p className={cn(ds.text.caption, 'mt-1 text-content-secondary')}>
              Decreases likelihood of repeating the same line verbatim.
            </p>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className={ds.form.label}>Presence Penalty</label>
              <span className={ds.text.body.small}>{gpt.modelSettings?.presencePenalty ?? 0}</span>
            </div>
            <Slider
              size="sm"
              step={0.1}
              maxValue={2}
              minValue={0}
              defaultValue={0}
              value={gpt.modelSettings?.presencePenalty ?? 0}
              onChange={value => handleModelSettingsChange('presencePenalty', value as number)}
              className="max-w-md"
            />
            <p className={cn(ds.text.caption, 'mt-1 text-content-secondary')}>
              Increases likelihood of talking about new topics.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
