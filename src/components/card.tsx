import type {FC} from 'react'
import {cn, compose, ds} from '@/lib/design-system'
import '@/styles/heroui-v3.css'
import {Divider, Skeleton} from '@heroui/react'
import {Avatar, Link, Card as NextUICard} from '@heroui-v3/react'

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
  const isInteractive = !isLoading && !error

  return (
    <NextUICard
      className={cn(
        compose.card('max-w-sm'),
        'p-0 border-2', // Override compose.card padding since HeroUI Card handles internal spacing
        'shadow-small',
        isInteractive && 'hover:border-primary-300 dark:hover:border-primary-600 hover:bg-content2',
        ds.animation.transition,
        isLoading && ds.state.loading,
        error && ds.state.error,
      )}
      data-testid="example-gpt-card"
    >
      {error ? (
        <>
          <NextUICard.Header className="flex gap-4">
            <div className="flex flex-col">
              <p className={cn(ds.text.heading.h4, 'text-danger')}>Error Loading GPT</p>
              <p className={cn(ds.text.body.small, 'text-danger')}>{error}</p>
            </div>
          </NextUICard.Header>
        </>
      ) : (
        <>
          <NextUICard.Header className="flex gap-4">
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
                <Avatar className="rounded-full ring-2 ring-default ring-offset-2 ring-offset-background" size="md">
                  <Avatar.Image alt="GPT Logo" src={avatarUrl.toString()} />
                  <Avatar.Fallback>{title.slice(0, 1).toUpperCase()}</Avatar.Fallback>
                </Avatar>
                <div className="flex flex-col">
                  <p className={cn(ds.text.heading.h4)}>{title}</p>
                  <Link
                    className={cn(ds.text.body.small, 'font-normal')}
                    href={authorUrl.toString()}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {author}
                  </Link>
                </div>
              </>
            )}
          </NextUICard.Header>
          <Divider />
          <NextUICard.Content>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-3 w-full rounded-lg" />
                <Skeleton className="h-3 w-4/5 rounded-lg" />
                <Skeleton className="h-3 w-3/5 rounded-lg" />
              </div>
            ) : (
              <p className={cn(ds.text.body.base)}>{description}</p>
            )}
          </NextUICard.Content>
          <Divider />
          <NextUICard.Footer>
            {isLoading ? (
              <Skeleton className="h-4 w-32 rounded-lg" />
            ) : (
              <Link
                href={gptUrl.toString()}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary"
              >
                Open in ChatGPT
                <Link.Icon className="size-[1em] pb-0" />
              </Link>
            )}
          </NextUICard.Footer>
        </>
      )}
    </NextUICard>
  )
}
