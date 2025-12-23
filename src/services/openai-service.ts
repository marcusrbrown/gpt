import type {GPTConfiguration} from '@/types/gpt'
import OpenAI, {type ClientOptions} from 'openai'

// Define types for tool calls
interface ToolCallOutput {
  tool_call_id: string
  output: string
}

// Define OpenAI service types
interface OpenAIServiceConfig {
  apiKey: string | null
}

// Define custom error type
interface OpenAIError extends Error {
  message: string
  status?: number
  code?: string
}

/**
 * Error response types for better handling
 */

const ErrorTypes = {
  AUTHENTICATION: 'authentication',
  PERMISSION: 'permission',
  NOT_FOUND: 'not_found',
  RATE_LIMIT: 'rate_limit',
  SERVER: 'server',
  TIMEOUT: 'timeout',
  VALIDATION: 'validation',
  CONNECTION: 'connection',
  UNKNOWN: 'unknown',
} as const

type ErrorType = (typeof ErrorTypes)[keyof typeof ErrorTypes]

export type CreateOpenAIService = ReturnType<typeof createOpenAIService>

/**
 * Creates a service for interacting with the OpenAI Assistants API
 * This service provides methods for creating assistants, threads, and runs
 * using the official OpenAI API client.
 */
const createOpenAIService = (config: OpenAIServiceConfig = {apiKey: null}) => {
  // Private state
  const state: OpenAIServiceConfig = {
    apiKey: config.apiKey,
  }

  // OpenAI client instance
  let client: OpenAI | null = null

  /**
   * Initialize or update the OpenAI client with the API key
   */
  const initClient = () => {
    if (!state.apiKey) {
      throw new Error('API key not set. Please call setApiKey first.')
    }

    const options: ClientOptions = {
      apiKey: state.apiKey,
      dangerouslyAllowBrowser: true, // Note: In production, you should use a backend proxy
    }

    client = new OpenAI(options)
  }

  /**
   * Set the API key for OpenAI
   */
  const setApiKey = (apiKey: string): void => {
    state.apiKey = apiKey || null
    if (!apiKey) {
      client = null
      return
    }
    try {
      initClient()
    } catch (error) {
      console.error('Error initializing OpenAI client:', error)
      throw error
    }
  }

  /**
   * Get the current API key
   */
  const getApiKey = (): string | null => {
    return state.apiKey
  }

  /**
   * Helper for consistent error handling
   */
  const handleApiError = (error: unknown, defaultMessage: string): Error => {
    const apiError = error as OpenAIError
    console.error(`${defaultMessage}:`, apiError)

    let errorType: ErrorType = ErrorTypes.UNKNOWN

    // Determine the type of error for better handling by callers
    if (apiError.status) {
      if (apiError.status === 401) errorType = ErrorTypes.AUTHENTICATION
      else if (apiError.status === 403) errorType = ErrorTypes.PERMISSION
      else if (apiError.status === 404) errorType = ErrorTypes.NOT_FOUND
      else if (apiError.status === 429) errorType = ErrorTypes.RATE_LIMIT
      else if (apiError.status >= 500) errorType = ErrorTypes.SERVER
    } else if (apiError.code === 'ECONNABORTED') {
      errorType = ErrorTypes.TIMEOUT
    } else if (apiError.code === 'ECONNREFUSED' || apiError.code === 'ENOTFOUND') {
      errorType = ErrorTypes.CONNECTION
    }

    const enrichedError = new Error(apiError.message || defaultMessage)
    enrichedError.name = errorType
    return enrichedError
  }

  /**
   * Executes a function with retry logic for transient errors
   */
  const withRetry = async <T>(
    fn: () => Promise<T>,
    options: {maxRetries?: number; baseDelayMs?: number; maxDelayMs?: number} = {},
  ): Promise<T> => {
    const {maxRetries = 3, baseDelayMs = 500, maxDelayMs = 10000} = options

    let retries = 0
    let delay = baseDelayMs

    while (true) {
      try {
        return await fn()
      } catch (error) {
        const apiError = error as OpenAIError

        // Only retry on potentially transient errors
        const shouldRetry =
          retries < maxRetries &&
          (apiError.status === 429 || // Rate limit
            apiError.status === 500 || // Server error
            apiError.status === 503 || // Service unavailable
            apiError.code === 'ECONNABORTED' || // Timeout
            apiError.code === 'ECONNRESET') // Connection reset

        if (!shouldRetry) throw error

        retries++
        console.warn(`Retry attempt ${retries}/${maxRetries} after ${delay}ms`)

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay))

        // Exponential backoff with jitter
        delay = Math.min(delay * (1.5 + Math.random() * 0.5), maxDelayMs)
      }
    }
  }

  /**
   * Ensure client is initialized and return it
   */
  const ensureClient = (): OpenAI => {
    if (!client) {
      initClient()
    }
    if (!client) {
      throw new Error('Failed to initialize OpenAI client')
    }
    return client
  }

  /**
   * Create an assistant based on GPT configuration
   */
  const createAssistant = async (config: GPTConfiguration) => {
    // Build tools configuration
    const tools: {
      type: 'code_interpreter' | 'retrieval' | 'file_search' | 'function'
      file_search?: {
        max_chunk_size_tokens?: number
        chunk_overlap_tokens?: number
        max_num_results?: number
        ranking_options?: {
          ranker: 'auto' | 'default_2024_08_21'
          scoreThreshold: number
        }
      }
      function?: {
        name: string
        description: string
        parameters: Record<string, unknown>
      }
    }[] = []

    const toolResources: {
      code_interpreter?: {
        file_ids: string[]
      }
      file_search?: {
        vector_store_ids: string[]
      }
    } = {}

    // Add capabilities
    if (config.capabilities.codeInterpreter) {
      tools.push({type: 'code_interpreter'})
      const fileIds = config.knowledge.files
        .filter(file => file.type === 'file' && file.content)
        .map(file => file.content)
      if (fileIds.length > 0) {
        toolResources.code_interpreter = {
          file_ids: fileIds,
        }
      }
    }

    if (config.capabilities.webBrowsing) {
      tools.push({type: 'retrieval'})
    }

    if (config.capabilities.fileSearch?.enabled) {
      const fileSearchTool = {
        type: 'file_search' as const,
        file_search: {} as {
          max_chunk_size_tokens?: number
          chunk_overlap_tokens?: number
          max_num_results?: number
          ranking_options?: {
            ranker: 'auto' | 'default_2024_08_21'
            scoreThreshold: number
          }
        },
      }

      if (config.capabilities.fileSearch.maxChunkSizeTokens) {
        fileSearchTool.file_search.max_chunk_size_tokens = config.capabilities.fileSearch.maxChunkSizeTokens
      }

      if (config.capabilities.fileSearch.chunkOverlapTokens) {
        fileSearchTool.file_search.chunk_overlap_tokens = config.capabilities.fileSearch.chunkOverlapTokens
      }

      if (config.capabilities.fileSearch.maxNumResults) {
        fileSearchTool.file_search.max_num_results = config.capabilities.fileSearch.maxNumResults
      }

      if (config.capabilities.fileSearch.ranking) {
        fileSearchTool.file_search.ranking_options = config.capabilities.fileSearch.ranking
      }

      tools.push(fileSearchTool)

      const vectorStores = config.knowledge.vectorStores || []
      if (vectorStores.length > 0) {
        toolResources.file_search = {
          vector_store_ids: vectorStores.map(vs => vs.id),
        }
      }
    }

    // Add custom tools
    if (config.tools && config.tools.length > 0) {
      config.tools.forEach(tool => {
        tools.push({
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.schema,
          },
        })
      })
    }

    try {
      const client = ensureClient()

      const assistant = await withRetry(async () =>
        client.beta.assistants.create({
          name: config.name,
          description: config.description,
          instructions: config.systemPrompt,
          model: 'gpt-4o',
          tools: tools as OpenAI.Beta.Assistants.AssistantTool[],
          tool_resources: toolResources,
        }),
      )

      return assistant
    } catch (error) {
      throw handleApiError(error, 'Failed to create assistant')
    }
  }

  /**
   * Create a new thread for conversation
   */
  const createThread = async () => {
    const client = ensureClient()

    try {
      const thread = await withRetry(async () => client.beta.threads.create())
      return thread
    } catch (error) {
      throw handleApiError(error, 'Failed to create thread')
    }
  }

  /**
   * Add a message to an existing thread
   */
  const addMessage = async (threadId: string, content: string, fileIds?: string[]) => {
    const client = ensureClient()

    try {
      // Since the OpenAI SDK doesn't fully type 'file_ids' in MessageCreateParams,
      // we need to create the base parameters first
      const baseParams = {
        role: 'user' as const,
        content,
      }

      // Then we create the final params without specifying type
      const params = fileIds && fileIds.length > 0 ? {...baseParams, file_ids: fileIds} : baseParams

      // Use the OpenAI SDK with the params - TypeScript will allow this
      // because the SDK types are permissive at runtime
      const message = await withRetry(async () => client.beta.threads.messages.create(threadId, params))

      return message
    } catch (error) {
      throw handleApiError(error, 'Failed to add message')
    }
  }

  /**
   * Create a run to generate a response from the assistant
   */
  const createRun = async (threadId: string, assistantId: string) => {
    const client = ensureClient()

    try {
      const run = await withRetry(async () =>
        client.beta.threads.runs.create(threadId, {
          assistant_id: assistantId,
        }),
      )
      return run
    } catch (error) {
      throw handleApiError(error, 'Failed to create run')
    }
  }

  /**
   * Check the status of a run
   */
  const checkRunStatus = async (threadId: string, runId: string) => {
    const client = ensureClient()

    try {
      const run = await withRetry(async () => client.beta.threads.runs.retrieve(runId, {thread_id: threadId}))
      return run
    } catch (error) {
      throw handleApiError(error, 'Failed to check run status')
    }
  }

  /**
   * Get messages from a thread
   */
  const getMessages = async (threadId: string) => {
    const client = ensureClient()

    try {
      const messages = await withRetry(async () => client.beta.threads.messages.list(threadId))
      return messages
    } catch (error) {
      throw handleApiError(error, 'Failed to get messages')
    }
  }

  /**
   * Submit tool outputs for a run that requires action
   */
  const submitToolOutputs = async (threadId: string, runId: string, toolCalls: ToolCallOutput[]) => {
    const client = ensureClient()

    try {
      const run = await withRetry(async () =>
        client.beta.threads.runs.submitToolOutputs(runId, {thread_id: threadId, tool_outputs: toolCalls}),
      )
      return run
    } catch (error) {
      throw handleApiError(error, 'Failed to submit tool outputs')
    }
  }

  /**
   * Upload a file to OpenAI for use with assistants
   */
  const uploadFile = async (file: File) => {
    const client = ensureClient()

    try {
      const uploadedFile = await withRetry(async () =>
        client.files.create({
          file,
          purpose: 'assistants',
        }),
      )
      return uploadedFile
    } catch (error) {
      throw handleApiError(error, 'Failed to upload file')
    }
  }

  /**
   * Create a vector store for file search
   */
  const createVectorStore = async (name: string, fileIds: string[]) => {
    const client = ensureClient()

    try {
      const vectorStore = await withRetry(async () =>
        client.vectorStores.create({
          name,
          file_ids: fileIds.slice(0, 500), // OpenAI limit
        }),
      )
      return vectorStore
    } catch (error) {
      throw handleApiError(error, 'Failed to create vector store')
    }
  }

  /**
   * Add files to a vector store
   */
  const addFilesToVectorStore = async (vectorStoreId: string, fileIds: string[]) => {
    const client = ensureClient()

    try {
      const batch = await withRetry(async () =>
        client.vectorStores.fileBatches.create(vectorStoreId, {file_ids: fileIds}),
      )
      return batch
    } catch (error) {
      throw handleApiError(error, 'Failed to add files to vector store')
    }
  }

  /**
   * Wait for a run to complete with active polling
   */
  const waitForRunCompletion = async (
    threadId: string,
    runId: string,
    {pollIntervalMs = 1000, maxWaitTimeMs = 60000} = {},
  ) => {
    const startTime = Date.now()
    let run = await checkRunStatus(threadId, runId)

    while (['queued', 'in_progress'].includes(run.status) && Date.now() - startTime < maxWaitTimeMs) {
      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
      run = await checkRunStatus(threadId, runId)
    }

    if (['queued', 'in_progress'].includes(run.status)) {
      throw new Error(`Run timed out after ${maxWaitTimeMs}ms`)
    }

    return run
  }

  /**
   * Stream a run's progress by polling for status updates
   */
  const streamRun = async (threadId: string, assistantId: string, onUpdate: (message: unknown) => void) => {
    try {
      // Create a run
      const run = await createRun(threadId, assistantId)
      onUpdate({type: 'run_created', run})

      // Start polling
      const poll = async () => {
        let currentRun = run
        const startTime = Date.now()
        const timeout = 300000 // 5 minutes timeout
        const pollInterval = 1000 // 1 second polling interval

        // Keep polling until the run is complete or times out
        while (['queued', 'in_progress'].includes(currentRun.status) && Date.now() - startTime < timeout) {
          // Wait before polling again
          await new Promise(resolve => setTimeout(resolve, pollInterval))

          // Check the current status
          currentRun = await checkRunStatus(threadId, run.id)
          onUpdate({type: 'run_update', run: currentRun})

          // Handle required_action status
          if (currentRun.status === 'requires_action') {
            onUpdate({
              type: 'requires_action',
              required_action: currentRun.required_action,
            })
            break
          }

          // If completed, get messages
          if (currentRun.status === 'completed') {
            const messages = await getMessages(threadId)
            onUpdate({type: 'messages_update', messages})
            break
          }

          // Handle failed runs
          if (['failed', 'cancelled', 'expired'].includes(currentRun.status)) {
            onUpdate({type: 'run_failed', run: currentRun})
            break
          }
        }

        // Handle timeout
        if (['queued', 'in_progress'].includes(currentRun.status)) {
          onUpdate({
            type: 'run_timeout',
            message: 'The run timed out after 5 minutes',
          })
        }

        return currentRun
      }

      return await poll()
    } catch (error) {
      throw handleApiError(error, 'Failed to stream run')
    }
  }

  /**
   * Cancel a run
   */
  const cancelRun = async (threadId: string, runId: string) => {
    const client = ensureClient()

    try {
      const run = await withRetry(async () => client.beta.threads.runs.cancel(runId, {thread_id: threadId}))
      return run
    } catch (error) {
      throw handleApiError(error, 'Failed to cancel run')
    }
  }

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
    uploadFile,
    createVectorStore,
    addFilesToVectorStore,
    waitForRunCompletion,
  }
}

// Create a singleton instance of the OpenAI service
export const openAIService = createOpenAIService()

// Also export the factory function for tests or custom instances
export default createOpenAIService
