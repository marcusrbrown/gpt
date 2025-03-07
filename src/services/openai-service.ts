import {GPTConfiguration} from '../types/gpt';
import OpenAI from 'openai';
import type {ClientOptions} from 'openai';

// Define types for tool calls
interface ToolCallOutput {
  tool_call_id: string;
  output: string;
}

// Define OpenAI service types
interface OpenAIServiceConfig {
  apiKey: string | null;
}

// Define custom error type
interface OpenAIError extends Error {
  message: string;
  status?: number;
  code?: string;
}

/**
 * Creates a service for interacting with the OpenAI Assistants API
 * This service provides methods for creating assistants, threads, and runs
 * using the official OpenAI API client.
 */
const createOpenAIService = () => {
  // Private state
  const state: OpenAIServiceConfig = {
    apiKey: null,
  };

  // OpenAI client instance
  let client: OpenAI | null = null;

  /**
   * Initialize or update the OpenAI client with the API key
   */
  const initClient = () => {
    if (!state.apiKey) {
      throw new Error('API key not set. Please call setApiKey first.');
    }

    const options: ClientOptions = {
      apiKey: state.apiKey,
      dangerouslyAllowBrowser: true, // Note: In production, you should use a backend proxy
    };

    client = new OpenAI(options);
  };

  /**
   * Set the API key for OpenAI
   */
  const setApiKey = (apiKey: string): void => {
    state.apiKey = apiKey;
    try {
      initClient();
    } catch (error) {
      console.error('Error initializing OpenAI client:', error);
      throw error;
    }
  };

  /**
   * Get the current API key
   */
  const getApiKey = (): string | null => {
    return state.apiKey;
  };

  /**
   * Create an assistant based on GPT configuration
   */
  const createAssistant = async (config: GPTConfiguration) => {
    if (!client) initClient();

    // Build tools configuration
    // We're using a simple array as per the OpenAI documentation
    // The TypeScript types in the SDK are more specific, but the API accepts this format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tools: any[] = [];

    // Add capabilities
    if (config.capabilities.codeInterpreter) {
      tools.push({type: 'code_interpreter'});
    }
    if (config.capabilities.webBrowsing) {
      tools.push({type: 'retrieval'});
    }

    // Add custom tools
    if (config.tools && config.tools.length > 0) {
      config.tools.forEach((tool) => {
        tools.push({
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.schema,
          },
        });
      });
    }

    try {
      // The TypeScript definitions in the OpenAI SDK don't perfectly match our usage,
      // but the API accepts this structure as documented in the OpenAI API documentation
      const assistant = await client!.beta.assistants.create({
        name: config.name,
        description: config.description,
        instructions: config.systemPrompt,
        model: 'gpt-4o',
        tools,
      });

      return assistant;
    } catch (error) {
      const apiError = error as OpenAIError;
      console.error('Failed to create assistant:', apiError);
      throw new Error(apiError.message || 'Failed to create assistant');
    }
  };

  /**
   * Create a new thread for conversation
   */
  const createThread = async () => {
    if (!client) initClient();

    try {
      const thread = await client!.beta.threads.create();
      return thread;
    } catch (error) {
      const apiError = error as OpenAIError;
      console.error('Failed to create thread:', apiError);
      throw new Error(apiError.message || 'Failed to create thread');
    }
  };

  /**
   * Add a message to an existing thread
   */
  const addMessage = async (threadId: string, content: string) => {
    if (!client) initClient();

    try {
      const message = await client!.beta.threads.messages.create(threadId, {
        role: 'user',
        content: content,
      });
      return message;
    } catch (error) {
      const apiError = error as OpenAIError;
      console.error('Failed to add message:', apiError);
      throw new Error(apiError.message || 'Failed to add message');
    }
  };

  /**
   * Create a run to generate a response from the assistant
   */
  const createRun = async (threadId: string, assistantId: string) => {
    if (!client) initClient();

    try {
      const run = await client!.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
      });
      return run;
    } catch (error) {
      const apiError = error as OpenAIError;
      console.error('Failed to create run:', apiError);
      throw new Error(apiError.message || 'Failed to create run');
    }
  };

  /**
   * Check the status of a run
   */
  const checkRunStatus = async (threadId: string, runId: string) => {
    if (!client) initClient();

    try {
      const run = await client!.beta.threads.runs.retrieve(threadId, runId);
      return run;
    } catch (error) {
      const apiError = error as OpenAIError;
      console.error('Failed to check run status:', apiError);
      throw new Error(apiError.message || 'Failed to check run status');
    }
  };

  /**
   * Get messages from a thread
   */
  const getMessages = async (threadId: string) => {
    if (!client) initClient();

    try {
      const messages = await client!.beta.threads.messages.list(threadId);
      return messages;
    } catch (error) {
      const apiError = error as OpenAIError;
      console.error('Failed to get messages:', apiError);
      throw new Error(apiError.message || 'Failed to get messages');
    }
  };

  /**
   * Submit tool outputs for a run that requires action
   */
  const submitToolOutputs = async (threadId: string, runId: string, toolCalls: ToolCallOutput[]) => {
    if (!client) initClient();

    try {
      const response = await client!.beta.threads.runs.submitToolOutputs(threadId, runId, {
        tool_outputs: toolCalls,
      });
      return response;
    } catch (error) {
      const apiError = error as OpenAIError;
      console.error('Failed to submit tool outputs:', apiError);
      throw new Error(apiError.message || 'Failed to submit tool outputs');
    }
  };

  /**
   * Stream run responses for real-time updates
   */
  const streamRun = async (threadId: string, assistantId: string, onUpdate: (message: unknown) => void) => {
    if (!client) initClient();

    try {
      // Create a run
      const run = await client!.beta.threads.runs.create(threadId, {
        assistant_id: assistantId,
      });

      // Poll for updates until we reach a terminal state
      const terminalStates = ['completed', 'failed', 'cancelled', 'expired', 'requires_action'];
      let currentRun = run;

      const poll = async () => {
        // Get the latest status
        currentRun = await client!.beta.threads.runs.retrieve(threadId, run.id);

        // Check if we've reached a terminal state
        if (terminalStates.includes(currentRun.status)) {
          if (currentRun.status === 'completed') {
            // Get the messages if completed
            const messages = await client!.beta.threads.messages.list(threadId);
            onUpdate({
              type: 'complete',
              messages: messages.data,
            });
          } else if (currentRun.status === 'requires_action') {
            // Return the required actions
            onUpdate({
              type: 'requires_action',
              required_action: currentRun.required_action,
            });
          } else {
            // Handle error states
            onUpdate({
              type: 'error',
              status: currentRun.status,
              error: currentRun.last_error,
            });
          }
          return;
        }

        // If not in a terminal state, poll again after a short delay
        // Use void to avoid Promise returned in setTimeout warning
        void setTimeout(() => void poll(), 1000);
      };

      // Start polling
      await poll();

      return run;
    } catch (error) {
      const apiError = error as OpenAIError;
      console.error('Error in streamRun:', apiError);
      onUpdate({
        type: 'error',
        error: apiError.message || 'Error streaming run',
      });
      throw apiError;
    }
  };

  /**
   * Cancel a run that is in progress
   */
  const cancelRun = async (threadId: string, runId: string) => {
    if (!client) initClient();

    try {
      const response = await client!.beta.threads.runs.cancel(threadId, runId);
      return response;
    } catch (error) {
      const apiError = error as OpenAIError;
      console.error('Failed to cancel run:', apiError);
      throw new Error(apiError.message || 'Failed to cancel run');
    }
  };

  // Return the public API
  return {
    setApiKey,
    getApiKey,
    createAssistant,
    createThread,
    addMessage,
    createRun,
    checkRunStatus,
    getMessages,
    submitToolOutputs,
    streamRun,
    cancelRun,
  };
};

// Create and export a singleton instance
export const openAIService = createOpenAIService();
