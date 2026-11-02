import type {GPTCapabilities, GPTConfiguration} from '@/types/gpt'
import {render, screen, waitFor, within} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {AppearanceSettings} from '../settings/appearance-settings'
import {BackupRestorePanel} from '../backup-restore-panel'
import {CapabilitiesConfiguration} from '../capabilities-configuration'
import {ExportDialog} from '../export-dialog'
import {GPTExportDialog} from '../gpt-export-dialog'
import {KnowledgeConfiguration} from '../knowledge-configuration'

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

describe('Switch (v3)', () => {
  it('names each backup switch by its label and toggles by click and Space', async () => {
    const user = userEvent.setup()
    const onCreateBackup = vi.fn().mockResolvedValue(undefined)
    render(<BackupRestorePanel onCreateBackup={onCreateBackup} onRestoreBackup={vi.fn()} />)

    const conversations = screen.getByRole('switch', {name: 'Include conversations'})
    const knowledge = screen.getByRole('switch', {name: 'Include knowledge files'})
    const settings = screen.getByRole('switch', {name: 'Include settings'})
    expect(conversations).toBeChecked()
    expect(knowledge).toBeChecked()
    expect(settings).toBeChecked()

    // Clicking the label text toggles the switch
    await user.click(screen.getByText('Include conversations'))
    expect(conversations).not.toBeChecked()

    // Space toggles it back, once
    conversations.focus()
    await user.keyboard(' ')
    expect(conversations).toBeChecked()

    await user.click(screen.getByText('Include settings'))
    await user.click(screen.getByRole('button', {name: /create backup/i}))

    expect(onCreateBackup).toHaveBeenCalledTimes(1)
    expect(onCreateBackup).toHaveBeenCalledWith({
      includeConversations: true,
      includeKnowledge: true,
      includeSettings: false,
    })
  })

  it('keeps the disabled reduce-motion switch named, disabled and in sync with the system preference', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    render(<AppearanceSettings />)

    const motion = screen.getByRole('switch', {name: 'Reduce motion (controlled by system preference)'})
    expect(motion).toBeDisabled()
    expect(motion).toBeChecked()
  })

  it('labels the export options and describes them', async () => {
    const user = userEvent.setup()
    renderExportDialog()

    const metadata = await screen.findByRole('switch', {name: 'Include metadata'})
    expect(metadata).toBeChecked()
    expect(screen.getByText('Model info, token usage, tool calls')).toBeInTheDocument()

    await user.click(screen.getByText('Include metadata'))
    expect(metadata).not.toBeChecked()
    expect(screen.getByRole('switch', {name: 'Include timestamps'})).toBeChecked()
  })
})

describe('Checkbox (v3)', () => {
  it('toggles each GPT export option by label and reports the options once', async () => {
    const user = userEvent.setup()
    const onExport = vi.fn().mockResolvedValue(undefined)
    render(<GPTExportDialog isOpen onClose={vi.fn()} gpt={gpt} onExport={onExport} />)

    const knowledge = await screen.findByRole('checkbox', {name: 'Knowledge files'})
    const history = screen.getByRole('checkbox', {name: 'Version history'})
    const conversations = screen.getByRole('checkbox', {name: 'Conversations'})
    expect(knowledge).toBeChecked()
    expect(history).not.toBeChecked()
    expect(conversations).not.toBeChecked()

    await user.click(screen.getByText('Version history'))
    await user.click(screen.getByText('Knowledge files'))
    expect(history).toBeChecked()
    expect(knowledge).not.toBeChecked()

    await user.click(screen.getByRole('button', {name: /export/i}))
    await waitFor(() => expect(onExport).toHaveBeenCalledTimes(1))
    expect(onExport).toHaveBeenCalledWith({
      includeKnowledge: false,
      includeVersionHistory: true,
      includeConversations: false,
    })
  })

  it('keeps the capability ids and calls onCapabilityChange once per click', async () => {
    const user = userEvent.setup()
    const capabilities: GPTCapabilities = {
      codeInterpreter: true,
      webBrowsing: false,
      imageGeneration: false,
      fileSearch: {enabled: true},
    }
    const onCapabilityChange = vi.fn()
    render(<CapabilitiesConfiguration capabilities={capabilities} onCapabilityChange={onCapabilityChange} />)

    const code = screen.getByRole('checkbox', {name: /code interpreter/i})
    const web = screen.getByRole('checkbox', {name: /web browsing/i})
    expect(code).toHaveAttribute('id', 'codeInterpreter')
    expect(web).toHaveAttribute('id', 'webBrowsing')
    expect(screen.getByRole('checkbox', {name: /file search/i})).toBeChecked()
    expect(code).toBeChecked()
    expect(web).not.toBeChecked()

    await user.click(screen.getByText('web Browsing'))
    expect(onCapabilityChange).toHaveBeenCalledTimes(1)
    expect(onCapabilityChange).toHaveBeenCalledWith('webBrowsing')

    // Space on the focused checkbox is one more user action
    code.focus()
    await user.keyboard(' ')
    expect(onCapabilityChange).toHaveBeenCalledTimes(2)
    expect(onCapabilityChange).toHaveBeenLastCalledWith('codeInterpreter')
  })

  it('names the destructive restore checkbox and toggles it', async () => {
    const user = userEvent.setup()
    render(<BackupRestorePanel onCreateBackup={vi.fn()} onRestoreBackup={vi.fn()} />)

    const file = new File(['PK'], 'backup.zip', {type: 'application/zip'})
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')
    if (!fileInput) throw new Error('restore file input not found')
    await user.upload(fileInput, file)

    const dialog = await screen.findByRole('dialog')
    const wipe = within(dialog).getByRole('checkbox', {name: 'Delete all existing data before restore'})
    expect(wipe).not.toBeChecked()
    expect(within(dialog).getByRole('button', {name: 'Restore'})).toBeInTheDocument()

    await user.click(within(dialog).getByText('Delete all existing data before restore'))
    expect(wipe).toBeChecked()
    expect(within(dialog).getByRole('button', {name: 'Wipe & Restore'})).toBeInTheDocument()
  })
})

describe('RadioGroup (v3)', () => {
  it('names the export format group, selects by label and with arrow keys, and exports the choice', async () => {
    const user = userEvent.setup()
    const {onExport} = renderExportDialog()

    const group = await screen.findByRole('radiogroup', {name: 'Export Format'})
    const json = within(group).getByRole('radio', {name: /JSON/})
    const markdown = within(group).getByRole('radio', {name: /Markdown/})
    expect(json).toBeChecked()
    expect(json).toHaveAttribute('name', 'export-format')

    // The whole card is the click target, not just the text
    await user.click(within(group).getByText('Human-readable format for documentation'))
    expect(markdown).toBeChecked()

    // One tab stop: arrows move the selection inside the group
    markdown.focus()
    await user.keyboard('{ArrowUp}')
    expect(json).toBeChecked()
    await user.keyboard('{ArrowDown}')
    expect(markdown).toBeChecked()

    await user.click(screen.getByRole('button', {name: /^export$/i}))
    expect(onExport).toHaveBeenCalledTimes(1)
    expect(onExport).toHaveBeenCalledWith('markdown')
  })

  it('keeps the label-less extraction mode radios named and controlled', async () => {
    const user = userEvent.setup()
    const onExtractionModeChange = vi.fn()
    render(
      <KnowledgeConfiguration
        gptId="gpt-1"
        files={[]}
        onFileUpload={vi.fn()}
        onRemoveFile={vi.fn()}
        extractionMode="manual"
        onExtractionModeChange={onExtractionModeChange}
        onExtractFile={vi.fn()}
        onExtractAllPending={vi.fn()}
        urls={[]}
        errors={{knowledge: {urls: {}}}}
        onAddUrl={vi.fn()}
        onRemoveUrl={vi.fn()}
        onUrlChange={vi.fn()}
        onCacheUrl={vi.fn()}
        onRefreshCachedUrl={vi.fn()}
        onRemoveCachedUrl={vi.fn()}
        cachedUrls={[]}
        onCreateSnippet={vi.fn()}
        onUpdateSnippet={vi.fn()}
        onDeleteSnippet={vi.fn()}
        snippets={[]}
        onSearch={vi.fn()}
        summary={{
          filesCount: 0,
          extractedFilesCount: 0,
          pendingExtractionCount: 0,
          urlsCount: 0,
          snippetsCount: 0,
          totalSize: 0,
          extractedTextLength: 0,
        }}
      />,
    )

    const group = screen.getByRole('radiogroup', {name: 'Extraction Mode'})
    const manual = within(group).getByRole('radio', {name: 'Manual'})
    const auto = within(group).getByRole('radio', {name: 'Auto-extract'})
    expect(manual).toBeChecked()
    expect(auto).not.toBeChecked()

    // Controlled: the parent owns the value, onChange fires once with the new value
    await user.click(auto)
    expect(onExtractionModeChange).toHaveBeenCalledTimes(1)
    expect(onExtractionModeChange).toHaveBeenCalledWith('auto')
    expect(manual).toBeChecked()
  })
})

function renderExportDialog() {
  const onExport = vi.fn()
  render(
    <ExportDialog
      isOpen
      onClose={vi.fn()}
      onExport={onExport}
      conversation={{
        id: 'c1',
        gptId: 'gpt-1',
        title: 'Weekly sync',
        messages: [],
        messageCount: 2,
        createdAt: new Date('2025-08-07T10:00:00.000Z'),
        updatedAt: new Date('2025-08-07T11:00:00.000Z'),
        tags: [],
        isPinned: false,
        isArchived: false,
        pinnedAt: null,
        archivedAt: null,
      }}
    />,
  )
  return {onExport}
}

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})
