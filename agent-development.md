# AI Agent Development Guide

## Overview

This guide provides a comprehensive framework for developing AI agents within the GPT project. The project focuses on research and development of LLM-powered AI agents and assistants, supporting multiple AI platforms including Ollama, Anthropic, and Azure OpenAI Service.

## Core Concepts

### Agent Architecture

An AI agent consists of three primary components [^1]:

1. **Sensors**: Input processors that handle text, structured data, code, or multimodal content
2. **Reasoning Engine**: LLM-based decision-making system that processes inputs and determines actions
3. **Actuators**: Output handlers that execute actions and interact with external systems

### Agent Types

The project supports multiple agent types [^2]:

- **Reactive Agents**: Simple input-output processors
- **Memory-Based Agents**: Agents with state management and context awareness
- **Goal-Based Agents**: Task-oriented agents with specific objectives
- **Learning Agents**: Adaptive agents that improve through feedback

## Implementation Guide

# Project Setup

Install the required dependencies:

```bash
pnpm add @langchain/core @langchain/langgraph @langchain/openai @langchain/community
```

# Agent State Definition

LangGraph uses state channels for managing agent state [^4]:

```typescript
import {StateGraph, Channel, type NodeType} from "@langchain/langgraph";
import {BaseMessage, HumanMessage, AIMessage} from "@langchain/core/messages";
import {ChatPromptTemplate, MessagesPlaceholder} from "@langchain/core/prompts";
import {ChatOpenAI} from "@langchain/openai";
import {ToolNode} from "@langchain/langgraph/prebuilt";
import {z} from "zod";

// Define agent state
interface AgentState {
  messages: BaseMessage[];
  context: {
    workspace: string;
    tools: string[];
    metadata: Record<string, unknown>;
  };
}

// Create state channels
const channels = {
  messages: new Channel<BaseMessage[]>(),
  context: new Channel<AgentState["context"]>(),
};

// Initialize graph with state
const graph = new StateGraph({
  channels,
  initialState: {
    messages: [],
    context: {
      workspace: process.cwd(),
      tools: [],
      metadata: {},
    },
  },
});
```

# Tool Implementation

Create platform-agnostic tools using LangGraph's ToolNode [^5]:

```typescript
import {ToolNode} from "@langchain/langgraph/prebuilt";
import {z} from "zod";
import type {Tool} from "@langchain/core/tools";

// Define tool schema
const CodeAnalysisSchema = z.object({
  code: z.string(),
  language: z.string().optional(),
  depth: z.number().optional(),
});

// Create tool node
const createAnalysisTools = () => {
  const tools: Tool[] = [
    {
      name: "analyze_code",
      description: "Analyzes code quality and security",
      schema: CodeAnalysisSchema,
      call: async (input) => {
        // Implement analysis logic
        return {
          quality: "high",
          issues: [],
          metrics: {complexity: "low"},
        };
      },
    },
  ];

  return new ToolNode(tools);
};
```

# Agent Workflow

Define the agent's reasoning process using LangGraph's workflow system [^6]:

```typescript
import {StateGraph, type NodeType} from "@langchain/langgraph";
import {ChatOpenAI} from "@langchain/openai";
import {ChatPromptTemplate, MessagesPlaceholder} from "@langchain/core/prompts";
import {RunnableSequence} from "@langchain/core/runnables";

// Create model with tool binding
const model = new ChatOpenAI({
  modelName: "gpt-4",
  temperature: 0,
});

// Define agent prompt
const prompt = ChatPromptTemplate.fromMessages([
  ["system", "You are an AI development assistant."],
  new MessagesPlaceholder("chat_history"),
  ["human", "{input}"],
  new MessagesPlaceholder("agent_scratchpad"),
]);

// Define workflow nodes
const agentNode: NodeType = async (state: AgentState) => {
  const response = await model.invoke(state.messages);
  return {messages: [...state.messages, response]};
};

const toolNode = createAnalysisTools();

// Create workflow
const workflow = new StateGraph()
  .addNode("agent", agentNode)
  .addNode("tools", toolNode)
  .addEdge("agent", "tools")
  .addConditionalEdges("agent", (state) => {
    const lastMessage = state.messages[state.messages.length - 1];
    return lastMessage.additional_kwargs?.tool_calls ? "tools" : "__end__";
  });
```

# Memory and Persistence

Implement durable state management using Postgres [^7]:

```typescript
import {Pool} from "pg";
import {PostgresCheckpointer} from "@langchain/langgraph-checkpoint-postgres";
import type {CheckpointerConfig} from "@langchain/core/checkpointers";

// Create Postgres connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production",
});

// Initialize persistence
const checkpointer = new PostgresCheckpointer({
  pool,
  tableName: "agent_state",
  sessionId: "user-123",
} satisfies CheckpointerConfig);

// Add persistence to workflow
const persistentWorkflow = workflow.withCheckpointer(checkpointer);
```

# Monitoring and Debugging

Implement comprehensive monitoring [^8]:

```typescript
import {LangSmithTracer} from "@langchain/core/tracers/langsmith";
import type {BaseCallbackConfig} from "@langchain/core/callbacks/manager";

// Create tracer
const tracer = new LangSmithTracer({
  projectName: "gpt-agents",
  apiKey: process.env.LANGCHAIN_API_KEY,
});

// Add tracing to workflow
const monitoredAgent = await persistentWorkflow.compile({
  callbacks: [
    {
      handleLLMStart: async (llm, _prompts, runId, parentRunId, tags, metadata) => {
        console.log(`Starting LLM: ${llm.name}`);
        await tracer.handleLLMStart(llm, _prompts, runId, parentRunId, tags, metadata);
      },
      handleToolError: async (error, runId, parentRunId, tags, metadata) => {
        console.error(`Tool error: ${error.message}`);
        await tracer.handleToolError(error, runId, parentRunId, tags, metadata);
      },
    } satisfies BaseCallbackConfig,
  ],
});
```

# API Integration

Create a type-safe API interface using Fastify with Zod [^9]:

```typescript
import {FastifyInstance} from "fastify";
import {z} from "zod";
import {withTypeProvider} from "@fastify/type-provider-zod";
import type {FastifyZod} from "@fastify/type-provider-zod";

// Define API schema
const AnalysisRequestSchema = z.object({
  code: z.string(),
  sessionId: z.string(),
  config: z
    .object({
      depth: z.number().optional(),
      language: z.string().optional(),
    })
    .optional(),
});

type AnalysisRequest = z.infer<typeof AnalysisRequestSchema>;

// Create API route with Zod type provider
export async function agentRoutes(app: FastifyInstance) {
  // Enable Zod schema validation
  const fastify = app.withTypeProvider<FastifyZod>();

  fastify.post<{Body: AnalysisRequest}>(
    "/analyze",
    {
      schema: {
        body: AnalysisRequestSchema,
      },
    },
    async (request, reply) => {
      const {code, sessionId, config} = request.body;

      try {
        const result = await monitoredAgent.invoke({
          messages: [
            {
              type: "human",
              content: code,
              metadata: {sessionId, config},
            },
          ],
        });

        return reply.send(result);
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );
}
```

## Best Practices

### Platform Agnostic Design

Designing platform-agnostic AI agents requires careful consideration of abstraction layers and interfaces. By implementing platform-specific adapters in dedicated directories, you create a clean separation between core agent logic and platform-specific implementations. This approach allows your agent to work seamlessly across different LLM providers while maintaining a consistent interface.

Supporting fallback mechanisms ensures your agent remains operational even when primary services are unavailable. By implementing graceful degradation and service discovery, your agent can automatically switch between different LLM providers or models based on availability and performance requirements. This resilience is crucial for production deployments where service interruptions must be handled gracefully.

Here's an example of a platform-agnostic agent implementation [^10]:

```typescript
import {ChatOpenAI} from "@langchain/openai";
import {ChatAnthropic} from "@langchain/anthropic";
import {ChatOllama} from "@langchain/community/chat_models/ollama";
import {StateGraph, type NodeType} from "@langchain/langgraph";
import {BaseMessage} from "@langchain/core/messages";
import {ChatPromptTemplate} from "@langchain/core/prompts";
import {BaseChatModel} from "@langchain/core/language_models/chat_models";

interface ModelConfig {
  provider: "openai" | "anthropic" | "ollama";
  model: string;
  temperature?: number;
}

class PlatformAgnosticAgent {
  private models: Map<string, BaseChatModel>;
  private fallbackOrder: string[];

  constructor(configs: ModelConfig[]) {
    this.models = new Map();
    this.fallbackOrder = configs.map((c) => c.provider);

    configs.forEach((config) => {
      const model = this.createModel(config);
      this.models.set(config.provider, model);
    });
  }

  private createModel(config: ModelConfig): BaseChatModel {
    switch (config.provider) {
      case "openai":
        return new ChatOpenAI({
          modelName: config.model,
          temperature: config.temperature ?? 0,
        });
      case "anthropic":
        return new ChatAnthropic({
          modelName: config.model,
          temperature: config.temperature ?? 0,
        });
      case "ollama":
        return new ChatOllama({
          model: config.model,
          temperature: config.temperature ?? 0,
        });
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }

  async createWorkflow(prompt: ChatPromptTemplate): Promise<StateGraph> {
    const agentNode: NodeType = async (state: {messages: BaseMessage[]}) => {
      for (const provider of this.fallbackOrder) {
        try {
          const model = this.models.get(provider);
          if (!model) continue;

          const response = await model.invoke(state.messages);
          return {messages: [...state.messages, response]};
        } catch (error) {
          console.warn(`Provider ${provider} failed, trying next...`);
          continue;
        }
      }
      throw new Error("All providers failed");
    };

    return new StateGraph().addNode("agent", agentNode).setEntryPoint("agent");
  }
}

// Usage example
const agent = new PlatformAgnosticAgent([
  {provider: "openai", model: "gpt-4", temperature: 0},
  {provider: "anthropic", model: "claude-3-opus-20240229", temperature: 0},
  {provider: "ollama", model: "llama2", temperature: 0},
]);

const prompt = ChatPromptTemplate.fromMessages([
  ["system", "You are a helpful AI assistant."],
  ["human", "{input}"],
]);

const workflow = await agent.createWorkflow(prompt);
const compiledAgent = workflow.compile();
```

[^10]: ["Build a JavaScript AI Agent With LangGraph.js and MongoDB"](https://www.mongodb.com/developer/languages/typescript/build-javascript-ai-agent-langgraphjs-mongodb/), MongoDB Developer, 2024

### Type Safety

Type safety is crucial for building reliable and maintainable AI agents. TypeScript and Zod work together to provide compile-time type checking and runtime validation, ensuring that data flowing through your agent meets expected schemas and contracts. This dual-layer approach catches potential issues early in development while also protecting against invalid runtime data.

Runtime validation becomes especially important when dealing with external inputs and LLM outputs. By defining clear interfaces and validation schemas, you can ensure that your agent handles edge cases gracefully and provides meaningful error messages. This is particularly important for production systems where unexpected inputs could lead to system failures or security vulnerabilities.

Here's an example demonstrating comprehensive type safety in an agent [^11]:

```typescript
import {z} from "zod";
import {StateGraph, type NodeType} from "@langchain/langgraph";
import {BaseMessage, HumanMessage, AIMessage} from "@langchain/core/messages";
import {ChatPromptTemplate} from "@langchain/core/prompts";
import {ChatOpenAI} from "@langchain/openai";
import {RunnableSequence} from "@langchain/core/runnables";

// Define strict types for agent configuration
interface AgentConfig {
  modelName: string;
  temperature: number;
  maxTokens: number;
}

// Define validation schema for external input
const InputSchema = z.object({
  query: z.string().min(1).max(1000),
  context: z
    .object({
      systemPrompt: z.string().optional(),
      metadata: z.record(z.unknown()).optional(),
      preferences: z
        .object({
          language: z.enum(["en", "es", "fr"]).optional(),
          style: z.enum(["formal", "casual"]).optional(),
        })
        .optional(),
    })
    .optional(),
});

type ValidatedInput = z.infer<typeof InputSchema>;

class TypeSafeAgent {
  private config: AgentConfig;
  private model: ChatOpenAI;
  private graph: StateGraph;

  constructor(config: AgentConfig) {
    // Validate config at runtime
    const ConfigSchema = z.object({
      modelName: z.string(),
      temperature: z.number().min(0).max(2),
      maxTokens: z.number().positive(),
    });

    this.config = ConfigSchema.parse(config);
    this.model = new ChatOpenAI(this.config);
    this.graph = this.createGraph();
  }

  private createGraph(): StateGraph {
    const agentNode: NodeType = async (state: {messages: BaseMessage[]; input: ValidatedInput}) => {
      const systemPrompt = state.input.context?.systemPrompt ?? "You are a helpful AI assistant.";

      const prompt = ChatPromptTemplate.fromMessages([
        ["system", systemPrompt],
        ...state.messages,
        ["human", "{query}"],
      ]);

      const chain = RunnableSequence.from([
        prompt,
        this.model,
        // Ensure output is properly typed
        (response): AIMessage => {
          if (!response.content || typeof response.content !== "string") {
            throw new Error("Invalid model response");
          }
          return new AIMessage(response.content);
        },
      ]);

      const response = await chain.invoke({
        query: state.input.query,
        messages: state.messages,
      });

      return {
        messages: [...state.messages, response],
        input: state.input,
      };
    };

    return new StateGraph().addNode("agent", agentNode).setEntryPoint("agent");
  }

  async invoke(input: unknown) {
    // Validate input at runtime
    const validatedInput = InputSchema.parse(input);

    const workflow = await this.graph.compile();
    return workflow.invoke({
      messages: [],
      input: validatedInput,
    });
  }
}

// Usage example
const agent = new TypeSafeAgent({
  modelName: "gpt-4",
  temperature: 0.7,
  maxTokens: 1000,
});

try {
  const result = await agent.invoke({
    query: "Explain type safety in TypeScript",
    context: {
      systemPrompt: "You are an expert TypeScript developer.",
      preferences: {
        language: "en",
        style: "formal",
      },
    },
  });
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error("Validation error:", error.errors);
  } else {
    console.error("Unexpected error:", error);
  }
}
```

[^11]: ["Type-Safe LLM Agents with TypeScript and Zod"](https://js.langchain.com/docs/modules/model_io/models/chat/), LangChain, 2024

### Testing and Validation

Comprehensive testing is essential for ensuring AI agents behave reliably and predictably. Unit tests should cover individual components like tools, prompts, and state management, while integration tests verify the interaction between components and external services. Mock LLM responses and tool outputs help create deterministic test scenarios that can be reliably reproduced.

Testing AI agents presents unique challenges due to the non-deterministic nature of LLM outputs. By implementing robust validation and verification strategies, you can ensure your agent maintains consistent behavior across different scenarios. This includes testing edge cases, error handling, and recovery mechanisms to ensure production reliability.

Here's an example demonstrating comprehensive testing approaches [^12]:

```typescript
import {expect, test, vi} from "vitest";
import {StateGraph} from "@langchain/langgraph";
import {ChatOpenAI} from "@langchain/openai";
import {HumanMessage, AIMessage} from "@langchain/core/messages";
import {ChatPromptTemplate} from "@langchain/core/prompts";
import {Tool} from "@langchain/core/tools";
import {ToolNode} from "@langchain/langgraph/prebuilt";
import {z} from "zod";

// Mock tool for testing
class MockAnalysisTool extends Tool {
  name = "mock_analysis";
  description = "Mock tool for testing";
  schema = z.object({
    code: z.string(),
    language: z.string().optional(),
  });

  constructor(private mockResponse: object) {
    super();
  }

  async _call(input: z.infer<typeof this.schema>) {
    return JSON.stringify(this.mockResponse);
  }
}

// Test helper to create a deterministic agent
function createTestAgent(mockLLMResponse: string, mockToolResponse: object) {
  // Mock LLM
  const mockLLM = new ChatOpenAI({
    temperature: 0,
  });

  vi.spyOn(mockLLM, "invoke").mockResolvedValue(new AIMessage(mockLLMResponse));

  // Create agent graph
  const tools = [new MockAnalysisTool(mockToolResponse)];
  const toolNode = new ToolNode(tools);

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are a testing assistant."],
    ["human", "{input}"],
  ]);

  const graph = new StateGraph()
    .addNode("agent", async (state) => {
      const response = await mockLLM.invoke([...state.messages, new HumanMessage(state.input)]);
      return {messages: [...state.messages, response]};
    })
    .addNode("tools", toolNode)
    .addEdge("agent", "tools")
    .setEntryPoint("agent");

  return graph.compile();
}

// Unit tests
test("agent handles valid input correctly", async () => {
  const mockLLMResponse = "Analyze this code: console.log('test')";
  const mockToolResponse = {quality: "good", issues: []};

  const agent = createTestAgent(mockLLMResponse, mockToolResponse);

  const result = await agent.invoke({
    messages: [],
    input: "Check this code",
  });

  expect(result.messages).toHaveLength(2);
  expect(result.messages[1].content).toBe(mockLLMResponse);
});

// Integration test with error handling
test("agent handles tool errors gracefully", async () => {
  const mockLLMResponse = "Invalid command";
  const mockToolResponse = new Error("Tool execution failed");

  const agent = createTestAgent(mockLLMResponse, mockToolResponse);

  try {
    await agent.invoke({
      messages: [],
      input: "Invalid input",
    });
    throw new Error("Should have thrown");
  } catch (error) {
    expect(error.message).toBe("Tool execution failed");
  }
});

// Validation test
test("agent validates input schema", async () => {
  const InputSchema = z.object({
    messages: z.array(z.any()),
    input: z.string().min(1),
  });

  const mockLLMResponse = "Valid response";
  const mockToolResponse = {status: "success"};

  const agent = createTestAgent(mockLLMResponse, mockToolResponse);

  // Test invalid input
  const invalidInput = {
    messages: [],
    input: "", // Empty string should fail validation
  };

  await expect(async () => {
    const validated = InputSchema.parse(invalidInput);
    await agent.invoke(validated);
  }).rejects.toThrow();

  // Test valid input
  const validInput = {
    messages: [],
    input: "Valid test input",
  };

  const validated = InputSchema.parse(validInput);
  const result = await agent.invoke(validated);
  expect(result.messages).toBeDefined();
});

// Mock external service test
test("agent handles external service integration", async () => {
  vi.mock("@langchain/community/chat_models/ollama", () => ({
    ChatOllama: vi.fn().mockImplementation(() => ({
      invoke: vi.fn().mockResolvedValue(new AIMessage("Mocked response")),
    })),
  }));

  const mockLLMResponse = "Process with external service";
  const mockToolResponse = {externalData: "processed"};

  const agent = createTestAgent(mockLLMResponse, mockToolResponse);
  const result = await agent.invoke({
    messages: [],
    input: "Use external service",
  });

  expect(result.messages[1].content).toBe(mockLLMResponse);
});
```

[^12]: ["Testing LangChain.js Applications"](https://js.langchain.com/docs/guides/testing), LangChain, 2024

### Performance Optimization

Performance optimization in AI agents requires careful attention to token usage, response latency, and resource utilization. Implementing effective caching strategies can significantly reduce API costs and improve response times by storing frequently used prompts, tool results, and intermediate computations. Streaming responses provide better user experience for long-running operations while managing memory efficiently.

Token optimization is particularly important when working with LLMs, as it directly impacts costs and latency. By implementing smart chunking strategies, parallel processing where appropriate, and efficient prompt management, you can maximize the value obtained from each API call. Monitoring token usage and implementing rate limiting helps maintain predictable costs while ensuring service reliability.

Here's an example demonstrating performance optimization techniques [^13]:

```typescript
import {StateGraph, type NodeType} from "@langchain/langgraph";
import {ChatOpenAI} from "@langchain/openai";
import {BaseMessage, HumanMessage, AIMessage} from "@langchain/core/messages";
import {ChatPromptTemplate} from "@langchain/core/prompts";
import {RunnableSequence} from "@langchain/core/runnables";
import {LRUCache} from "lru-cache";
import {TokenTextSplitter} from "@langchain/text-splitter";
import {CallbackManager} from "@langchain/core/callbacks/manager";

interface CacheConfig {
  maxSize: number;
  ttl: number;
}

class OptimizedAgent {
  private model: ChatOpenAI;
  private promptCache: LRUCache<string, BaseMessage[]>;
  private resultCache: LRUCache<string, any>;
  private tokenSplitter: TokenTextSplitter;
  private graph: StateGraph;

  constructor(modelName: string = "gpt-3.5-turbo", cacheConfig: CacheConfig = {maxSize: 1000, ttl: 3600000}) {
    // Initialize caches
    this.promptCache = new LRUCache({
      max: cacheConfig.maxSize,
      ttl: cacheConfig.ttl,
    });

    this.resultCache = new LRUCache({
      max: cacheConfig.maxSize,
      ttl: cacheConfig.ttl,
    });

    // Initialize token splitter
    this.tokenSplitter = new TokenTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 100,
    });

    // Initialize model with streaming
    this.model = new ChatOpenAI({
      modelName,
      temperature: 0,
      streaming: true,
      callbacks: CallbackManager.fromHandlers({
        handleLLMNewToken: (token: string) => {
          process.stdout.write(token);
        },
      }),
    });

    this.graph = this.createGraph();
  }

  private async getCachedPrompt(key: string, generator: () => Promise<BaseMessage[]>) {
    const cached = this.promptCache.get(key);
    if (cached) return cached;

    const generated = await generator();
    this.promptCache.set(key, generated);
    return generated;
  }

  private createGraph(): StateGraph {
    const agentNode: NodeType = async (state: {messages: BaseMessage[]; input: string}) => {
      // Generate cache key
      const cacheKey = `${state.input}-${state.messages.length}`;
      const cachedResult = this.resultCache.get(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }

      // Split long inputs
      const chunks = await this.tokenSplitter.splitText(state.input);

      // Process chunks in parallel with rate limiting
      const chunkResults = await Promise.all(
        chunks.map(async (chunk, index) => {
          // Rate limiting delay
          await new Promise((resolve) => setTimeout(resolve, index * 200));

          // Get or generate prompt
          const promptMessages = await this.getCachedPrompt(`prompt-${chunk.length}`, async () => {
            const prompt = ChatPromptTemplate.fromMessages([
              ["system", "Process this text chunk efficiently."],
              ["human", "{input}"],
            ]);
            return prompt.formatMessages({input: chunk});
          });

          // Process chunk
          const response = await this.model.invoke(promptMessages);
          return response;
        }),
      );

      // Combine results
      const result = {
        messages: [...state.messages, ...chunkResults],
        input: state.input,
      };

      // Cache result
      this.resultCache.set(cacheKey, result);
      return result;
    };

    return new StateGraph().addNode("agent", agentNode).setEntryPoint("agent");
  }

  async invoke(input: string, options: {stream?: boolean} = {}) {
    const workflow = await this.graph.compile();

    if (options.stream) {
      // Use streaming for long inputs
      const stream = await workflow.invoke(
        {
          messages: [],
          input,
        },
        {
          callbacks: CallbackManager.fromHandlers({
            handleLLMNewToken: (token: string) => {
              process.stdout.write(token);
            },
          }),
        },
      );
      return stream;
    }

    // Use regular invocation for short inputs
    return workflow.invoke({
      messages: [],
      input,
    });
  }

  // Monitoring methods
  getTokenUsage(): {cached: number; total: number} {
    return {
      cached: this.promptCache.size,
      total: this.resultCache.size,
    };
  }

  clearCaches() {
    this.promptCache.clear();
    this.resultCache.clear();
  }
}

// Usage example
const agent = new OptimizedAgent("gpt-4", {
  maxSize: 2000,
  ttl: 1800000, // 30 minutes
});

// Handle short input
const quickResult = await agent.invoke("Summarize this brief text.");

// Handle long input with streaming
const streamingResult = await agent.invoke("Process this very long document...", {stream: true});

// Monitor performance
console.log("Cache statistics:", agent.getTokenUsage());
```

[^13]: ["Optimizing LLM Token Usage and Performance"](https://js.langchain.com/docs/modules/model_io/models/chat/how_to/streaming), LangChain, 2024

## Example Implementation

See the [Code Analysis Agent](notebooks/agents/analysis/code-analyzer.ipynb) for a complete example that demonstrates:

- Platform-agnostic implementation
- Type-safe configuration
- Comprehensive error handling
- Modular analysis capabilities

## Framework Integration

### LangChain.js Implementation

Using LangChain.js for agent development provides additional capabilities and tools. Here's an example implementation:

```typescript
import {AgentExecutor, ChatAgentOutputParser} from "langchain/agents";
import {OpenAI} from "langchain/llms/openai";
import {ChatPromptTemplate} from "langchain/prompts";
import {RunnableSequence} from "langchain/schema/runnable";
import {OpenAIAgentTokenBufferMemory} from "langchain/agents/toolkits";
import {Tool} from "langchain/tools";

// Define custom tool
class CustomAnalysisTool extends Tool {
  name = "code-analysis";
  description = "Analyzes code for quality and security issues";

  async _call(input: string): Promise<string> {
    // Implement analysis logic
    return "Analysis results";
  }
}

// Create agent with memory
const createAnalysisAgent = async () => {
  const model = new OpenAI({temperature: 0});
  const tools = [new CustomAnalysisTool()];

  const memory = new OpenAIAgentTokenBufferMemory({
    llm: model,
    memoryKey: "chat_history",
    outputKey: "output",
  });

  const executor = await AgentExecutor.fromAgentAndTools({
    agent: ChatAgentOutputParser,
    tools,
    memory,
    returnIntermediateSteps: true,
    maxIterations: 3,
    verbose: true,
  });

  return executor;
};
```

### LangGraph Integration

LangGraph provides a more flexible way to build agent workflows:

```typescript
import {StateGraph, MessagesAnnotation} from "@langchain/langgraph";
import {ChatOpenAI} from "@langchain/openai";
import {ToolNode} from "@langchain/langgraph/prebuilt";
import {HumanMessage} from "@langchain/core/messages";

// Define tools and nodes
const tools = [new CustomAnalysisTool()];
const toolNode = new ToolNode(tools);

// Create model with tool binding
const model = new ChatOpenAI({
  model: "gpt-4",
  temperature: 0,
}).bindTools(tools);

// Define workflow logic
function shouldContinue({messages}: typeof MessagesAnnotation.State) {
  const lastMessage = messages[messages.length - 1];
  return lastMessage.additional_kwargs.tool_calls ? "tools" : "__end__";
}

// Create workflow graph
const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", async (state) => {
    const response = await model.invoke(state.messages);
    return {messages: [response]};
  })
  .addNode("tools", toolNode)
  .addEdge("tools", "agent")
  .addConditionalEdges("agent", shouldContinue);

// Compile and use
const agent = workflow.compile();

const runAgent = async (input: string) => {
  return await agent.invoke({
    messages: [new HumanMessage(input)],
  });
};
```

### Memory Management

Implement persistent memory for long-running agents:

```typescript
import {ChatMessageHistory} from "langchain/memory";
import {HumanMessage, AIMessage} from "langchain/schema";

// Initialize with existing chat history
const initializeMemory = async () => {
  const previousMessages = [new HumanMessage("Initial context"), new AIMessage("Acknowledged")];

  return new OpenAIAgentTokenBufferMemory({
    llm: new ChatOpenAI({}),
    memoryKey: "chat_history",
    outputKey: "output",
    chatHistory: new ChatMessageHistory(previousMessages),
  });
};

// Usage with streaming
const streamingAgent = await AgentExecutor.fromAgentAndTools({
  agent: ChatAgentOutputParser,
  tools,
  memory: await initializeMemory(),
  returnIntermediateSteps: true,
  streamEvents: true,
});

// Handle streaming events
streamingAgent.invoke({
  input: "Analyze this code",
  callbacks: {
    handleLLMNewToken: (token) => console.log(token),
    handleToolStart: (tool) => console.log(`Using tool: ${tool.name}`),
    handleAgentAction: (action) => console.log(`Action: ${action.tool}`),
  },
});
```

### Advanced Patterns

#### Tool Composition

```typescript
import {createOpenApiAgent, OpenApiToolkit} from "langchain/agents";
import {JsonSpec} from "langchain/tools";

// Create API-aware agent
const createApiAgent = async (spec: JsonSpec) => {
  const toolkit = new OpenApiToolkit(spec, model, {
    headers: {Authorization: `Bearer ${process.env.API_KEY}`},
  });

  return createOpenApiAgent(model, toolkit);
};

// Combine with analysis agent
const combinedAgent = async (input: string) => {
  const apiAgent = await createApiAgent(spec);
  const analysisAgent = await createAnalysisAgent();

  const apiResult = await apiAgent.invoke({input});
  return await analysisAgent.invoke({
    input,
    context: {apiResult},
  });
};
```

#### Error Handling and Retries

```typescript
import {ExponentialBackoff} from "langchain/utils/backoff";

class ResilientAgent {
  private backoff = new ExponentialBackoff();

  async invoke(input: string, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.agent.invoke(input);
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await this.backoff.wait();
      }
    }
  }
}
```

## Testing Framework

The project includes a comprehensive testing framework for evaluating AI agents across multiple dimensions [^14]. The framework supports:

- Behavioral testing to validate agent responses and behaviors
- Performance testing to measure latency, token usage, and success rates
- Cross-platform comparison to evaluate metrics across different LLM platforms

### Test Case Definition

Define test cases using the `AgentTestCase` interface:

```typescript
interface AgentTestCase {
  name: string;
  input: string;
  expectedOutput?: string;
  expectedBehavior?: (response: AgentResponse) => boolean;
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
  timeout?: number;
  retries?: number;
}
```

### Framework Configuration

Configure the test framework with type-safe options [^15]:

```typescript
const testFramework = new AgentTestFramework({
  concurrency: 1,
  timeoutMs: 30000,
  retries: 2,
  warmup: true,
  collectMetrics: true,
  compareBaseline: true,
  baselineResults: {
    latency: {mean: 500, p50: 450, p95: 750, p99: 1000},
    tokenUsage: {prompt: 100, completion: 50, total: 150},
    success: {rate: 0.95, total: 100, failed: 5},
  },
  metricThresholds: {
    maxLatencyMs: 1000,
    minSuccessRate: 0.9,
    maxTokenUsage: 200,
  },
});
```

### Running Tests

#### Behavioral Tests

Test agent responses and behaviors [^16]:

```typescript
const behavioralTests: AgentTestCase[] = [
  {
    name: "Basic question answering",
    input: "What is the capital of France?",
    expectedOutput: "The capital of France is Paris.",
  },
  {
    name: "Code analysis",
    input: "Analyze this code: function add(a, b) { return a + b; }",
    expectedBehavior: (response) => {
      const content = response.output.content;
      return typeof content === "string" && content.includes("function") && content.includes("parameters");
    },
  },
];

const results = await testFramework.runBehavioralTests(agentConfig, behavioralTests);
```

#### Performance Tests

Measure agent performance metrics [^17]:

```typescript
const performanceTests = [
  {
    input: "What is 2 + 2?",
    iterations: 10,
  },
  {
    input: "Write a function to calculate fibonacci numbers.",
    iterations: 5,
  },
];

const metrics = await testFramework.runPerformanceTests(agentConfig, performanceTests);
```

### Metrics Collection

The framework collects comprehensive metrics [^18]:

- Latency: mean, p50, p95, p99
- Token usage: prompt, completion, total
- Memory usage: heap used/total
- Success rates and cache hits
- Cross-platform comparisons

### Best Practices

1. **Test Coverage**

   - Write tests for both success and failure cases
   - Include edge cases and error conditions
   - Test across different LLM platforms

2. **Performance Testing**

   - Use realistic inputs and workloads
   - Set appropriate thresholds
   - Compare against baselines

3. **Metrics and Monitoring**
   - Track key performance indicators
   - Monitor resource usage
   - Set up alerts for regressions

### Example Test Suite

Here's a complete example of a test suite [^19]:

```typescript
import {AgentTestFramework, type AgentTestCase} from "../agent-test-framework";
import {type AgentConfig, type AgentResponse} from "../types/agent";
import {AIMessage} from "@langchain/core/messages";

// Define behavioral test cases
const behavioralTests: AgentTestCase[] = [
  {
    name: "Basic question answering",
    input: "What is the capital of France?",
    expectedOutput: "The capital of France is Paris.",
  },
  {
    name: "Code analysis",
    input: "Analyze this code: function add(a, b) { return a + b; }",
    expectedBehavior: (response: AgentResponse) => {
      const content = response.output.content;
      if (typeof content !== "string") return false;
      return content.includes("function") && content.includes("parameters") && content.includes("return");
    },
  },
  {
    name: "Error handling",
    input: "",
    expectedBehavior: (response: AgentResponse) => {
      const content = response.output.content;
      return typeof content === "string" && content.includes("error");
    },
  },
];

// Define performance test cases
const performanceTests = [
  {
    input: "What is 2 + 2?",
    iterations: 10,
  },
  {
    input: "Write a function to calculate fibonacci numbers.",
    iterations: 5,
  },
];

// Define baseline metrics for comparison
const baselineMetrics = {
  latency: {mean: 500, p50: 450, p95: 750, p99: 1000},
  tokenUsage: {prompt: 100, completion: 50, total: 150},
  memoryUsage: {heapUsed: 50000000, heapTotal: 100000000},
  success: {rate: 0.95, total: 100, failed: 5},
};

async function runTests() {
  // Initialize test framework with comprehensive configuration
  const testFramework = new AgentTestFramework({
    concurrency: 1,
    timeoutMs: 30000,
    retries: 2,
    warmup: true,
    collectMetrics: true,
    compareBaseline: true,
    baselineResults: baselineMetrics,
    metricThresholds: {
      maxLatencyMs: 1000,
      minSuccessRate: 0.9,
      maxTokenUsage: 200,
    },
  });

  // Define agent configurations for testing
  const baseConfig: AgentConfig = {
    model: "gpt-4",
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

  try {
    // Run behavioral tests
    console.log("\nRunning behavioral tests...");
    const behavioralResults = await testFramework.runBehavioralTests(baseConfig, behavioralTests);
    console.log("Behavioral test results:", {
      passed: behavioralResults.passed.length,
      failed: behavioralResults.failed.length,
      metrics: behavioralResults.metrics,
    });

    // Run performance tests
    console.log("\nRunning performance tests...");
    const performanceMetrics = await testFramework.runPerformanceTests(baseConfig, performanceTests);
    console.log("Performance metrics:", performanceMetrics);

    // Compare different platforms
    console.log("\nComparing platforms...");
    const platformConfigs: AgentConfig[] = [
      baseConfig,
      {...baseConfig, model: "gpt-3.5-turbo"},
      {...baseConfig, model: "claude-3-opus-20240229"},
    ];

    const platformComparison = await testFramework.comparePlatforms(platformConfigs, behavioralTests);
    console.log("Platform comparison results:", platformComparison);

    // Validate results against thresholds
    validateResults(behavioralResults, performanceMetrics, platformComparison);
  } catch (error) {
    console.error("Error during testing:", error);
    process.exit(1);
  }
}

function validateResults(
  behavioralResults: {
    passed: AgentTestCase[];
    failed: Array<{test: AgentTestCase; error: Error}>;
    metrics?: AgentPerformanceMetrics;
  },
  performanceMetrics: AgentPerformanceMetrics,
  platformComparison: Record<string, AgentPerformanceMetrics>,
) {
  // Validate behavioral test results
  const successRate =
    behavioralResults.passed.length / (behavioralResults.passed.length + behavioralResults.failed.length);

  if (successRate < 0.9) {
    throw new Error(`Success rate ${successRate} below threshold 0.9`);
  }

  // Validate performance metrics
  if (performanceMetrics.latency.mean > 1000) {
    throw new Error(`Mean latency ${performanceMetrics.latency.mean}ms exceeds threshold 1000ms`);
  }

  // Compare platform metrics
  for (const [platform, metrics] of Object.entries(platformComparison)) {
    if (metrics.success.rate < 0.8) {
      console.warn(`Platform ${platform} success rate ${metrics.success.rate} below 0.8`);
    }
  }
}

// Run the tests if this file is executed directly
if (require.main === module) {
  runTests().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}
```

[^14]: ["Writing Agent Tests"](https://volttron.readthedocs.io/en/stable/developing-volttron/developing-agents/writing-agent-tests.html), VOLTTRON Documentation, 2024

[^15]: ["Test Examples"](https://github.com/valyakin/aa-testkit), AA-TestKit Documentation, 2024

[^16]: ["Writing Unit Tests"](https://volttron.readthedocs.io/en/stable/developing-volttron/developing-agents/writing-agent-tests.html), VOLTTRON Documentation, 2024

[^17]: ["Writing Integration Tests"](https://volttron.readthedocs.io/en/stable/developing-volttron/developing-agents/writing-agent-tests.html), VOLTTRON Documentation, 2024

[^18]: ["Performance Testing Best Practices"](https://volttron.readthedocs.io/en/stable/developing-volttron/developing-agents/writing-agent-tests.html), VOLTTRON Documentation, 2024

[^19]: ["Test Examples with Mocha"](https://github.com/valyakin/aa-testkit), AA-TestKit Documentation, 2024

## Key Takeaways

1. **Modular Architecture**: The agent framework provides a flexible, type-safe foundation for building complex AI systems
2. **Platform Independence**: Abstract platform-specific details to support multiple LLM providers
3. **Development Efficiency**: Standardized templates and tools accelerate agent development

## Advanced Agent Ideas

1. **Distributed Multi-Agent System**

   - Implement agent collaboration protocols
   - Add peer-to-peer communication
   - Develop consensus mechanisms

2. **Self-Improving Code Generator**

   - Create agents that learn from code review feedback
   - Implement automated testing and validation
   - Add continuous improvement mechanisms

3. **Context-Aware Research Assistant**
   - Develop advanced memory management
   - Implement citation tracking and validation
   - Add source credibility assessment
