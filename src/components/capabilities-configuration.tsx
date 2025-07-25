import {type GPTCapabilities} from '../types/gpt'

interface CapabilitiesConfigurationProps {
  capabilities: GPTCapabilities
  onCapabilityChange: (capability: keyof GPTCapabilities) => void
}

export function CapabilitiesConfiguration({capabilities, onCapabilityChange}: CapabilitiesConfigurationProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">Capabilities</label>
      <div className="mt-2 space-y-2">
        {Object.entries(capabilities).map(([key, value]) => (
          <div key={key} className="flex items-center">
            <input
              type="checkbox"
              id={key}
              checked={typeof value === 'boolean' ? value : value.enabled}
              onChange={() => onCapabilityChange(key as keyof GPTCapabilities)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor={key} className="ml-2 block text-sm text-gray-900">
              {key.replaceAll(/([A-Z])/g, ' $1').trim()}
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}
