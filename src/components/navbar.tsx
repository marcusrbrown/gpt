import {ThemeSwitch} from '@/components/theme-switch'
import {cn, ds, theme} from '@/lib/design-system'
import '@/styles/heroui-v3.css'
import {Button, InputGroup, TextField} from '@heroui-v3/react'
import {buttonVariants, type ButtonVariants} from '@heroui-v3/styles'
import {Archive, BookOpen, Github, Menu, Search, Settings, X} from 'lucide-react'
import {useEffect, useState, type MouseEvent} from 'react'
import {Link as RouterLink, type LinkProps} from 'react-router-dom'

// v3 Button renders a <button> only, so route links keep a real <a href> and borrow the v3 button styles.
type ButtonLinkProps = LinkProps & ButtonVariants

const ButtonLink = ({variant, size, isIconOnly, fullWidth, className, ...props}: ButtonLinkProps) => (
  <RouterLink className={cn(buttonVariants({variant, size, isIconOnly, fullWidth}), className)} {...props} />
)

export const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleSkipToMainContent = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()

    const mainContent = document.querySelector<HTMLElement>('#main-content')
    if (mainContent instanceof HTMLElement) {
      mainContent.focus()
      mainContent.scrollIntoView({block: 'start'})
    }
  }

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
      <a
        href="#main-content"
        onClick={handleSkipToMainContent}
        className={cn(
          'sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:px-4 focus:py-2 focus:shadow-lg focus:outline-none',
          ds.focus.ring,
          theme.surface(2),
          theme.content('primary'),
        )}
      >
        Skip to main content
      </a>
      <div className={cn('flex items-center justify-between h-full', ds.layout.container)}>
        {/* Left section - Logo */}
        <div className="flex items-center gap-3">
          <Button
            isIconOnly
            variant="tertiary"
            className="lg:hidden min-w-[40px] h-[40px] flex items-center justify-center"
            onPress={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {isMobileMenuOpen ? (
              <X size={20} className={theme.content('primary')} />
            ) : (
              <Menu size={20} className={theme.content('primary')} />
            )}
          </Button>
          <RouterLink to="/" className="flex items-center gap-3">
            <span className={cn(ds.text.heading.h4, 'font-bold')}>GPT</span>
            <span className={cn(ds.text.body.base, 'font-medium hidden sm:inline', theme.content('secondary'))}>
              Agent Framework
            </span>
          </RouterLink>
        </div>

        {/* Center section - Search */}
        <div className="flex-1 min-w-0 max-w-2xl mx-4 flex items-center">
          <div className="relative w-full">
            <TextField type="search" aria-label="Search documentation" fullWidth>
              <InputGroup fullWidth className={cn(theme.surface(1), 'h-10', ds.animation.transition)}>
                <InputGroup.Prefix>
                  <Search className={theme.content('tertiary')} size={16} aria-hidden="true" />
                </InputGroup.Prefix>
                <InputGroup.Input placeholder="Search documentation..." className="text-sm" />
              </InputGroup>
            </TextField>
          </div>
        </div>

        {/* Right section - Navigation */}
        <nav className="flex items-center gap-3" aria-label="Main navigation">
          <ButtonLink
            to="/settings"
            isIconOnly
            variant="tertiary"
            className="hidden sm:flex min-w-[40px] h-[40px] items-center justify-center"
            aria-label="Settings"
          >
            <Settings size={20} className={theme.content('primary')} />
          </ButtonLink>
          <ButtonLink
            to="/backup"
            isIconOnly
            variant="tertiary"
            className="hidden sm:flex min-w-[40px] h-[40px] items-center justify-center"
            aria-label="Backup & Restore"
          >
            <Archive size={20} className={theme.content('primary')} />
          </ButtonLink>
          <ButtonLink
            to="/docs"
            isIconOnly
            variant="tertiary"
            className="min-w-[40px] h-[40px] flex items-center justify-center"
            aria-label="Documentation"
          >
            <BookOpen size={20} className={theme.content('primary')} />
          </ButtonLink>
          <a
            href="https://github.com/marcusrbrown/gpt"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({variant: 'tertiary', isIconOnly: true}),
              'min-w-[40px] h-[40px] flex items-center justify-center',
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
                variant="tertiary"
                size="lg"
                className="min-w-[44px] h-[44px] flex items-center justify-center"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Settings (Quick Access)"
              >
                <Settings size={24} className={theme.content('primary')} />
              </ButtonLink>
            </div>

            {/* Navigation content - Settings removed from list (available in header) */}
            <nav className={cn(ds.layout.container, 'flex flex-col gap-4 py-6')} aria-label="Mobile navigation">
              <TextField type="search" aria-label="Search documentation" fullWidth>
                <InputGroup fullWidth className={cn(theme.surface(1), 'min-h-[40px]', ds.animation.transition)}>
                  <InputGroup.Prefix>
                    <Search className={theme.content('tertiary')} size={16} aria-hidden="true" />
                  </InputGroup.Prefix>
                  <InputGroup.Input placeholder="Search documentation..." className="text-sm" />
                </InputGroup>
              </TextField>
              <ButtonLink
                to="/backup"
                variant="tertiary"
                className="justify-start h-12"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Go to Backup & Restore"
              >
                <Archive size={20} className={cn(theme.content('primary'), 'mr-3')} aria-hidden="true" />
                Backup & Restore
              </ButtonLink>
              <ButtonLink
                to="/docs"
                variant="tertiary"
                className="justify-start h-12"
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Go to Documentation"
              >
                <BookOpen size={20} className={cn(theme.content('primary'), 'mr-3')} aria-hidden="true" />
                Documentation
              </ButtonLink>
              <a
                href="https://github.com/marcusrbrown/gpt"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({variant: 'tertiary'}), 'justify-start h-12')}
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
