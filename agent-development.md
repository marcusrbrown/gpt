# AI Agent Development Guide

## Overview

This guide provides a comprehensive framework for developing AI agents within the GPT project using [LangGraph.js](https://langchain-ai.github.io/langgraphjs/). The project focuses on research and development of LLM-powered AI agents and assistants, supporting multiple AI platforms including Ollama, Anthropic, and Azure OpenAI Service.

**Target Audience**: AI agents and developers building autonomous code generation and analysis systems.

## Quick Start

### Installation

```bash
pnpm add @langchain/langgraph @langchain/core @langchain/openai zod
```

### Minimal Agent

```typescript
import {AIMessage, HumanMessage} from "@langchain/core/messages"
import {tool} from "@langchain/core/tools"
import {END, MessagesAnnotation, START, StateGraph} from "@langchain/langgraph"
import {ToolNode} from "@langchain/langgraph/prebuilt"
import {ChatOpenAI} from "@langchain/openai"
import {z} from "zod"

// 1. Define tools
const analyzeCode = tool(
  async ({code, language}) => {
    return JSON.stringify({quality: "good", issues: [], language})
  },
  {
    name: "analyze_code",
    description: "Analyzes code for quality and issues",
    schema: z.object({
      code: z.string().describe("The code to analyze"),
      language: z.string().optional().describe("Programming language"),
    }),
  },
)

// 2. Create model with tools bound
const model = new ChatOpenAI({model: "gpt-4o", temperature: 0}).bindTools([analyzeCode])

// 3. Define workflow nodes
async function callModel(state: typeof MessagesAnnotation.State) {
  const response = await model.invoke(state.messages)
  return {messages: [response]}
}

function shouldContinue(state: typeof MessagesAnnotation.State) {
  const lastMessage = state.messages.at(-1) as AIMessage
  return lastMessage.tool_calls?.length ? "tools" : END
}

// 4. Build and compile graph
const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", new ToolNode([analyzeCode]))
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue, {tools: "tools", [END]: END})
  .addEdge("tools", "agent")

const agent = workflow.compile()

// 5. Run the agent
const result = await agent.invoke({
  messages: [new HumanMessage("Analyze this code: function add(a, b) { return a + b; }")],
})
```

## Core Concepts

### Agent Architecture

An AI agent consists of three primary components:

1. **Sensors**: Input processors that handle text, structured data, code, or multimodal content
2. **Reasoning Engine**: LLM-based decision-making system that processes inputs and determines actions
3. **Actuators**: Output handlers that execute actions and interact with external systems

### LangGraph Fundamentals

LangGraph models agent workflows as **directed graphs** where:

- **Nodes** execute functions that transform state
- **Edges** define transitions between nodes
- **State** flows through the graph, accumulating results
- **Conditional edges** enable dynamic routing based on state

## State Management

### Using Annotations

LangGraph uses **Annotations** to define typed state with reducers:

```typescript
import {BaseMessage} from "@langchain/core/messages"
import {Annotation} from "@langchain/langgraph"

// Define custom state with Annotation.Root
const AgentState = Annotation.Root({
  // Messages use a reducer to append new messages
  messages: Annotation<BaseMessage[]>({
    reducer: (current, update) => current.concat(update),
    default: () => [],
  }),
  // Context is replaced entirely on update
  context: Annotation<{
    workspace: string
    tools: string[]
    metadata: Record<string, unknown>
  }>(),
  // Simple values without reducers
  iteration: Annotation<number>({
    default: () => 0,
  }),
})

// Use with StateGraph
const workflow = new StateGraph(AgentState)
  .addNode("agent", async state => {
    // Access typed state
    const currentMessages = state.messages
    const workspace = state.context?.workspace ?? process.cwd()

    // Return partial state updates
    return {
      iteration: state.iteration + 1,
    }
  })
  .addEdge(START, "agent")
  .addEdge("agent", END)
```

### MessagesAnnotation

For chat-based agents, use the built-in `MessagesAnnotation`:

```typescript
import {MessagesAnnotation, StateGraph} from "@langchain/langgraph"

// MessagesAnnotation provides a messages array with proper reducer
const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", async state => {
    // state.messages is BaseMessage[] with append reducer
    const response = await model.invoke(state.messages)
    return {messages: [response]}
  })
  .addEdge(START, "agent")
  .addEdge("agent", END)
```

## Tool Implementation

### Defining Tools with Zod

Use the `tool()` function from `@langchain/core/tools` with Zod schemas:

```typescript
import {tool} from "@langchain/core/tools"
import {z} from "zod"

// Simple tool with schema
const searchCode = tool(
  async ({query, filePattern}) => {
    // Implementation
    const results = await performSearch(query, filePattern)
    return JSON.stringify(results)
  },
  {
    name: "search_code",
    description: "Searches the codebase for code matching the query",
    schema: z.object({
      query: z.string().describe("Search query or pattern"),
      filePattern: z.string().optional().describe("Glob pattern for files to search"),
    }),
  },
)

// Tool with complex schema
const refactorCode = tool(
  async ({code, refactorType, options}) => {
    // Implementation
    return JSON.stringify({refactored: true, code: transformedCode})
  },
  {
    name: "refactor_code",
    description: "Refactors code according to specified patterns",
    schema: z.object({
      code: z.string().describe("Code to refactor"),
      refactorType: z.enum(["extract_function", "rename", "inline"]).describe("Type of refactoring"),
      options: z
        .object({
          newName: z.string().optional(),
          targetLine: z.number().optional(),
        })
        .optional(),
    }),
  },
)
```

### Using ToolNode

`ToolNode` executes tool calls from the model:

```typescript
import {ToolNode} from "@langchain/langgraph/prebuilt"

const tools = [searchCode, refactorCode, analyzeCode]
const toolNode = new ToolNode(tools)

// Bind tools to model for function calling
const modelWithTools = new ChatOpenAI({model: "gpt-4o"}).bindTools(tools)
```

## Building Agent Workflows

### Complete ReAct Agent

```typescript
import {AIMessage, HumanMessage} from "@langchain/core/messages"
import {tool} from "@langchain/core/tools"
import {END, MessagesAnnotation, START, StateGraph} from "@langchain/langgraph"
import {ToolNode} from "@langchain/langgraph/prebuilt"
import {ChatOpenAI} from "@langchain/openai"
import {z} from "zod"

// Define tools
const getWeather = tool(
  async ({location}) => {
    return `Weather in ${location}: Sunny, 72°F`
  },
  {
    name: "get_weather",
    description: "Get current weather for a location",
    schema: z.object({location: z.string()}),
  },
)

const tools = [getWeather]
const toolNode = new ToolNode(tools)

// Create model with tools
const model = new ChatOpenAI({model: "gpt-4o", temperature: 0}).bindTools(tools)

// Define the agent node
async function agentNode(state: typeof MessagesAnnotation.State) {
  const response = await model.invoke(state.messages)
  return {messages: [response]}
}

// Define routing logic
function routeAfterAgent(state: typeof MessagesAnnotation.State): typeof END | "tools" {
  const lastMessage = state.messages.at(-1) as AIMessage
  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    return "tools"
  }
  return END
}

// Build the graph
const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", agentNode)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", routeAfterAgent, {
    tools: "tools",
    [END]: END,
  })
  .addEdge("tools", "agent")

// Compile and run
const agent = workflow.compile()

const response = await agent.invoke({
  messages: [new HumanMessage("What's the weather in San Francisco?")],
})
```

### Using createReactAgent

For standard ReAct patterns, use the prebuilt helper:

```typescript
import {HumanMessage} from "@langchain/core/messages"
import {tool} from "@langchain/core/tools"
import {MemorySaver} from "@langchain/langgraph"
import {createReactAgent} from "@langchain/langgraph/prebuilt"
import {ChatOpenAI} from "@langchain/openai"
import {z} from "zod"

const analyzeCode = tool(async ({code}) => JSON.stringify({quality: "good", issues: []}), {
  name: "analyze_code",
  description: "Analyzes code quality",
  schema: z.object({code: z.string()}),
})

const model = new ChatOpenAI({model: "gpt-4o"})
const checkpointer = new MemorySaver()

const agent = createReactAgent({
  llm: model,
  tools: [analyzeCode],
  checkpointSaver: checkpointer,
})

// Run with thread_id for conversation persistence
const result = await agent.invoke(
  {messages: [new HumanMessage("Analyze: const x = 1")]},
  {configurable: {thread_id: "session-123"}},
)
```

## Persistence and Memory

### In-Memory Checkpointing

Use `MemorySaver` for development and testing:

```typescript
import {MemorySaver} from "@langchain/langgraph"

const checkpointer = new MemorySaver()

const agent = workflow.compile({checkpointer})

// Conversations persist across invocations with thread_id
const config = {configurable: {thread_id: "user-123"}}

await agent.invoke({messages: [new HumanMessage("Hello")]}, config)
await agent.invoke({messages: [new HumanMessage("What did I just say?")]}, config)
```

### PostgreSQL Persistence

For production, use PostgreSQL:

```bash
pnpm add @langchain/langgraph-checkpoint-postgres pg
```

```typescript
import {PostgresSaver} from "@langchain/langgraph-checkpoint-postgres"
import pg from "pg"

// Create connection pool
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? {rejectUnauthorized: false} : false,
})

// Initialize checkpointer (creates tables if needed)
const checkpointer = PostgresSaver.fromConnString(process.env.DATABASE_URL!)
await checkpointer.setup()

// Compile with checkpointer
const agent = workflow.compile({checkpointer})

// Use with thread_id for conversation tracking
const result = await agent.invoke({messages: [new HumanMessage("Hello")]}, {configurable: {thread_id: "user-456"}})
```

## Platform-Agnostic Design

### Multi-Provider Support

Abstract LLM providers for flexibility:

```typescript
import {ChatAnthropic} from "@langchain/anthropic"
import {ChatOllama} from "@langchain/ollama"
import {BaseChatModel} from "@langchain/core/language_models/chat_models"
import {ChatOpenAI} from "@langchain/openai"

type Provider = "openai" | "anthropic" | "ollama"

interface ModelConfig {
  provider: Provider
  model: string
  temperature?: number
}

function createModel(config: ModelConfig): BaseChatModel {
  const {provider, model, temperature = 0} = config

  switch (provider) {
    case "openai":
      return new ChatOpenAI({model, temperature})
    case "anthropic":
      return new ChatAnthropic({model, temperature})
    case "ollama":
      return new ChatOllama({model, temperature})
    default:
      throw new Error(`Unsupported provider: ${provider}`)
  }
}

// Usage with fallback
class ResilientAgent {
  private models: Map<Provider, BaseChatModel>
  private fallbackOrder: Provider[]

  constructor(configs: ModelConfig[]) {
    this.models = new Map()
    this.fallbackOrder = []

    for (const config of configs) {
      this.models.set(config.provider, createModel(config))
      this.fallbackOrder.push(config.provider)
    }
  }

  async invoke(messages: BaseMessage[]): Promise<AIMessage> {
    for (const provider of this.fallbackOrder) {
      try {
        const model = this.models.get(provider)!
        return (await model.invoke(messages)) as AIMessage
      } catch (error) {
        console.warn(`Provider ${provider} failed, trying next...`)
      }
    }
    throw new Error("All providers failed")
  }
}
```

## Streaming

### Stream Events

```typescript
import {HumanMessage} from "@langchain/core/messages"

const agent = workflow.compile()

// Stream all events
for await (const event of agent.streamEvents(
  {messages: [new HumanMessage("Explain TypeScript generics")]},
  {version: "v2"},
)) {
  if (event.event === "on_chat_model_stream") {
    const chunk = event.data.chunk
    if (chunk.content) {
      process.stdout.write(chunk.content)
    }
  }
}
```

### Stream Node Updates

```typescript
// Stream state updates from each node
for await (const chunk of agent.stream({messages: [new HumanMessage("Hello")]})) {
  for (const [nodeName, update] of Object.entries(chunk)) {
    console.log(`Node ${nodeName}:`, update)
  }
}
```

## Monitoring and Debugging

### LangSmith Integration

```typescript
// Set environment variables
process.env.LANGCHAIN_TRACING_V2 = "true"
process.env.LANGCHAIN_API_KEY = "your-api-key"
process.env.LANGCHAIN_PROJECT = "gpt-agents"

// All LangGraph operations are automatically traced
const result = await agent.invoke({messages: [new HumanMessage("Hello")]})
```

### Custom Callbacks

```typescript
import {BaseCallbackHandler} from "@langchain/core/callbacks/base"

class AgentCallbackHandler extends BaseCallbackHandler {
  name = "AgentCallbackHandler"

  async handleLLMStart(llm: {name: string}, prompts: string[]) {
    console.log(`LLM Start: ${llm.name}`)
  }

  async handleLLMEnd(output: any) {
    console.log(`LLM End: ${output.generations?.[0]?.[0]?.text?.slice(0, 50)}...`)
  }

  async handleToolStart(tool: {name: string}, input: string) {
    console.log(`Tool Start: ${tool.name}`)
  }

  async handleToolError(error: Error) {
    console.error(`Tool Error: ${error.message}`)
  }
}

const agent = workflow.compile()
const result = await agent.invoke({messages: [new HumanMessage("Hello")]}, {callbacks: [new AgentCallbackHandler()]})
```

## Testing

### Unit Testing with Vitest

```typescript
import {AIMessage, HumanMessage, ToolMessage} from "@langchain/core/messages"
import {tool} from "@langchain/core/tools"
import {END, MessagesAnnotation, START, StateGraph} from "@langchain/langgraph"
import {ToolNode} from "@langchain/langgraph/prebuilt"
import {ChatOpenAI} from "@langchain/openai"
import {beforeEach, describe, expect, it, vi} from "vitest"
import {z} from "zod"

describe("CodeAnalysisAgent", () => {
  const mockTool = tool(async ({code}) => JSON.stringify({quality: "good", issues: []}), {
    name: "analyze_code",
    description: "Analyzes code",
    schema: z.object({code: z.string()}),
  })

  let mockModel: ChatOpenAI

  beforeEach(() => {
    mockModel = new ChatOpenAI({model: "gpt-4o"})
  })

  it("should process valid code input", async () => {
    // Mock the model response
    vi.spyOn(mockModel, "invoke").mockResolvedValue(
      new AIMessage({
        content: "The code looks good.",
        tool_calls: [],
      }),
    )

    const workflow = new StateGraph(MessagesAnnotation)
      .addNode("agent", async state => {
        const response = await mockModel.invoke(state.messages)
        return {messages: [response]}
      })
      .addEdge(START, "agent")
      .addEdge("agent", END)

    const agent = workflow.compile()
    const result = await agent.invoke({
      messages: [new HumanMessage("Analyze this code: const x = 1")],
    })

    expect(result.messages).toHaveLength(2)
    expect(result.messages[1].content).toBe("The code looks good.")
  })

  it("should handle tool calls correctly", async () => {
    const toolNode = new ToolNode([mockTool])

    // Simulate tool call
    const toolCallMessage = new AIMessage({
      content: "",
      tool_calls: [
        {
          id: "call_123",
          name: "analyze_code",
          args: {code: "const x = 1"},
        },
      ],
    })

    const result = await toolNode.invoke({messages: [toolCallMessage]})
    expect(result.messages).toHaveLength(1)
    expect(result.messages[0]).toBeInstanceOf(ToolMessage)
  })

  it("should validate input schema", () => {
    const schema = z.object({
      code: z.string().min(1),
      language: z.string().optional(),
    })

    expect(() => schema.parse({code: ""})).toThrow()
    expect(() => schema.parse({code: "const x = 1"})).not.toThrow()
  })
})
```

### Integration Testing

```typescript
import {HumanMessage} from "@langchain/core/messages"
import {MemorySaver} from "@langchain/langgraph"
import {describe, expect, it} from "vitest"

describe("Agent Integration", () => {
  it("should maintain conversation context with checkpointer", async () => {
    const checkpointer = new MemorySaver()
    const agent = createTestAgent().compile({checkpointer})

    const config = {configurable: {thread_id: "test-123"}}

    // First message
    const result1 = await agent.invoke({messages: [new HumanMessage("My name is Alice")]}, config)

    // Second message should have context
    const result2 = await agent.invoke({messages: [new HumanMessage("What is my name?")]}, config)

    // Verify conversation continuity
    expect(result2.messages.length).toBeGreaterThan(result1.messages.length)
  })

  it("should handle errors gracefully", async () => {
    const agent = createAgentWithFailingTool()

    await expect(
      agent.invoke({
        messages: [new HumanMessage("Use the failing tool")],
      }),
    ).rejects.toThrow()
  })
})
```

## Performance Optimization

### Response Caching

```typescript
import {AIMessage, BaseMessage} from "@langchain/core/messages"
import {LRUCache} from "lru-cache"

class CachedAgent {
  private cache: LRUCache<string, AIMessage>
  private model: ChatOpenAI

  constructor(model: ChatOpenAI, cacheOptions = {max: 1000, ttl: 1000 * 60 * 30}) {
    this.model = model
    this.cache = new LRUCache(cacheOptions)
  }

  private getCacheKey(messages: BaseMessage[]): string {
    return messages.map(m => `${m._getType()}:${m.content}`).join("|")
  }

  async invoke(messages: BaseMessage[]): Promise<AIMessage> {
    const key = this.getCacheKey(messages)

    const cached = this.cache.get(key)
    if (cached) {
      return cached
    }

    const response = (await this.model.invoke(messages)) as AIMessage
    this.cache.set(key, response)
    return response
  }

  clearCache() {
    this.cache.clear()
  }
}
```

### Parallel Tool Execution

LangGraph's `ToolNode` automatically parallelizes independent tool calls:

```typescript
// If the model returns multiple tool calls, they execute in parallel
const response = new AIMessage({
  content: "",
  tool_calls: [
    {id: "1", name: "search_code", args: {query: "function"}},
    {id: "2", name: "get_weather", args: {location: "SF"}},
    {id: "3", name: "analyze_code", args: {code: "const x = 1"}},
  ],
})

// ToolNode executes all three concurrently
const result = await toolNode.invoke({messages: [response]})
```

## Error Handling

### Retry with Exponential Backoff

```typescript
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, baseDelay = 1000): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === maxRetries - 1) throw error

      const delay = baseDelay * Math.pow(2, attempt)
      console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw new Error("Unreachable")
}

// Usage in agent node
async function resilientAgentNode(state: typeof MessagesAnnotation.State) {
  const response = await withRetry(() => model.invoke(state.messages))
  return {messages: [response]}
}
```

### Graceful Degradation

```typescript
import {AIMessage} from "@langchain/core/messages"

async function agentWithFallback(state: typeof MessagesAnnotation.State) {
  try {
    const response = await primaryModel.invoke(state.messages)
    return {messages: [response]}
  } catch (primaryError) {
    console.warn("Primary model failed, using fallback")

    try {
      const fallbackResponse = await fallbackModel.invoke(state.messages)
      return {messages: [fallbackResponse]}
    } catch (fallbackError) {
      // Return a graceful error message
      return {
        messages: [new AIMessage("I apologize, but I'm temporarily unable to process your request. Please try again.")],
      }
    }
  }
}
```

## Project Integration

### Example: Code Analysis Agent

See [`notebooks/agents/analysis/code-analyzer.ipynb`](notebooks/agents/analysis/code-analyzer.ipynb) for a complete example demonstrating:

- Platform-agnostic implementation
- Type-safe configuration with Zod
- Comprehensive error handling
- Modular analysis capabilities

### Directory Structure

```
src/
├── agents/
│   ├── base.ts           # Base agent interfaces
│   ├── code-analyzer.ts  # Code analysis agent
│   └── research.ts       # Research assistant agent
├── tools/
│   ├── search.ts         # Code search tools
│   ├── analysis.ts       # Analysis tools
│   └── index.ts          # Tool exports
└── types/
    └── agent.ts          # Shared agent types
```

## Key Takeaways

1. **Use Annotations** for type-safe state management with proper reducers
2. **Use `tool()` function** with Zod schemas for type-safe tool definitions
3. **Use `createReactAgent`** for standard ReAct patterns
4. **Use checkpointers** (`MemorySaver`, `PostgresSaver`) for conversation persistence
5. **Bind tools to models** with `.bindTools()` for function calling
6. **Use conditional edges** for dynamic workflow routing
7. **Stream responses** for better UX with long-running operations
8. **Test thoroughly** with mocked models and deterministic scenarios

## References

- [LangGraph.js Documentation](https://langchain-ai.github.io/langgraphjs/)
- [LangChain.js Documentation](https://js.langchain.com/docs/)
- [LangGraph Concepts](https://langchain-ai.github.io/langgraph/concepts/)
- [LangSmith](https://docs.smith.langchain.com/) for tracing and monitoring
