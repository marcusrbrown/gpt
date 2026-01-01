import type {GPTCapabilities} from '@/types/gpt'
import {cn, ds} from '@/lib/design-system'
import {Checkbox} from '@heroui/react'

interface CapabilitiesConfigurationProps {
  capabilities: GPTCapabilities
  onCapabilityChange: (capability: keyof GPTCapabilities) => void
}

export function CapabilitiesConfiguration({capabilities, onCapabilityChange}: CapabilitiesConfigurationProps) {
  return (
    <div>
      <label className={cn(ds.form.label, 'mb-3 block')}>Capabilities</label>
      <div className="flex flex-wrap gap-4">
        {Object.entries(capabilities).map(([key, value]) => {
          const label = key.replaceAll(/([A-Z])/g, ' $1').trim()
          return (
            <Checkbox
              key={key}
              id={key}
              size="md"
              color="primary"
              isSelected={typeof value === 'boolean' ? value : value.enabled}
              onValueChange={() => onCapabilityChange(key as keyof GPTCapabilities)}
            >
              {label}
            </Checkbox>
          )
        })}
      </div>
    </div>
  )
}
