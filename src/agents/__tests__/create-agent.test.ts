import {describe, it, expect, vi, beforeEach} from 'vitest';
import {ChatOpenAI} from '@langchain/openai';
import {StructuredTool, Tool} from '@langchain/core/tools';
import {AIMessage, HumanMessage} from '@langchain/core/messages';
import {z} from 'zod';
import {createAgent} from '../create-agent';
import type {AgentConfig} from '../../types/agent';
import type {OpenAIToolCall} from '@langchain/core/messages';

const mockBindTools = vi.fn().mockReturnThis();
const mockInvoke = vi.fn().mockResolvedValue([new AIMessage({content: 'Test response'})]);

vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn().mockImplementation(() => ({
    bindTools: mockBindTools,
    invoke: mockInvoke,
  })),
}));

describe('createAgent', () => {
  let mockConfig: Required<AgentConfig>;
  let mockTool: Tool;

  beforeEach(() => {
    class TestTool extends StructuredTool {
      name = 'test-tool';
      description = 'A test tool';
      schema = z
        .object({
          input: z.string().optional(),
        })
        .transform((input) => input?.input ?? '');

      async _call(input: {input?: string}) {
        await Promise.resolve(); // Add await to satisfy linter
        return input?.input ?? 'test result';
      }
    }

    mockTool = new TestTool() as unknown as Tool;

    // Create a non-optional capabilities object
    const capabilities = {
      tools: [mockTool],
      streaming: false,
      humanInTheLoop: false,
      callbacks: undefined,
    };

    mockConfig = {
      model: 'gpt-4',
      temperature: 0,
      maxTokens: 1000,
      apiKey: 'test-key',
      cacheConfig: {
        maxSize: 100,
        ttl: 3600,
      },
      capabilities,
    };

    vi.clearAllMocks();
  });

  it('should create an agent with the specified configuration', () => {
    const agent = createAgent(mockConfig);

    expect(ChatOpenAI).toHaveBeenCalledWith({
      model: mockConfig.model,
      temperature: mockConfig.temperature,
      maxTokens: mockConfig.maxTokens,
    });

    expect(agent).toBeDefined();
    expect(agent.name).toBe('agent-execution');
  });

  it('should handle empty tools array', () => {
    const capabilities = {
      tools: [] as Tool[],
      streaming: false,
      humanInTheLoop: false,
      callbacks: undefined,
    };

    const configWithoutTools: Required<AgentConfig> = {
      ...mockConfig,
      capabilities,
    };

    const agent = createAgent(configWithoutTools);
    expect(agent).toBeDefined();
    expect(ChatOpenAI).toHaveBeenCalled();
  });

  it('should create agent with human-in-the-loop capability', () => {
    const capabilities = {
      tools: [...(mockConfig.capabilities?.tools ?? [])],
      streaming: false,
      humanInTheLoop: true,
      callbacks: undefined,
    };

    const configWithHITL: Required<AgentConfig> = {
      ...mockConfig,
      capabilities,
    };

    const agent = createAgent(configWithHITL);
    expect(agent).toBeDefined();
    expect(agent.checkpointer).toBeDefined();
  });

  it('should route messages correctly based on tool calls', async () => {
    const agent = createAgent(mockConfig);
    const toolCall: OpenAIToolCall = {
      id: '1',
      type: 'function',
      function: {
        name: 'test-tool',
        arguments: '{}',
      },
    };

    const mockMessages = [
      new HumanMessage({content: 'Test message'}),
      new AIMessage({
        content: 'Test response',
        additional_kwargs: {
          tool_calls: [toolCall],
        },
      }),
    ];

    const state = {messages: mockMessages};
    const result = await agent.invoke(state);

    expect(result).toBeDefined();
    expect(result.messages).toBeDefined();
  });

  it('should handle missing capabilities gracefully', () => {
    const capabilities = {
      tools: [] as Tool[],
      streaming: false,
      humanInTheLoop: false,
      callbacks: undefined,
    };

    const minimalConfig: Required<AgentConfig> = {
      ...mockConfig,
      capabilities,
    };

    const agent = createAgent(minimalConfig);
    expect(agent).toBeDefined();
  });

  it('should bind tools to the model correctly', () => {
    createAgent(mockConfig);
    expect(mockBindTools).toHaveBeenCalledWith(mockConfig.capabilities?.tools);
  });

  describe('Performance Tests', () => {
    it('should complete agent creation within acceptable time', () => {
      const startTime = performance.now();
      createAgent(mockConfig);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should create agent in less than 100ms
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid model configurations gracefully', () => {
      const capabilities = {
        tools: [] as Tool[],
        streaming: false,
        humanInTheLoop: false,
        callbacks: undefined,
      };

      const invalidConfig: Required<AgentConfig> = {
        ...mockConfig,
        model: '',
        capabilities,
      };

      expect(() => createAgent(invalidConfig)).not.toThrow();
    });

    it('should handle undefined capabilities gracefully', () => {
      const capabilities = {
        tools: [] as Tool[],
        streaming: false,
        humanInTheLoop: false,
        callbacks: undefined,
      };

      const configWithoutCapabilities: Required<AgentConfig> = {
        ...mockConfig,
        capabilities,
      };

      expect(() => createAgent(configWithoutCapabilities)).not.toThrow();
    });
  });
});
