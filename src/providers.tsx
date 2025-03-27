import {HeroUIProvider} from '@heroui/react';
import {ThemeProvider as NextThemesProvider} from 'next-themes';
import {useEffect} from 'react';
import {StorageProvider} from './contexts/storage-provider';
import {ConversationProvider} from './contexts/conversation-provider';

export interface ProvidersProps {
  children: React.ReactNode;
}

function ThemeScript() {
  useEffect(() => {
    // Apply the theme on initial load
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }, []);

  return null;
}

export const Providers = ({children}: ProvidersProps): React.ReactElement => {
  return (
    <NextThemesProvider attribute='data-theme' defaultTheme='system' enableSystem={true} disableTransitionOnChange>
      <HeroUIProvider>
        <ThemeScript />
        <StorageProvider>
          <ConversationProvider>{children}</ConversationProvider>
        </StorageProvider>
      </HeroUIProvider>
    </NextThemesProvider>
  );
};
