import type {SessionContextValue} from '@/contexts/session-context'
import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {SessionUnlockPrompt} from '../session-unlock-prompt'

type SessionState = Pick<SessionContextValue, 'isInitialized' | 'isPassphraseSet' | 'isUnlocked' | 'webCryptoAvailable'>

const unlock = vi.fn<(passphrase: string) => Promise<boolean>>()
let session: SessionState

vi.mock('@/hooks/use-session', () => ({
  useSession: () => ({...session, unlock, setInitialPassphrase: vi.fn()}),
}))

describe('SessionUnlockPrompt', () => {
  beforeEach(() => {
    unlock.mockReset().mockResolvedValue(true)
    session = {isInitialized: true, isPassphraseSet: true, isUnlocked: false, webCryptoAvailable: true}
  })

  it('shows when a passphrase exists and the session is locked', () => {
    render(<SessionUnlockPrompt />)

    expect(screen.getByTestId('session-unlock-prompt')).toHaveTextContent('Your stored API keys are locked')
    expect(screen.getByRole('button', {name: 'Unlock'})).toBeInTheDocument()
  })

  it.each([
    ['no passphrase has been set yet', {isPassphraseSet: false}],
    ['the session is unlocked', {isUnlocked: true}],
    ['the session is still initializing', {isInitialized: false}],
    ['Web Crypto is unavailable', {webCryptoAvailable: false}],
  ] as const)('renders nothing when %s', (_name, override) => {
    session = {...session, ...override}
    render(<SessionUnlockPrompt />)

    expect(screen.queryByTestId('session-unlock-prompt')).not.toBeInTheDocument()
  })

  it('opens the unlock dialog without blocking the page', async () => {
    const user = userEvent.setup()
    render(<SessionUnlockPrompt />)

    expect(screen.queryByRole('dialog', {name: 'Unlock Session'})).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', {name: 'Unlock'}))

    expect(await screen.findByRole('dialog', {name: 'Unlock Session'})).toBeInTheDocument()
  })

  it('closes the dialog after a successful unlock', async () => {
    const user = userEvent.setup()
    render(<SessionUnlockPrompt />)

    await user.click(screen.getByRole('button', {name: 'Unlock'}))
    await user.type(await screen.findByLabelText('Passphrase', {exact: true}), 'correct-passphrase{Enter}')

    await waitFor(() => {
      expect(screen.queryByRole('dialog', {name: 'Unlock Session'})).not.toBeInTheDocument()
    })
    expect(unlock).toHaveBeenCalledWith('correct-passphrase')
  })

  it('keeps the dialog open with an inline error after a wrong passphrase', async () => {
    unlock.mockResolvedValue(false)
    const user = userEvent.setup()
    render(<SessionUnlockPrompt />)

    await user.click(screen.getByRole('button', {name: 'Unlock'}))
    await user.type(await screen.findByLabelText('Passphrase', {exact: true}), 'wrong-passphrase{Enter}')

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect passphrase')
    expect(screen.getByRole('dialog', {name: 'Unlock Session'})).toBeInTheDocument()
  })
})
