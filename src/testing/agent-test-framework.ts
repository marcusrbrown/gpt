import {HumanMessage} from '@langchain/core/messages';
import {type AgentResponse, type AgentConfig} from '../types/agent';
import {z} from 'zod';
import {createAgent} from '../agents/create-agent';

/**
 * Test case definition for agent behavior testing
 */
export interface AgentTestCase {
  name: string;
  input: string;
  expectedOutput?: string;
  expectedBehavior?: (response: AgentResponse) => boolean;
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
  timeout?: number;
  retries?: number;
}

/**
 * Performance metrics collected during agent testing
 */
export interface AgentPerformanceMetrics {
  latency: {
    mean: number;
    p50: number;
    p95: number;
    p99: number;
  };
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
  };
  success: {
    rate: number;
    total: number;
    failed: number;
  };
  cacheHits?: {
    rate: number;
    total: number;
  };
}

/**
 * Configuration for the agent test framework
 */
export const TestFrameworkConfigSchema = z.object({
  concurrency: z.number().positive().default(1),
  timeoutMs: z.number().positive().default(30000),
  retries: z.number().min(0).default(3),
  warmup: z.boolean().default(true),
  collectMetrics: z.boolean().default(true),
  compareBaseline: z.boolean().default(false),
  baselineResults: z.record(z.any()).optional(),
  metricThresholds: z
    .object({
      maxLatencyMs: z.number().positive().optional(),
      minSuccessRate: z.number().min(0).max(1).optional(),
      maxTokenUsage: z.number().positive().optional(),
    })
    .optional(),
});

export type TestFrameworkConfig = z.infer<typeof TestFrameworkConfigSchema>;

type CompiledAgentGraph = ReturnType<typeof createAgent>;

/**
 * A comprehensive testing framework for evaluating AI agents across multiple dimensions:
 * - Behavioral testing: Validates expected agent responses and behaviors
 * - Performance testing: Measures latency, token usage, and success rates
 * - Cross-platform comparison: Compares metrics across different LLM platforms
 *
 * Features:
 * - Configurable concurrency, timeouts, and retries
 * - Optional warmup runs
 * - Metric collection and baseline comparison
 * - Threshold validation for key metrics
 *
 * @example
 * ```ts
 * const framework = new AgentTestFramework({
 *   concurrency: 1,
 *   timeoutMs: 30000,
 *   retries: 2,
 *   warmup: true,
 *   collectMetrics: true
 * });
 *
 * const results = await framework.runBehavioralTests(
 *   { model: "gpt-4", temperature: 0 },
 *   [
 *     {
 *       name: "Basic QA",
 *       input: "What is 2+2?",
 *       expectedOutput: "4"
 *     }
 *   ]
 * );
 * ```
 */
export class AgentTestFramework {
  private config: TestFrameworkConfig;

  constructor(config: TestFrameworkConfig) {
    this.config = TestFrameworkConfigSchema.parse(config);
  }

  /**
   * Runs a suite of behavioral tests to validate agent responses and behaviors.
   * Supports expected output matching and custom behavior validation.
   *
   * Features:
   * - Automatic retries on failure
   * - Optional warmup runs
   * - Metric collection
   * - Baseline comparison
   * - Threshold validation
   *
   * @param agentConfig - Configuration for the agent under test
   * @param testCases - Array of test cases to run
   * @returns Object containing passed/failed tests and optional metrics
   *
   * @example
   * ```ts
   * const results = await framework.runBehavioralTests(
   *   { model: "gpt-4" },
   *   [{
   *     name: "Test case",
   *     input: "Hello",
   *     expectedOutput: "Hi there!"
   *   }]
   * );
   * ```
   */
  async runBehavioralTests(
    agentConfig: AgentConfig,
    testCases: AgentTestCase[],
  ): Promise<{
    passed: AgentTestCase[];
    failed: Array<{test: AgentTestCase; error: Error}>;
    metrics?: AgentPerformanceMetrics;
  }> {
    const passed: AgentTestCase[] = [];
    const failed: Array<{test: AgentTestCase; error: Error}> = [];
    const metrics: AgentPerformanceMetrics = this.initializeMetrics();

    const agent = createAgent(agentConfig);

    // Optional warmup
    if (this.config.warmup) {
      await this.warmupAgent(agent);
    }

    for (const testCase of testCases) {
      try {
        // Setup
        if (testCase.setup) await testCase.setup();

        // Run test with retries
        const maxRetries = testCase.retries ?? this.config.retries;
        let success = false;

        for (let attempt = 0; attempt <= maxRetries && !success; attempt++) {
          try {
            const startTime = performance.now();
            const response = await agent.invoke({
              messages: [{type: 'human', content: testCase.input}],
            });
            const endTime = performance.now();

            // Update metrics
            if (this.config.collectMetrics) {
              this.updateMetrics(metrics, {
                latency: endTime - startTime,
                success: true,
                tokenUsage: {cached: 0, total: 0}, // TODO: Implement token tracking
                isRetry: attempt > 0,
              });
            }

            // Verify response
            const lastMessage = response.messages[response.messages.length - 1];
            if (testCase.expectedOutput && lastMessage?.content !== testCase.expectedOutput) {
              throw new Error(
                `Output mismatch. Expected: ${testCase.expectedOutput}, Got: ${typeof lastMessage?.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage?.content)}`,
              );
            }

            if (testCase.expectedBehavior && !testCase.expectedBehavior({output: lastMessage} as AgentResponse)) {
              throw new Error('Expected behavior validation failed');
            }

            success = true;
          } catch (error) {
            if (attempt === maxRetries) {
              // Only update metrics on final failure
              if (this.config.collectMetrics) {
                this.updateMetrics(metrics, {
                  success: false,
                  isRetry: attempt > 0,
                });
              }
              throw error;
            }
            // Wait before retry
            await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          }
        }

        passed.push(testCase);
      } catch (error) {
        failed.push({test: testCase, error: error as Error});
      } finally {
        // Teardown
        if (testCase.teardown) await testCase.teardown();
      }
    }

    // Compare with baseline if enabled
    if (this.config.compareBaseline && this.config.baselineResults) {
      this.compareWithBaseline(metrics, this.config.baselineResults as AgentPerformanceMetrics);
    }

    // Validate against thresholds
    if (this.config.metricThresholds) {
      this.validateMetrics(metrics, this.config.metricThresholds);
    }

    return {
      passed,
      failed,
      ...(this.config.collectMetrics ? {metrics} : {}),
    };
  }

  /**
   * Runs performance tests to measure agent latency, token usage, and reliability.
   * Executes each test case multiple times to gather statistical metrics.
   *
   * @param agentConfig - Configuration for the agent under test
   * @param testCases - Array of test cases with iteration counts
   * @returns Collected performance metrics
   *
   * @example
   * ```ts
   * const metrics = await framework.runPerformanceTests(
   *   { model: "gpt-4" },
   *   [{
   *     input: "Test prompt",
   *     iterations: 100
   *   }]
   * );
   * ```
   */
  async runPerformanceTests(
    agentConfig: AgentConfig,
    testCases: Array<{input: string; iterations: number}>,
  ): Promise<AgentPerformanceMetrics> {
    const metrics = this.initializeMetrics();
    const agent = createAgent(agentConfig);

    for (const {input, iterations} of testCases) {
      const latencies: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        try {
          await agent.invoke({messages: [{type: 'human', content: input}]});
          const endTime = performance.now();
          latencies.push(endTime - startTime);

          this.updateMetrics(metrics, {
            latency: endTime - startTime,
            success: true,
            tokenUsage: {cached: 0, total: 0}, // TODO: Implement token tracking
            isRetry: false,
          });
        } catch {
          this.updateMetrics(metrics, {
            success: false,
            isRetry: false,
          });
        }
      }

      // Calculate percentiles
      metrics.latency = this.calculatePercentiles(latencies);
    }

    return metrics;
  }

  /**
   * Compares agents across different LLM platforms.
   * Runs the same test cases against multiple configurations and collects metrics.
   *
   * @param configs - Array of agent configurations to compare
   * @param testCases - Test cases to run on each configuration
   * @returns Record of metrics keyed by model name
   *
   * @example
   * ```ts
   * const comparison = await framework.comparePlatforms(
   *   [
   *     { model: "gpt-4" },
   *     { model: "claude-3" }
   *   ],
   *   testCases
   * );
   * ```
   */
  async comparePlatforms(
    configs: AgentConfig[],
    testCases: AgentTestCase[],
  ): Promise<Record<string, AgentPerformanceMetrics>> {
    const results: Record<string, AgentPerformanceMetrics> = {};

    for (const config of configs) {
      const {metrics} = await this.runBehavioralTests(config, testCases);
      if (metrics) {
        results[config.model] = metrics;
      }
    }

    return results;
  }

  private initializeMetrics(): AgentPerformanceMetrics {
    return {
      latency: {mean: 0, p50: 0, p95: 0, p99: 0},
      tokenUsage: {prompt: 0, completion: 0, total: 0},
      memoryUsage: {
        heapUsed: 0,
        heapTotal: 0,
      },
      success: {rate: 0, total: 0, failed: 0},
      cacheHits: {rate: 0, total: 0},
    };
  }

  private updateMetrics(
    metrics: AgentPerformanceMetrics,
    update: {
      latency?: number;
      success: boolean;
      tokenUsage?: {cached: number; total: number};
      isRetry?: boolean;
    },
  ) {
    // Only increment total for first attempts
    if (!update.isRetry) {
      metrics.success.total++;
    }

    // Increment failed count only on final failure
    if (!update.success && (!update.isRetry || update.isRetry)) {
      metrics.success.failed++;
    }

    // Calculate success rate
    metrics.success.rate =
      metrics.success.total > 0 ? (metrics.success.total - metrics.success.failed) / metrics.success.total : 0;

    // Update latency if provided
    if (update.latency) {
      metrics.latency.mean =
        (metrics.latency.mean * (metrics.success.total - 1) + update.latency) / metrics.success.total;
    }

    // Update token usage if provided
    if (update.tokenUsage) {
      metrics.tokenUsage.total += update.tokenUsage.total;
      if (update.tokenUsage.cached > 0) {
        metrics.cacheHits!.total += update.tokenUsage.cached;
        metrics.cacheHits!.rate = metrics.cacheHits!.total / metrics.tokenUsage.total;
      }
    }

    // Update memory usage
    const memUsage = process.memoryUsage();
    metrics.memoryUsage = {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
    };
  }

  private async warmupAgent(agent: CompiledAgentGraph) {
    await agent.invoke({
      messages: [new HumanMessage('Warmup test input')],
    });
  }

  private compareWithBaseline(current: AgentPerformanceMetrics, baseline: AgentPerformanceMetrics) {
    const latencyDiff = (current.latency.mean - baseline.latency.mean) / baseline.latency.mean;
    const successDiff = current.success.rate - baseline.success.rate;
    const tokenDiff = (current.tokenUsage.total - baseline.tokenUsage.total) / baseline.tokenUsage.total;

    if (latencyDiff > 0.1) {
      console.warn(`Latency regression: ${(latencyDiff * 100).toFixed(2)}% slower than baseline`);
    }
    if (successDiff < -0.05) {
      console.warn(`Success rate regression: ${(Math.abs(successDiff) * 100).toFixed(2)}% lower than baseline`);
    }
    if (tokenDiff > 0.1) {
      console.warn(`Token usage regression: ${(tokenDiff * 100).toFixed(2)}% higher than baseline`);
    }
  }

  private calculatePercentiles(latencies: number[]): {mean: number; p50: number; p95: number; p99: number} {
    if (latencies.length === 0) {
      return {mean: 0, p50: 0, p95: 0, p99: 0};
    }

    latencies.sort((a, b) => a - b);
    return {
      mean: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      p50: latencies[Math.floor(latencies.length * 0.5)] || 0,
      p95: latencies[Math.floor(latencies.length * 0.95)] || 0,
      p99: latencies[Math.floor(latencies.length * 0.99)] || 0,
    };
  }

  private validateMetrics(
    metrics: AgentPerformanceMetrics,
    thresholds: NonNullable<TestFrameworkConfig['metricThresholds']>,
  ) {
    if (thresholds.maxLatencyMs && metrics.latency.mean > thresholds.maxLatencyMs) {
      throw new Error(`Mean latency ${metrics.latency.mean}ms exceeds threshold ${thresholds.maxLatencyMs}ms`);
    }
    if (thresholds.minSuccessRate && metrics.success.rate < thresholds.minSuccessRate) {
      throw new Error(`Success rate ${metrics.success.rate} below threshold ${thresholds.minSuccessRate}`);
    }
    if (thresholds.maxTokenUsage && metrics.tokenUsage.total > thresholds.maxTokenUsage) {
      throw new Error(`Token usage ${metrics.tokenUsage.total} exceeds threshold ${thresholds.maxTokenUsage}`);
    }
  }
}
