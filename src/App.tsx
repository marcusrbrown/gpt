import {CardGroup} from '@/components/card-group';
import {Footer} from '@/components/footer';
import {Navbar} from '@/components/navbar';
import {Providers} from './providers';
import {Routes, Route} from 'react-router-dom';
import {DocLayout} from '@/components/docs/doc-layout';
import {DocsIndex} from '@/components/docs/docs-index';
import {AgentTutorial} from '@/components/docs/agent-tutorial';
import {GettingStarted} from '@/components/docs/getting-started';
import {ApiReference} from '@/components/docs/api-reference';
import {lazy, Suspense} from 'react';

// Lazy load documentation components for better initial load performance
const DocsSidebar = lazy(() => import('@/components/docs/docs-sidebar').then((m) => ({default: m.DocsSidebar})));

function App() {
  return (
    <Providers>
      <div className='relative flex flex-col min-h-screen'>
        <Navbar />
        <div className='flex-grow pt-[var(--header-height)]'>
          <Routes>
            {/* Home page */}
            <Route
              path='/'
              element={
                <main className='container mx-auto px-12'>
                  <h1 className='text-3xl text-center font-bold py-20'>Custom GPTs</h1>
                  <CardGroup />
                </main>
              }
            />

            {/* Documentation routes */}
            <Route
              path='/docs/*'
              element={
                <Suspense fallback={<div className='flex-grow flex items-center justify-center'>Loading...</div>}>
                  <DocLayout sidebar={<DocsSidebar />}>
                    <Routes>
                      <Route index element={<DocsIndex />} />
                      <Route path='getting-started' element={<GettingStarted />} />
                      <Route path='api' element={<ApiReference />} />
                      <Route path='tutorials/first-agent' element={<AgentTutorial />} />
                      {/* Add more doc routes as needed */}
                    </Routes>
                  </DocLayout>
                </Suspense>
              }
            />
          </Routes>
        </div>
        <Footer />
      </div>
    </Providers>
  );
}

export default App;
