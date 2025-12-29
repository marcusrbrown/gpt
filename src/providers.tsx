import {HeroUIProvider} from '@heroui/react'
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
