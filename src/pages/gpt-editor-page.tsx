import type {GPTConfiguration} from '@/types/gpt'
import {GPTEditor} from '@/components/gpt-editor'
import {GPTTestPane} from '@/components/gpt-test-pane'
import {useAIProvider} from '@/hooks/use-ai-provider'
import {useStorage} from '@/hooks/use-storage'
import {cn, ds, theme} from '@/lib/design-system'
import {Button, Link} from '@heroui/react'
import {Play, Settings} from 'lucide-react'
import {useEffect, useState} from 'react'
import {Link as RouterLink, useNavigate, useParams} from 'react-router-dom'
import {v4 as uuidv4} from 'uuid'

export function GPTEditorPage() {
  const {gptId} = useParams()
  const navigate = useNavigate()
  const storage = useStorage()
  const [gptConfig, setGptConfig] = useState<GPTConfiguration | undefined>(undefined)
  const {providers, isLoading} = useAIProvider()

  const openAIConfig = providers.find(p => p.id === 'openai')
  const isConfigured = openAIConfig?.isConfigured ?? false

  useEffect(() => {
    const loadGpt = async () => {
      if (gptId) {
        const savedGpt = await storage.getGPT(gptId)
        if (savedGpt) {
          queueMicrotask(() => setGptConfig(savedGpt))
        } else {
          const defaultGpt: GPTConfiguration = {
            id: gptId,
            name: 'New GPT',
            description: '',
            systemPrompt: '',
            tools: [],
            knowledge: {
              files: [],
              urls: [],
              extractionMode: 'manual' as const,
            },
            capabilities: {
              codeInterpreter: false,
              webBrowsing: false,
              imageGeneration: false,
              fileSearch: {
                enabled: false,
              },
            },
            createdAt: new Date(),
            updatedAt: new Date(),
            version: 1,
            tags: [],
            isArchived: false,
            folderId: null,
            archivedAt: null,
          }
          queueMicrotask(() => setGptConfig(defaultGpt))
        }
      } else {
        const newGpt: GPTConfiguration = {
          id: uuidv4(),
          name: 'New GPT',
          description: '',
          systemPrompt: 'You are a helpful assistant.',
          tools: [],
          knowledge: {
            files: [],
            urls: [],
            extractionMode: 'manual' as const,
          },
          capabilities: {
            codeInterpreter: false,
            webBrowsing: false,
            imageGeneration: false,
            fileSearch: {
              enabled: false,
            },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
          tags: [],
          isArchived: false,
          folderId: null,
          archivedAt: null,
        }
        queueMicrotask(() => setGptConfig(newGpt))
      }
    }
    loadGpt().catch(console.error)
  }, [gptId, storage])

  const handleSaveGpt = async (updatedGpt: GPTConfiguration) => {
    const gptWithUpdatedTimestamp = {
      ...updatedGpt,
      updatedAt: new Date(),
    }
    await storage.saveGPT(gptWithUpdatedTimestamp)
    setGptConfig(gptWithUpdatedTimestamp)
  }

  const handleTestGpt = () => {
    if (gptConfig) {
      const result = navigate(`/gpt/test/${gptConfig.id}`)
      if (result instanceof Promise) {
        result.catch(console.error)
      }
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height))]">
      {/* Page Header */}
      <div className={cn('flex-none p-6 border-b', theme.surface(1), theme.border())}>
        <div className="flex justify-between items-center">
          <h1 className={cn(ds.text.heading.h2)}>{gptConfig?.name || 'New GPT'}</h1>
          <div className="flex items-center gap-3">
            <Link
              as={RouterLink}
              to="/settings"
              className={cn(
                'flex items-center gap-2 text-content-secondary hover:text-content-primary',
                ds.animation.transition,
              )}
            >
              <Settings size={18} />
              <span className="text-sm">Settings</span>
            </Link>
            {gptConfig && (
              <Button
                color="primary"
                size="lg"
                startContent={<Play size={18} />}
                onPress={handleTestGpt}
                className="flex items-center shadow-sm"
              >
                Test GPT
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Split Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor Panel - 60% width */}
        <div className={cn('w-3/5 overflow-auto p-6 border-r', theme.surface(0), theme.border())}>
          {gptConfig ? (
            <GPTEditor
              gptId={gptConfig.id}
              onSave={gpt => {
                handleSaveGpt(gpt).catch(console.error)
              }}
            />
          ) : null}
        </div>

        {/* Test Panel - 40% width */}
        <div className={cn('w-2/5 overflow-auto', theme.surface(0))}>
          {!isConfigured && !isLoading ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div
                className={cn(
                  'p-8 rounded-xl border-2 shadow-sm',
                  'bg-linear-to-br from-primary-50 to-primary-100 dark:from-primary-950 dark:to-primary-900',
                  'border-primary-200 dark:border-primary-800',
                )}
              >
                <p className={cn(ds.text.body.large, 'text-content-primary mb-6 font-medium')}>
                  To test your GPT, please configure an AI provider in settings.
                </p>
                <Button
                  as={RouterLink}
                  to="/settings"
                  color="primary"
                  variant="solid"
                  size="lg"
                  startContent={<Settings size={18} />}
                  className={cn('flex items-center', ds.animation.transition, 'shadow-md')}
                >
                  Open Settings
                </Button>
              </div>
            </div>
          ) : (
            <GPTTestPane gptConfig={gptConfig} />
          )}
        </div>
      </div>
    </div>
  )
}
