import {ThemeSwitch} from '@/components/theme-switch'
import {cn, ds, theme} from '@/lib/design-system'
import {Button, Input} from '@heroui/react'
import {Archive, BookOpen, Github, Menu, Search, Settings, X} from 'lucide-react'
import {useEffect, useState} from 'react'
import {Link as RouterLink, useNavigate} from 'react-router-dom'

const ButtonLink = ({
  to,
  children,
  className,
  onPress,
  ...props
}: {to: string; children: React.ReactNode; className?: string; onPress?: () => void} & Omit<
  React.ComponentProps<typeof Button>,
  'onPress'
>) => {
  const navigate = useNavigate()
  return (
    <Button
      className={cn(
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1',
        className,
      )}
      onPress={() => {
        onPress?.()
        void navigate(to)
      }}
      {...props}
    >
      {children}
    </Button>
  )
}

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
    <header className={cn('w-full h-(--header-height) border-b', theme.surface(0), theme.border())}>
      <div className={cn('flex items-center justify-between h-full', ds.layout.container)}>
        {/* Left section - Logo */}
        <div className="flex items-center gap-3">
          <Button
            isIconOnly
            variant="tertiary"
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
            <div
              className={cn(
                theme.surface(1),
                'h-10 flex items-center rounded-lg border border-border-default focus-within:ring-2 focus-within:ring-primary-500 transition-all',
              )}
            >
              <div className="pl-3 flex items-center pointer-events-none">
                <Search className={cn(theme.content('tertiary'))} size={16} aria-hidden="true" />
              </div>
              <Input
                type="search"
                placeholder="Search documentation..."
                className="flex-1 bg-transparent border-none focus:ring-0 px-3 py-2 text-sm"
                aria-label="Search documentation"
              />
            </div>
          </div>
        </div>

        {/* Right section - Navigation */}
        <nav className="flex items-center gap-3" aria-label="Main navigation">
          <ButtonLink
            to="/settings"
            isIconOnly
            variant="tertiary"
            className={cn('hidden sm:flex min-w-[40px] h-[40px] items-center justify-center')}
            aria-label="Settings"
          >
            <Settings size={20} className={theme.content('primary')} />
          </ButtonLink>
          <ButtonLink
            to="/backup"
            isIconOnly
            variant="tertiary"
            className={cn('hidden sm:flex min-w-[40px] h-[40px] items-center justify-center')}
            aria-label="Backup & Restore"
          >
            <Archive size={20} className={theme.content('primary')} />
          </ButtonLink>
          <ButtonLink
            to="/docs"
            isIconOnly
            variant="tertiary"
            className={cn('min-w-[40px] h-[40px] flex items-center justify-center')}
            aria-label="Documentation"
          >
            <BookOpen size={20} className={theme.content('primary')} />
          </ButtonLink>
          <a
            href="https://github.com/marcusrbrown/gpt"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'min-w-[40px] h-[40px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1',
            )}
            aria-label="GitHub repository"
          >
            <Github size={20} className={theme.content('primary')} />
          </a>
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
            className={cn('fixed top-(--header-height) left-0 right-0 bottom-0 z-50 lg:hidden', theme.surface(0))}
            role="dialog"
            aria-label="Mobile navigation menu"
          >
            {/* Mobile menu header with Settings quick-access */}
            <div className={cn('border-b px-4 py-3 flex items-center justify-between', theme.border())}>
              <h2 className={cn(ds.text.heading.h4, theme.content('primary'))}>Menu</h2>
              <ButtonLink
                to="/settings"
                isIconOnly
                variant="primary"
                size="lg"
                className={cn('min-w-[44px] h-[44px] flex items-center justify-center')}
                onPress={() => setIsMobileMenuOpen(false)}
                aria-label="Settings (Quick Access)"
              >
                <Settings size={24} className={theme.content('primary')} />
              </ButtonLink>
            </div>

            {/* Navigation content - Settings removed from list (available in header) */}
            <nav className={cn(ds.layout.container, 'flex flex-col gap-4 py-6')} aria-label="Mobile navigation">
              <div
                className={cn(
                  theme.surface(1),
                  'min-h-[40px] flex items-center rounded-lg border border-border-default focus-within:ring-2 focus-within:ring-primary-500 transition-all',
                )}
              >
                <div className="pl-3 flex items-center pointer-events-none">
                  <Search className={cn(theme.content('tertiary'))} size={16} aria-hidden="true" />
                </div>
                <Input
                  type="search"
                  placeholder="Search documentation..."
                  className="flex-1 bg-transparent border-none focus:ring-0 px-3 py-2 text-sm"
                  aria-label="Search documentation"
                />
              </div>
              <ButtonLink
                to="/backup"
                variant="secondary"
                className={cn('justify-start h-12', ds.animation.transition)}
                onPress={() => setIsMobileMenuOpen(false)}
                aria-label="Go to Backup & Restore"
              >
                <Archive size={20} className={cn(theme.content('primary'), 'mr-3')} aria-hidden="true" />
                Backup & Restore
              </ButtonLink>
              <ButtonLink
                to="/docs"
                variant="secondary"
                className={cn('justify-start h-12', ds.animation.transition)}
                onPress={() => setIsMobileMenuOpen(false)}
                aria-label="Go to Documentation"
              >
                <BookOpen size={20} className={cn(theme.content('primary'), 'mr-3')} aria-hidden="true" />
                Documentation
              </ButtonLink>
              <a
                href="https://github.com/marcusrbrown/gpt"
                target="_blank"
                rel="noopener noreferrer"
                className={cn('justify-start h-12 flex items-center', ds.animation.transition)}
                aria-label="Visit GitHub repository (opens in new tab)"
              >
                <Github size={20} className={cn(theme.content('primary'), 'mr-3')} aria-hidden="true" />
                GitHub
              </a>
            </nav>
          </div>
        </>
      )}
    </header>
  )
}
