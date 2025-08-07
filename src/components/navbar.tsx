import {ThemeSwitch} from '@/components/theme-switch'
import {cn, ds} from '@/lib/design-system'
import {Button, Input, type ButtonProps} from '@heroui/react'
import {BookOpen, Github, Menu, Search, X} from 'lucide-react'
import {useState, type ElementType} from 'react'
import {Link as RouterLink, type LinkProps} from 'react-router-dom'

type ButtonLinkProps = ButtonProps & {
  to: string
} & Omit<LinkProps, keyof {to: string; className: string}>

const ButtonLink = ({to, children, className, ...props}: ButtonLinkProps) => (
  <Button
    as={RouterLink as ElementType}
    to={to}
    className={cn(ds.animation.transition, ds.focus.ring, className)}
    {...props}
  >
    {children}
  </Button>
)

export const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 h-[var(--header-height)] border-b border-border-default bg-surface-primary z-50">
      <div className={cn('flex items-center justify-between h-full', ds.layout.container)}>
        {/* Left section - Logo */}
        <div className="flex items-center gap-2">
          <Button
            isIconOnly
            variant="light"
            color="default"
            className={cn('lg:hidden', ds.animation.transition, ds.focus.ring)}
            onPress={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {isMobileMenuOpen ? (
              <X size={20} className="text-content-primary" />
            ) : (
              <Menu size={20} className="text-content-primary" />
            )}
          </Button>
          <RouterLink to="/" className="flex items-center gap-2">
            <span className="font-bold text-xl">GPT</span>
            <span className="font-medium text-content-secondary hidden sm:inline">Agent Framework</span>
          </RouterLink>
        </div>

        {/* Center section - Search */}
        <div className="flex-1 max-w-2xl mx-4">
          <div className="relative w-full">
            <Input
              type="search"
              placeholder="Search documentation..."
              startContent={<Search className="text-content-tertiary" size={16} />}
              size="sm"
              variant="bordered"
              className={cn(ds.animation.transition, ds.focus.ring)}
              classNames={{
                input: 'text-sm',
                inputWrapper: 'bg-surface-secondary',
              }}
            />
          </div>
        </div>

        {/* Right section - Navigation */}
        <nav className="flex items-center gap-2">
          <ButtonLink to="/docs" isIconOnly variant="light" color="default" aria-label="Documentation">
            <BookOpen size={20} className="text-content-primary" />
          </ButtonLink>
          <Button
            as="a"
            href="https://github.com/marcusrbrown/gpt"
            target="_blank"
            rel="noopener noreferrer"
            isIconOnly
            variant="light"
            color="default"
            className={cn(ds.animation.transition, ds.focus.ring)}
            aria-label="GitHub repository"
          >
            <Github size={20} className="text-content-primary" />
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
          />
          <div className="fixed top-[var(--header-height)] left-0 right-0 bottom-0 z-50 bg-surface-primary lg:hidden">
            <nav className={cn(ds.layout.container, 'flex flex-col gap-4 py-4')}>
              <Input
                type="search"
                placeholder="Search documentation..."
                startContent={<Search className="text-content-tertiary" size={16} />}
                size="sm"
                variant="bordered"
                className={cn(ds.animation.transition, ds.focus.ring)}
                classNames={{
                  input: 'text-sm',
                  inputWrapper: 'bg-surface-secondary',
                }}
              />
              <ButtonLink
                to="/docs"
                variant="light"
                color="default"
                className="justify-start"
                onPress={() => setIsMobileMenuOpen(false)}
              >
                <BookOpen size={20} className="text-content-primary mr-2" />
                Documentation
              </ButtonLink>
              <Button
                as="a"
                href="https://github.com/marcusrbrown/gpt"
                target="_blank"
                rel="noopener noreferrer"
                variant="light"
                color="default"
                className={cn('justify-start', ds.animation.transition, ds.focus.ring)}
              >
                <Github size={20} className="text-content-primary mr-2" />
                GitHub
              </Button>
            </nav>
          </div>
        </>
      )}
    </header>
  )
}
