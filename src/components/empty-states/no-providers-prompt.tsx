import {useAIProvider} from '@/hooks/use-ai-provider'
import {cn, ds, theme} from '@/lib/design-system'

import {Button} from '@heroui/react'
import {AlertCircle, Settings} from 'lucide-react'

import {useCallback} from 'react'
import {useNavigate} from 'react-router-dom'

/**
 * Empty state component shown when no AI providers are configured.
 * Guides first-time users to configure their API keys in settings.
 */
export function NoProvidersPrompt() {
  const navigate = useNavigate()
  const {providers, isLoading} = useAIProvider()

  const handleNavigateToSettings = useCallback(() => {
    const result = navigate('/settings')
    if (result instanceof Promise) {
      result.catch(console.error)
    }
  }, [navigate])

  // Check if any provider is configured
  const hasConfiguredProvider = providers.some(p => p.isConfigured)

  // Don't render anything while loading or if a provider is configured
  if (isLoading || hasConfiguredProvider) {
    return null
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center',
        'rounded-xl border-2 border-dashed',
        theme.border(),
        theme.surface(1),
      )}
      aria-labelledby="no-providers-title"
      aria-describedby="no-providers-description"
    >
      <div
        className={cn(
          'flex items-center justify-center w-16 h-16 mb-6',
          'rounded-full bg-warning-100 dark:bg-warning-900/30',
        )}
      >
        <AlertCircle size={32} className="text-warning-600 dark:text-warning-400" aria-hidden="true" />
      </div>

      <h2 id="no-providers-title" className={cn(ds.text.heading.h3, 'text-content-primary mb-2')}>
        No AI Providers Configured
      </h2>

      <p id="no-providers-description" className={cn(ds.text.body.base, 'text-content-secondary mb-6 max-w-md')}>
        To start creating and testing GPTs, you need to configure at least one AI provider. Set up your OpenAI,
        Anthropic, or Ollama credentials in Settings.
      </p>

      <Button
        color="primary"
        size="lg"
        startContent={<Settings size={18} />}
        onPress={handleNavigateToSettings}
        className={cn('flex items-center gap-2', ds.animation.transition)}
      >
        Configure Providers
      </Button>
    </div>
  )
}
