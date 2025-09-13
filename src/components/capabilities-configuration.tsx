import type {GPTCapabilities} from '../types/gpt'
import {Checkbox} from '@heroui/react'
import {cn, ds} from '../lib/design-system'

interface CapabilitiesConfigurationProps {
  capabilities: GPTCapabilities
  onCapabilityChange: (capability: keyof GPTCapabilities) => void
}

export function CapabilitiesConfiguration({capabilities, onCapabilityChange}: CapabilitiesConfigurationProps) {
  return (
    <div>
      <label className={cn(ds.form.label)}>Capabilities</label>
      <div className="mt-2 space-y-2">
        {Object.entries(capabilities).map(([key, value]) => (
          <Checkbox
            key={key}
            id={key}
            isSelected={typeof value === 'boolean' ? value : value.enabled}
            onValueChange={() => onCapabilityChange(key as keyof GPTCapabilities)}
            className={cn(ds.form.fieldRow)}
          >
            {key.replaceAll(/([A-Z])/g, ' $1').trim()}
          </Checkbox>
        ))}
      </div>
    </div>
  )
}
