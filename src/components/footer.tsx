import type {FC} from 'react'
import {siteConfig} from '@/config/site'
import {cn} from '@/lib/design-system'
import '@/styles/heroui-v3.css'
import {Link, Tooltip} from '@heroui-v3/react'

export const Footer: FC = () => {
  return (
    <footer
      className={cn(
        'w-full flex items-center justify-center py-6 border-t',
        'bg-surface-secondary border-border-default',
      )}
    >
      <Tooltip delay={0}>
        <Link
          className="flex items-center gap-2 font-normal text-current"
          href={siteConfig.links.github}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="text-sm text-content-secondary">Made with 🖤 by</span>
          <span className="text-primary-600 dark:text-content-primary font-semibold text-sm">Marcus R. Brown</span>
        </Link>
        <Tooltip.Content>@marcusrbrown on GitHub</Tooltip.Content>
      </Tooltip>
    </footer>
  )
}
