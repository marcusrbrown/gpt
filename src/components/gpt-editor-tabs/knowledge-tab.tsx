import type {GPTConfiguration, LocalFile} from '@/types/gpt'
import type {
  CachedURLDB,
  CreateSnippetInput,
  KnowledgeFileDB,
  KnowledgeSummary,
  SearchResult,
  TextSnippetDB,
  UpdateSnippetInput,
} from '@/types/knowledge'
import {KnowledgeConfiguration} from '@/components/knowledge-configuration'
import {responsive} from '@/lib/design-system'
import {VectorKnowledge} from './vector-knowledge'

interface KnowledgeTabProps {
  gpt: GPTConfiguration
  gptId?: string
  enrichedFiles: (LocalFile & {
    id?: string
    extractionStatus: string
    extractionError?: string
  })[]
  knowledgeFiles: KnowledgeFileDB[]
  cachedUrls: CachedURLDB[]
  snippets: TextSnippetDB[]
  knowledgeSummary: KnowledgeSummary
  errors: Record<string, any>
  // Handlers
  onUpdate: (updates: Partial<GPTConfiguration>) => void
  onExtractFile: (fileId: string) => Promise<void>
  onExtractAllPending: () => Promise<void>
  onCacheUrl: (url: string) => Promise<void>
  onRefreshCachedUrl: (urlId: string) => Promise<void>
  onRemoveCachedUrl: (urlId: string) => Promise<void>
  onCreateSnippet: (input: CreateSnippetInput) => Promise<void>
  onUpdateSnippet: (id: string, input: UpdateSnippetInput) => Promise<void>
  onDeleteSnippet: (id: string) => Promise<void>
  onSearch: (query: string) => Promise<SearchResult[]>
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  onRemoveFile: (index: number) => void
  onAddUrl: () => void
  onRemoveUrl: (index: number) => void
  onUrlChange: (index: number, value: string) => void
  onCreateVectorStore: (name: string, fileIds: string[]) => void
  onDeleteVectorStore: (id: string) => void
}

export function KnowledgeTab({
  gpt,
  gptId,
  enrichedFiles,
  cachedUrls,
  snippets,
  knowledgeSummary,
  errors,
  onUpdate,
  onExtractFile,
  onExtractAllPending,
  onCacheUrl,
  onRefreshCachedUrl,
  onRemoveCachedUrl,
  onCreateSnippet,
  onUpdateSnippet,
  onDeleteSnippet,
  onSearch,
  onFileUpload,
  onRemoveFile,
  onAddUrl,
  onRemoveUrl,
  onUrlChange,
  onCreateVectorStore,
  onDeleteVectorStore,
}: KnowledgeTabProps) {
  const handleExtractionModeChange = (mode: 'manual' | 'auto') => {
    onUpdate({
      knowledge: {
        ...gpt.knowledge,
        extractionMode: mode,
      },
    })
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto p-4">
      <div>
        <h2 className={responsive.heading.medium}>Knowledge Sources</h2>
        <KnowledgeConfiguration
          gptId={gptId ?? ''}
          files={enrichedFiles}
          urls={gpt.knowledge.urls}
          errors={{knowledge: {urls: errors.knowledge?.urls || {}}}}
          extractionMode={gpt.knowledge.extractionMode}
          onExtractionModeChange={handleExtractionModeChange}
          onExtractFile={onExtractFile}
          onExtractAllPending={onExtractAllPending}
          cachedUrls={cachedUrls}
          onCacheUrl={onCacheUrl}
          onRefreshCachedUrl={onRefreshCachedUrl}
          onRemoveCachedUrl={onRemoveCachedUrl}
          snippets={snippets}
          onCreateSnippet={onCreateSnippet}
          onUpdateSnippet={onUpdateSnippet}
          onDeleteSnippet={onDeleteSnippet}
          onSearch={onSearch}
          summary={knowledgeSummary}
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          onFileUpload={onFileUpload}
          onRemoveFile={onRemoveFile}
          onAddUrl={onAddUrl}
          onRemoveUrl={onRemoveUrl}
          onUrlChange={onUrlChange}
        />
      </div>

      <div className="pt-8 border-t border-default-200">
        <VectorKnowledge
          files={gpt.knowledge.files}
          vectorStores={gpt.knowledge.vectorStores || []}
          onCreateVectorStore={onCreateVectorStore}
          onDeleteVectorStore={onDeleteVectorStore}
        />
      </div>
    </div>
  )
}
