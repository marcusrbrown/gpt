import {useAIProvider} from '@/hooks/use-ai-provider'
import {useSession} from '@/hooks/use-session'
import {db} from '@/lib/database'
import {getEncryptionService, resetEncryptionServiceForTesting} from '@/services/encryption'
import {getProviderRegistry, OpenAIProvider} from '@/services/providers'
import {resetSessionManagerForTesting} from '@/services/session'
import {act, render, screen, waitFor} from '@testing-library/react'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {AIProvider} from '../ai-provider-context'
import {SessionProvider} from '../session-context'

const PASSPHRASE = 'correct-passphrase'
const API_KEY = 'sk-test-key'

let session: ReturnType<typeof useSession>

function Probe() {
  session = useSession()
  const {providers, isLoading} = useAIProvider()
  const openai = providers.find(p => p.id === 'openai')

  return (
    <output data-testid="probe">
      {isLoading ? 'loading' : openai?.isConfigured ? 'openai-configured' : 'openai-unconfigured'}
    </output>
  )
}

function renderProviders() {
  return render(
    <SessionProvider>
      <AIProvider>
        <Probe />
      </AIProvider>
    </SessionProvider>,
  )
}

describe('AIProvider', () => {
  const validateCredentials = vi.spyOn(OpenAIProvider.prototype, 'validateCredentials')

  beforeEach(async () => {
    await db.secrets.clear()
    await db.settings.clear()
    resetEncryptionServiceForTesting()
    resetSessionManagerForTesting()
    validateCredentials.mockReset().mockResolvedValue({valid: true})

    // A returning user: passphrase set and an OpenAI key stored, then the page reloads (session locked).
    const encryption = getEncryptionService()
    await encryption.initializePassphrase(PASSPHRASE)
    await encryption.encryptSecret('openai', API_KEY)
    encryption.lock()
    getProviderRegistry().setConfigured('openai', false)
  })

  afterEach(async () => {
    getEncryptionService().lock()
    resetSessionManagerForTesting()
    await db.secrets.clear()
    await db.settings.clear()
  })

  it('does not configure providers from stored keys while the session is locked', async () => {
    renderProviders()

    await waitFor(() => {
      expect(screen.getByTestId('probe')).toHaveTextContent('openai-unconfigured')
    })
    expect(session.isPassphraseSet).toBe(true)
    expect(session.isUnlocked).toBe(false)
    expect(validateCredentials).not.toHaveBeenCalled()
  })

  it('reloads and validates stored keys once the session unlocks', async () => {
    renderProviders()
    await waitFor(() => {
      expect(session.isPassphraseSet).toBe(true)
    })
    await waitFor(() => {
      expect(screen.getByTestId('probe')).toHaveTextContent('openai-unconfigured')
    })

    let unlocked = false
    await act(async () => {
      unlocked = await session.unlock(PASSPHRASE)
    })
    expect(unlocked).toBe(true)

    await waitFor(() => {
      expect(screen.getByTestId('probe')).toHaveTextContent('openai-configured')
    })
    expect(validateCredentials).toHaveBeenCalledWith(API_KEY)
  })

  it('stays unconfigured after a wrong passphrase', async () => {
    renderProviders()
    await waitFor(() => {
      expect(session.isPassphraseSet).toBe(true)
    })

    let unlocked = true
    await act(async () => {
      unlocked = await session.unlock('wrong-passphrase')
    })

    expect(unlocked).toBe(false)
    expect(screen.getByTestId('probe')).toHaveTextContent('openai-unconfigured')
    expect(validateCredentials).not.toHaveBeenCalled()
  })

  it('leaves a stored key unconfigured when validation rejects it', async () => {
    validateCredentials.mockResolvedValue({valid: false, error: 'Invalid API key'})
    renderProviders()
    await waitFor(() => {
      expect(session.isPassphraseSet).toBe(true)
    })

    await act(async () => {
      await session.unlock(PASSPHRASE)
    })

    await waitFor(() => {
      expect(validateCredentials).toHaveBeenCalledWith(API_KEY)
    })
    expect(screen.getByTestId('probe')).toHaveTextContent('openai-unconfigured')
  })
})
