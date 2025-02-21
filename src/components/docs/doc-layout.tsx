import {type ReactNode, useState} from 'react';
import {Link} from 'react-router-dom';
import {Menu, X} from 'lucide-react';

interface DocLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
}

export function DocLayout({children, sidebar}: DocLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className='flex min-h-screen bg-white dark:bg-gray-900'>
      {/* Mobile sidebar backdrop */}
      {isSidebarOpen && (
        <div
          className='fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden'
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden='true'
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-[64px] bottom-0 left-0 z-50 w-[280px] border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 lg:static lg:top-0 transform transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <nav className='h-full py-6 px-4 overflow-y-auto'>
          <div className='mb-8 flex items-center justify-between lg:justify-start'>
            <Link to='/' className='text-2xl font-bold text-gray-900 dark:text-white'>
              GPT Docs
            </Link>
            <button onClick={() => setIsSidebarOpen(false)} className='p-2 -mr-2 lg:hidden' aria-label='Close sidebar'>
              <X size={20} className='text-gray-500' />
            </button>
          </div>
          {sidebar}
        </nav>
      </aside>

      {/* Main content */}
      <main className='flex-1 overflow-auto'>
        <div className='sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-4 lg:hidden'>
          <button onClick={() => setIsSidebarOpen(true)} className='p-2 -ml-2' aria-label='Open sidebar'>
            <Menu size={20} className='text-gray-500' />
          </button>
          <h1 className='text-lg font-semibold'>GPT Docs</h1>
        </div>
        <div className='container mx-auto px-4 py-6 lg:px-8'>{children}</div>
      </main>
    </div>
  );
}
