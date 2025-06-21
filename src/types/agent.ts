import {type Callbacks} from '@langchain/core/callbacks/manager'
import {type BaseChatModel} from '@langchain/core/language_models/chat_models'
import {type BaseMessage} from '@langchain/core/messages'
import {type Tool} from '@langchain/core/tools'
import {type StateGraph} from '@langchain/langgraph'
import {z} from 'zod'

/**
 * Configuration interface for caching behavior in agents.
 * Controls the size and time-to-live (TTL) of various caches used by agents.
 */
export interface CacheConfig {
  /** Maximum number of items to store in the cache */
  maxSize: number
  /** Time-to-live in milliseconds for cache entries */
  ttl: number
}

/**
 * Configuration schema for all agents.
 * Defines the core parameters required to initialize any agent.
 */
export const AgentConfigSchema = z.object({
  /** The specific model to use from the chosen platform */
  model: z.string(),
  /** Temperature setting for model outputs (0-1) */
  temperature: z.number().min(0).max(1),
  /** Maximum tokens to generate in responses */
  maxTokens: z.number().positive(),
  /** Optional API key for the platform */
  apiKey: z.string().optional(),
  /** Optional cache configuration */
  cacheConfig: z
    .object({
      maxSize: z.number().positive(),
      ttl: z.number().positive(),
    })
    .optional(),
  /** Optional agent capabilities */
  capabilities: z
    .object({
      tools: z.array(z.custom<Tool>()),
      streaming: z.boolean().optional().default(false),
      humanInTheLoop: z.boolean().optional().default(false),
      callbacks: z.custom<Callbacks>().optional(),
    })
    .optional(),
})

export type AgentConfig = z.infer<typeof AgentConfigSchema>

/**
 * Memory interface for agent state management.
 * Provides persistent storage capabilities for maintaining agent state.
 */
export interface AgentMemory {
  /** Retrieve a value from memory */
  get(key: string): Promise<unknown>
  /** Store a value in memory */
  set(key: string, value: unknown): Promise<void>
  /** Clear all stored values */
  clear(): Promise<void>
}

/**
 * Agent state interface for LangGraph workflows.
 * Defines the structure of state maintained during agent execution.
 */
export interface AgentState {
  /** Message history for the agent */
  messages: BaseMessage[]
  /** Current input being processed */
  input: string
  /** Available tools for the agent */
  tools: Tool[]
  /** Additional context and metadata */
  context?: Record<string, unknown>
}

/**
 * Standard response format for all agent operations.
 * Provides a consistent structure for agent outputs.
 */
export interface AgentResponse {
  /** The operation result */
  output: BaseMessage
  /** Intermediate steps taken by the agent */
  intermediateSteps?: {
    action: string
    observation: string
  }[]
  /** Optional metadata about the operation */
  metadata?: Record<string, unknown>
}

/**
 * Configuration for agent capabilities and tools.
 * Defines the features available to an agent.
 */
export interface AgentCapabilities {
  /** List of tools available to the agent */
  tools: Tool[]
  /** Whether to enable streaming responses */
  streaming?: boolean
  /** Whether to enable human-in-the-loop workflows */
  humanInTheLoop?: boolean
  /** Optional callbacks for monitoring and logging */
  callbacks?: Callbacks
}

/**
 * Interface that all agents must implement.
 * Defines the core functionality required for any agent implementation.
 */
export interface Agent {
  /** The underlying language model */
  model: BaseChatModel
  /** The agent's capabilities */
  capabilities: AgentCapabilities
  /** The agent's workflow graph */
  graph?: StateGraph<AgentState, AgentState>

  /**
   * Process an input and return a response
   * @param input The input to process
   * @param options Processing options
   */
  invoke(
    input: string,
    options?: {
      stream?: boolean
      callbacks?: Callbacks
    },
  ): Promise<AgentResponse>

  /**
   * Initialize the agent with necessary setup
   */
  initialize(): Promise<void>

  /**
   * Clean up resources used by the agent
   */
  cleanup(): Promise<void>

  /**
   * Get current token usage statistics
   */
  getTokenUsage(): {cached: number; total: number}

  /**
   * Clear all caches
   */
  clearCaches(): void
}

/**
 * Configuration for tool usage within agents.
 * Defines how tools should be configured and used.
 */
export interface ToolConfig {
  /** Name of the tool */
  name: string
  /** Whether the tool is enabled */
  enabled: boolean
  /** Optional tool parameters */
  parameters?: Record<string, unknown>
}
