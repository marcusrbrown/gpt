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
      size="md"
      className="h-10 w-10 min-w-10 flex items-center justify-center"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
    </Button>
  )
}
