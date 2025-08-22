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
import {cn, ds} from '../lib/design-system'
import {type GPTConfiguration} from '../types/gpt'

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
        setGptConfig(savedGpt)
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
        setGptConfig(defaultGpt)
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
      setGptConfig(newGpt)
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
      navigate(`/gpt/test/${gptConfig.id}`)
    }
  }

  const toggleSettings = () => {
    setShowSettings(!showSettings)
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-none p-4 bg-gray-100 border-b">
        <div className="flex justify-between items-center">
          <h1 className={cn(ds.text.heading.h2)}>{gptConfig?.name || 'New GPT'}</h1>
          {gptConfig && (
            <Button color="primary" startContent={<Play size={16} />} onPress={handleTestGpt}>
              Test GPT
            </Button>
          )}
        </div>
        <div className="flex mt-2">
          <button
            type="button"
            onClick={toggleSettings}
            className={cn(ds.text.body.small, 'text-primary-600 hover:underline')}
          >
            {showSettings ? 'Hide API Settings' : 'Show API Settings'}
          </button>
        </div>
        {showSettings && (
          <div className="mt-4">
            <APISettings />
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Editor Panel - 60% width */}
        <div className="w-3/5 overflow-auto p-4 border-r">
          {gptConfig ? <GPTEditor gptId={gptConfig.id} onSave={handleSaveGpt} /> : null}
        </div>

        {/* Test Panel - 40% width */}
        <div className="w-2/5 overflow-auto">
          {!apiKey && isInitialized ? (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
              <p className={cn(ds.text.body.base, 'text-content-secondary mb-4')}>
                To test your GPT, please set your OpenAI API key in the settings.
              </p>
              <button
                type="button"
                onClick={toggleSettings}
                className={cn('px-4 py-2 rounded transition-colors', 'bg-primary-600 hover:bg-primary-700 text-white')}
              >
                Open API Settings
              </button>
            </div>
          ) : (
            <GPTTestPane gptConfig={gptConfig} apiKey={apiKey || undefined} />
          )}
        </div>
      </div>
    </div>
  )
}
