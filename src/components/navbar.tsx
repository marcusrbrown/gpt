import {ThemeSwitch} from '@/components/theme-switch'
import {cn, ds, theme} from '@/lib/design-system'
import {Button, Input, type ButtonProps} from '@heroui/react'
import {Archive, BookOpen, Github, Menu, Search, X} from 'lucide-react'
import {useEffect, useState, type ElementType} from 'react'
import {Link as RouterLink, type LinkProps} from 'react-router-dom'

type ButtonLinkProps = ButtonProps & {
  to: string
} & Omit<LinkProps, keyof {to: string; className: string}>

const ButtonLink = ({to, children, className, ...props}: ButtonLinkProps) => (
  <Button
    as={RouterLink as ElementType}
    to={to}
    className={cn(
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1',
      className,
    )}
    {...props}
  >
    {children}
  </Button>
)

export const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Handle keyboard navigation for mobile menu
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false)
      }
    }

    if (isMobileMenuOpen) {
      document.addEventListener('keydown', handleKeyDown)
      // Prevent body scroll when mobile menu is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'auto'
    }
  }, [isMobileMenuOpen])

  return (
    <header className={cn('w-full h-[var(--header-height)] border-b', theme.surface(0), theme.border())}>
      <div className={cn('flex items-center justify-between h-full', ds.layout.container)}>
        {/* Left section - Logo */}
        <div className="flex items-center gap-3">
          <Button
            isIconOnly
            variant="light"
            color="default"
            className={cn('lg:hidden min-w-[40px] h-[40px] flex items-center justify-center', ds.animation.transition)}
            onPress={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {isMobileMenuOpen ? (
              <X size={20} className={theme.content('primary')} />
            ) : (
              <Menu size={20} className={theme.content('primary')} />
            )}
          </Button>
          <RouterLink to="/" className="flex items-center gap-3" aria-label="GPT Agent Framework - Go to homepage">
            <span className={cn(ds.text.heading.h4, 'font-bold')}>GPT</span>
            <span className={cn(ds.text.body.base, 'font-medium hidden sm:inline', theme.content('secondary'))}>
              Agent Framework
            </span>
          </RouterLink>
        </div>

        {/* Center section - Search */}
        <div className="flex-1 max-w-2xl mx-4 flex items-center">
          <div className="relative w-full">
            <Input
              type="search"
              placeholder="Search documentation..."
              startContent={<Search className={cn(theme.content('tertiary'), 'mr-1')} size={16} aria-hidden="true" />}
              size="md"
              variant="bordered"
              className={cn(ds.animation.transition)}
              classNames={{
                base: 'h-10',
                input: 'text-sm pr-9',
                inputWrapper: cn(theme.surface(1), 'h-10 flex items-center'),
                innerWrapper: 'flex items-center',
                mainWrapper: 'h-10',
              }}
              aria-label="Search documentation"
            />
          </div>
        </div>

        {/* Right section - Navigation */}
        <nav className="flex items-center gap-3" aria-label="Main navigation">
          <ButtonLink
            to="/backup"
            isIconOnly
            variant="light"
            color="default"
            className={cn('hidden sm:flex min-w-[40px] h-[40px] items-center justify-center')}
            aria-label="Backup & Restore"
          >
            <Archive size={20} className={theme.content('primary')} />
          </ButtonLink>
          <ButtonLink
            to="/docs"
            isIconOnly
            variant="light"
            color="default"
            className={cn('min-w-[40px] h-[40px] flex items-center justify-center')}
            aria-label="Documentation"
          >
            <BookOpen size={20} className={theme.content('primary')} />
          </ButtonLink>
          <Button
            as="a"
            href="https://github.com/marcusrbrown/gpt"
            target="_blank"
            rel="noopener noreferrer"
            isIconOnly
            variant="light"
            color="default"
            className={cn(
              'min-w-[40px] h-[40px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1',
            )}
            aria-label="GitHub repository"
          >
            <Github size={20} className={theme.content('primary')} />
          </Button>
          <ThemeSwitch />
        </nav>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
            role="presentation"
          />
          <div
            className={cn('fixed top-[var(--header-height)] left-0 right-0 bottom-0 z-50 lg:hidden', theme.surface(0))}
            role="dialog"
            aria-label="Mobile navigation menu"
          >
            <nav className={cn(ds.layout.container, 'flex flex-col gap-4 py-6')} aria-label="Mobile navigation">
              <Input
                type="search"
                placeholder="Search documentation..."
                startContent={<Search className={cn(theme.content('tertiary'), 'mr-1')} size={16} aria-hidden="true" />}
                size="sm"
                variant="bordered"
                className={cn(ds.animation.transition)}
                classNames={{
                  input: 'text-sm pr-9',
                  inputWrapper: cn(theme.surface(1), 'min-h-[40px]'),
                }}
                aria-label="Search documentation"
              />
              <ButtonLink
                to="/backup"
                variant="light"
                color="default"
                className={cn('justify-start h-12', ds.animation.transition)}
                onPress={() => setIsMobileMenuOpen(false)}
                aria-label="Go to Backup & Restore"
              >
                <Archive size={20} className={cn(theme.content('primary'), 'mr-3')} aria-hidden="true" />
                Backup & Restore
              </ButtonLink>
              <ButtonLink
                to="/docs"
                variant="light"
                color="default"
                className={cn('justify-start h-12', ds.animation.transition)}
                onPress={() => setIsMobileMenuOpen(false)}
                aria-label="Go to Documentation"
              >
                <BookOpen size={20} className={cn(theme.content('primary'), 'mr-3')} aria-hidden="true" />
                Documentation
              </ButtonLink>
              <Button
                as="a"
                href="https://github.com/marcusrbrown/gpt"
                target="_blank"
                rel="noopener noreferrer"
                variant="light"
                color="default"
                className={cn('justify-start h-12', ds.animation.transition)}
                aria-label="Visit GitHub repository (opens in new tab)"
              >
                <Github size={20} className={cn(theme.content('primary'), 'mr-3')} aria-hidden="true" />
                GitHub
              </Button>
            </nav>
          </div>
        </>
      )}
    </header>
  )
}
