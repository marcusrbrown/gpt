import {vi} from 'vitest';
import {afterEach} from 'vitest';

// Mock console methods to avoid noise in test output
const originalConsole = {...console};

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
});
