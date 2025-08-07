import {cn, compose, ds, theme} from '@/lib/design-system'
import {Card, CardBody, CardFooter, CardHeader, Skeleton} from '@heroui/react'
import {type LucideIcon} from 'lucide-react'
import {type FC} from 'react'

import {useNavigate} from 'react-router-dom'

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
  const navigate = useNavigate()
  const isExternal = href.startsWith('http')

  const handleCardPress = () => {
    if (isLoading || error) return
    if (isExternal) {
      window.open(href, '_blank', 'noopener,noreferrer')
    } else {
      navigate(href)
    }
  }

  return (
    <Card
      className={cn(
        compose.card(),
        ds.animation.transition,
        'max-w-sm',
        'cursor-pointer',
        'group', // Add group class for hover effects
        ds.focus.ring,
        isLoading && ds.state.loading,
        error && ds.state.error,
      )}
      isHoverable={!isLoading && !error}
      isPressable={!isLoading && !error}
      onPress={handleCardPress}
    >
      <CardHeader className={cn('pb-4')}>
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
            <div className={cn('rounded-lg p-3', theme.surface(2), ds.animation.transition, 'group-hover:scale-105')}>
              <Icon
                className={cn('h-6 w-6', 'text-primary-500', 'group-hover:text-primary-600', ds.animation.transition)}
              />
            </div>
            <div className="flex flex-col">
              <h3 className={cn(ds.text.heading.h4)}>{title}</h3>
              {domain && <div className={cn(ds.text.body.small)}>{domain}</div>}
            </div>
          </div>
        )}
      </CardHeader>

      <CardBody className="pt-0">
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
      </CardBody>

      <CardFooter className="pt-4">
        {error || isLoading ? (
          <Skeleton className="h-4 w-32 rounded-lg" />
        ) : (
          <span
            className={cn(
              'text-primary-500 font-medium',
              ds.text.body.small,
              ds.animation.transition,
              'group-hover:text-primary-600',
            )}
          >
            {isExternal ? 'Open in ChatGPT' : 'Learn more'} →
          </span>
        )}
      </CardFooter>
    </Card>
  )
}
