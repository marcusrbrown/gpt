import {Spinner} from '@heroui/react'
import {lazy, Suspense} from 'react'
import {Route, Routes} from 'react-router-dom'
import {CardGroup} from './components/card-group'
import {Footer} from './components/footer'
import {Navbar} from './components/navbar'
import {OpenAIProvider} from './contexts/openai-provider'
import {StorageProvider} from './contexts/storage-provider'
import {cn, ds, responsive, theme} from './lib/design-system'
import {GPTEditorPage} from './pages/gpt-editor-page'
import {GPTTestPage} from './pages/gpt-test-page'
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
  return (
    <OpenAIProvider>
      <StorageProvider>
        <Providers>
          <div className="relative flex flex-col min-h-screen">
            <Navbar />
            <div className="flex-grow pt-[var(--header-height)]">
              <Routes>
                {/* Home page */}
                <Route
                  path="/"
                  element={
                    <main className="container mx-auto px-12 py-8">
                      <div className="text-center py-12 mb-8">
                        <h1 className={`${responsive.heading.responsive} mb-4 bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent`}>
                          Custom GPTs
                        </h1>
                        <p className={cn(ds.text.body.large, theme.content('secondary'))}>
                          Build, test, and deploy your AI agents with complete data sovereignty
                        </p>
                      </div>
                      <CardGroup />
                    </main>
                  }
                />

                {/* GPT Editor routes */}
                <Route
                  path="/gpt/new"
                  element={
                    <main className="h-[calc(100vh-var(--header-height))]">
                      <GPTEditorPage />
                    </main>
                  }
                />
                <Route
                  path="/gpt/edit/:gptId"
                  element={
                    <main className="h-[calc(100vh-var(--header-height))]">
                      <GPTEditorPage />
                    </main>
                  }
                />

                {/* GPT Test route */}
                <Route path="/gpt/test/:gptId" element={<GPTTestPage />} />

                {/* Documentation routes */}
                <Route
                  path="/docs/*"
                  element={
                    <Suspense
                      fallback={
                        <div className="flex-grow flex items-center justify-center">
                          <Spinner size="lg" color="primary" />
                        </div>
                      }
                    >
                      <DocLayout sidebar={<DocsSidebar />}>
                        <Routes>
                          <Route index element={<DocsIndex />} />
                          <Route path="getting-started" element={<GettingStarted />} />
                          <Route path="api" element={<ApiReference />} />
                          <Route path="tutorials/first-agent" element={<AgentTutorial />} />
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
    </OpenAIProvider>
  )
}

export default App
