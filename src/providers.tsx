import {HeroUIProvider} from '@heroui/react';
import {ThemeProvider as NextThemesProvider} from 'next-themes';

export interface ProvidersProps {
  children: React.ReactNode;
}

export const Providers = ({children}: ProvidersProps): React.ReactElement => {
  return (
    <HeroUIProvider>
      <NextThemesProvider attribute='class' defaultTheme='dark'>
        {children}
      </NextThemesProvider>
    </HeroUIProvider>
  );
};
