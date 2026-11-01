import {PassphraseModal} from '@/components/passphrase-modal'
import {useSession} from '@/hooks/use-session'
import {cn, ds} from '@/lib/design-system'
import '@/styles/heroui-v3.css'
import {Button} from '@heroui-v3/react'
import {Lock} from 'lucide-react'
import {useState} from 'react'

export interface SessionUnlockPromptProps {
  className?: string
}

/**
 * Non-blocking notice for surfaces that need a stored key. Shown only when a passphrase exists and the session is
 * locked (for example after a reload); on first run there is nothing to unlock, so it renders nothing.
 */
export function SessionUnlockPrompt({className}: SessionUnlockPromptProps) {
  const {isInitialized, isPassphraseSet, isUnlocked, webCryptoAvailable} = useSession()
  const [isOpen, setIsOpen] = useState(false)

  if (!webCryptoAvailable || !isInitialized || !isPassphraseSet || isUnlocked) {
    return null
  }

  return (
    <div
      role="status"
      data-testid="session-unlock-prompt"
      className={cn(
        'flex items-center gap-3 rounded-lg border border-border-default bg-surface-secondary p-3',
        className,
      )}
    >
      <Lock size={18} className="shrink-0 text-content-tertiary" aria-hidden="true" />
      <p className={cn(ds.text.body.small, 'flex-1')}>
        Your stored API keys are locked. Unlock them to use your providers.
      </p>
      <Button
        size="sm"
        variant="primary"
        onPress={() => {
          setIsOpen(true)
        }}
      >
        Unlock
      </Button>
      <PassphraseModal
        mode="unlock"
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false)
        }}
        onSuccess={() => {
          setIsOpen(false)
        }}
      />
    </div>
  )
}
