import {Providers} from './providers';
import {Routes, Route} from 'react-router-dom';
import {lazy, Suspense} from 'react';
import {StorageProvider} from './contexts/storage-provider';
import {GPTEditor} from './components/gpt-editor';
import {Navbar} from './components/navbar';
import {Footer} from './components/footer';
import {CardGroup} from './components/card-group';

// Lazy load documentation components for better initial load performance
const DocLayout = lazy(() => import('@/components/docs/doc-layout').then((m) => ({default: m.DocLayout})));
const DocsSidebar = lazy(() => import('@/components/docs/docs-sidebar').then((m) => ({default: m.DocsSidebar})));
const DocsIndex = lazy(() => import('@/components/docs/docs-index').then((m) => ({default: m.DocsIndex})));
const GettingStarted = lazy(() =>
  import('@/components/docs/getting-started').then((m) => ({default: m.GettingStarted})),
);
const AgentTutorial = lazy(() => import('@/components/docs/agent-tutorial').then((m) => ({default: m.AgentTutorial})));
const ApiReference = lazy(() => import('@/components/docs/api-reference').then((m) => ({default: m.ApiReference})));

function App() {
  return (
    <StorageProvider>
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

              {/* GPT Editor routes */}
              <Route
                path='/gpt/new'
                element={
                  <main className='container mx-auto px-12'>
                    <h1 className='text-3xl font-bold py-8'>Create New GPT</h1>
                    <div className='bg-white rounded-lg shadow p-6'>
                      <GPTEditor />
                    </div>
                  </main>
                }
              />
              <Route
                path='/gpt/edit/:id'
                element={
                  <main className='container mx-auto px-12'>
                    <h1 className='text-3xl font-bold py-8'>Edit GPT</h1>
                    <div className='bg-white rounded-lg shadow p-6'>
                      <GPTEditor />
                    </div>
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
    </StorageProvider>
  );
}

export default App;
