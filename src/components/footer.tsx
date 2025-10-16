import type {FC} from 'react'
import {siteConfig} from '@/config/site'
import {Link} from '@heroui/react'

export const Footer: FC = () => {
  return (
    <footer className="w-full flex items-center justify-center py-6 border-t border-border-default bg-surface-secondary">
      <Link
        className="flex items-center gap-1.5 text-current transition-colors"
        href={siteConfig.links.github}
        isExternal
        title="@marcusrbrown on GitHub"
      >
        <span className="text-content-secondary text-sm">Made with 🖤 by</span>
        <span className="text-primary-600 dark:text-primary-400 font-semibold text-sm">Marcus R. Brown</span>
      </Link>
    </footer>
  )
}
