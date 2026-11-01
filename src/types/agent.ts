import {z} from 'zod'

/** A single message exchanged with an agent. */
export const AgentMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.string(),
})

export type AgentMessage = z.infer<typeof AgentMessageSchema>

/** A tool an agent can call. Extra fields are preserved. */
export const AgentToolSchema = z.looseObject({
  name: z.string(),
  description: z.string(),
})

export type AgentTool = z.infer<typeof AgentToolSchema>

/** Named lifecycle callbacks for monitoring and logging. */
export const AgentCallbacksSchema = z.record(z.string(), z.unknown())

export type AgentCallbacks = z.infer<typeof AgentCallbacksSchema>

/** The language model an agent talks to. */
export interface AgentModel {
  invoke: (messages: AgentMessage[]) => Promise<AgentMessage>
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
      tools: z.array(AgentToolSchema),
      streaming: z.boolean().optional().default(false),
      humanInTheLoop: z.boolean().optional().default(false),
      callbacks: AgentCallbacksSchema.optional(),
    })
    .optional(),
})

export type AgentConfig = z.infer<typeof AgentConfigSchema>

/**
 * Agent state interface for agent workflows.
 * Defines the structure of state maintained during agent execution.
 */
export interface AgentState {
  /** Message history for the agent */
  messages: AgentMessage[]
  /** Current input being processed */
  input: string
  /** Available tools for the agent */
  tools: AgentTool[]
  /** Additional context and metadata */
  context?: Record<string, unknown>
}

/**
 * Standard response format for all agent operations.
 * Provides a consistent structure for agent outputs.
 */
export interface AgentResponse {
  /** The operation result */
  output: AgentMessage
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
  tools: AgentTool[]
  /** Whether to enable streaming responses */
  streaming?: boolean
  /** Whether to enable human-in-the-loop workflows */
  humanInTheLoop?: boolean
  /** Optional callbacks for monitoring and logging */
  callbacks?: AgentCallbacks
}

/**
 * Interface that all agents must implement.
 * Defines the core functionality required for any agent implementation.
 */
export interface Agent {
  /** The underlying language model */
  model: AgentModel
  /** The agent's capabilities */
  capabilities: AgentCapabilities

  /**
   * Process an input and return a response
   * @param input The input to process
   * @param options Processing options
   */
  invoke: (
    input: string,
    options?: {
      stream?: boolean
      callbacks?: AgentCallbacks
    },
  ) => Promise<AgentResponse>

  /**
   * Initialize the agent with necessary setup
   */
  initialize: () => Promise<void>

  /**
   * Clean up resources used by the agent
   */
  cleanup: () => Promise<void>

  /**
   * Get current token usage statistics
   */
  getTokenUsage: () => {cached: number; total: number}

  /**
   * Clear all caches
   */
  clearCaches: () => void
}
