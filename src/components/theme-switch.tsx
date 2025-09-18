import type {FC} from 'react'
import {Button} from '@heroui/react'
import {Moon, Sun} from 'lucide-react'
import {useTheme} from 'next-themes'

export const ThemeSwitch: FC = () => {
  const {theme, setTheme} = useTheme()

  return (
    <Button
      onPress={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      isIconOnly
      variant="light"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
    </Button>
  )
}
