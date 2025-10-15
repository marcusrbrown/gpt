import type {FC} from 'react'
import {siteConfig} from '@/config/site'
import {cn, theme} from '@/lib/design-system'
import {Link} from '@heroui/react'

export const Footer: FC = () => {
  return (
    <footer className={cn('w-full flex items-center justify-center py-6', theme.surface(0))}>
      <Link
        className="flex items-center gap-2 text-current"
        href={siteConfig.links.github}
        isExternal
        title="@marcusrbrown on GitHub"
      >
        <span className={theme.content('secondary')}>Made with 🖤 by</span>
        <p className="text-primary font-medium">Marcus R. Brown</p>
      </Link>
    </footer>
  )
}
