import type {ReactNode} from 'react'
import {cn, ds, theme} from '@/lib/design-system'

interface SidebarLayoutProps {
  children: ReactNode
  sidebar: ReactNode
  sidebarWidth?: string
  className?: string
}

export function SidebarLayout({children, sidebar, sidebarWidth = 'w-64', className}: SidebarLayoutProps) {
  return (
    <div
      className={cn('flex h-[calc(100vh-var(--header-height)-var(--footer-height))]', ds.animation.fadeIn, className)}
    >
      <aside className={cn(sidebarWidth, 'flex-shrink-0 border-r overflow-y-auto', theme.border(), theme.surface(1))}>
        {sidebar}
      </aside>
      <main className={cn('flex-1 overflow-y-auto', theme.surface(0))}>{children}</main>
    </div>
  )
}
