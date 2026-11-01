import {PassphraseModal, type PassphraseModalMode} from '@/components/passphrase-modal'
import {useSession} from '@/hooks/use-session'
import {useCallback, useRef, useState, type ReactElement} from 'react'

export interface UnlockGate {
  /**
   * Resolves `true` once the session is unlocked. Opens the create-passphrase dialog on first run and the unlock
   * dialog when a passphrase already exists; resolves `false` if the user dismisses it.
   */
  ensureUnlocked: () => Promise<boolean>
  /** Render this once in the component that calls `ensureUnlocked`. */
  passphraseDialog: ReactElement
}

/**
 * Lets an action that needs a stored key ask for the passphrase on demand. Nothing prompts until the action is taken,
 * so features that never touch a stored key (for example Ollama) stay passphrase-free.
 */
export function useUnlockGate(): UnlockGate {
  const {isUnlocked, isPassphraseSet, webCryptoAvailable} = useSession()
  const [mode, setMode] = useState<PassphraseModalMode>('setup')
  const [isOpen, setIsOpen] = useState(false)
  const settleRef = useRef<((unlocked: boolean) => void) | null>(null)

  const settle = useCallback((unlocked: boolean) => {
    settleRef.current?.(unlocked)
    settleRef.current = null
    setIsOpen(false)
  }, [])

  const ensureUnlocked = useCallback(async (): Promise<boolean> => {
    // Without Web Crypto there is nothing to unlock; let the caller's own error path report it.
    if (isUnlocked || !webCryptoAvailable) return true

    // A previous request may still be pending; release it before starting another.
    settleRef.current?.(false)

    return new Promise<boolean>(resolve => {
      settleRef.current = resolve
      setMode(isPassphraseSet ? 'unlock' : 'setup')
      setIsOpen(true)
    })
  }, [isUnlocked, isPassphraseSet, webCryptoAvailable])

  const passphraseDialog = (
    <PassphraseModal
      mode={mode}
      isOpen={isOpen}
      onClose={() => {
        settle(false)
      }}
      onSuccess={() => {
        settle(true)
      }}
    />
  )

  return {ensureUnlocked, passphraseDialog}
}
