import {z} from 'zod';

/**
 * Supported AI platforms for agent implementation
 */
export enum Platform {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  OLLAMA = 'ollama',
  AZURE = 'azure',
}

/**
 * Base configuration for all agents
 */
export const BaseAgentConfigSchema = z.object({
  platform: z.nativeEnum(Platform),
  model: z.string(),
  temperature: z.number().min(0).max(1),
  maxTokens: z.number().positive(),
  apiKey: z.string().optional(),
});

export type BaseAgentConfig = z.infer<typeof BaseAgentConfigSchema>;

/**
 * Memory interface for agent state management
 */
export interface AgentMemory {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  clear(): Promise<void>;
}

/**
 * Standard response format for all agents
 */
export interface AgentResponse {
  success: boolean;
  result: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Base interface that all agents must implement
 */
export interface BaseAgent {
  /**
   * Process an input and return a response
   * @param input The input to process
   * @param context Optional context for the processing
   */
  process(input: string, context?: Record<string, unknown>): Promise<AgentResponse>;

  /**
   * Initialize the agent with any necessary setup
   */
  initialize?(): Promise<void>;

  /**
   * Clean up any resources used by the agent
   */
  cleanup?(): Promise<void>;
}

/**
 * Tool interface for agent capabilities
 */
export interface Tool {
  name: string;
  description: string;
  execute(params: Record<string, unknown>): Promise<unknown>;
}

/**
 * Configuration for tool usage
 */
export interface ToolConfig {
  name: string;
  enabled: boolean;
  parameters?: Record<string, unknown>;
}

/**
 * Agent capabilities configuration
 */
export interface AgentCapabilities {
  tools: ToolConfig[];
  memory?: boolean;
  streaming?: boolean;
  multimodal?: boolean;
}

/**
 * Complete agent configuration
 */
export const AgentConfigSchema = BaseAgentConfigSchema.extend({
  capabilities: z
    .object({
      tools: z.array(
        z.object({
          name: z.string(),
          enabled: z.boolean(),
          parameters: z.record(z.unknown()).optional(),
        }),
      ),
      memory: z.boolean().optional(),
      streaming: z.boolean().optional(),
      multimodal: z.boolean().optional(),
    })
    .optional(),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;
