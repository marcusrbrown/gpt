import type {FC} from 'react'
import {siteConfig} from '@/config/site'
import {cn, theme} from '@/lib/design-system'
import {Link} from '@heroui/react'

export const Footer: FC = () => {
  return (
    <footer className={cn('w-full flex items-center justify-center py-6 border-t', theme.surface(1), theme.border())}>
      <Link
        className="flex items-center gap-2 text-current transition-colors"
        href={siteConfig.links.github}
        isExternal
        title="@marcusrbrown on GitHub"
      >
        <span className={cn('text-sm', theme.content('secondary'))}>Made with 🖤 by</span>
        <span className="text-primary-600 dark:text-primary-400 font-semibold text-sm">Marcus R. Brown</span>
      </Link>
    </footer>
  )
}
