import {cn, ds, theme} from '@/lib/design-system'
import {ChevronRight} from 'lucide-react'
import {useState, type ReactNode} from 'react'
import {Link, useLocation, type LinkProps} from 'react-router-dom'

interface DocLayoutProps {
  children: ReactNode
  sidebar?: ReactNode
}

type BreadcrumbLinkProps = {
  to: string
  children: React.ReactNode
  className?: string
} & Omit<LinkProps, keyof {to: string; className: string}>

const BreadcrumbLink = ({to, children, className, ...props}: BreadcrumbLinkProps) => (
  <Link
    to={to}
    className={cn(
      ds.text.body.small,
      ds.animation.transition,
      'hover:text-primary-600 dark:hover:text-primary-400 font-medium',
      className,
    )}
    {...props}
  >
    {children}
  </Link>
)

function Breadcrumbs() {
  const {pathname} = useLocation()
  const paths = pathname.split('/').filter(Boolean)

  return (
    <div className={cn('flex items-center gap-1', ds.text.body.small)} role="navigation" aria-label="Breadcrumb">
      <BreadcrumbLink to="/">Home</BreadcrumbLink>
      {paths.map((path, index) => (
        <span key={path} className="flex items-center">
          <ChevronRight size={14} className={cn('mx-1', theme.content('tertiary'))} />
          <BreadcrumbLink to={`/${paths.slice(0, index + 1).join('/')}`} className="capitalize">
            {path.replaceAll('-', ' ')}
          </BreadcrumbLink>
        </span>
      ))}
    </div>
  )
}

export function DocLayout({children, sidebar}: DocLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className={cn('flex min-h-[calc(100vh-var(--header-height))]', theme.surface(0))}>
      {/* Mobile sidebar backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-(--header-height) bottom-0 left-0 z-40 w-(--sidebar-width) border-r lg:static transform transition-transform duration-300',
          theme.border(),
          theme.surface(0),
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <nav className="h-full py-6 px-4 overflow-y-auto">{sidebar}</nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto lg:pl-(--sidebar-width)">
        <div className={cn(ds.layout.container, 'py-6')}>
          <Breadcrumbs />
          {children}
        </div>
      </main>
    </div>
  )
}
