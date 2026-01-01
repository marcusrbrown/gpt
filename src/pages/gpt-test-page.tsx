import type {Conversation, ConversationMessage, GPTConfiguration} from '@/types/gpt'
import {ChatInterface} from '@/components/chat'
import {useAllConnectedTools, useMCP} from '@/hooks/use-mcp'
import {useOpenAIService} from '@/hooks/use-openai-service'
import {useSession} from '@/hooks/use-session'
import {useStorage} from '@/hooks/use-storage'
import {cn, ds} from '@/lib/design-system'
import {useCallback, useEffect, useRef, useState} from 'react'
import {useLocation, useNavigate, useParams} from 'react-router-dom'

export function GPTTestPage() {
  const {gptId, conversationId} = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const storage = useStorage()
  const {getSecret} = useSession()
  const openAIService = useOpenAIService()
  const {callTool} = useMCP()
  const allTools = useAllConnectedTools()

  // Page Load State
  const [gptConfig, setGptConfig] = useState<GPTConfiguration | undefined>(undefined)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isConfigLoading, setIsConfigLoading] = useState(true)

  // Chat State
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processingMessage, setProcessingMessage] = useState('Starting...')
  const [conversationName, setConversationName] = useState('New Chat')

  // Thread and Assistant state
  const [threadId, setThreadId] = useState<string | null>(null)
  const [assistantId, setAssistantId] = useState<string | null>(null)
  const [runId, setRunId] = useState<string | null>(null)
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(conversationId)

  // Ref for the runId to ensure callbacks always have the latest value
  const runIdRef = useRef<string | null>(null)
  useEffect(() => {
    runIdRef.current = runId
  }, [runId])

  // Load GPT Config & Conversations
  useEffect(() => {
    const loadGptData = async () => {
      try {
        if (typeof gptId === 'string' && gptId.trim() !== '') {
          const [config, gptConversations] = await Promise.all([
            storage.getGPT(gptId),
            storage.getConversationsForGPT(gptId),
          ])

          setGptConfig(config)
          setConversations(gptConversations)
        }
      } catch (error_) {
        console.error('Failed to load GPT data', error_)
        setGptConfig(undefined)
      } finally {
        setIsConfigLoading(false)
      }
    }
    loadGptData().catch(console.error)
  }, [gptId, storage])

  // Load Conversation History when ID changes
  useEffect(() => {
    const loadConversation = async () => {
      if (!currentConversationId || !storage) return

      try {
        const conversation = await storage.getConversation(currentConversationId)
        if (conversation) {
          setMessages(conversation.messages)
          setConversationName(conversation.title || 'New Chat')
          // In a real app, we would also need to retrieve the threadId associated with this conversation
          // For now, we'll start a new thread if we resume a conversation (limitation of current data model)
        }
      } catch (error_) {
        console.error('Failed to load conversation', error_)
      }
    }

    if (currentConversationId) {
      loadConversation().catch(console.error)
    } else {
      // New chat
      setMessages([])
      setConversationName('New Chat')
      setThreadId(null)
    }
  }, [currentConversationId, storage])

  // Load API Key
  useEffect(() => {
    const loadApiKey = async () => {
      const key = await getSecret('openai')
      if (key) {
        setApiKey(key)
        openAIService.setApiKey(key)
      }
    }
    loadApiKey().catch(console.error)
  }, [getSecret, openAIService])

  // Initialize the assistant and thread
  const initializeAssistant = useCallback(async () => {
    if (!gptConfig || !apiKey) {
      setError('Missing GPT configuration or API key')
      return
    }

    try {
      setIsChatLoading(true)
      setProcessingMessage('Creating assistant...')

      // Create the assistant without direct type casting
      const assistant = await openAIService.createAssistant(gptConfig)
      setAssistantId(assistant.id)

      setProcessingMessage('Creating thread...')
      const thread = await openAIService.createThread()
      setThreadId(thread.id)

      // Set default conversation name based on current date
      const now = new Date()
      const newName = `Conversation ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`
      setConversationName(newName)

      setProcessingMessage('Ready')
      setIsChatLoading(false)

      return {assistantId: assistant.id, threadId: thread.id, title: newName}
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to initialize assistant')
      setIsChatLoading(false)
      return null
    }
  }, [gptConfig, apiKey, openAIService])

  // Define types for API responses
  interface ApiMessage {
    id: string
    role: string
    content: {
      type?: string
      text?: {
        value: string
      }
    }[]
    created_at: number
  }

  // Define types for Run and ToolCalls locally
  interface ToolCall {
    id: string
    function: {
      name: string
      arguments: string
    }
  }

  interface Run {
    id: string
    status:
      | 'queued'
      | 'in_progress'
      | 'requires_action'
      | 'cancelling'
      | 'cancelled'
      | 'failed'
      | 'completed'
      | 'expired'
    required_action?: {
      submit_tool_outputs?: {
        tool_calls: ToolCall[]
      }
    }
    last_error?: {
      code: string
      message: string
    }
  }

  // Handle streaming run updates
  type RunUpdate =
    | {type: 'run_created'; run: Run}
    | {type: 'run_update'; run: Run}
    | {type: 'requires_action'; required_action: NonNullable<Run['required_action']>}
    | {type: 'messages_update'; messages: {data: ApiMessage[]}}
    | {type: 'run_failed'; run: Run}
    | {type: 'run_timeout'; message: string}

  // Process API messages to ConversationMessage format
  const processMessages = useCallback((messageResponse: {data: ApiMessage[]}) => {
    const newMessages = messageResponse.data
      .filter((msg: ApiMessage) => msg.role && msg.content && Array.isArray(msg.content) && msg.content.length > 0)
      .map((msg: ApiMessage) => {
        // Find the first text content if available
        // Use a more type-safe approach for handling the content
        const textContent = msg.content.find((content: {type?: string; text?: {value: string}}) => {
          if (typeof content === 'object' && content !== null && 'type' in content) {
            const typedContent = content as {type: string; text?: {value: string}}
            return typedContent.type === 'text' && typedContent.text?.value !== undefined
          }
          return false
        })

        return {
          id: msg.id,
          role: msg.role as 'user' | 'assistant' | 'system',
          content: textContent?.text?.value || '',
          timestamp: new Date(msg.created_at * 1000),
        }
      })
      .reverse()

    return newMessages
  }, [])

  // Save conversation state
  const saveConversationState = useCallback(
    async (msgs: ConversationMessage[], title: string) => {
      if (!gptConfig || !storage) return

      const conversation: Conversation = {
        id: currentConversationId || crypto.randomUUID(),
        gptId: gptConfig.id,
        title,
        messages: msgs,
        createdAt: new Date(),
        updatedAt: new Date(),
        messageCount: msgs.length,
        lastMessagePreview: msgs.at(-1)?.content.slice(0, 100),
        tags: [],
        isPinned: false,
        isArchived: false,
        pinnedAt: null,
        archivedAt: null,
      }

      await storage.saveConversation(conversation)

      // If this was a new conversation, update URL and state
      if (!currentConversationId) {
        setCurrentConversationId(conversation.id)
        // Refresh list
        const list = await storage.getConversationsForGPT(gptConfig.id)
        setConversations(list)

        // Update URL to include the new conversation ID
        const result = navigate(`/gpt/test/${gptConfig.id}/c/${conversation.id}`, {replace: true})
        if (result instanceof Promise) {
          result.catch(console.error)
        }
      }
    },
    [gptConfig, storage, currentConversationId, navigate],
  )

  const handleStreamUpdate = useCallback(
    async (update: RunUpdate, currentThreadId: string, currentRunId?: string) => {
      // Use switch for cleaner flow control
      switch (update.type) {
        case 'run_created': {
          setRunId(update.run.id)
          setProcessingMessage('Thinking...')
          break
        }
        case 'run_update': {
          if (update.run.status === 'in_progress') {
            setProcessingMessage('Processing...')
          }
          break
        }
        case 'requires_action': {
          setProcessingMessage('Using tools...')
          // Handle tool calls
          if (update.required_action?.submit_tool_outputs?.tool_calls && currentRunId) {
            const toolCalls = update.required_action.submit_tool_outputs.tool_calls

            try {
              // Execute tools in parallel
              const toolOutputs = await Promise.all(
                toolCalls.map(async toolCall => {
                  try {
                    // Parse arguments if they are a string
                    const args =
                      typeof toolCall.function.arguments === 'string'
                        ? JSON.parse(toolCall.function.arguments)
                        : toolCall.function.arguments

                    // We're using args here to log what would happen, silencing the unused var warning
                    console.log(`Executing tool ${toolCall.function.name} with args:`, args)

                    // Find the server that has this tool
                    const toolProvider = allTools.find(t => t.tool.name === toolCall.function.name)

                    let result: unknown

                    if (toolProvider) {
                      console.log(`Found tool provider: ${toolProvider.serverName} (${toolProvider.serverId})`)
                      try {
                        const toolResult = await callTool(
                          toolProvider.serverId,
                          toolCall.function.name,
                          args as Record<string, unknown>,
                        )
                        result = toolResult.isError
                          ? {error: 'Tool execution failed', details: toolResult}
                          : toolResult.content
                      } catch (error) {
                        console.error('Tool execution error:', error)
                        result = {error: error instanceof Error ? error.message : 'Unknown tool execution error'}
                      }
                    } else {
                      // Fallback to mock if MCP is not set up for this tool
                      console.warn(`No provider found for tool: ${toolCall.function.name}. Using mock response.`)
                      result = {result: `Tool ${toolCall.function.name} executed successfully (Mock)`}
                    }

                    return {
                      tool_call_id: toolCall.id,
                      output: JSON.stringify(result),
                    }
                  } catch (error_) {
                    console.error(`Error executing tool ${toolCall.function.name}:`, error_)
                    return {
                      tool_call_id: toolCall.id,
                      output: JSON.stringify({error: error_ instanceof Error ? error_.message : 'Unknown error'}),
                    }
                  }
                }),
              )

              // Submit outputs and continue streaming
              await openAIService.submitToolOutputs(currentThreadId, currentRunId, toolOutputs)
            } catch (error) {
              console.error('Error handling tool calls:', error)
              setError('Failed to execute tools')
            }
          }
          break
        }
        case 'messages_update': {
          const newMessages = processMessages(update.messages)
          setMessages(newMessages)
          setIsChatLoading(false)
          setProcessingMessage('')
          // Auto-save history
          saveConversationState(newMessages, conversationName).catch(console.error)
          break
        }
        case 'run_failed': {
          setError(`Run failed: ${update.run.last_error?.message || update.run.status}`)
          setIsChatLoading(false)
          setProcessingMessage('')
          break
        }
        case 'run_timeout': {
          setError(update.message)
          setIsChatLoading(false)
          setProcessingMessage('')
          break
        }
      }
    },
    [openAIService, processMessages, saveConversationState, conversationName],
  )

  // Handle sending a message
  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !gptConfig || !apiKey || isChatLoading) return

    setIsChatLoading(true)
    setError(null)

    // Add the user message to the local messages
    const userMessage: ConversationMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)

    try {
      // If we don't have a thread and assistant yet, create them
      let currentThreadId = threadId
      let currentAssistantId = assistantId

      if (!currentThreadId || !currentAssistantId) {
        const initResult = await initializeAssistant()
        if (!initResult) {
          throw new Error('Failed to initialize assistant')
        }
        currentThreadId = initResult.threadId
        currentAssistantId = initResult.assistantId
      }

      // Add the message to the thread
      if (currentThreadId) {
        await openAIService.addMessage(currentThreadId, content)

        // Start streaming the run
        if (currentAssistantId) {
          let activeRunId: string | undefined

          await openAIService.streamRun(currentThreadId, currentAssistantId, (update: unknown) => {
            const typedUpdate = update as RunUpdate

            // Capture run ID from updates if available
            if (typedUpdate.type === 'run_created') {
              activeRunId = typedUpdate.run.id
            } else if (typedUpdate.type === 'run_update' || typedUpdate.type === 'run_failed') {
              activeRunId = typedUpdate.run.id
            }

            handleStreamUpdate(typedUpdate, currentThreadId, activeRunId).catch(console.error)
          })
        }
      } else {
        throw new Error('Thread ID is missing')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error sending message')
      setIsChatLoading(false)
    }
  }

  // Handle initial prompt from navigation state (e.g. from showcase)
  const initialPromptProcessed = useRef(false)

  useEffect(() => {
    if (initialPromptProcessed.current || !gptConfig || !apiKey || isChatLoading) return

    const state = location.state as {initialPrompt?: string} | null
    if (state?.initialPrompt) {
      initialPromptProcessed.current = true
      handleSendMessage(state.initialPrompt).catch(console.error)
      // Clear history state so we don't re-send on refresh
      window.history.replaceState({}, '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally run only when initialPrompt/gptConfig/apiKey change
  }, [location.state, gptConfig, apiKey])

  // Handle regeneration
  const handleRegenerate = async () => {
    if (isChatLoading || messages.length === 0) return

    // Find last user message
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
    if (lastUserMessage) {
      // Remove messages after the last user message
      const userMsgIndex = messages.findIndex(m => m.id === lastUserMessage.id)
      if (userMsgIndex !== -1) {
        setMessages(messages.slice(0, userMsgIndex + 1))

        if (threadId && assistantId) {
          setIsChatLoading(true)
          setProcessingMessage('Regenerating...')
          try {
            let activeRunId: string | undefined

            await openAIService.streamRun(threadId, assistantId, (update: unknown) => {
              const typedUpdate = update as RunUpdate

              if (typedUpdate.type === 'run_created') {
                activeRunId = typedUpdate.run.id
              } else if (typedUpdate.type === 'run_update' || typedUpdate.type === 'run_failed') {
                activeRunId = typedUpdate.run.id
              }

              handleStreamUpdate(typedUpdate, threadId, activeRunId).catch(console.error)
            })
          } catch (error) {
            setError(error instanceof Error ? error.message : 'Error regenerating')
            setIsChatLoading(false)
          }
        }
      }
    }
  }

  // Handle clearing the conversation
  const handleClearConversation = () => {
    // If we're already on a new chat, just clear the UI state
    if (!currentConversationId) {
      setMessages([])
      setThreadId(null)
      setAssistantId(null)
      setRunId(null)
      setError(null)
      setProcessingMessage('Starting...')
      setConversationName('New Chat')
      return
    }

    // Otherwise navigate to the base URL which will trigger the new chat state via useEffect
    if (gptId) {
      const result = navigate(`/gpt/test/${gptId}`)
      if (result instanceof Promise) {
        result.catch(console.error)
      }
    }
  }

  // Handle selecting a conversation
  const handleSelectConversation = (id: string) => {
    setCurrentConversationId(id)
    if (gptId) {
      const result = navigate(`/gpt/test/${gptId}/c/${id}`)
      if (result instanceof Promise) {
        result.catch(console.error)
      }
    }
  }

  if (isConfigLoading) {
    return (
      <div className="flex flex-col h-screen p-4">
        <p className={cn(ds.text.body.large, 'text-content-tertiary')}>Loading...</p>
      </div>
    )
  }

  if (!gptConfig) {
    return (
      <div className="flex flex-col h-screen p-4">
        <p className={cn(ds.text.body.large, 'text-content-tertiary')}>GPT not found. Please select a valid GPT.</p>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-var(--header-height))]">
      <ChatInterface
        gptConfig={gptConfig}
        messages={messages}
        conversations={conversations}
        currentConversationId={currentConversationId}
        isLoading={isChatLoading}
        onSendMessage={(content: string) => {
          handleSendMessage(content).catch(console.error)
        }}
        onClearConversation={handleClearConversation}
        onSelectConversation={handleSelectConversation}
        onRegenerate={() => {
          handleRegenerate().catch(console.error)
        }}
        conversationName={conversationName}
        error={error}
        processingMessage={processingMessage}
      />
    </div>
  )
}
