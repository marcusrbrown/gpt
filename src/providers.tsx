import {HeroUIProvider} from '@heroui/react';
import {ThemeProvider as NextThemesProvider} from 'next-themes';
import {BrowserRouter} from 'react-router-dom';

export interface ProvidersProps {
  children: React.ReactNode;
}

export const Providers = ({children}: ProvidersProps): React.ReactElement => {
  return (
    <BrowserRouter>
      <HeroUIProvider>
        <NextThemesProvider attribute='class' defaultTheme='dark'>
          {children}
        </NextThemesProvider>
      </HeroUIProvider>
    </BrowserRouter>
  );
};
