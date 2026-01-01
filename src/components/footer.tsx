import type {FC} from 'react'
import {siteConfig} from '@/config/site'
import {cn} from '@/lib/design-system'
import {Link} from '@heroui/react'

export const Footer: FC = () => {
  return (
    <footer
      className={cn(
        'w-full flex items-center justify-center py-6 border-t',
        'bg-surface-secondary border-border-default',
      )}
    >
      <Link
        className="flex items-center gap-2 text-current"
        href={siteConfig.links.github}
        isExternal
        title="@marcusrbrown on GitHub"
      >
        <span className="text-sm text-content-secondary">Made with 🖤 by</span>
        <span className="text-primary-600 dark:text-content-primary font-semibold text-sm">Marcus R. Brown</span>
      </Link>
    </footer>
  )
}
