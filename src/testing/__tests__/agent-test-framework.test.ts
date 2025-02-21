import {describe, it, expect, vi, beforeEach} from 'vitest';
import {AgentTestFramework, type AgentTestCase} from '../agent-test-framework';
import {type AgentResponse} from '../../types/agent';
import {AIMessage} from '@langchain/core/messages';
import {createAgent} from '../../agents/create-agent';

// Mock the create-agent module
vi.mock('../../agents/create-agent');

describe('AgentTestFramework', () => {
  let testFramework: AgentTestFramework;
  let mockInvoke: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset mocks before each test
    vi.resetAllMocks();

    // Initialize mock function
    mockInvoke = vi.fn();

    // Setup createAgent mock implementation
    (createAgent as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      invoke: mockInvoke,
    }));

    // Initialize test framework with default config
    testFramework = new AgentTestFramework({
      concurrency: 1,
      timeoutMs: 1000,
      retries: 1,
      warmup: false,
      collectMetrics: true,
      compareBaseline: false,
    });
  });

  describe('runBehavioralTests', () => {
    it('should run test cases and collect metrics', async () => {
      mockInvoke.mockResolvedValue({
        messages: [new AIMessage('Test response')],
      });

      const testCases: AgentTestCase[] = [
        {
          name: 'Basic test',
          input: 'Test input',
          expectedOutput: 'Test response',
        },
        {
          name: 'Custom behavior test',
          input: 'Test input 2',
          expectedBehavior: (response: AgentResponse) => response.output.content === 'Test response',
        },
      ];

      const result = await testFramework.runBehavioralTests(
        {
          model: 'gpt-4',
          temperature: 0,
          maxTokens: 1000,
        },
        testCases,
      );

      expect(result.passed).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      expect(result.metrics).toBeDefined();
      expect(result.metrics?.success.rate).toBe(1);
    });

    it('should handle test failures', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Test error'));

      const testCases: AgentTestCase[] = [
        {
          name: 'Failing test',
          input: 'Test input',
          expectedOutput: 'Test response',
          retries: 0,
        },
      ];

      const result = await testFramework.runBehavioralTests(
        {
          model: 'gpt-4',
          temperature: 0,
          maxTokens: 1000,
        },
        testCases,
      );

      expect(result.passed).toHaveLength(0);
      expect(result.failed).toHaveLength(1);
      expect(result.metrics?.success.total).toBe(1);
      expect(result.metrics?.success.failed).toBe(1);
      expect(result.metrics?.success.rate).toBe(0);
    });

    it('should respect retry configuration', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('First attempt')).mockResolvedValueOnce({
        messages: [new AIMessage('Test response')],
      });

      const testCases: AgentTestCase[] = [
        {
          name: 'Retry test',
          input: 'Test input',
          expectedOutput: 'Test response',
          retries: 1,
        },
      ];

      const result = await testFramework.runBehavioralTests(
        {
          model: 'gpt-4',
          temperature: 0,
          maxTokens: 1000,
        },
        testCases,
      );

      expect(mockInvoke).toHaveBeenCalledTimes(2);
      expect(result.passed).toHaveLength(1);
      expect(result.failed).toHaveLength(0);
    });
  });

  describe('runPerformanceTests', () => {
    it('should collect performance metrics', async () => {
      mockInvoke.mockResolvedValue({
        messages: [new AIMessage('Test response')],
      });

      const testCases = [
        {
          input: 'Test input',
          iterations: 3,
        },
      ];

      const metrics = await testFramework.runPerformanceTests(
        {
          model: 'gpt-4',
          temperature: 0,
          maxTokens: 1000,
        },
        testCases,
      );

      expect(metrics.latency).toBeDefined();
      expect(metrics.tokenUsage).toBeDefined();
      expect(metrics.success.total).toBe(3);
      expect(metrics.success.rate).toBe(1);
    });

    it('should handle errors during performance testing', async () => {
      mockInvoke.mockRejectedValue(new Error('Performance test error'));

      const testCases = [
        {
          input: 'Test input',
          iterations: 2,
        },
      ];

      const metrics = await testFramework.runPerformanceTests(
        {
          model: 'gpt-4',
          temperature: 0,
          maxTokens: 1000,
        },
        testCases,
      );

      expect(metrics.success.total).toBe(2);
      expect(metrics.success.failed).toBe(2);
      expect(metrics.success.rate).toBe(0);
    });
  });

  describe('comparePlatforms', () => {
    it('should compare metrics across different configurations', async () => {
      mockInvoke.mockResolvedValue({
        messages: [new AIMessage('Test response')],
      });

      const configs = [
        {
          model: 'gpt-4',
          temperature: 0,
          maxTokens: 1000,
        },
        {
          model: 'claude-3',
          temperature: 0,
          maxTokens: 1000,
        },
      ];

      const testCases: AgentTestCase[] = [
        {
          name: 'Cross-platform test',
          input: 'Test input',
          expectedOutput: 'Test response',
        },
      ];

      const results = await testFramework.comparePlatforms(configs, testCases);

      expect(Object.keys(results)).toHaveLength(2);
      expect(results['gpt-4']).toBeDefined();
      expect(results['claude-3']).toBeDefined();
    });
  });
});
