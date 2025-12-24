import {Spinner} from '@heroui/react'
import {lazy, Suspense} from 'react'
import {Route, Routes, useLocation} from 'react-router-dom'
import {Footer} from './components/footer'
import {Navbar} from './components/navbar'
import {cn, ds} from './lib/design-system'
import {GPTEditorPage} from './pages/gpt-editor-page'
import {GPTTestPage} from './pages/gpt-test-page'
import {HomePage} from './pages/home-page'
import {Providers} from './providers'

// Lazy load documentation components for better initial load performance
const DocLayout = lazy(async () => import('@/components/docs/doc-layout').then(m => ({default: m.DocLayout})))
const DocsSidebar = lazy(async () => import('@/components/docs/docs-sidebar').then(m => ({default: m.DocsSidebar})))
const DocsIndex = lazy(async () => import('@/components/docs/docs-index').then(m => ({default: m.DocsIndex})))
const GettingStarted = lazy(async () =>
  import('@/components/docs/getting-started').then(m => ({default: m.GettingStarted})),
)
const AgentTutorial = lazy(async () =>
  import('@/components/docs/agent-tutorial').then(m => ({default: m.AgentTutorial})),
)
const ApiReference = lazy(async () => import('@/components/docs/api-reference').then(m => ({default: m.ApiReference})))

function App() {
  const location = useLocation()

  return (
    <Providers>
      <div className="relative flex flex-col min-h-screen">
        <Navbar />
        <div className="grow">
          {/* Key by pathname to trigger page transition animations on route changes */}
          <Routes key={location.pathname}>
            {/* Home page */}
            <Route path="/" element={<HomePage />} />

            {/* GPT Editor routes */}
            <Route
              path="/gpt/new"
              element={
                <main className={cn('h-[calc(100vh-var(--header-height))]', ds.animation.slideIn)}>
                  <GPTEditorPage />
                </main>
              }
            />
            <Route
              path="/gpt/edit/:gptId"
              element={
                <main className={cn('h-[calc(100vh-var(--header-height))]', ds.animation.slideIn)}>
                  <GPTEditorPage />
                </main>
              }
            />

            {/* GPT Test route */}
            <Route
              path="/gpt/test/:gptId"
              element={
                <div className={ds.animation.slideIn}>
                  <GPTTestPage />
                </div>
              }
            />

            {/* Documentation routes */}
            <Route
              path="/docs/*"
              element={
                <Suspense
                  fallback={
                    <div className="grow flex items-center justify-center">
                      <Spinner size="lg" color="primary" />
                    </div>
                  }
                >
                  <div className={ds.animation.fadeIn}>
                    <DocLayout sidebar={<DocsSidebar />}>
                      <Routes>
                        <Route index element={<DocsIndex />} />
                        <Route path="getting-started" element={<GettingStarted />} />
                        <Route path="api" element={<ApiReference />} />
                        <Route path="tutorials/first-agent" element={<AgentTutorial />} />
                        {/* Add more doc routes as needed */}
                      </Routes>
                    </DocLayout>
                  </div>
                </Suspense>
              }
            />
          </Routes>
        </div>
        <Footer />
      </div>
    </Providers>
  )
}

export default App
