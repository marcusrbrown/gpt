import {Button, Input} from '@heroui/react'
import {useState} from 'react'
import {useOpenAI} from '../../contexts/openai-provider'
import {cn, compose, ds, responsive, theme} from '../../lib/design-system'

export function APISettings() {
  const {apiKey, setApiKey, clearApiKey} = useOpenAI()
  const [inputKey, setInputKey] = useState(apiKey || '')
  const [showApiKey, setShowApiKey] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputKey(e.target.value)
    setSaveStatus('idle')
  }

  const handleSaveKey = () => {
    try {
      setApiKey(inputKey)
      setSaveStatus('success')

      // Reset status after 3 seconds
      setTimeout(() => {
        setSaveStatus('idle')
      }, 3000)
    } catch (error) {
      setSaveStatus('error')
      console.error('Error saving API key:', error)
    }
  }

  const handleClearKey = () => {
    clearApiKey()
    setInputKey('')
    setSaveStatus('idle')
  }

  const toggleShowApiKey = () => {
    setShowApiKey(!showApiKey)
  }

  return (
    <div className={cn(compose.card(), theme.surface(1))}>
      <h2 className={cn(responsive.heading.large, 'mb-4')}>OpenAI API Settings</h2>

      <div className={cn(ds.form.fieldGroup)}>
        <p className={cn(ds.text.body.small, 'mb-2')}>
          Enter your OpenAI API key to use the GPT Test functionality. Your API key is stored locally in your browser
          and never sent to our servers.
        </p>

        <div className="flex items-center mb-2">
          <Input
            type={showApiKey ? 'text' : 'password'}
            value={inputKey}
            onChange={handleInputChange}
            placeholder="sk-..."
            className={cn('flex-1 mr-2', ds.focus.ring, ds.animation.transition)}
            description="Your OpenAI API key for testing GPT configurations"
            aria-label="Enter your OpenAI API key"
          />
          <Button
            onPress={toggleShowApiKey}
            variant="bordered"
            className={cn('min-w-[80px] px-3', ds.focus.ring, ds.animation.transition)}
            aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
          >
            {showApiKey ? 'Hide' : 'Show'}
          </Button>
        </div>

        {saveStatus === 'success' && (
          <p className={cn(ds.form.errorText, 'text-success-600 mt-1')}>API key saved successfully!</p>
        )}

        {saveStatus === 'error' && (
          <p className={cn(ds.form.errorText, 'mt-1')}>Failed to save API key. Please try again.</p>
        )}

        <div className={cn('flex mt-4 space-x-2', ds.form.fieldRow)}>
          <Button
            onPress={handleSaveKey}
            color="primary"
            isDisabled={!inputKey.trim() || inputKey === apiKey}
            className={cn(ds.focus.ring, ds.animation.transition)}
            aria-label="Save API key to local storage"
          >
            Save API Key
          </Button>

          <Button
            onPress={handleClearKey}
            variant="bordered"
            color="danger"
            isDisabled={!apiKey}
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
