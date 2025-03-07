import {vi} from 'vitest';
import {afterEach, beforeAll, afterAll} from 'vitest';
import '@testing-library/jest-dom';
import {cleanup} from '@testing-library/react';

// Mock console methods to avoid noise in test output
const originalConsole = {...console};

// Create a storage object to persist data between tests
const storage: Record<string, string> = {};

const localStorageMock = {
  getItem: vi.fn((key: string) => storage[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    storage[key] = value;
  }),
  clear: vi.fn(() => {
    Object.keys(storage).forEach((key) => delete storage[key]);
  }),
  removeItem: vi.fn((key: string) => {
    delete storage[key];
  }),
  length: 0,
  key: vi.fn((index: number) => Object.keys(storage)[index] || null),
};

// Mock window object
const windowMock = {
  localStorage: localStorageMock,
  navigator: {
    clipboard: {
      writeText: vi.fn(),
      readText: vi.fn(),
    },
  },
};

beforeAll(() => {
  // @ts-expect-error - we're mocking window
  global.window = windowMock;
  global.localStorage = localStorageMock;
  // @ts-expect-error - we're mocking navigator with limited properties
  global.navigator = windowMock.navigator;
});

beforeEach(() => {
  console.log = vi.fn();
  console.error = vi.fn();
  console.warn = vi.fn();
  console.info = vi.fn();
});

afterEach(() => {
  console.log = originalConsole.log.bind(console);
  console.error = originalConsole.error.bind(console);
  console.warn = originalConsole.warn.bind(console);
  console.info = originalConsole.info.bind(console);
  vi.clearAllMocks();
  cleanup();
  localStorage.clear();
});

afterAll(() => {
  // @ts-expect-error - cleanup window mock
  global.window = undefined;
  // @ts-expect-error - cleanup localStorage mock
  global.localStorage = undefined;
  // @ts-expect-error - cleanup navigator mock
  global.navigator = undefined;
});
