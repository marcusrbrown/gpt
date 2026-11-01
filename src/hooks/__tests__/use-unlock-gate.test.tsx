import type {SessionContextValue} from '@/contexts/session-context'
import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {useState} from 'react'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {useUnlockGate} from '../use-unlock-gate'

type SessionState = Pick<SessionContextValue, 'isPassphraseSet' | 'isUnlocked' | 'webCryptoAvailable'>

const unlock = vi.fn<(passphrase: string) => Promise<boolean>>()
const setInitialPassphrase = vi.fn<(passphrase: string) => Promise<void>>()
const resetAllData = vi.fn<() => Promise<void>>()
let session: SessionState

vi.mock('@/hooks/use-session', () => ({
  useSession: () => ({...session, unlock, setInitialPassphrase, resetAllData}),
}))

function Harness() {
  const {ensureUnlocked, passphraseDialog} = useUnlockGate()
  const [result, setResult] = useState('pending')

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          ensureUnlocked()
            .then(unlocked => setResult(unlocked ? 'unlocked' : 'dismissed'))
            .catch(console.error)
        }}
      >
        Save
      </button>
      <output data-testid="result">{result}</output>
      {passphraseDialog}
    </div>
  )
}

describe('useUnlockGate', () => {
  beforeEach(() => {
    unlock.mockReset().mockResolvedValue(true)
    setInitialPassphrase.mockReset().mockResolvedValue()
    resetAllData.mockReset().mockResolvedValue()
    session = {isPassphraseSet: false, isUnlocked: false, webCryptoAvailable: true}
  })

  it('resolves immediately, without a dialog, when the session is unlocked', async () => {
    session = {...session, isPassphraseSet: true, isUnlocked: true}
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', {name: 'Save'}))

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('unlocked')
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('asks for a new passphrase on first run, then resolves unlocked', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', {name: 'Save'}))
    expect(await screen.findByRole('dialog', {name: 'Create a Passphrase'})).toBeInTheDocument()

    await user.type(screen.getByLabelText('Passphrase', {exact: true}), 'long-enough-1')
    await user.type(screen.getByLabelText('Confirm Passphrase'), 'long-enough-1{Enter}')

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('unlocked')
    })
    expect(setInitialPassphrase).toHaveBeenCalledWith('long-enough-1')
  })

  it('asks for the existing passphrase when the session is locked, then resolves unlocked', async () => {
    session = {...session, isPassphraseSet: true}
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', {name: 'Save'}))
    expect(await screen.findByRole('dialog', {name: 'Unlock Session'})).toBeInTheDocument()

    await user.type(screen.getByLabelText('Passphrase', {exact: true}), 'correct-passphrase{Enter}')

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('unlocked')
    })
    expect(unlock).toHaveBeenCalledWith('correct-passphrase')
  })

  it('offers a new passphrase after a forgotten one is reset, then resolves unlocked', async () => {
    session = {...session, isPassphraseSet: true}
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', {name: 'Save'}))
    await user.click(await screen.findByRole('button', {name: 'Forgot passphrase?'}))
    await user.click(await screen.findByRole('button', {name: 'Delete Keys and Reset'}))

    expect(await screen.findByRole('dialog', {name: 'Create a Passphrase'})).toBeInTheDocument()
    expect(resetAllData).toHaveBeenCalledTimes(1)

    await user.type(screen.getByLabelText('Passphrase', {exact: true}), 'long-enough-1')
    await user.type(screen.getByLabelText('Confirm Passphrase'), 'long-enough-1{Enter}')

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('unlocked')
    })
    expect(setInitialPassphrase).toHaveBeenCalledWith('long-enough-1')
  })

  it('resolves dismissed when the user cancels', async () => {
    session = {...session, isPassphraseSet: true}
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', {name: 'Save'}))
    await user.click(await screen.findByRole('button', {name: 'Cancel'}))

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('dismissed')
    })
    expect(unlock).not.toHaveBeenCalled()
  })

  it('leaves the caller to report the error when Web Crypto is unavailable', async () => {
    session = {...session, webCryptoAvailable: false}
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', {name: 'Save'}))

    await waitFor(() => {
      expect(screen.getByTestId('result')).toHaveTextContent('unlocked')
    })
  })
})
