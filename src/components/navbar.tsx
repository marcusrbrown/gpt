import {FC} from 'react';
import {
  Image,
  Link,
  Navbar as NextUINavbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenu,
  NavbarMenuToggle,
} from '@heroui/react';
import {Github, BookOpen} from 'lucide-react';
import {ThemeSwitch} from '@/components/theme-switch';
import {siteConfig} from '@/config/site';
import logo from '@/assets/logo.png';
import {Link as RouterLink} from 'react-router-dom';

export const Navbar: FC = () => {
  return (
    <NextUINavbar maxWidth='full' position='sticky'>
      <NavbarContent className='basis-1/5 sm:basis-full' justify='start'>
        <NavbarBrand as='li' className='gap-3 max-w-fit'>
          <Link className='flex justify-start items-center gap-1 font-bold text-xl' href='/'>
            <Image alt='logo' src={logo} width={24} height={24} />
            gpt.mrbro.dev
          </Link>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent className='hidden sm:flex basis-1/5 sm:basis-full' justify='end'>
        <NavbarItem className='hidden sm:flex gap-4'>
          <RouterLink
            to='/docs'
            className='flex items-center gap-1 text-default-600 hover:text-default-900 dark:hover:text-default-200'
            aria-label='Documentation'
          >
            <BookOpen size={20} />
            <span>Docs</span>
          </RouterLink>
          <Link aria-label='GitHub' href={siteConfig.links.repository} isExternal>
            <Github className='text-default-500' size={24} />
          </Link>
          <ThemeSwitch />
        </NavbarItem>
      </NavbarContent>

      <NavbarContent className='sm:hidden basis-1 pl-4' justify='end'>
        <RouterLink to='/docs' className='flex items-center gap-1 text-default-600' aria-label='Documentation'>
          <BookOpen size={20} />
        </RouterLink>
        <Link aria-label='GitHub' href={siteConfig.links.repository} isExternal>
          <Github className='text-default-500' size={24} />
        </Link>
        <ThemeSwitch />
        <NavbarMenuToggle />
      </NavbarContent>

      <NavbarMenu>
        <div className='mx-4 mt-2 flex flex-col gap-2'>
          <RouterLink
            to='/docs'
            className='flex items-center gap-2 text-default-600 hover:text-default-900 dark:hover:text-default-200'
          >
            <BookOpen size={20} />
            <span>Documentation</span>
          </RouterLink>
        </div>
      </NavbarMenu>
    </NextUINavbar>
  );
};
