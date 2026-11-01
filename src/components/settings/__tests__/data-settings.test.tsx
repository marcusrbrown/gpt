import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {MemoryRouter} from 'react-router-dom'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {DataSettings} from '../data-settings'

const clearAll = vi.fn<() => Promise<void>>()
const resetAllData = vi.fn<() => Promise<void>>()
const refresh = vi.fn<() => Promise<void>>()
let webCryptoAvailable = true

vi.mock('@/hooks/use-storage', () => ({
  useStorage: () => ({clearAll}),
}))

vi.mock('@/hooks/use-storage-quota', () => ({
  useStorageQuota: () => ({used: 0, total: 100, percentage: 0, isLoading: false, refresh}),
}))

vi.mock('@/hooks/use-session', () => ({
  useSession: () => ({resetAllData, webCryptoAvailable}),
}))

async function clearEverything() {
  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <DataSettings />
    </MemoryRouter>,
  )
  await user.click(screen.getByRole('button', {name: 'Clear Data'}))
  await user.click(await screen.findByRole('button', {name: 'Delete Everything'}))
}

describe('DataSettings', () => {
  beforeEach(() => {
    clearAll.mockReset().mockResolvedValue()
    resetAllData.mockReset().mockResolvedValue()
    refresh.mockReset().mockResolvedValue()
    webCryptoAvailable = true
  })

  it('clears stored data, then locks the session and forgets the passphrase', async () => {
    await clearEverything()

    await waitFor(() => {
      expect(resetAllData).toHaveBeenCalledTimes(1)
    })
    expect(clearAll).toHaveBeenCalledTimes(1)
    expect(clearAll.mock.invocationCallOrder[0]).toBeLessThan(resetAllData.mock.invocationCallOrder[0] ?? 0)
  })

  it('does not reset the session when stored data could not be cleared', async () => {
    clearAll.mockRejectedValue(new Error('IndexedDB blocked'))

    await clearEverything()

    await waitFor(() => {
      expect(clearAll).toHaveBeenCalledTimes(1)
    })
    expect(resetAllData).not.toHaveBeenCalled()
  })

  it('skips the session reset when Web Crypto is unavailable', async () => {
    webCryptoAvailable = false

    await clearEverything()

    await waitFor(() => {
      expect(refresh).toHaveBeenCalledTimes(1)
    })
    expect(clearAll).toHaveBeenCalledTimes(1)
    expect(resetAllData).not.toHaveBeenCalled()
  })
})
