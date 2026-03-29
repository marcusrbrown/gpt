import {cn, compose, ds} from '@/lib/design-system'
import {Avatar, CardHeader, CardContent, CardFooter, Separator, Link, Card as NextUICard, Skeleton} from '@heroui/react'

import {useRef, type FC} from 'react'

export interface CardProps {
  title: string
  description: string
  avatarUrl: string | URL
  author: string
  authorUrl: string | URL
  gptUrl: string | URL
  isLoading?: boolean
  error?: string | null
}

export const Card: FC<CardProps> = ({
  title,
  description,
  avatarUrl,
  author,
  authorUrl,
  gptUrl,
  isLoading = false,
  error = null,
}) => {
  const ref = useRef<HTMLDivElement | null>(null)

  return (
    <NextUICard
      ref={ref}
      className={cn(
        compose.card('max-w-sm'),
        'p-0 border-2 cursor-pointer',
        'hover:border-primary-300 dark:hover:border-primary-600',
        ds.animation.transition,
        ds.focus.ring,
        isLoading && ds.state.loading,
        error && ds.state.error,
      )}
      data-testid="example-gpt-card"
    >
      {error ? (
        <>
          <CardHeader className="flex gap-4">
            <div className="flex flex-col">
              <p className={cn(ds.text.heading.h4, 'text-danger')}>Error Loading GPT</p>
              <p className={cn(ds.text.body.small, 'text-danger')}>{error}</p>
            </div>
          </CardHeader>
        </>
      ) : (
        <>
          <CardHeader className="flex gap-4">
            {isLoading ? (
              <>
                <Skeleton className="flex rounded-full w-12 h-12" />
                <div className="flex flex-col gap-2 w-full">
                  <Skeleton className="h-4 w-3/4 rounded-lg" />
                  <Skeleton className="h-3 w-1/2 rounded-lg" />
                </div>
              </>
            ) : (
              <>
                <Avatar size="md" className="ring-2 ring-primary-200">
                  <Avatar.Image src={avatarUrl.toString()} alt="GPT Logo" />
                  <Avatar.Fallback>GL</Avatar.Fallback>
                </Avatar>
                <div className="flex flex-col">
                  <p className={cn(ds.text.heading.h4)}>{title}</p>
                  <Link
                    className={cn(ds.text.body.small)}
                    href={authorUrl.toString()}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {author}
                  </Link>
                </div>
              </>
            )}
          </CardHeader>
          <Separator />
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-3 w-full rounded-lg" />
                <Skeleton className="h-3 w-4/5 rounded-lg" />
                <Skeleton className="h-3 w-3/5 rounded-lg" />
              </div>
            ) : (
              <p className={cn(ds.text.body.base)}>{description}</p>
            )}
          </CardContent>
          <Separator />
          <CardFooter>
            {isLoading ? (
              <Skeleton className="h-4 w-32 rounded-lg" />
            ) : (
              <Link
                href={gptUrl.toString()}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline"
              >
                Open in ChatGPT
                <span className="ml-1">↗</span>
              </Link>
            )}
          </CardFooter>
        </>
      )}
    </NextUICard>
  )
}
