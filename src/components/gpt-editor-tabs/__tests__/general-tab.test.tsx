import type {GPTConfiguration} from '@/types/gpt'
import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {useState} from 'react'
import {describe, expect, it, vi} from 'vitest'
import {GeneralTab} from '../general-tab'

const baseGpt: GPTConfiguration = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Test GPT',
  description: 'A GPT',
  systemPrompt: 'Be helpful',
  conversationStarters: ['', ''],
  tools: [],
  knowledge: {files: [], urls: [], extractionMode: 'manual'},
  capabilities: {
    codeInterpreter: false,
    webBrowsing: false,
    imageGeneration: false,
    fileSearch: {enabled: false},
  },
  createdAt: new Date(0),
  updatedAt: new Date(0),
  version: 1,
  tags: [],
  isArchived: false,
  folderId: null,
  archivedAt: null,
}

function Harness() {
  const [gpt, setGpt] = useState(baseGpt)
  return (
    <GeneralTab
      gpt={gpt}
      onUpdate={updates => setGpt(prev => ({...prev, ...updates}))}
      errors={{}}
      handleFieldValidation={vi.fn()}
      hasFieldSuccess={() => false}
    />
  )
}

describe('GeneralTab conversation starters', () => {
  it('keeps the same input mounted and focused while typing into a starter', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    const [input] = screen.getAllByPlaceholderText('e.g. Help me write a blog post...')
    expect(input).toBeDefined()
    await user.click(input as HTMLElement)
    await user.keyboard('Hello')

    const [after] = screen.getAllByPlaceholderText('e.g. Help me write a blog post...')
    expect(after).toBe(input)
    expect(after).toHaveFocus()
    expect(after).toHaveValue('Hello')
  })

  it('keeps remaining starters aligned when one is removed', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    const inputs = screen.getAllByPlaceholderText('e.g. Help me write a blog post...')
    await user.type(inputs[0] as HTMLElement, 'first')
    await user.type(inputs[1] as HTMLElement, 'second')
    await user.click(screen.getAllByRole('button', {name: 'Remove conversation starter'})[0] as HTMLElement)

    const remaining = screen.getAllByPlaceholderText('e.g. Help me write a blog post...')
    expect(remaining).toHaveLength(1)
    expect(remaining[0]).toBe(inputs[1])
    expect(remaining[0]).toHaveValue('second')
  })
})
