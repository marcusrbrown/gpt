import type {ReactNode} from 'react'
import {cn, ds} from '@/lib/design-system'

interface FullHeightLayoutProps {
  children: ReactNode
  className?: string
}

export function FullHeightLayout({children, className}: FullHeightLayoutProps) {
  return (
    <main
      className={cn(
        'h-[calc(100vh-var(--header-height)-var(--footer-height))]',
        'overflow-hidden',
        ds.animation.fadeIn,
        className,
      )}
    >
      {children}
    </main>
  )
}
