import type {FC} from 'react'
import {theme} from '@/lib/design-system'
import '@/styles/heroui-v3.css'
import {Button} from '@heroui-v3/react'
import {Moon, Sun} from 'lucide-react'
import {useTheme} from 'next-themes'

export const ThemeSwitch: FC = () => {
  const {theme: currentTheme, setTheme} = useTheme()

  return (
    <Button
      onPress={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
      isIconOnly
      variant="tertiary"
      className="min-w-[40px] h-[40px] flex items-center justify-center"
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
