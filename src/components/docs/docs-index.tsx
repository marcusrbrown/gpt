import {Link} from 'react-router-dom';

interface DocSection {
  title: string;
  description: string;
  path: string;
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
];

export function DocsIndex() {
  return (
    <div className='max-w-4xl mx-auto py-12'>
      <h1 className='text-4xl font-bold mb-8'>GPT Agent Documentation</h1>
      <p className='text-xl text-gray-600 dark:text-gray-300 mb-12'>
        Comprehensive documentation for building, understanding, and extending GPT agents.
      </p>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {SECTIONS.map((section) => (
          <Link
            key={section.path}
            to={section.path}
            className='block p-6 border rounded-lg hover:border-blue-500 transition-colors'
          >
            <h2 className='text-2xl font-semibold mb-2'>{section.title}</h2>
            <p className='text-gray-600 dark:text-gray-300'>{section.description}</p>
          </Link>
        ))}
      </div>

      <div className='mt-12 p-6 bg-blue-50 dark:bg-blue-900 rounded-lg'>
        <h2 className='text-2xl font-semibold mb-4'>Latest Updates</h2>
        <ul className='space-y-2'>
          <li className='flex items-center gap-2'>
            <span className='text-blue-500'>●</span>
            <span>New interactive notebook feature for live code experimentation</span>
          </li>
          <li className='flex items-center gap-2'>
            <span className='text-blue-500'>●</span>
            <span>Added research paper integration with code examples</span>
          </li>
          <li className='flex items-center gap-2'>
            <span className='text-blue-500'>●</span>
            <span>Improved API documentation with real-world use cases</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
