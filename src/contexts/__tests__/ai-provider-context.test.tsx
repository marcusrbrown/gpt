import {useAIProvider} from '@/hooks/use-ai-provider'
import {useSession} from '@/hooks/use-session'
import {db} from '@/lib/database'
import {getEncryptionService, resetEncryptionServiceForTesting} from '@/services/encryption'
import {loadProviderBaseUrls} from '@/services/provider-base-urls'
import {AnthropicProvider, getProviderRegistry, OpenAIProvider} from '@/services/providers'
import {getSessionManager, resetSessionManagerForTesting} from '@/services/session'
import {act, render, screen, waitFor} from '@testing-library/react'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {AIProvider} from '../ai-provider-context'
import {SessionProvider} from '../session-context'

const PASSPHRASE = 'correct-passphrase'
const API_KEY = 'sk-test-key'

let session: ReturnType<typeof useSession>
let ai: ReturnType<typeof useAIProvider>

function Probe() {
  session = useSession()
  ai = useAIProvider()
  const {providers, isLoading} = ai
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
    for (const id of ['openai', 'anthropic'] as const) {
      const provider = getProviderRegistry().get(id)
      if (provider instanceof OpenAIProvider || provider instanceof AnthropicProvider) {
        provider.configure({baseUrl: undefined})
      }
    }
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

  it('treats providers as locked again, and drops the key, when the session auto-locks', async () => {
    renderProviders()
    await waitFor(() => {
      expect(session.isPassphraseSet).toBe(true)
    })
    await act(async () => {
      await session.unlock(PASSPHRASE)
    })
    await waitFor(() => {
      expect(screen.getByTestId('probe')).toHaveTextContent('openai-configured')
    })

    // The idle timeout calls the session manager's lock() directly, not the context's.
    act(() => {
      getSessionManager().lock()
    })

    await waitFor(() => {
      expect(screen.getByTestId('probe')).toHaveTextContent('openai-unconfigured')
    })
    expect(getEncryptionService().isUnlocked()).toBe(false)
    expect(getProviderRegistry().get('openai')?.isConfigured).toBe(false)
    expect(await session.getSecret('openai')).toBeNull()
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
  describe('base URLs', () => {
    const GATEWAY = 'http://localhost:8317/v1'

    const configuredBaseUrl = () => (getProviderRegistry().get('openai') as OpenAIProvider).baseUrl

    it('applies a stored base URL while the session is still locked', async () => {
      await db.settings.put({key: 'provider_base_urls', value: {openai: GATEWAY}})
      renderProviders()

      await waitFor(() => {
        expect(ai.baseUrls).toEqual({openai: GATEWAY})
      })
      expect(configuredBaseUrl()).toBe(GATEWAY)
      expect(session.isUnlocked).toBe(false)
      expect(validateCredentials).not.toHaveBeenCalled()
    })

    it('points the provider at the base URL before it validates a stored key on unlock', async () => {
      await db.settings.put({key: 'provider_base_urls', value: {openai: GATEWAY}})
      const baseUrlAtValidation: (string | undefined)[] = []
      validateCredentials.mockImplementation(async function (this: OpenAIProvider) {
        baseUrlAtValidation.push(this.baseUrl)
        return {valid: true}
      })
      renderProviders()
      await waitFor(() => {
        expect(session.isPassphraseSet).toBe(true)
      })

      await act(async () => {
        await session.unlock(PASSPHRASE)
      })

      await waitFor(() => {
        expect(screen.getByTestId('probe')).toHaveTextContent('openai-configured')
      })
      expect(baseUrlAtValidation).toEqual([GATEWAY])
    })

    it('saves a base URL without a passphrase and leaves the locked key alone', async () => {
      renderProviders()
      await waitFor(() => {
        expect(session.isPassphraseSet).toBe(true)
      })

      let result: Awaited<ReturnType<typeof ai.setBaseUrl>> | undefined
      await act(async () => {
        result = await ai.setBaseUrl('openai', `${GATEWAY}/`)
      })

      expect(result).toBeNull()
      expect(session.isUnlocked).toBe(false)
      expect(ai.baseUrls).toEqual({openai: GATEWAY})
      expect(configuredBaseUrl()).toBe(GATEWAY)
      expect(await loadProviderBaseUrls()).toEqual({openai: GATEWAY})
      expect(validateCredentials).not.toHaveBeenCalled()
    })

    it('checks the stored key against the new URL when the session is unlocked', async () => {
      renderProviders()
      await waitFor(() => {
        expect(session.isPassphraseSet).toBe(true)
      })
      await act(async () => {
        await session.unlock(PASSPHRASE)
      })
      await waitFor(() => {
        expect(screen.getByTestId('probe')).toHaveTextContent('openai-configured')
      })
      validateCredentials.mockClear().mockResolvedValue({valid: false, error: 'Invalid API key'})

      let result: Awaited<ReturnType<typeof ai.setBaseUrl>> | undefined
      await act(async () => {
        result = await ai.setBaseUrl('openai', GATEWAY)
      })

      // No override: the provider validates against the URL it was just configured with.
      expect(validateCredentials).toHaveBeenCalledWith(API_KEY, undefined)
      expect(configuredBaseUrl()).toBe(GATEWAY)
      expect(result).toEqual({valid: false, error: 'Invalid API key'})
      expect(screen.getByTestId('probe')).toHaveTextContent('openai-unconfigured')
    })

    it('goes back to the vendor endpoint when the base URL is cleared', async () => {
      await db.settings.put({key: 'provider_base_urls', value: {openai: GATEWAY}})
      renderProviders()
      await waitFor(() => {
        expect(configuredBaseUrl()).toBe(GATEWAY)
      })

      await act(async () => {
        await ai.setBaseUrl('openai', undefined)
      })

      expect(configuredBaseUrl()).toBeUndefined()
      expect(ai.baseUrls).toEqual({})
      expect(await loadProviderBaseUrls()).toEqual({})
    })

    it('rejects an invalid URL and keeps the saved one', async () => {
      await db.settings.put({key: 'provider_base_urls', value: {openai: GATEWAY}})
      renderProviders()
      await waitFor(() => {
        expect(configuredBaseUrl()).toBe(GATEWAY)
      })

      await act(async () => {
        await expect(ai.setBaseUrl('openai', 'ftp://example.com/v1')).rejects.toThrow()
      })

      expect(configuredBaseUrl()).toBe(GATEWAY)
      expect(await loadProviderBaseUrls()).toEqual({openai: GATEWAY})
    })
  })
})
