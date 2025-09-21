import {cn, ds, theme} from '@/lib/design-system'
import {ChevronDown} from 'lucide-react'
import {useCallback, useEffect, useState} from 'react'
import {NavLink, useLocation, type NavLinkProps} from 'react-router-dom'

interface NavItem {
  title: string
  path: string
  items?: NavItem[]
}

type SidebarLinkProps = {
  to: string
  children: React.ReactNode
  className?: string | ((props: {isActive: boolean}) => string)
  onClick?: (e: React.MouseEvent) => void
} & Omit<NavLinkProps, keyof {to: string; className: string | ((props: {isActive: boolean}) => string)}>

const SidebarLink = ({to, children, className, ...props}: SidebarLinkProps) => (
  <NavLink
    to={to}
    className={cn(ds.focus.visible, 'rounded-md', typeof className === 'function' ? className : className)}
    {...props}
  >
    {children}
  </NavLink>
)

const NAV_ITEMS: NavItem[] = [
  {
    title: 'Get started',
    path: '/docs/getting-started',
    items: [
      {title: 'Learn the basics', path: '/docs/getting-started'},
      {title: 'Installation', path: '/docs/getting-started/installation'},
      {title: 'Quick Start', path: '/docs/getting-started/quick-start'},
    ],
  },
  {
    title: 'Guides',
    path: '/docs/guides',
    items: [
      {title: 'How-to Guides', path: '/docs/guides/how-to'},
      {title: 'Concepts', path: '/docs/guides/concepts'},
      {title: 'Tutorials', path: '/docs/guides/tutorials'},
    ],
  },
  {
    title: 'API Reference',
    path: '/docs/api',
    items: [
      {title: 'Core API', path: '/docs/api/core'},
      {title: 'Agent Types', path: '/docs/api/types'},
      {title: 'Utilities', path: '/docs/api/utils'},
    ],
  },
  {
    title: 'Resources',
    path: '/docs/resources',
    items: [
      {title: 'Examples', path: '/docs/resources/examples'},
      {title: 'FAQ', path: '/docs/resources/faq'},
      {title: 'Troubleshooting', path: '/docs/resources/troubleshooting'},
    ],
  },
]

function NavItemComponent({item}: {item: NavItem}) {
  const {pathname} = useLocation()
  const [isExpanded, setIsExpanded] = useState(false)

  // Auto-expand the section that contains the current page
  useEffect(() => {
    if (pathname.startsWith(item.path) || item.items?.some(subItem => pathname.startsWith(subItem.path))) {
      setIsExpanded(true)
    }
  }, [pathname, item.path, item.items])

  const toggleExpand = useCallback(
    (e: React.MouseEvent) => {
      if (item.items) {
        e.preventDefault()
        setIsExpanded(prev => !prev)
      }
    },
    [item.items],
  )

  const isActive = pathname === item.path
  const hasActiveChild = item.items?.some(subItem => pathname === subItem.path)

  return (
    <div className="mb-2">
      <div className="flex items-center">
        <SidebarLink
          to={item.path}
          className={({isActive: linkActive}) =>
            cn(
              'flex-1 flex items-center py-1.5 px-3 rounded-md',
              ds.animation.transition,
              ds.text.body.small,
              linkActive || hasActiveChild
                ? 'text-primary bg-default-100'
                : cn(theme.content('secondary'), 'hover:text-content-primary'),
            )
          }
          onClick={toggleExpand}
        >
          <span className="flex-1">{item.title}</span>
          {item.items && (
            <ChevronDown
              size={16}
              className={cn(
                'transform',
                ds.animation.transition,
                isExpanded ? 'rotate-180' : '',
                isActive || hasActiveChild ? 'text-primary' : theme.content('tertiary'),
              )}
            />
          )}
        </SidebarLink>
      </div>
      {item.items && (
        <div
          className={cn(
            'overflow-hidden',
            ds.animation.transition,
            isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0',
          )}
        >
          <div className={cn('ml-3 pl-3 mt-1', theme.border('default'), 'border-l')}>
            {item.items.map(subItem => (
              <SidebarLink
                key={subItem.path}
                to={subItem.path}
                className={({isActive}) =>
                  cn(
                    'block py-1 px-3 rounded-md',
                    ds.animation.transition,
                    ds.text.body.small,
                    isActive
                      ? 'text-primary bg-default-100'
                      : cn(theme.content('secondary'), 'hover:text-content-primary'),
                  )
                }
              >
                {subItem.title}
              </SidebarLink>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function DocsSidebar() {
  return (
    <nav className="py-4" role="navigation" aria-label="Documentation navigation">
      {NAV_ITEMS.map(item => (
        <NavItemComponent key={item.path} item={item} />
      ))}
    </nav>
  )
}
