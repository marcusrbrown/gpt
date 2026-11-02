import {act, render, screen, waitFor, within} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {describe, expect, it, vi} from 'vitest'
import {MCPServerForm} from '../mcp-server-form'

function renderForm() {
  const onClose = vi.fn()
  const onSave = vi.fn().mockResolvedValue(undefined)
  render(<MCPServerForm isOpen onClose={onClose} onSave={onSave} />)
  return {onClose, onSave}
}

describe('MCPServerForm', () => {
  it('is named by its heading and shows both selects with their current values', async () => {
    renderForm()

    const dialog = await screen.findByRole('dialog', {name: 'Add MCP Server'})
    expect(within(dialog).getByRole('button', {name: /Transport/})).toHaveTextContent('SSE / HTTP (Remote)')
    expect(within(dialog).getByRole('button', {name: /Authentication/})).toHaveTextContent('None')
  })

  it('keeps the Select popover open inside the modal', async () => {
    const user = userEvent.setup()
    renderForm()
    const dialog = await screen.findByRole('dialog', {name: 'Add MCP Server'})
    const trigger = within(dialog).getByRole('button', {name: /Transport/})

    await user.click(trigger)

    const listbox = await screen.findByRole('listbox')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    // The v2 popover closed on the next focus-scope tick; give any such tick a chance to run.
    await act(async () => {
      await new Promise(resolve => {
        setTimeout(resolve, 150)
      })
    })

    expect(listbox).toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByRole('option')).toHaveLength(2)
  })

  it('selecting an option updates the form and closes only the popover', async () => {
    const user = userEvent.setup()
    const {onClose} = renderForm()
    const dialog = await screen.findByRole('dialog', {name: 'Add MCP Server'})

    await user.click(within(dialog).getByRole('button', {name: /Transport/}))
    await user.click(await screen.findByRole('option', {name: /Stdio/}))

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })
    expect(within(dialog).getByRole('button', {name: /Transport/})).toHaveTextContent('Stdio (Local Process)')
    expect(within(dialog).getByText(/Stdio transport requires a desktop environment/)).toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Server URL')).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('switches the authentication fields with the Authentication select', async () => {
    const user = userEvent.setup()
    renderForm()
    const dialog = await screen.findByRole('dialog', {name: 'Add MCP Server'})

    await user.click(within(dialog).getByRole('button', {name: /Authentication/}))
    await user.click(await screen.findByRole('option', {name: 'Bearer Token'}))

    expect(await within(dialog).findByLabelText('Token')).toBeInTheDocument()
  })

  it('Escape closes the popover first, then the modal', async () => {
    const user = userEvent.setup()
    const {onClose} = renderForm()
    const dialog = await screen.findByRole('dialog', {name: 'Add MCP Server'})

    await user.click(within(dialog).getByRole('button', {name: /Transport/}))
    await screen.findByRole('listbox')

    await user.keyboard('{Escape}')
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })
    expect(onClose).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(within(dialog).getByRole('button', {name: /Transport/})).toHaveFocus()
    })

    await user.keyboard('{Escape}')
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  it('cancels once through Cancel and through the labelled close control', async () => {
    const user = userEvent.setup()
    const {onClose} = renderForm()
    const dialog = await screen.findByRole('dialog', {name: 'Add MCP Server'})

    await user.click(within(dialog).getByRole('button', {name: 'Cancel'}))
    expect(onClose).toHaveBeenCalledTimes(1)

    await user.click(within(dialog).getByRole('button', {name: 'Close'}))
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(2)
    })
  })
})
