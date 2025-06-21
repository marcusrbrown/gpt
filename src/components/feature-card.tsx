import {type LucideIcon} from 'lucide-react'
import {type FC} from 'react'
import {Link} from 'react-router-dom'

interface FeatureCardProps {
  title: string
  description: string
  icon: LucideIcon
  href: string
  domain?: string
}

export const FeatureCard: FC<FeatureCardProps> = ({title, description, icon: Icon, href, domain}) => {
  const isExternal = href.startsWith('http')

  const cardContent = (
    <>
      <div className="flex items-center gap-4">
        <div className="rounded-lg bg-[var(--background-tertiary)] p-3 transition-colors">
          <Icon className="h-6 w-6 text-[var(--accent-color)]" />
        </div>
        <div>
          <h3 className="font-semibold text-[var(--text-primary)]">{title}</h3>
          {domain && <div className="text-sm text-[var(--text-tertiary)]">{domain}</div>}
        </div>
      </div>
      <p className="mt-4 text-[var(--text-secondary)] line-clamp-2">{description}</p>
      <div className="mt-4">
        <span className="text-[var(--accent-color)] text-sm font-medium group-hover:text-[var(--accent-hover)]">
          {isExternal ? 'Open in ChatGPT' : 'Learn more'} →
        </span>
      </div>
    </>
  )

  const cardClasses =
    'group relative rounded-lg border border-[var(--border-color)] bg-[var(--background-secondary)] p-6 transition-all hover:border-[var(--accent-color)] hover:shadow-md'

  return isExternal ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cardClasses}>
      {cardContent}
    </a>
  ) : (
    <Link to={href} className={cardClasses}>
      {cardContent}
    </Link>
  )
}
