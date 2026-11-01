import {SessionUnlockPrompt} from '@/components/session-unlock-prompt'
import {useSession} from '@/hooks/use-session'
import {Link} from 'react-router-dom'

export function GPTProviderPrompt({providerName}: {providerName: string}) {
  const {isInitialized, isPassphraseSet, isUnlocked, webCryptoAvailable} = useSession()

  // While locked, stored keys can't be read, so "not set up" may only mean "not unlocked yet". Offer the unlock first.
  if (webCryptoAvailable && isInitialized && isPassphraseSet && !isUnlocked) {
    return (
      <div className="border-t border-border-default p-4">
        <SessionUnlockPrompt />
      </div>
    )
  }

  return (
    <div className="border-t border-border-default p-4 text-sm text-content-secondary text-center">
      <p>{providerName} isn't set up for this GPT. Add its API key in Settings.</p>
      <Link className="text-primary-600 underline" to="/settings">
        Settings
      </Link>
    </div>
  )
}
