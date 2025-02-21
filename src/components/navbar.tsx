import {Button, Input, type ButtonProps} from '@heroui/react';
import {ThemeSwitch} from '@/components/theme-switch';
import {Link as RouterLink, type LinkProps} from 'react-router-dom';
import {BookOpen, Github, Menu, Search, X} from 'lucide-react';
import {useState, ElementType} from 'react';

type ButtonLinkProps = ButtonProps & {
  to: string;
} & Omit<LinkProps, keyof {to: string; className: string}>;

const ButtonLink = ({to, children, ...props}: ButtonLinkProps) => (
  <Button as={RouterLink as ElementType} to={to} {...props}>
    {children}
  </Button>
);

export const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className='fixed top-0 left-0 right-0 h-[var(--header-height)] border-b border-[var(--border-color)] bg-[var(--background-primary)] z-50'>
      <div className='flex items-center justify-between h-full px-4 mx-auto container'>
        {/* Left section - Logo */}
        <div className='flex items-center gap-2'>
          <Button
            isIconOnly
            variant='light'
            className='lg:hidden'
            onPress={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
          <RouterLink to='/' className='flex items-center gap-2'>
            <span className='font-bold text-xl'>GPT</span>
            <span className='font-medium text-[var(--text-secondary)] hidden sm:inline'>Agent Framework</span>
          </RouterLink>
        </div>

        {/* Center section - Search */}
        <div className='flex-1 max-w-2xl mx-4'>
          <div className='relative w-full'>
            <Input
              type='search'
              placeholder='Search documentation...'
              startContent={<Search className='text-[var(--text-tertiary)]' />}
              size='sm'
              variant='bordered'
              classNames={{
                input: 'text-sm',
                inputWrapper: 'bg-[var(--background-secondary)]',
              }}
            />
          </div>
        </div>

        {/* Right section - Navigation */}
        <nav className='flex items-center gap-2'>
          <ButtonLink to='/docs' isIconOnly variant='light' aria-label='Documentation'>
            <BookOpen size={20} />
          </ButtonLink>
          <Button
            as='a'
            href='https://github.com/marcusrbrown/gpt'
            target='_blank'
            rel='noopener noreferrer'
            isIconOnly
            variant='light'
            aria-label='GitHub repository'
          >
            <Github size={20} />
          </Button>
          <ThemeSwitch />
        </nav>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <>
          <div
            className='fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden'
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden='true'
          />
          <div className='fixed top-[var(--header-height)] left-0 right-0 bottom-0 z-50 bg-[var(--background-primary)] lg:hidden'>
            <nav className='container mx-auto p-4 flex flex-col gap-4'>
              <Input
                type='search'
                placeholder='Search documentation...'
                startContent={<Search className='text-[var(--text-tertiary)]' />}
                size='sm'
                variant='bordered'
                classNames={{
                  input: 'text-sm',
                  inputWrapper: 'bg-[var(--background-secondary)]',
                }}
              />
              <ButtonLink
                to='/docs'
                variant='light'
                className='justify-start'
                onPress={() => setIsMobileMenuOpen(false)}
              >
                <BookOpen size={20} className='mr-2' />
                Documentation
              </ButtonLink>
              <Button
                as='a'
                href='https://github.com/marcusrbrown/gpt'
                target='_blank'
                rel='noopener noreferrer'
                variant='light'
                className='justify-start'
              >
                <Github size={20} className='mr-2' />
                GitHub
              </Button>
            </nav>
          </div>
        </>
      )}
    </header>
  );
};
