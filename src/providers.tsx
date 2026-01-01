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
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem={true}>
      <HeroUIProvider>
        <ToastProvider
          placement="bottom-right"
          maxVisibleToasts={3}
          toastProps={{
            radius: 'lg',
            classNames: {
              base: '!bg-surface-secondary border! !border-border-default shadow-lg! opacity-100!',
              title: 'font-medium text-content-primary',
              description: 'text-small text-content-secondary',
              closeButton: 'text-content-tertiary hover:text-content-primary',
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
