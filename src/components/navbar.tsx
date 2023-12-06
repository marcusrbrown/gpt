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
} from '@nextui-org/react';
import {ThemeSwitch} from '@/components/theme-switch';
import logo from '@/assets/logo.png';

export const Navbar: FC = () => {
  return (
    <NextUINavbar maxWidth='full' position='sticky'>
      <NavbarContent className='basis-1/5 sm:basis-full' justify='start'>
        <NavbarBrand as='li' className='gap-3 max-w-fit'>
          <Link className='flex justify-start items-center gap-1 font-bold text-xl' href='/'>
            <Image alt='logo' src={logo} width={24} height={24} />
            GPT
          </Link>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent className='hidden sm:flex basis-1/5 sm:basis-full' justify='end'>
        <NavbarItem>
          <ThemeSwitch />
        </NavbarItem>
      </NavbarContent>

      <NavbarContent className='sm:hidden basis-1 pl-4' justify='end'>
        <ThemeSwitch />
        <NavbarMenuToggle />
      </NavbarContent>

      <NavbarMenu>
        <div className='mx-4 mt-2 flex flex-col gap-2'></div>
      </NavbarMenu>
    </NextUINavbar>
  );
};
