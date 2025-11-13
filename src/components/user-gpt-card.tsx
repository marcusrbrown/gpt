import type {FC} from 'react'
import type {GPTConfiguration} from '../types/gpt'
import {cn, compose, ds} from '@/lib/design-system'
import {Button, Card, CardBody, CardFooter, CardHeader, Divider, Skeleton} from '@heroui/react'

import {Edit, Play} from 'lucide-react'
import {Link} from 'react-router-dom'

export interface UserGPTCardProps {
  gpt: GPTConfiguration
  isLoading?: boolean
  error?: string | null
}

export const UserGPTCard: FC<UserGPTCardProps> = ({gpt, isLoading = false, error = null}) => {
  return (
    <Card
      className={cn(
        compose.card('max-w-sm'),
        'p-0 border-2',
        'hover:border-primary-300 dark:hover:border-primary-600',
        ds.focus.ring,
        ds.animation.cardHover,
        isLoading && ds.state.loading,
        error && ds.state.error,
      )}
      isHoverable={!isLoading && !error}
      shadow="sm"
      data-testid="user-gpt-card"
    >
      <CardHeader className="flex gap-4 pb-3">
        {error ? (
          <div className="flex flex-col">
            <p className={cn(ds.text.heading.h4, 'text-danger')}>Error Loading GPT</p>
            <p className={cn(ds.text.body.small, 'text-danger')}>{error}</p>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col gap-2 w-full">
            <Skeleton className="h-5 w-3/4 rounded-lg" />
            <Skeleton className="h-4 w-1/2 rounded-lg" />
          </div>
        ) : (
          <div className="flex flex-col">
            <p className={cn(ds.text.heading.h4)} data-testid="gpt-name">
              {gpt.name}
            </p>
            <p className={cn(ds.text.body.small)}>Updated: {new Date(gpt.updatedAt).toLocaleDateString()}</p>
          </div>
        )}
      </CardHeader>
      <Divider />
      <CardBody>
        {error ? (
          <p className={cn(ds.text.body.base, 'text-danger')}>Unable to load GPT data. Please try again later.</p>
        ) : isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-3 w-full rounded-lg" />
            <Skeleton className="h-3 w-4/5 rounded-lg" />
            <Skeleton className="h-3 w-3/5 rounded-lg" />
          </div>
        ) : (
          <p className={cn(ds.text.body.base, 'line-clamp-3')}>{gpt.description || 'No description provided.'}</p>
        )}
      </CardBody>
      <Divider />
      <CardFooter className="flex justify-between gap-3">
        {error || isLoading ? (
          <>
            <Skeleton className="h-10 w-20 rounded-lg" />
            <Skeleton className="h-10 w-20 rounded-lg" />
          </>
        ) : (
          <>
            <Button
              as={Link}
              to={`/gpt/edit/${gpt.id}`}
              variant="flat"
              color="primary"
              startContent={<Edit size={16} />}
              className={cn('flex items-center', ds.animation.transition, ds.animation.buttonPress)}
              size="sm"
            >
              Edit
            </Button>
            <Button
              as={Link}
              to={`/gpt/test/${gpt.id}`}
              variant="solid"
              color="primary"
              startContent={<Play size={16} />}
              className={cn('flex items-center', ds.animation.transition, ds.animation.buttonPress)}
              size="sm"
            >
              Test
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  )
}
