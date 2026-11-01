import type {SessionContextValue} from '@/contexts/session-context'
import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {MemoryRouter} from 'react-router-dom'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {GPTProviderPrompt} from '../gpt-provider-prompt'

type SessionState = Pick<SessionContextValue, 'isInitialized' | 'isPassphraseSet' | 'isUnlocked' | 'webCryptoAvailable'>

const setInitialPassphrase = vi.fn<(passphrase: string) => Promise<void>>()
const resetAllData = vi.fn<() => Promise<void>>()

// A subscribable store, like the real context: changing the session re-renders every consumer, parent included.
const store = vi.hoisted(() => ({
  state: {isInitialized: false, isPassphraseSet: false, isUnlocked: false, webCryptoAvailable: false},
  listeners: new Set<() => void>(),
}))

let session: SessionState

function setSession(next: SessionState) {
  session = next
  store.state = next
  for (const listener of store.listeners) listener()
}

vi.mock('@/hooks/use-session', async () => {
  const {useSyncExternalStore} = await import('react')
  const subscribe = (listener: () => void) => {
    store.listeners.add(listener)
    return () => store.listeners.delete(listener)
  }
  return {
    useSession: () => ({
      ...useSyncExternalStore(subscribe, () => store.state),
      unlock: vi.fn(),
      setInitialPassphrase,
      resetAllData,
    }),
  }
})

function show() {
  return render(
    <MemoryRouter>
      <GPTProviderPrompt providerName="OpenAI" />
    </MemoryRouter>,
  )
}

describe('GPTProviderPrompt', () => {
  beforeEach(() => {
    setInitialPassphrase.mockReset().mockResolvedValue()
    resetAllData.mockReset().mockImplementation(async () => {
      // Like the real reset, forget the passphrase: the locked condition no longer holds.
      setSession({...session, isPassphraseSet: false})
    })
    setSession({isInitialized: true, isPassphraseSet: true, isUnlocked: false, webCryptoAvailable: true})
  })

  it('offers to unlock instead of asking for a key when the session is locked', () => {
    show()

    expect(screen.getByTestId('session-unlock-prompt')).toBeInTheDocument()
    expect(screen.getByRole('button', {name: 'Unlock'})).toBeInTheDocument()
    expect(screen.queryByText(/isn't set up for this GPT/)).not.toBeInTheDocument()
  })

  it.each([
    ['no passphrase has been set', {isPassphraseSet: false}],
    ['the session is unlocked', {isUnlocked: true}],
    ['the session is still initializing', {isInitialized: false}],
    ['Web Crypto is unavailable', {webCryptoAvailable: false}],
  ] as const)('asks for the API key in Settings when %s', (_name, override) => {
    setSession({...session, ...override})
    show()

    expect(screen.getByText("OpenAI isn't set up for this GPT. Add its API key in Settings.")).toBeInTheDocument()
    expect(screen.getByRole('link', {name: 'Settings'})).toHaveAttribute('href', '/settings')
    expect(screen.queryByTestId('session-unlock-prompt')).not.toBeInTheDocument()
  })

  it('keeps the dialog open to set a new passphrase after a forgotten one is reset', async () => {
    const user = userEvent.setup()
    show()

    await user.click(screen.getByRole('button', {name: 'Unlock'}))
    await user.click(await screen.findByRole('button', {name: 'Forgot passphrase?'}))
    await user.click(await screen.findByRole('button', {name: 'Delete Keys and Reset'}))

    // The reset clears the passphrase, which flips this component out of its locked branch; the dialog must survive.
    expect(await screen.findByRole('dialog', {name: 'Create a Passphrase'})).toBeInTheDocument()

    await user.type(screen.getByLabelText('Passphrase', {exact: true}), 'long-enough-1')
    await user.type(screen.getByLabelText('Confirm Passphrase'), 'long-enough-1{Enter}')

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(setInitialPassphrase).toHaveBeenCalledWith('long-enough-1')
  })
})
