import type {ReactNode} from 'react'
import {cn, ds} from '@/lib/design-system'

interface DefaultLayoutProps {
  children: ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

const maxWidthClasses = {
  sm: 'max-w-(--breakpoint-sm)',
  md: 'max-w-(--breakpoint-md)',
  lg: 'max-w-(--breakpoint-lg)',
  xl: 'max-w-(--breakpoint-xl)',
  full: 'max-w-full',
} as const

export function DefaultLayout({children, className, maxWidth = 'xl'}: DefaultLayoutProps) {
  return (
    <main
      className={cn(
        'container mx-auto px-4 py-6',
        'min-h-[calc(100vh-var(--header-height)-var(--footer-height))]',
        maxWidthClasses[maxWidth],
        ds.animation.fadeIn,
        className,
      )}
    >
      {children}
    </main>
  )
}
