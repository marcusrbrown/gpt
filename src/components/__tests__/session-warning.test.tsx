import type {SessionStatus} from '@/services/session'
import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {SessionWarning} from '../session-warning'

const extendSession = vi.fn()
let session: {status: SessionStatus; remainingSeconds?: number}

vi.mock('@/hooks/use-session', () => ({
  useSession: () => ({...session, extendSession}),
}))

describe('SessionWarning', () => {
  beforeEach(() => {
    extendSession.mockReset()
    session = {status: 'timing_out', remainingSeconds: 125}
  })

  it('shows the remaining time while the session is about to lock', () => {
    render(<SessionWarning />)

    expect(screen.getByTestId('session-warning')).toHaveTextContent('Session locks in 2:05')
  })

  it('extends the session on request', async () => {
    const user = userEvent.setup()
    render(<SessionWarning />)

    await user.click(screen.getByRole('button', {name: 'Extend Session'}))

    expect(extendSession).toHaveBeenCalledTimes(1)
  })

  it.each<[SessionStatus, number | undefined]>([
    ['unlocked', undefined],
    ['locked', undefined],
    ['timing_out', undefined],
  ])('renders nothing for %s without a countdown', (status, remainingSeconds) => {
    session = {status, remainingSeconds}
    render(<SessionWarning />)

    expect(screen.queryByTestId('session-warning')).not.toBeInTheDocument()
  })
})
