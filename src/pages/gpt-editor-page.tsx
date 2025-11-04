import type {GPTConfiguration} from '../types/gpt'
import {Button} from '@heroui/react'
import {Play} from 'lucide-react'
import {useEffect, useState} from 'react'
import {useNavigate, useParams} from 'react-router-dom'
import {v4 as uuidv4} from 'uuid'
import {GPTEditor} from '../components/gpt-editor'
import {GPTTestPane} from '../components/gpt-test-pane'
import {APISettings} from '../components/settings/api-settings'
import {useOpenAI} from '../contexts/openai-provider'
import {useStorage} from '../hooks/use-storage'
import {cn, ds, theme} from '../lib/design-system'

export function GPTEditorPage() {
  const {gptId} = useParams()
  const navigate = useNavigate()
  const storage = useStorage()
  const [gptConfig, setGptConfig] = useState<GPTConfiguration | undefined>(undefined)
  const {apiKey, isInitialized} = useOpenAI()
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    if (gptId) {
      const savedGpt = storage.getGPT(gptId)
      if (savedGpt) {
        // Defer state update to avoid synchronous setState inside effect
        queueMicrotask(() => setGptConfig(savedGpt))
      } else {
        // Create a default configuration if the gptId is not found
        const defaultGpt: GPTConfiguration = {
          id: gptId,
          name: 'New GPT',
          description: '',
          systemPrompt: '',
          tools: [],
          knowledge: {
            files: [],
            urls: [],
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
        }
        // Defer state update to avoid synchronous setState inside effect
        queueMicrotask(() => setGptConfig(defaultGpt))
      }
    } else {
      // Create a new GPT configuration
      const newGpt: GPTConfiguration = {
        id: uuidv4(),
        name: 'New GPT',
        description: '',
        systemPrompt: 'You are a helpful assistant.',
        tools: [],
        knowledge: {
          files: [],
          urls: [],
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
      }
      // Defer state update to avoid synchronous setState inside effect
      queueMicrotask(() => setGptConfig(newGpt))
    }
  }, [gptId, storage])

  const handleSaveGpt = (updatedGpt: GPTConfiguration) => {
    const gptWithUpdatedTimestamp = {
      ...updatedGpt,
      updatedAt: new Date(),
    }
    storage.saveGPT(gptWithUpdatedTimestamp)
    setGptConfig(gptWithUpdatedTimestamp)
  }

  const handleTestGpt = () => {
    if (gptConfig) {
      navigate(`/gpt/test/${gptConfig.id}`) as void
    }
  }

  const toggleSettings = () => {
    setShowSettings(!showSettings)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height))]">
      {/* Page Header */}
      <div className={cn('flex-none p-6 border-b', theme.surface(1), theme.border())}>
        <div className="flex justify-between items-center mb-4">
          <h1 className={cn(ds.text.heading.h2)}>{gptConfig?.name || 'New GPT'}</h1>
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
        <div className="flex">
          <Button
            variant="light"
            color="primary"
            size="sm"
            onPress={toggleSettings}
            className={cn(ds.animation.transition)}
          >
            {showSettings ? 'Hide API Settings' : 'Show API Settings'}
          </Button>
        </div>
        {showSettings && (
          <div className={cn('mt-4 p-4 rounded-lg border', theme.surface(0), theme.border())}>
            <APISettings />
          </div>
        )}
      </div>

      {/* Split Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor Panel - 60% width */}
        <div className={cn('w-3/5 overflow-auto p-6 border-r', theme.surface(0), theme.border())}>
          {gptConfig ? <GPTEditor gptId={gptConfig.id} onSave={handleSaveGpt} /> : null}
        </div>

        {/* Test Panel - 40% width */}
        <div className={cn('w-2/5 overflow-auto', theme.surface(0))}>
          {!apiKey && isInitialized ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div
                className={cn(
                  'p-8 rounded-xl border-2 shadow-sm',
                  'bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-950 dark:to-primary-900',
                  'border-primary-200 dark:border-primary-800',
                )}
              >
                <p className={cn(ds.text.body.large, 'text-content-primary mb-6 font-medium')}>
                  To test your GPT, please set your OpenAI API key in the settings.
                </p>
                <Button
                  color="primary"
                  variant="solid"
                  size="lg"
                  onPress={toggleSettings}
                  className={cn('flex items-center', ds.animation.transition, 'shadow-md')}
                >
                  Open API Settings
                </Button>
              </div>
            </div>
          ) : (
            <GPTTestPane gptConfig={gptConfig} apiKey={apiKey || undefined} />
          )}
        </div>
      </div>
    </div>
  )
}
