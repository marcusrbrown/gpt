import {cn, ds, responsive} from '@/lib/design-system'
import {Link} from 'react-router-dom'

interface DocSection {
  title: string
  description: string
  path: string
}

const SECTIONS: DocSection[] = [
  {
    title: 'Getting Started',
    description: 'Learn the basics of working with GPT agents and get your development environment set up.',
    path: '/docs/getting-started',
  },
  {
    title: 'Interactive Tutorials',
    description: 'Hands-on tutorials with live code execution to help you learn by doing.',
    path: '/docs/tutorials',
  },
  {
    title: 'API Reference',
    description: 'Detailed documentation of the GPT agent framework API.',
    path: '/docs/api',
  },
  {
    title: 'Research Papers',
    description: 'Academic papers and research findings related to our agent architecture.',
    path: '/docs/research',
  },
]

export function DocsIndex() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className={responsive.heading.responsive}>GPT Agent Documentation</h1>
      <p className="text-content-secondary text-lg sm:text-xl lg:text-2xl mb-12">
        Comprehensive documentation for building, understanding, and extending GPT agents.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {SECTIONS.map(section => (
          <Link key={section.path} to={section.path} className="card-link group">
            <h2 className={cn(responsive.heading.large, 'mb-2')}>{section.title}</h2>
            <p className={cn(ds.text.body.base, 'text-content-secondary mb-4')}>{section.description}</p>
            <span className="text-primary text-sm font-medium group-hover:text-primary-600">Learn more →</span>
          </Link>
        ))}
      </div>

      <div className="mt-12 p-6 rounded-lg bg-[var(--background-tertiary)] border border-[var(--border-color)]">
        <h2 className="text-2xl font-semibold mb-4">Latest Updates</h2>
        <ul className="space-y-3">
          <li className="flex items-center gap-2">
            <span className="text-primary">●</span>
            <span className="text-content-secondary">
              New interactive notebook feature for live code experimentation
            </span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-primary">●</span>
            <span className="text-content-secondary">Added research paper integration with code examples</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-primary">●</span>
            <span className="text-content-secondary">Improved API documentation with real-world use cases</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
