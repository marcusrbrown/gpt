import type {GPTConfiguration} from '@/types/gpt'
import {StorageProvider} from '@/contexts/storage-provider'
import {useStorage} from '@/hooks/use-storage'
import {deleteDatabase} from '@/lib/database'
import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {useEffect, useState} from 'react'
import {v4 as uuidv4} from 'uuid'
import {vi} from 'vitest'
import 'fake-indexeddb/auto'
import '@testing-library/jest-dom'

function TestComponent() {
  const {getAllGPTs, saveGPT, isLoading: providerLoading} = useStorage()
  const [gpts, setGpts] = useState<GPTConfiguration[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (providerLoading) return
    getAllGPTs()
      .then(setGpts)
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [getAllGPTs, providerLoading])

  const handleAddGPT = async () => {
    const newGPT: GPTConfiguration = {
      id: uuidv4(),
      name: 'Test GPT',
      description: 'Test Description',
      systemPrompt: 'You are a test assistant',
      tools: [],
      knowledge: {
        files: [],
        urls: [],
        extractionMode: 'manual' as const,
      },
      capabilities: {
        codeInterpreter: false,
        webBrowsing: false,
        imageGeneration: false,
        fileSearch: {
          enabled: false,
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      tags: [],
      isArchived: false,
      folderId: null,
      archivedAt: null,
    }
    await saveGPT(newGPT)
    const updated = await getAllGPTs()
    setGpts(updated)
  }

  if (isLoading) {
    return <div data-testid="loading">Loading...</div>
  }

  return (
    <div>
      <div data-testid="gpt-count">{gpts.length}</div>
      <button
        type="button"
        onClick={() => {
          handleAddGPT().catch(console.error)
        }}
      >
        Add GPT
      </button>
    </div>
  )
}

describe('storageContext', () => {
  beforeEach(async () => {
    await deleteDatabase()
  })

  afterEach(async () => {
    await deleteDatabase()
  })

  it('should provide storage context to children', async () => {
    render(
      <StorageProvider>
        <TestComponent />
      </StorageProvider>,
    )

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument()
    })

    expect(screen.getByTestId('gpt-count')).toHaveTextContent('0')
  })

  it('should throw error when used outside provider', () => {
    const consoleError = console.error
    console.error = vi.fn()

    expect(() => render(<TestComponent />)).toThrow('useStorage must be used within a StorageProvider')

    console.error = consoleError
  })

  it('should handle state updates', async () => {
    const user = userEvent.setup()
    render(
      <StorageProvider>
        <TestComponent />
      </StorageProvider>,
    )

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument()
    })

    expect(screen.getByTestId('gpt-count')).toHaveTextContent('0')

    await user.click(screen.getByRole('button', {name: 'Add GPT'}))

    await waitFor(() => {
      expect(screen.getByTestId('gpt-count')).toHaveTextContent('1')
    })
  })

  it('should persist state across renders', async () => {
    const user = userEvent.setup()
    const {unmount} = render(
      <StorageProvider>
        <TestComponent />
      </StorageProvider>,
    )

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', {name: 'Add GPT'}))

    await waitFor(() => {
      expect(screen.getByTestId('gpt-count')).toHaveTextContent('1')
    })

    unmount()

    render(
      <StorageProvider>
        <TestComponent />
      </StorageProvider>,
    )

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByTestId('gpt-count')).toHaveTextContent('1')
    })
  })
})
