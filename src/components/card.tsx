import {cn, compose, ds} from '@/lib/design-system'
import {Avatar, CardBody, CardFooter, CardHeader, Divider, Link, Card as NextUICard, Skeleton} from '@heroui/react'

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
      as="div"
      className={cn(
        compose.card('max-w-[400px]'),
        'p-0', // Override compose.card padding since HeroUI Card handles internal spacing
        'hover:cursor-pointer',
        ds.animation.transition,
        isLoading && ds.state.loading,
        error && ds.state.error,
      )}
      isHoverable={!isLoading && !error}
      isPressable={!isLoading && !error}
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
                <Avatar alt="GPT Logo" isBordered radius="full" size="md" src={avatarUrl.toString()} />
                <div className="flex flex-col">
                  <p className={cn(ds.text.heading.h4)}>{title}</p>
                  <Link className={cn(ds.text.body.small)} href={authorUrl.toString()} isExternal>
                    {author}
                  </Link>
                </div>
              </>
            )}
          </CardHeader>
          <Divider />
          <CardBody>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-3 w-full rounded-lg" />
                <Skeleton className="h-3 w-4/5 rounded-lg" />
                <Skeleton className="h-3 w-3/5 rounded-lg" />
              </div>
            ) : (
              <p className={cn(ds.text.body.base)}>{description}</p>
            )}
          </CardBody>
          <Divider />
          <CardFooter>
            {isLoading ? (
              <Skeleton className="h-4 w-32 rounded-lg" />
            ) : (
              <Link href={gptUrl.toString()} isExternal showAnchorIcon>
                Open in ChatGPT
              </Link>
            )}
          </CardFooter>
        </>
      )}
    </NextUICard>
  )
}
