import {useReducedMotion} from '@/hooks/use-reduced-motion'
import {HeroUIProvider, ToastProvider} from '@heroui/react'
import {ThemeProvider as NextThemesProvider} from 'next-themes'
import {AIProvider} from './contexts/ai-provider-context'
import {ConversationProvider} from './contexts/conversation-provider'
import {MCPProvider} from './contexts/mcp-context'
import {SessionProvider} from './contexts/session-context'
import {StorageProvider} from './contexts/storage-provider'

export interface ProvidersProps {
  children: React.ReactNode
}

export const Providers = ({children}: ProvidersProps): React.ReactElement => {
  const prefersReducedMotion = useReducedMotion()

  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem={true}>
      <HeroUIProvider>
        <ToastProvider
          placement="bottom-right"
          maxVisibleToasts={3}
          disableAnimation={prefersReducedMotion}
          toastProps={{
            radius: 'lg',
            classNames: {
              title: 'font-medium',
              description: 'text-small',
            },
          }}
        />
        <StorageProvider>
          <SessionProvider>
            <AIProvider>
              <MCPProvider>
                <ConversationProvider>{children}</ConversationProvider>
              </MCPProvider>
            </AIProvider>
          </SessionProvider>
        </StorageProvider>
      </HeroUIProvider>
    </NextThemesProvider>
  )
}
