import {AgentTestFramework, type AgentTestCase} from '../agent-test-framework';
import {type AgentConfig} from '../../types/agent';

async function main() {
  // Initialize test framework
  const testFramework = new AgentTestFramework({
    concurrency: 1,
    timeoutMs: 30000,
    retries: 2,
    warmup: true,
    collectMetrics: true,
    compareBaseline: true,
    baselineResults: {
      // Example baseline metrics from previous runs
      latency: {mean: 500, p50: 450, p95: 750, p99: 1000},
      tokenUsage: {prompt: 100, completion: 50, total: 150},
      memoryUsage: {heapUsed: 50000000, heapTotal: 100000000},
      success: {rate: 0.95, total: 100, failed: 5},
    },
    metricThresholds: {
      maxLatencyMs: 1000,
      minSuccessRate: 0.9,
      maxTokenUsage: 200,
    },
  });

  // Define test cases
  const behavioralTests: AgentTestCase[] = [
    {
      name: 'Basic question answering',
      input: 'What is the capital of France?',
      expectedOutput: 'The capital of France is Paris.',
    },
    {
      name: 'Code analysis',
      input: 'Analyze this code: function add(a, b) { return a + b; }',
      expectedBehavior: (response) => {
        const content = response.output.content;
        if (typeof content !== 'string') return false;
        return content.includes('function') && content.includes('parameters') && content.includes('return');
      },
    },
    {
      name: 'Error handling',
      input: '',
      expectedBehavior: (response) => {
        const content = response.output.content;
        return typeof content === 'string' && content.includes('error');
      },
    },
  ];

  // Define performance test cases
  const performanceTests = [
    {
      input: 'What is 2 + 2?',
      iterations: 10,
    },
    {
      input: 'Write a function to calculate fibonacci numbers.',
      iterations: 5,
    },
  ];

  // Define different agent configurations for comparison
  const baseConfig: AgentConfig = {
    model: 'gpt-4',
    temperature: 0,
    maxTokens: 1000,
    apiKey: process.env.OPENAI_API_KEY,
    cacheConfig: {
      maxSize: 1000,
      ttl: 3600000,
    },
    capabilities: {
      tools: [],
      streaming: false,
      humanInTheLoop: false,
    },
  };

  const configs: AgentConfig[] = [
    baseConfig,
    {
      ...baseConfig,
      model: 'gpt-3.5-turbo',
    },
  ];

  if (!baseConfig.apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  try {
    // Run behavioral tests
    console.log('\nRunning behavioral tests...');
    const behavioralResults = await testFramework.runBehavioralTests(baseConfig, behavioralTests);
    console.log('Behavioral test results:', {
      passed: behavioralResults.passed.length,
      failed: behavioralResults.failed.length,
      metrics: behavioralResults.metrics,
    });

    // Run performance tests
    console.log('\nRunning performance tests...');
    const performanceMetrics = await testFramework.runPerformanceTests(baseConfig, performanceTests);
    console.log('Performance test metrics:', performanceMetrics);

    // Compare different platforms
    console.log('\nComparing platforms...');
    const platformComparison = await testFramework.comparePlatforms(configs, behavioralTests);
    console.log('Platform comparison results:', platformComparison);
  } catch (error) {
    console.error('Error during testing:', error);
    process.exit(1);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export {main as runTestExample};
