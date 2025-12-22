import {cleanup} from '@testing-library/react'
import {afterAll, afterEach, beforeAll, beforeEach, vi} from 'vitest'
import 'fake-indexeddb/auto'
import '@testing-library/jest-dom'

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock

const originalConsole = {...console}

// Create a storage object to persist data between tests
const storage = new Map<string, string>()

// Create a simple localStorage mock
const localStorageMock = {
  getItem: vi.fn((key: string) => {
    const value = storage.get(key)
    return value === undefined ? null : value
  }),
  setItem: vi.fn((key: string, value: string) => {
    storage.set(key, value)
  }),
  clear: vi.fn(() => {
    storage.clear()
  }),
  removeItem: vi.fn((key: string) => {
    storage.delete(key)
  }),
  length: 0,
  key: vi.fn((index: number) => {
    const keys = Array.from(storage.keys())
    return index < keys.length ? keys[index] : null
  }),
}

// Configure global test environment
beforeAll(() => {
  // Setup localStorage mock
  globalThis.localStorage = localStorageMock as unknown as Storage
})

beforeEach(() => {
  console.log = vi.fn()
  console.error = vi.fn()
  console.warn = vi.fn()
  console.info = vi.fn()
})

afterEach(() => {
  console.log = originalConsole.log.bind(console)
  console.error = originalConsole.error.bind(console)
  console.warn = originalConsole.warn.bind(console)
  console.info = originalConsole.info.bind(console)
  vi.clearAllMocks()
  cleanup()
  localStorage.clear()
})

afterAll(() => {
  // Cleanup global mocks
  vi.restoreAllMocks()
})
