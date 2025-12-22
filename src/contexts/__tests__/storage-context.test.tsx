import type {GPTConfiguration} from '@/types/gpt'
import {useStorage} from '@/hooks/use-storage'
import {deleteDatabase} from '@/lib/database'
import {act, render, screen, waitFor} from '@testing-library/react'
import {StorageProvider} from '../storage-provider'
import 'fake-indexeddb/auto'

function TestComponent({onMount}: {onMount?: (storage: ReturnType<typeof useStorage>) => void}) {
  const storage = useStorage()
  if (onMount) {
    onMount(storage)
  }
  return <div data-testid="test-component">Loaded</div>
}

function createTestGPT(overrides: Partial<GPTConfiguration> = {}): GPTConfiguration {
  return {
    id: crypto.randomUUID(),
    name: 'Test GPT',
    description: 'A test GPT configuration',
    systemPrompt: 'You are a helpful assistant.',
    tools: [],
    knowledge: {files: [], urls: []},
    capabilities: {
      codeInterpreter: false,
      webBrowsing: false,
      imageGeneration: false,
      fileSearch: {enabled: false},
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    tags: [],
    isArchived: false,
    ...overrides,
  }
}

describe('StorageContext', () => {
  beforeEach(async () => {
    await deleteDatabase()
  })

  it('provides storage context to children', async () => {
    render(
      <StorageProvider>
        <TestComponent />
      </StorageProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('test-component')).toBeInTheDocument()
    })
  })

  it('initially returns empty GPT list', async () => {
    let capturedStorage: ReturnType<typeof useStorage> | null = null

    render(
      <StorageProvider>
        <TestComponent
          onMount={storage => {
            capturedStorage = storage
          }}
        />
      </StorageProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('test-component')).toBeInTheDocument()
    })

    expect(capturedStorage).not.toBeNull()
    const gpts = await capturedStorage!.getAllGPTs()
    expect(gpts).toHaveLength(0)
  })

  it('can save and retrieve a GPT', async () => {
    let capturedStorage: ReturnType<typeof useStorage> | null = null

    render(
      <StorageProvider>
        <TestComponent
          onMount={storage => {
            capturedStorage = storage
          }}
        />
      </StorageProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('test-component')).toBeInTheDocument()
    })

    const testGPT = createTestGPT({name: 'My Test GPT'})

    await act(async () => {
      await capturedStorage!.saveGPT(testGPT)
    })

    const retrieved = await capturedStorage!.getGPT(testGPT.id)
    expect(retrieved).toBeDefined()
    expect(retrieved?.name).toBe('My Test GPT')
  })

  it('throws when used outside provider', () => {
    const consoleError = console.error
    console.error = () => {}

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useStorage must be used within a StorageProvider')

    console.error = consoleError
  })
})
