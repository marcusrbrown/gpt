import {SessionUnlockPrompt} from '@/components/session-unlock-prompt'
import {useSession} from '@/hooks/use-session'
import {cn} from '@/lib/design-system'
import {Link} from 'react-router-dom'

export function GPTProviderPrompt({providerName}: {providerName: string}) {
  const {isInitialized, isPassphraseSet, isUnlocked, webCryptoAvailable} = useSession()

  // While locked, stored keys can't be read, so "not set up" may only mean "not unlocked yet". Offer the unlock first.
  const isLocked = webCryptoAvailable && isInitialized && isPassphraseSet && !isUnlocked

  // SessionUnlockPrompt stays mounted at a fixed position: it keeps its dialog open while a forgotten-passphrase reset
  // clears `isPassphraseSet`, which would otherwise swap this branch and unmount the dialog before the new passphrase
  // is set. It renders nothing on its own when there is nothing to unlock.
  return (
    <div
      className={cn('border-t border-border-default p-4', !isLocked && 'text-sm text-content-secondary text-center')}
    >
      <SessionUnlockPrompt />
      {!isLocked && (
        <>
          <p>{providerName} isn't set up for this GPT. Add its API key in Settings.</p>
          <Link className="text-primary-600 underline" to="/settings">
            Settings
          </Link>
        </>
      )}
    </div>
  )
}
