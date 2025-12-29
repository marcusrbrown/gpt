import {useOllamaStatus} from '@/hooks/use-ollama-status'
import {cn, compose, ds, responsive, theme} from '@/lib/design-system'
import {getOllamaProvider} from '@/services/providers/ollama-provider'
import {Button, Chip, Input, Spinner} from '@heroui/react'
import {useMemo, useState} from 'react'

export function OllamaSettings() {
  const {status, models, error, checkNow, isChecking} = useOllamaStatus({
    autoStart: true,
    fetchModels: true,
  })

  // Get initial base URL synchronously from provider
  const initialBaseUrl = useMemo(() => getOllamaProvider().baseUrl, [])
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleBaseUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBaseUrl(e.target.value)
    setSaveStatus('idle')
  }

  const handleSaveUrl = async () => {
    try {
      const provider = getOllamaProvider()
      provider.configure({baseUrl})
      await checkNow()
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (error_: unknown) {
      setSaveStatus('error')
      console.error('Error saving Ollama URL:', error_)
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'success'
      case 'checking':
        return 'warning'
      case 'disconnected':
      case 'cors_error':
        return 'danger'
      default:
        return 'default'
    }
  }

  const getStatusLabel = () => {
    switch (status) {
      case 'connected':
        return 'Connected'
      case 'checking':
        return 'Checking...'
      case 'disconnected':
        return 'Disconnected'
      case 'cors_error':
        return 'CORS Error'
      default:
        return 'Unknown'
    }
  }

  return (
    <div className={cn(compose.card(), theme.surface(1))}>
      <div className="flex justify-between items-center mb-4">
        <h2 className={cn(responsive.heading.large)}>Ollama Settings</h2>
        <Chip
          color={getStatusColor()}
          variant="flat"
          startContent={isChecking ? <Spinner size="sm" color="current" /> : undefined}
          className={cn(ds.text.body.small, 'capitalize')}
        >
          {getStatusLabel()}
        </Chip>
      </div>

      <div className={cn(ds.form.fieldGroup)}>
        <p className={cn(ds.text.body.small, 'mb-2')}>
          Connect to your local Ollama instance to use open-source models like Llama 3, Mistral, and Gemma.
        </p>

        {status === 'connected' && (
          <p className={cn(ds.text.body.small, 'mb-2 text-success-600')}>
            ✓ Connected to Ollama ({models.length} models available)
          </p>
        )}

        {status === 'cors_error' && (
          <div className={cn('p-3 mb-4 rounded-lg bg-danger-50 border border-danger-200')}>
            <p className={cn(ds.text.body.small, 'text-danger-700 font-medium mb-1')}>CORS Configuration Required</p>
            <p className={cn(ds.text.body.small, 'text-danger-600 mb-2')}>
              To enable browser access, set the OLLAMA_ORIGINS environment variable:
            </p>
            <code className={cn('block p-2 rounded bg-white text-danger-800 text-xs font-mono')}>
              OLLAMA_ORIGINS="*" ollama serve
            </code>
          </div>
        )}

        {error && status !== 'cors_error' && (
          <p className={cn(ds.text.body.small, 'mb-2 text-danger-600')}>Error: {error}</p>
        )}

        <div className="flex items-center mb-2">
          <Input
            type="url"
            value={baseUrl}
            onChange={handleBaseUrlChange}
            placeholder="http://localhost:11434"
            className={cn('flex-1 mr-2', ds.focus.ring, ds.animation.transition)}
            description="Base URL for your Ollama instance"
            aria-label="Ollama Base URL"
          />
          <Button
            onPress={() => {
              checkNow().catch(console.error)
            }}
            isLoading={isChecking}
            variant="bordered"
            className={cn('min-w-24 px-3', ds.focus.ring, ds.animation.transition)}
            aria-label="Test connection to Ollama"
          >
            Test
          </Button>
        </div>

        {saveStatus === 'success' && (
          <p className={cn(ds.form.errorText, 'text-success-600 mt-1')}>Settings saved successfully!</p>
        )}

        {saveStatus === 'error' && (
          <p className={cn(ds.form.errorText, 'mt-1')}>Failed to save settings. Please try again.</p>
        )}

        <div className={cn('flex mt-4 space-x-2', ds.form.fieldRow)}>
          <Button
            onPress={() => {
              handleSaveUrl().catch(console.error)
            }}
            color="primary"
            isDisabled={!baseUrl.trim()}
            className={cn(ds.focus.ring, ds.animation.transition)}
            aria-label="Save Ollama settings"
          >
            Save Settings
          </Button>
        </div>

        {status === 'connected' && models.length > 0 && (
          <div className="mt-4">
            <h3 className={cn(ds.text.heading.h4, 'mb-2')}>Available Models</h3>
            <div className="flex flex-wrap gap-2">
              {models.map(model => (
                <Chip key={model.name} variant="flat" size="sm" className="bg-default-100">
                  {model.name}
                </Chip>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={cn('mt-4 pt-4', 'border-t', theme.border())}>
        <h3 className={cn(ds.text.heading.h4, 'mb-2')}>About Ollama</h3>
        <p className={cn(ds.text.body.small)}>
          Ollama allows you to run large language models locally. It's fast, private, and free. Visit{' '}
          <a
            href="https://ollama.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            ollama.com
          </a>{' '}
          to download and get started.
        </p>
      </div>
    </div>
  )
}
