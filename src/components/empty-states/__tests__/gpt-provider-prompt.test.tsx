import type {SessionContextValue} from '@/contexts/session-context'
import {render, screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {GPTProviderPrompt} from '../gpt-provider-prompt'

type SessionState = Pick<SessionContextValue, 'isInitialized' | 'isPassphraseSet' | 'isUnlocked' | 'webCryptoAvailable'>

let session: SessionState

vi.mock('@/hooks/use-session', () => ({
  useSession: () => ({...session, unlock: vi.fn(), setInitialPassphrase: vi.fn()}),
}))

function show() {
  return render(
    <MemoryRouter>
      <GPTProviderPrompt providerName="OpenAI" />
    </MemoryRouter>,
  )
}

describe('GPTProviderPrompt', () => {
  beforeEach(() => {
    session = {isInitialized: true, isPassphraseSet: true, isUnlocked: false, webCryptoAvailable: true}
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
    session = {...session, ...override}
    show()

    expect(screen.getByText("OpenAI isn't set up for this GPT. Add its API key in Settings.")).toBeInTheDocument()
    expect(screen.getByRole('link', {name: 'Settings'})).toHaveAttribute('href', '/settings')
    expect(screen.queryByTestId('session-unlock-prompt')).not.toBeInTheDocument()
  })
})
