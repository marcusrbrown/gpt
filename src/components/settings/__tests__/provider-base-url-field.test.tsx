import type {ValidationResult} from '@/types/provider'
import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {ProviderBaseUrlField} from '../provider-base-url-field'

const setBaseUrl = vi.fn<(id: string, baseUrl: string | undefined) => Promise<ValidationResult | null>>()
const addToast = vi.fn()
let baseUrls: Record<string, string> = {}

vi.mock('@/hooks/use-ai-provider', () => ({
  useAIProvider: () => ({baseUrls, setBaseUrl}),
}))

vi.mock('@heroui/react', async importOriginal => ({
  ...(await importOriginal<typeof import('@heroui/react')>()),
  addToast: (options: unknown) => addToast(options),
}))

function renderOpenAI() {
  return render(
    <ProviderBaseUrlField
      providerId="openai"
      providerName="OpenAI"
      compatibleWith="an OpenAI-compatible"
      defaultUrl="https://api.openai.com/v1"
    />,
  )
}

const saveButton = () => screen.getByRole('button', {name: 'Save Base URL'})
const field = () => screen.getByRole('textbox', {name: /Base URL/})

describe('ProviderBaseUrlField', () => {
  beforeEach(() => {
    baseUrls = {}
    setBaseUrl.mockReset().mockResolvedValue(null)
    addToast.mockReset()
  })

  it('is empty by default, shows the vendor URL as a hint and explains the setting', () => {
    renderOpenAI()

    expect(field()).toHaveValue('')
    expect(field()).toHaveAttribute('placeholder', 'https://api.openai.com/v1')
    expect(
      screen.getByText(
        /Leave empty to use OpenAI directly\. Set it to use an OpenAI-compatible gateway, for example http:\/\/localhost:8317\/v1\./,
      ),
    ).toBeInTheDocument()
    expect(saveButton()).toBeDisabled()
  })

  it('uses the Anthropic wording for Anthropic', () => {
    render(
      <ProviderBaseUrlField
        providerId="anthropic"
        providerName="Anthropic"
        compatibleWith="an Anthropic-compatible"
        defaultUrl="https://api.anthropic.com/v1"
      />,
    )

    expect(
      screen.getByText(
        /Leave empty to use Anthropic directly\. Set it to use an Anthropic-compatible gateway, for example http:\/\/localhost:8317\/v1\./,
      ),
    ).toBeInTheDocument()
  })

  it('shows the saved URL', () => {
    baseUrls = {openai: 'http://localhost:8317/v1'}
    renderOpenAI()

    expect(field()).toHaveValue('http://localhost:8317/v1')
    expect(saveButton()).toBeDisabled()
  })

  it.each(['localhost:8317/v1', 'ftp://example.com/v1', 'not a url'])(
    'shows an inline error for %j and keeps Save disabled',
    async value => {
      const user = userEvent.setup()
      renderOpenAI()

      await user.type(field(), value)

      expect(await screen.findByText(/Enter an http:\/\/ or https:\/\/ URL/)).toBeInTheDocument()
      expect(field()).toHaveAttribute('aria-invalid', 'true')
      expect(saveButton()).toBeDisabled()
    },
  )

  it('refuses a URL with credentials', async () => {
    const user = userEvent.setup()
    renderOpenAI()

    await user.type(field(), 'http://user:secret@localhost:8317/v1')

    expect(await screen.findByText('Remove the username and password from the URL')).toBeInTheDocument()
    expect(saveButton()).toBeDisabled()
  })

  it('saves a valid URL without its trailing slash and reports it', async () => {
    const user = userEvent.setup()
    renderOpenAI()

    await user.type(field(), '  http://localhost:8317/v1/  ')
    expect(screen.queryByText(/Enter an http/)).not.toBeInTheDocument()
    await user.click(saveButton())

    await waitFor(() => {
      expect(setBaseUrl).toHaveBeenCalledWith('openai', 'http://localhost:8317/v1')
    })
    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({title: 'Base URL Saved', color: 'success'}))
  })

  it('says the key works when it was re-validated against the new URL', async () => {
    setBaseUrl.mockResolvedValue({valid: true})
    const user = userEvent.setup()
    renderOpenAI()

    await user.type(field(), 'http://localhost:8317/v1')
    await user.click(saveButton())

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({title: 'Base URL Saved', description: expect.stringContaining('works with it')}),
      )
    })
  })

  it('warns, with the reason, when the key does not validate against the new URL', async () => {
    setBaseUrl.mockResolvedValue({valid: false, error: 'Invalid API key'})
    const user = userEvent.setup()
    renderOpenAI()

    await user.type(field(), 'http://localhost:8317/v1')
    await user.click(saveButton())

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Base URL Saved, Key Not Validated',
          description: expect.stringContaining('Invalid API key'),
          color: 'warning',
        }),
      )
    })
  })

  it('clears a saved URL when the field is emptied', async () => {
    baseUrls = {openai: 'http://localhost:8317/v1'}
    const user = userEvent.setup()
    renderOpenAI()

    await user.clear(field())
    expect(saveButton()).toBeEnabled()
    await user.click(saveButton())

    await waitFor(() => {
      expect(setBaseUrl).toHaveBeenCalledWith('openai', undefined)
    })
    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({title: 'Base URL Cleared'}))
  })

  it('treats a change that only adds a trailing slash as unchanged', async () => {
    baseUrls = {openai: 'http://localhost:8317/v1'}
    const user = userEvent.setup()
    renderOpenAI()

    await user.type(field(), '/')

    expect(saveButton()).toBeDisabled()
  })

  it('reports a failed save', async () => {
    setBaseUrl.mockRejectedValue(new Error('IndexedDB blocked'))
    const user = userEvent.setup()
    renderOpenAI()

    await user.type(field(), 'http://localhost:8317/v1')
    await user.click(saveButton())

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith(expect.objectContaining({title: 'Error', color: 'danger'}))
    })
  })
})
