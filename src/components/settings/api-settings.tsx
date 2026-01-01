import {useAIProvider} from '@/hooks/use-ai-provider'
import {useSession} from '@/hooks/use-session'
import {cn, compose, ds, responsive, theme} from '@/lib/design-system'
import {addToast, Button, Input} from '@heroui/react'
import {XCircle} from 'lucide-react'
import {useState} from 'react'

export function APISettings() {
  const {setSecret, deleteSecret, getSecret} = useSession()
  const {validateProvider, providers} = useAIProvider()
  const [inputKey, setInputKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)

  const openAIConfig = providers.find(p => p.id === 'openai')
  const isConfigured = openAIConfig?.isConfigured ?? false

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputKey(e.target.value)
  }

  const handleSaveKey = async () => {
    try {
      await setSecret('openai', inputKey)
      const result = await validateProvider('openai', inputKey)
      if (result.valid) {
        addToast({
          title: 'API Key Saved',
          description: 'Your OpenAI API key has been saved and validated.',
          color: 'success',
          timeout: 4000,
        })
      } else {
        addToast({
          title: 'Validation Failed',
          description: 'The API key could not be validated. Please check and try again.',
          color: 'danger',
          icon: <XCircle size={20} />,
          timeout: 5000,
        })
      }
    } catch (error_: unknown) {
      addToast({
        title: 'Error',
        description: 'Failed to save API key. Please try again.',
        color: 'danger',
        icon: <XCircle size={20} />,
        timeout: 5000,
      })
      console.error('Error saving API key:', error_)
    }
  }

  const handleClearKey = async () => {
    try {
      await deleteSecret('openai')
      setInputKey('')
      addToast({
        title: 'API Key Cleared',
        description: 'Your OpenAI API key has been removed.',
        color: 'success',
        timeout: 4000,
      })
    } catch (error_: unknown) {
      addToast({
        title: 'Error',
        description: 'Failed to clear API key. Please try again.',
        color: 'danger',
        icon: <XCircle size={20} />,
        timeout: 5000,
      })
      console.error('Error clearing API key:', error_)
    }
  }

  const toggleShowApiKey = () => {
    setShowApiKey(!showApiKey)
  }

  const loadCurrentKey = async () => {
    const key = await getSecret('openai')
    if (key) {
      setInputKey(key)
    }
  }

  return (
    <div className={cn(compose.card(), theme.surface(1))}>
      <h2 className={cn(responsive.heading.large, 'mb-4')}>OpenAI API Settings</h2>

      <div className={cn(ds.form.fieldGroup)}>
        <p className={cn(ds.text.body.small, 'mb-2')}>
          Enter your OpenAI API key to use the GPT Test functionality. Your API key is stored locally in your browser
          and never sent to our servers.
        </p>

        {isConfigured && (
          <p className={cn(ds.text.body.small, 'mb-2 text-success-600')}>✓ API key is configured and validated</p>
        )}

        <div className="flex items-center mb-2">
          <Input
            type={showApiKey ? 'text' : 'password'}
            value={inputKey}
            onChange={handleInputChange}
            onFocus={() => {
              if (!inputKey && isConfigured) {
                loadCurrentKey().catch(console.error)
              }
            }}
            placeholder="sk-..."
            className={cn('flex-1 mr-2', ds.focus.ring, ds.animation.transition)}
            description="Your OpenAI API key for testing GPT configurations"
            aria-label="Enter your OpenAI API key"
            classNames={{
              description: 'text-content-secondary',
            }}
          />
          <Button
            onPress={toggleShowApiKey}
            variant="bordered"
            className={cn('min-w-20 px-3', ds.focus.ring, ds.animation.transition)}
            aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
          >
            {showApiKey ? 'Hide' : 'Show'}
          </Button>
        </div>

        <div className={cn('flex mt-4 space-x-2', ds.form.fieldRow)}>
          <Button
            onPress={() => {
              handleSaveKey().catch(console.error)
            }}
            color="primary"
            isDisabled={!inputKey.trim()}
            className={cn(ds.focus.ring, ds.animation.transition)}
            aria-label="Save API key to local storage"
          >
            Save API Key
          </Button>

          <Button
            onPress={() => {
              handleClearKey().catch(console.error)
            }}
            variant="bordered"
            color="danger"
            isDisabled={!isConfigured}
            className={cn(ds.focus.ring, ds.animation.transition)}
            aria-label="Clear saved API key from local storage"
          >
            Clear API Key
          </Button>
        </div>
      </div>

      <div className={cn('mt-4 pt-4', 'border-t', theme.border())}>
        <h3 className={cn(ds.text.heading.h4, 'mb-2')}>Using Your API Key</h3>
        <p className={cn(ds.text.body.small)}>
          Your OpenAI API key is used to access the Assistants API for testing your GPT configurations. Usage will be
          billed to your OpenAI account based on your API usage.
        </p>
      </div>
    </div>
  )
}
