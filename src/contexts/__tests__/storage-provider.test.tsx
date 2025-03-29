import {render, screen} from '@testing-library/react';
import '@testing-library/jest-dom';
import {StorageProvider} from '../storage-provider';
import {useStorage} from '../../hooks/use-storage';
import {GPTConfiguration} from '../../types/gpt';
import {v4 as uuidv4} from 'uuid';
import {vi} from 'vitest';
import userEvent from '@testing-library/user-event';

// Test component that uses the storage context
function TestComponent() {
  const {getAllGPTs, saveGPT} = useStorage();
  const gpts = getAllGPTs();

  return (
    <div>
      <div data-testid='gpt-count'>{gpts.length}</div>
      <button
        onClick={() => {
          const newGPT: GPTConfiguration = {
            id: uuidv4(),
            name: 'Test GPT',
            description: 'Test Description',
            systemPrompt: 'You are a test assistant',
            tools: [],
            knowledge: {
              files: [],
              urls: [],
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
          };
          saveGPT(newGPT);
        }}
      >
        Add GPT
      </button>
    </div>
  );
}

describe('StorageContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('should provide storage context to children', () => {
    render(
      <StorageProvider>
        <TestComponent />
      </StorageProvider>,
    );

    expect(screen.getByTestId('gpt-count')).toHaveTextContent('0');
  });

  test('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleError = console.error;
    console.error = vi.fn();

    expect(() => render(<TestComponent />)).toThrow('useStorage must be used within a StorageProvider');

    console.error = consoleError;
  });

  test('should handle state updates', async () => {
    const user = userEvent.setup();
    render(
      <StorageProvider>
        <TestComponent />
      </StorageProvider>,
    );

    expect(screen.getByTestId('gpt-count')).toHaveTextContent('0');

    // Click the button to add a new GPT
    await user.click(screen.getByRole('button', {name: 'Add GPT'}));

    expect(screen.getByTestId('gpt-count')).toHaveTextContent('1');
  });

  test('should persist state across renders', async () => {
    const user = userEvent.setup();
    const {unmount} = render(
      <StorageProvider>
        <TestComponent />
      </StorageProvider>,
    );

    // Add a GPT
    await user.click(screen.getByRole('button', {name: 'Add GPT'}));

    // Unmount and remount to test persistence
    unmount();

    render(
      <StorageProvider>
        <TestComponent />
      </StorageProvider>,
    );

    expect(screen.getByTestId('gpt-count')).toHaveTextContent('1');
  });
});
