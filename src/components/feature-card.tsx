import type {LucideIcon} from 'lucide-react'
import type {FC} from 'react'
import {cn, compose, ds, theme} from '@/lib/design-system'
import '@/styles/heroui-v3.css'
import {Skeleton} from '@heroui/react'
import {Card} from '@heroui-v3/react'
import {Link as RouterLink} from 'react-router-dom'

/**
 * The title link is the card's one interactive element. Its `::after` covers the card, so a click
 * anywhere on the card follows the link. The card shows the focus ring when the link has keyboard focus.
 */
const stretchedLink = cn(
  'rounded-sm outline-none after:absolute after:inset-0 after:rounded-[inherit] after:content-[""]',
  'focus-visible:outline-none',
)

interface FeatureCardProps {
  title: string
  description: string
  icon: LucideIcon
  href: string
  domain?: string
  isLoading?: boolean
  error?: string | null
}

export const FeatureCard: FC<FeatureCardProps> = ({
  title,
  description,
  icon: Icon,
  href,
  domain,
  isLoading = false,
  error = null,
}) => {
  const isExternal = href.startsWith('http')
  const isInteractive = !isLoading && !error

  return (
    <Card
      data-testid="feature-card"
      className={cn(
        compose.card(),
        'max-w-sm',
        'cursor-pointer',
        'group',
        isInteractive && 'hover:bg-content2',
        'has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-primary-500 has-[a:focus-visible]:ring-offset-2',
        ds.animation.cardHover,
        isLoading && ds.state.loading,
        error && ds.state.error,
      )}
    >
      <Card.Header className={cn('pb-4')}>
        {error ? (
          <div className="flex items-center gap-4">
            <div className={cn('rounded-lg p-3', 'bg-danger-50', 'text-danger')}>
              <Icon className={cn('h-6 w-6')} />
            </div>
            <div className="flex flex-col">
              <h3 className={cn(ds.text.heading.h4, 'text-danger')}>Error Loading Feature</h3>
              <div className={cn(ds.text.body.small, 'text-danger')}>{error}</div>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center gap-4 w-full">
            <Skeleton className="flex rounded-lg w-12 h-12" />
            <div className="flex flex-col gap-2 w-full">
              <Skeleton className="h-5 w-3/4 rounded-lg" />
              <Skeleton className="h-4 w-1/2 rounded-lg" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className={cn('rounded-lg p-3', theme.surface(2), 'group-hover:scale-[1.02]')}>
              <Icon className={cn('h-6 w-6', 'text-primary-500', 'group-hover:text-primary-600')} />
            </div>
            <div className="flex flex-col">
              <h3 className={cn(ds.text.heading.h4)}>
                {isExternal ? (
                  <a href={href} target="_blank" rel="noopener noreferrer" className={stretchedLink}>
                    {title}
                  </a>
                ) : (
                  <RouterLink to={href} className={stretchedLink}>
                    {title}
                  </RouterLink>
                )}
              </h3>
              {domain && <div className={cn(ds.text.body.small)}>{domain}</div>}
            </div>
          </div>
        )}
      </Card.Header>

      <Card.Content className="pt-0">
        {error ? (
          <p className={cn(ds.text.body.base, 'text-danger')}>Unable to load feature data. Please try again later.</p>
        ) : isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-3 w-full rounded-lg" />
            <Skeleton className="h-3 w-4/5 rounded-lg" />
          </div>
        ) : (
          <p className={cn(ds.text.body.base, 'line-clamp-2')}>{description}</p>
        )}
      </Card.Content>

      <Card.Footer className="pt-4">
        {error || isLoading ? (
          <Skeleton className="h-4 w-32 rounded-lg" />
        ) : (
          <span className={cn('text-primary-500 font-medium', ds.text.body.small, 'group-hover:text-primary-600')}>
            {isExternal ? 'Open in ChatGPT' : 'Learn more'} →
          </span>
        )}
      </Card.Footer>
    </Card>
  )
}
