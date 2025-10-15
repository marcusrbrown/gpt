import type {FC} from 'react'
import {cn, theme} from '@/lib/design-system'
import {Button} from '@heroui/react'
import {Moon, Sun} from 'lucide-react'
import {useTheme} from 'next-themes'

export const ThemeSwitch: FC = () => {
  const {theme: currentTheme, setTheme} = useTheme()

  return (
    <Button
      onPress={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
      isIconOnly
      variant="light"
      color="default"
      className={cn(
        'min-w-[40px] h-[40px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1',
      )}
      aria-label={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {currentTheme === 'dark' ? (
        <Sun size={20} className={theme.content('primary')} />
      ) : (
        <Moon size={20} className={theme.content('primary')} />
      )}
    </Button>
  )
}
