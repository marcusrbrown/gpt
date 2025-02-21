import {NavLink} from 'react-router-dom';
import {useState, useCallback} from 'react';
import {ChevronDown} from 'lucide-react';

interface NavItem {
  title: string;
  path: string;
  items?: NavItem[];
}

const NAV_ITEMS: NavItem[] = [
  {
    title: 'Getting Started',
    path: '/docs/getting-started',
    items: [
      {title: 'Introduction', path: '/docs/getting-started'},
      {title: 'Installation', path: '/docs/getting-started/installation'},
      {title: 'Quick Start', path: '/docs/getting-started/quick-start'},
    ],
  },
  {
    title: 'Tutorials',
    path: '/docs/tutorials',
    items: [
      {title: 'Your First Agent', path: '/docs/tutorials/first-agent'},
      {title: 'Advanced Agents', path: '/docs/tutorials/advanced-agents'},
      {title: 'Custom Capabilities', path: '/docs/tutorials/custom-capabilities'},
    ],
  },
  {
    title: 'API Reference',
    path: '/docs/api',
    items: [
      {title: 'Core API', path: '/docs/api/core'},
      {title: 'Agent Types', path: '/docs/api/types'},
      {title: 'Utilities', path: '/docs/api/utils'},
    ],
  },
  {
    title: 'Research',
    path: '/docs/research',
    items: [
      {title: 'Papers', path: '/docs/research/papers'},
      {title: 'Experiments', path: '/docs/research/experiments'},
      {title: 'Contribute', path: '/docs/research/contribute'},
    ],
  },
];

function NavItemComponent({item}: {item: NavItem}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = useCallback(
    (e: React.MouseEvent) => {
      if (item.items) {
        e.preventDefault();
        setIsExpanded((prev) => !prev);
      }
    },
    [item.items],
  );

  return (
    <div>
      <div className='flex items-center'>
        <NavLink
          to={item.path}
          className={({isActive}) =>
            `flex-1 block py-2 px-4 text-sm transition-colors ${
              isActive ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'text-gray-600 dark:text-gray-300'
            }`
          }
          onClick={toggleExpand}
        >
          <div className='flex items-center justify-between'>
            <span>{item.title}</span>
            {item.items && (
              <ChevronDown size={16} className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            )}
          </div>
        </NavLink>
      </div>
      {item.items && (
        <div
          className={`ml-4 border-l border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-200 ${
            isExpanded ? 'max-h-96' : 'max-h-0'
          }`}
        >
          {item.items.map((subItem) => (
            <NavLink
              key={subItem.path}
              to={subItem.path}
              className={({isActive}) =>
                `block py-1 px-4 text-sm transition-colors ${
                  isActive ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'
                }`
              }
            >
              {subItem.title}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export function DocsSidebar() {
  return (
    <nav className='py-4 space-y-2' role='navigation' aria-label='Documentation navigation'>
      {NAV_ITEMS.map((item) => (
        <NavItemComponent key={item.path} item={item} />
      ))}
    </nav>
  );
}
