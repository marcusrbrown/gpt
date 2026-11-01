import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {PassphraseModal} from '../passphrase-modal'

const setInitialPassphrase = vi.fn<(passphrase: string) => Promise<void>>()
const unlock = vi.fn<(passphrase: string) => Promise<boolean>>()

vi.mock('@/hooks/use-session', () => ({
  useSession: () => ({setInitialPassphrase, unlock}),
}))

function renderModal(mode: 'setup' | 'unlock') {
  const onClose = vi.fn()
  const onSuccess = vi.fn()
  render(<PassphraseModal mode={mode} isOpen onClose={onClose} onSuccess={onSuccess} />)
  return {onClose, onSuccess}
}

describe('PassphraseModal', () => {
  beforeEach(() => {
    setInitialPassphrase.mockReset().mockResolvedValue()
    unlock.mockReset().mockResolvedValue(true)
  })

  describe('setup mode', () => {
    it('asks for a passphrase and a confirmation', async () => {
      renderModal('setup')

      expect(await screen.findByRole('dialog', {name: 'Create a Passphrase'})).toBeInTheDocument()
      expect(screen.getByLabelText('Passphrase', {exact: true})).toBeInTheDocument()
      expect(screen.getByLabelText('Confirm Passphrase')).toBeInTheDocument()
    })

    it('keeps submit disabled until the passphrase is long enough and confirmed', async () => {
      const user = userEvent.setup()
      renderModal('setup')

      const submit = await screen.findByRole('button', {name: 'Set Passphrase'})
      expect(submit).toBeDisabled()

      await user.type(screen.getByLabelText('Passphrase', {exact: true}), 'short')
      await user.type(screen.getByLabelText('Confirm Passphrase'), 'short')
      expect(submit).toBeDisabled()

      await user.clear(screen.getByLabelText('Passphrase', {exact: true}))
      await user.clear(screen.getByLabelText('Confirm Passphrase'))
      await user.type(screen.getByLabelText('Passphrase', {exact: true}), 'long-enough-1')
      await user.type(screen.getByLabelText('Confirm Passphrase'), 'long-enough-2')
      expect(submit).toBeDisabled()
      expect(screen.getByText('Passphrases do not match')).toBeInTheDocument()
    })

    it('sets the passphrase and reports success', async () => {
      const user = userEvent.setup()
      const {onSuccess} = renderModal('setup')

      await user.type(await screen.findByLabelText('Passphrase', {exact: true}), 'long-enough-1')
      await user.type(screen.getByLabelText('Confirm Passphrase'), 'long-enough-1')
      await user.click(screen.getByRole('button', {name: 'Set Passphrase'}))

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1)
      })
      expect(setInitialPassphrase).toHaveBeenCalledWith('long-enough-1')
      expect(unlock).not.toHaveBeenCalled()
    })

    it('submits with Enter', async () => {
      const user = userEvent.setup()
      const {onSuccess} = renderModal('setup')

      await user.type(await screen.findByLabelText('Passphrase', {exact: true}), 'long-enough-1')
      await user.type(screen.getByLabelText('Confirm Passphrase'), 'long-enough-1{Enter}')

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1)
      })
    })

    it('shows the failure inline without echoing the passphrase', async () => {
      setInitialPassphrase.mockRejectedValue(new Error('Services not initialized'))
      const user = userEvent.setup()
      const {onSuccess} = renderModal('setup')

      await user.type(await screen.findByLabelText('Passphrase', {exact: true}), 'long-enough-1')
      await user.type(screen.getByLabelText('Confirm Passphrase'), 'long-enough-1')
      await user.click(screen.getByRole('button', {name: 'Set Passphrase'}))

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('Services not initialized')
      expect(alert).not.toHaveTextContent('long-enough-1')
      expect(onSuccess).not.toHaveBeenCalled()
    })
  })

  describe('unlock mode', () => {
    it('asks only for the passphrase', async () => {
      renderModal('unlock')

      expect(await screen.findByRole('dialog', {name: 'Unlock Session'})).toBeInTheDocument()
      expect(screen.getByLabelText('Passphrase', {exact: true})).toBeInTheDocument()
      expect(screen.queryByLabelText('Confirm Passphrase')).not.toBeInTheDocument()
    })

    it('unlocks and reports success', async () => {
      const user = userEvent.setup()
      const {onSuccess} = renderModal('unlock')

      await user.type(await screen.findByLabelText('Passphrase', {exact: true}), 'correct-passphrase')
      await user.click(screen.getByRole('button', {name: 'Unlock'}))

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1)
      })
      expect(unlock).toHaveBeenCalledWith('correct-passphrase')
      expect(setInitialPassphrase).not.toHaveBeenCalled()
    })

    it('shows an inline error for a wrong passphrase and allows another try', async () => {
      unlock.mockResolvedValueOnce(false).mockResolvedValueOnce(true)
      const user = userEvent.setup()
      const {onSuccess} = renderModal('unlock')

      const input = await screen.findByLabelText('Passphrase', {exact: true})
      await user.type(input, 'wrong-passphrase{Enter}')

      expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect passphrase')
      expect(onSuccess).not.toHaveBeenCalled()

      await user.clear(input)
      await user.type(input, 'correct-passphrase{Enter}')

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1)
      })
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('keeps submit disabled while the field is empty', async () => {
      renderModal('unlock')

      expect(await screen.findByRole('button', {name: 'Unlock'})).toBeDisabled()
    })
  })

  it('reports dismissal through Cancel without touching the session', async () => {
    const user = userEvent.setup()
    const {onClose, onSuccess} = renderModal('unlock')

    await user.click(await screen.findByRole('button', {name: 'Cancel'}))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onSuccess).not.toHaveBeenCalled()
    expect(unlock).not.toHaveBeenCalled()
  })
})
