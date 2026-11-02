import type {ValidationResult} from '@/types/provider'
import {render, screen, waitFor, within} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {AnthropicSettings} from '../anthropic-settings'
import {APISettings} from '../api-settings'

const setBaseUrl = vi.fn<(id: string, baseUrl: string | undefined) => Promise<ValidationResult | null>>()
const validateProvider = vi.fn<(id: string, key: string) => Promise<ValidationResult>>()
const setSecret = vi.fn<(id: string, key: string) => Promise<void>>()
const ensureUnlocked = vi.fn<() => Promise<boolean>>()

vi.mock('@/hooks/use-ai-provider', () => ({
  useAIProvider: () => ({providers: [], baseUrls: {}, setBaseUrl, validateProvider}),
}))

vi.mock('@/hooks/use-session', () => ({
  useSession: () => ({setSecret, deleteSecret: vi.fn(), getSecret: vi.fn()}),
}))

vi.mock('@/hooks/use-unlock-gate', () => ({
  useUnlockGate: () => ({ensureUnlocked, passphraseDialog: null}),
}))

describe.each([
  {
    name: 'OpenAI',
    id: 'openai',
    Component: APISettings,
    keyLabel: 'Enter your OpenAI API key',
    help: /Leave empty to use OpenAI directly\. Set it to use an OpenAI-compatible gateway, for example http:\/\/localhost:8317\/v1\./,
  },
  {
    name: 'Anthropic',
    id: 'anthropic',
    Component: AnthropicSettings,
    keyLabel: 'Enter your Anthropic API key',
    help: /Leave empty to use Anthropic directly\. Set it to use an Anthropic-compatible gateway, for example http:\/\/localhost:8317\/v1\./,
  },
])('$name settings', ({id, Component, keyLabel, help}) => {
  beforeEach(() => {
    setBaseUrl.mockReset().mockResolvedValue(null)
    validateProvider.mockReset().mockResolvedValue({valid: true})
    setSecret.mockReset().mockResolvedValue()
    ensureUnlocked.mockReset().mockResolvedValue(true)
  })

  it('has an optional Base URL field with its help text', () => {
    render(<Component />)

    const section = screen.getByTestId(`${id}-base-url`)
    expect(within(section).getByRole('textbox', {name: /Base URL/})).toHaveValue('')
    expect(within(section).getByText(help)).toBeInTheDocument()
  })

  it('saves the base URL without asking for the passphrase', async () => {
    const user = userEvent.setup()
    render(<Component />)

    const section = screen.getByTestId(`${id}-base-url`)
    await user.type(within(section).getByRole('textbox', {name: /Base URL/}), 'http://localhost:8317/v1')
    await user.click(within(section).getByRole('button', {name: 'Save Base URL'}))

    await waitFor(() => {
      expect(setBaseUrl).toHaveBeenCalledWith(id, 'http://localhost:8317/v1')
    })
    expect(ensureUnlocked).not.toHaveBeenCalled()
    expect(setSecret).not.toHaveBeenCalled()
  })

  it('still gates the key behind the passphrase', async () => {
    const user = userEvent.setup()
    render(<Component />)

    await user.type(screen.getByLabelText(keyLabel), 'sk-test')
    await user.click(screen.getByRole('button', {name: 'Save API key to local storage'}))

    await waitFor(() => {
      expect(validateProvider).toHaveBeenCalledWith(id, 'sk-test')
    })
    expect(ensureUnlocked).toHaveBeenCalledTimes(1)
    expect(setSecret).toHaveBeenCalledWith(id, 'sk-test')
    expect(setBaseUrl).not.toHaveBeenCalled()
  })
})
