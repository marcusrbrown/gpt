import {cleanup} from '@testing-library/react'
import {afterAll, afterEach, beforeEach, vi} from 'vitest'
import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock

const originalConsole = {...console}

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
