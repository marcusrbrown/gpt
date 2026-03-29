import type {Key} from 'react'
import {useReducedMotion} from '@/hooks/use-reduced-motion'
import {cn, ds} from '@/lib/design-system'
import {ListBox, ListBoxItem, Select, Switch, toast} from '@heroui/react'
import {Monitor, Moon, Sun} from 'lucide-react'
import {useTheme} from 'next-themes'

const themeOptions = [
  {key: 'light', label: 'Light', icon: Sun},
  {key: 'dark', label: 'Dark', icon: Moon},
  {key: 'system', label: 'System', icon: Monitor},
] as const

/**
 * Appearance settings component for theme and motion preferences.
 * Uses system preferences for reduced motion and persists theme choice.
 */
export function AppearanceSettings() {
  const {theme: currentTheme, setTheme} = useTheme()
  const prefersReducedMotion = useReducedMotion()

  const handleThemeChange = (key: Key | null) => {
    if (!key) return
    const selected = String(key)
    setTheme(selected)
    const themeLabel = selected.charAt(0).toUpperCase() + selected.slice(1)
    toast.success('Theme Updated', {
      description: `Theme changed to ${themeLabel}.`,
      timeout: 3000,
    })
  }

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h2 className={cn(ds.text.heading.h3)}>Appearance</h2>
        <p className={cn(ds.text.body.small, 'mt-1')}>Customize how the application looks and feels.</p>
      </div>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <p className={cn(ds.text.body.base, 'font-medium')}>Theme</p>
            <p className={cn(ds.text.body.small)}>Choose your preferred color scheme</p>
          </div>
          <Select
            aria-label="Theme selection"
            selectedKey={currentTheme || 'system'}
            onSelectionChange={handleThemeChange}
            className="w-full sm:w-48"
          >
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Popover className="bg-surface-secondary border border-border-default">
              <ListBox>
                {themeOptions.map(option => (
                  <ListBoxItem id={option.key} key={option.key} textValue={option.label}>
                    <div className="flex items-center gap-2">
                      <option.icon size={16} />
                      <span>{option.label}</span>
                    </div>
                  </ListBoxItem>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <p className={cn(ds.text.body.base, 'font-medium')}>Reduce Motion</p>
            <p className={cn(ds.text.body.small)}>
              Minimize animations and transitions for accessibility.
              {prefersReducedMotion && (
                <span className="block text-content-tertiary mt-1">
                  Your system preference is set to reduce motion.
                </span>
              )}
            </p>
          </div>
          <Switch
            isSelected={prefersReducedMotion}
            isDisabled
            aria-label="Reduce motion (controlled by system preference)"
            size="sm"
          />
        </div>

        <div className={cn('p-4 rounded-lg', 'bg-surface-secondary')}>
          <p className={cn(ds.text.body.small, 'text-content-tertiary')}>
            Motion preferences are automatically detected from your operating system settings. To change this, update
            your system accessibility preferences.
          </p>
        </div>
      </div>
    </div>
  )
}
