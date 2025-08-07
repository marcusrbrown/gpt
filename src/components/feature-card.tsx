import {cn, compose, ds, theme} from '@/lib/design-system'
import {Card, CardBody, CardFooter, CardHeader} from '@heroui/react'
import {type LucideIcon} from 'lucide-react'
import {type FC} from 'react'

import {useNavigate} from 'react-router-dom'

interface FeatureCardProps {
  title: string
  description: string
  icon: LucideIcon
  href: string
  domain?: string
}

export const FeatureCard: FC<FeatureCardProps> = ({title, description, icon: Icon, href, domain}) => {
  const navigate = useNavigate()
  const isExternal = href.startsWith('http')

  const handleCardPress = () => {
    if (isExternal) {
      window.open(href, '_blank', 'noopener,noreferrer')
    } else {
      navigate(href)
    }
  }

  return (
    <Card
      className={cn(compose.card(), ds.animation.transition, 'max-w-sm', 'cursor-pointer')}
      isHoverable
      isPressable
      onPress={handleCardPress}
    >
      <CardHeader className={cn('pb-4')}>
        <div className="flex items-center gap-4">
          <div className={cn('rounded-lg p-3', theme.surface(2), ds.animation.transition)}>
            <Icon className={cn('h-6 w-6', 'text-primary-500')} />
          </div>
          <div className="flex flex-col">
            <h3 className={cn(ds.text.heading.h4)}>{title}</h3>
            {domain && <div className={cn(ds.text.body.small)}>{domain}</div>}
          </div>
        </div>
      </CardHeader>

      <CardBody className="pt-0">
        <p className={cn(ds.text.body.base, 'line-clamp-2')}>{description}</p>
      </CardBody>

      <CardFooter className="pt-4">
        <span
          className={cn(
            'text-primary-500 text-sm font-medium',
            ds.animation.transition,
            'group-hover:text-primary-600',
          )}
        >
          {isExternal ? 'Open in ChatGPT' : 'Learn more'} →
        </span>
      </CardFooter>
    </Card>
  )
}
