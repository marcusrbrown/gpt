import {useSession} from '@/hooks/use-session'
import {db} from '@/lib/database'
import {getEncryptionService, resetEncryptionServiceForTesting} from '@/services/encryption'
import {resetSessionManagerForTesting} from '@/services/session'
import {act, render, waitFor} from '@testing-library/react'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {SessionProvider} from '../session-context'

const PASSPHRASE = 'correct-passphrase'
const NEW_PASSPHRASE = 'brand-new-passphrase'

let session: ReturnType<typeof useSession>
let everUnlocked = false

function Probe() {
  session = useSession()
  if (session.isUnlocked) everUnlocked = true
  return null
}

async function renderSession() {
  render(
    <SessionProvider>
      <Probe />
    </SessionProvider>,
  )
  await waitFor(() => {
    expect(session.isInitialized).toBe(true)
  })
}

describe('SessionProvider', () => {
  beforeEach(async () => {
    await db.secrets.clear()
    await db.settings.clear()
    resetEncryptionServiceForTesting()
    resetSessionManagerForTesting()
    everUnlocked = false

    // A returning user with a passphrase and a stored OpenAI key; the page has just loaded, so the session is locked.
    const encryption = getEncryptionService()
    await encryption.initializePassphrase(PASSPHRASE)
    await encryption.encryptSecret('openai', 'sk-test-key')
    encryption.lock()
  })

  afterEach(async () => {
    getEncryptionService().lock()
    resetSessionManagerForTesting()
    await db.secrets.clear()
    await db.settings.clear()
  })

  describe('resetAllData', () => {
    it('deletes stored keys and the salt, then lets a new passphrase be set', async () => {
      await renderSession()
      expect(session.isPassphraseSet).toBe(true)

      await act(async () => {
        await session.resetAllData()
      })

      expect(session.isPassphraseSet).toBe(false)
      expect(session.isUnlocked).toBe(false)
      expect(await db.secrets.count()).toBe(0)
      expect(await getEncryptionService().isPassphraseSet()).toBe(false)

      await act(async () => {
        await session.setInitialPassphrase(NEW_PASSPHRASE)
      })
      expect(session.isPassphraseSet).toBe(true)
      expect(session.isUnlocked).toBe(true)
      expect(await session.getSecret('openai')).toBeNull()
    })

    it('locks an unlocked session and drops its key', async () => {
      await renderSession()
      await act(async () => {
        await session.unlock(PASSPHRASE)
      })
      expect(session.isUnlocked).toBe(true)

      await act(async () => {
        await session.resetAllData()
      })

      expect(session.isUnlocked).toBe(false)
      expect(getEncryptionService().isUnlocked()).toBe(false)
    })
  })

  describe('another tab', () => {
    it('does not unlock this tab when it unlocks', async () => {
      await renderSession()
      const lock = vi.spyOn(getEncryptionService(), 'lock')

      // What a second tab used to broadcast on unlock; this tab holds no key and must stay locked.
      const otherTab = new BroadcastChannel('gpt-session-sync')
      otherTab.postMessage({type: 'UNLOCK'})
      // Messages arrive in order, so once the LOCK sentinel is handled the UNLOCK has been too.
      otherTab.postMessage({type: 'LOCK'})
      otherTab.close()
      await waitFor(() => {
        expect(lock).toHaveBeenCalled()
      })

      expect(everUnlocked).toBe(false)
      expect(session.isUnlocked).toBe(false)
      expect(await session.getSecret('openai')).toBeNull()
    })

    it('locks this tab and drops its key when it locks', async () => {
      await renderSession()
      await act(async () => {
        await session.unlock(PASSPHRASE)
      })
      expect(session.isUnlocked).toBe(true)

      const otherTab = new BroadcastChannel('gpt-session-sync')
      otherTab.postMessage({type: 'LOCK'})
      otherTab.close()

      await waitFor(() => {
        expect(session.isUnlocked).toBe(false)
      })
      expect(getEncryptionService().isUnlocked()).toBe(false)
    })
  })
})
