import type {FC} from 'react'
import {siteConfig} from '@/config/site'
import {Link} from '@heroui/react'

export const Footer: FC = () => {
  return (
    <footer className="w-full flex items-center justify-center py-3">
      <Link
        className="flex items-center gap-1 text-current"
        href={siteConfig.links.github}
        isExternal
        title="@marcusrbrown on GitHub"
      >
        <span className="text-default-600">Made with 🖤 by</span>
        <p className="text-primary">Marcus R. Brown</p>
      </Link>
    </footer>
  )
}
