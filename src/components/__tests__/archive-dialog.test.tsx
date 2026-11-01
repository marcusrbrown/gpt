import type {GPTConfiguration} from '@/types/gpt'
import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {describe, expect, it, vi} from 'vitest'
import {ArchiveDialog} from '../archive-dialog'

const gpt: GPTConfiguration = {
  id: 'gpt-1',
  name: 'Release Notes Writer',
  description: 'Drafts release notes',
  systemPrompt: 'You write release notes.',
  capabilities: {codeInterpreter: false, webBrowsing: false, imageGeneration: false, fileSearch: {enabled: false}},
  tools: [],
  knowledge: {files: [], urls: [], extractionMode: 'manual'},
  createdAt: new Date('2025-08-07T10:00:00.000Z'),
  updatedAt: new Date('2025-08-07T10:00:00.000Z'),
  version: 1,
  tags: [],
  isArchived: false,
  folderId: null,
  archivedAt: null,
}

function renderDialog(mode: 'archive' | 'delete', isOpen = true) {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  render(<ArchiveDialog gpt={gpt} mode={mode} isOpen={isOpen} onConfirm={onConfirm} onCancel={onCancel} />)
  return {onConfirm, onCancel}
}

describe('ArchiveDialog', () => {
  it('names the dialog after its heading and keeps the confirm test id', async () => {
    renderDialog('delete')

    expect(await screen.findByRole('dialog', {name: 'Delete GPT Permanently'})).toBeInTheDocument()
    expect(screen.getByTestId('confirm-delete')).toHaveTextContent('Delete Permanently')
  })

  it('uses the archive confirm test id in archive mode', async () => {
    renderDialog('archive')

    expect(await screen.findByRole('dialog', {name: 'Archive GPT'})).toBeInTheDocument()
    expect(screen.getByTestId('confirm-archive')).toBeInTheDocument()
  })

  it('renders nothing while closed', () => {
    renderDialog('archive', false)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('confirms through the confirm button only', async () => {
    const user = userEvent.setup()
    const {onConfirm, onCancel} = renderDialog('archive')

    await user.click(await screen.findByTestId('confirm-archive'))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('cancels once through the Cancel button', async () => {
    const user = userEvent.setup()
    const {onCancel} = renderDialog('archive')

    await user.click(await screen.findByRole('button', {name: 'Cancel'}))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('cancels once through the labelled close control', async () => {
    const user = userEvent.setup()
    const {onCancel, onConfirm} = renderDialog('delete')

    await user.click(await screen.findByRole('button', {name: 'Close'}))

    await waitFor(() => {
      expect(onCancel).toHaveBeenCalledTimes(1)
    })
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('cancels once on Escape', async () => {
    const user = userEvent.setup()
    const {onCancel} = renderDialog('delete')
    await screen.findByRole('dialog')

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(onCancel).toHaveBeenCalledTimes(1)
    })
  })
})
