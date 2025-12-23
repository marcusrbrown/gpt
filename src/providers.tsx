import {HeroUIProvider} from '@heroui/react'
import {ThemeProvider as NextThemesProvider} from 'next-themes'
import {useEffect} from 'react'
import {AIProvider} from './contexts/ai-provider-context'
import {ConversationProvider} from './contexts/conversation-provider'
import {SessionProvider} from './contexts/session-context'
import {StorageProvider} from './contexts/storage-provider'

export interface ProvidersProps {
  children: React.ReactNode
}

function ThemeScript() {
  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light'
  }, [])

  return null
}

export const Providers = ({children}: ProvidersProps): React.ReactElement => {
  return (
    <NextThemesProvider attribute="data-theme" defaultTheme="system" enableSystem={true}>
      <HeroUIProvider>
        <ThemeScript />
        <StorageProvider>
          <SessionProvider>
            <AIProvider>
              <ConversationProvider>{children}</ConversationProvider>
            </AIProvider>
          </SessionProvider>
        </StorageProvider>
      </HeroUIProvider>
    </NextThemesProvider>
  )
}
