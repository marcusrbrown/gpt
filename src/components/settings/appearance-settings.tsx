import type {Key} from 'react'
import {useReducedMotion} from '@/hooks/use-reduced-motion'
import {cn, ds} from '@/lib/design-system'
import {addToast, Select, SelectItem, Switch} from '@heroui/react'
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

  const handleThemeChange = (keys: 'all' | Set<Key>) => {
    if (keys === 'all') return
    const selected = Array.from(keys)[0]
    if (typeof selected === 'string') {
      setTheme(selected)
      const themeLabel = selected.charAt(0).toUpperCase() + selected.slice(1)
      addToast({
        title: 'Theme Updated',
        description: `Theme changed to ${themeLabel}.`,
        color: 'success',
        timeout: 3000,
        shouldShowTimeoutProgress: true,
      })
    }
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
            selectedKeys={currentTheme ? [currentTheme] : ['system']}
            onSelectionChange={handleThemeChange}
            className="w-full sm:w-48"
            size="sm"
            popoverProps={{
              classNames: {
                content: '!bg-surface-secondary border border-border-default',
              },
            }}
          >
            {themeOptions.map(option => (
              <SelectItem key={option.key} startContent={<option.icon size={16} />}>
                {option.label}
              </SelectItem>
            ))}
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
