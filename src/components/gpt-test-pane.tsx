import {Button, Input, Spinner, Tooltip} from '@heroui/react'
import {AlertCircle, Download, Save, Send, Trash} from 'lucide-react'
import React, {useCallback, useEffect, useRef, useState} from 'react'
import {v4 as uuidv4} from 'uuid'
import {useOpenAIService} from '../hooks/use-openai-service'
import {useStorage} from '../hooks/use-storage'
import {type ConversationMessage, type GPTConfiguration} from '../types/gpt'

interface GPTTestPaneProps {
  gptConfig?: GPTConfiguration | undefined
  apiKey?: string | undefined
}

export function GPTTestPane({gptConfig, apiKey}: GPTTestPaneProps) {
  // State for managing the conversation
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [userInput, setUserInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processingMessage, setProcessingMessage] = useState('Starting...')
  const [conversationName, setConversationName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)

  // Thread and Assistant state
  const [threadId, setThreadId] = useState<string | null>(null)
  const [assistantId, setAssistantId] = useState<string | null>(null)
  const [runId, setRunId] = useState<string | null>(null)

  // Used for polling the run status
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const pollingCount = useRef(0)
  const MAX_POLLING_ATTEMPTS = 60 // 1 minute at 1 poll per second
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Storage service for saving conversations
  const {saveConversation} = useStorage()

  // Get an instance of the OpenAI service
  const openAIService = useOpenAIService()

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({behavior: 'smooth'})
  }

  // Effect to scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Initialize API key
  useEffect(() => {
    if (apiKey) {
      openAIService.setApiKey(apiKey)
    }
  }, [apiKey, openAIService])

  // Cleanup function for polling
  const clearPollingInterval = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
      pollingCount.current = 0
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return clearPollingInterval
  }, [clearPollingInterval])

  // Initialize the assistant and thread
  const initializeAssistant = useCallback(async () => {
    if (!gptConfig || !apiKey) {
      setError('Missing GPT configuration or API key')
      return
    }

    try {
      setIsLoading(true)
      setProcessingMessage('Creating assistant...')

      // Create the assistant without direct type casting
      const assistant = await openAIService.createAssistant(gptConfig)
      setAssistantId(assistant.id)

      setProcessingMessage('Creating thread...')
      const thread = await openAIService.createThread()
      setThreadId(thread.id)

      // Set default conversation name based on current date
      const now = new Date()
      setConversationName(`Conversation ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`)

      setProcessingMessage('Ready')
      setIsLoading(false)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to initialize assistant')
      setIsLoading(false)
    }
  }, [gptConfig, apiKey, openAIService, setError, setIsLoading, setProcessingMessage])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserInput(e.target.value)
  }

  const handleConversationNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConversationName(e.target.value)
    setIsSaved(false)
  }

  // Handle saving the conversation
  const handleSaveConversation = () => {
    if (!gptConfig || messages.length === 0) return

    setIsSaving(true)

    try {
      const conversation = {
        id: uuidv4(),
        gptId: gptConfig.id,
        messages,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      saveConversation(conversation)
      setIsSaved(true)

      // Reset isSaved after 3 seconds
      setTimeout(() => {
        setIsSaved(false)
      }, 3000)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save conversation')
    } finally {
      setIsSaving(false)
    }
  }

  // Handle clearing the conversation
  const handleClearConversation = () => {
    // eslint-disable-next-line no-alert
    if (window.confirm('Are you sure you want to clear this conversation?')) {
      setMessages([])
      setThreadId(null)
      setAssistantId(null)
      setRunId(null)
      setError(null)
      setProcessingMessage('Starting...')

      // Reset the conversation name
      const now = new Date()
      setConversationName(`Conversation ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`)

      // Reset isSaved flag
      setIsSaved(false)
    }
  }

  // Export conversation to JSON
  const handleExportConversation = () => {
    if (messages.length === 0) return

    try {
      const conversation = {
        name: conversationName,
        messages,
        gptConfig: {
          name: gptConfig?.name,
          description: gptConfig?.description,
          systemPrompt: gptConfig?.systemPrompt,
        },
        exportedAt: new Date(),
      }

      const json = JSON.stringify(conversation, null, 2)
      const blob = new Blob([json], {type: 'application/json'})
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = `${conversationName.replaceAll(/\s+/g, '-').toLowerCase()}.json`
      document.body.append(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to export conversation')
    }
  }

  // Tool call handling
  interface ToolCall {
    id: string
    function: {
      name: string
      arguments: string
    }
    type: string
  }

  const handleToolCalls = useCallback(
    async (toolCalls: ToolCall[], currentThreadId: string | null, currentRunId: string | null) => {
      if (!toolCalls || toolCalls.length === 0) return null

      try {
        // Build tool outputs
        const toolOutputs = toolCalls.map(toolCall => {
          return {
            tool_call_id: toolCall.id,
            output: JSON.stringify({result: `This is a mock result for ${toolCall.function.name}`}),
          }
        })

        // Submit tool outputs
        if (currentThreadId && currentRunId) {
          setProcessingMessage('Processing tool calls...')
          return openAIService.submitToolOutputs(currentThreadId, currentRunId, toolOutputs)
        }

        // If we don't have thread ID or run ID, return null
        return null
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Error processing tool calls')
        return null // Return null on error
      }
    },
    [setProcessingMessage, setError, openAIService],
  )

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

  // Use streamRun for real-time updates
  const processMessages = (messageResponse: {data: ApiMessage[]}) => {
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
  }

  // For state setters, use type assertion for IDs when we know they're valid strings
  const checkRunStatus = useCallback(async () => {
    if (!threadId || !runId) return

    pollingCount.current += 1

    if (pollingCount.current > MAX_POLLING_ATTEMPTS) {
      clearPollingInterval()
      setError('Timeout waiting for response')
      setIsLoading(false)
      return
    }

    try {
      // Use the run without type casting
      const runStatus = await openAIService.checkRunStatus(threadId, runId)
      let messageResponse
      let newMessages

      // Check status
      if (runStatus.status === 'completed') {
        // Run is complete, get the messages
        setProcessingMessage('Receiving response...')
        messageResponse = await openAIService.getMessages(threadId)

        // Convert API message format to our ConversationMessage format
        newMessages = processMessages(messageResponse)

        setMessages(newMessages)
        setIsLoading(false)

        // Clear the polling interval
        clearPollingInterval()
      } else if (runStatus.status === 'requires_action') {
        // Handle tool calls
        setProcessingMessage('Executing tools...')
        const {required_action} = runStatus
        const toolCalls = required_action?.submit_tool_outputs?.tool_calls as ToolCall[]

        // Process tool calls and submit outputs
        await handleToolCalls(toolCalls, threadId, runId)

        // Continue polling after submitting tool outputs
      }
    } catch (error) {
      clearPollingInterval()
      setError(error instanceof Error ? error.message : 'Error checking run status')
      setIsLoading(false)
    }
  }, [threadId, runId, clearPollingInterval, handleToolCalls, openAIService])

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!userInput.trim() || !gptConfig || !apiKey || isLoading) return

    setIsLoading(true)
    setError(null)

    // Add the user message to the local messages
    const userMessage: ConversationMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userInput,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setUserInput('')

    try {
      // If we don't have a thread and assistant yet, create them
      if (!threadId || !assistantId) {
        await initializeAssistant()
        if (!threadId || !assistantId) {
          throw new Error('Failed to initialize assistant')
        }
      }

      // Add the message to the thread
      await openAIService.addMessage(threadId, userInput)

      // Create a run
      setProcessingMessage('Starting assistant...')
      const run = await openAIService.createRun(threadId, assistantId)
      // Use a type assertion when we know the ID is a valid string
      setRunId(run.id)

      // Reset polling counter
      pollingCount.current = 0

      // Start polling for status
      setProcessingMessage('Processing...')
      clearPollingInterval() // Clear any existing interval
      pollingRef.current = setInterval(() => {
        checkRunStatus()
      }, 1000)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error sending message')
      setIsLoading(false)
    }
  }

  // Handle keypress events - submit on Enter
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      handleSendMessage()
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b flex justify-between items-center gap-2">
        <div className="flex-1">
          <Input
            label="Conversation Name"
            value={conversationName}
            onChange={handleConversationNameChange}
            className="w-full"
            aria-label="Conversation Name"
          />
        </div>
        <div className="flex gap-2">
          <Tooltip content="Save conversation">
            <Button
              isIconOnly
              aria-label="Save conversation"
              color={isSaved ? 'success' : 'primary'}
              isDisabled={isLoading || messages.length === 0 || isSaving}
              onPress={handleSaveConversation}
            >
              {isSaving ? <Spinner size="sm" /> : <Save size={18} />}
            </Button>
          </Tooltip>
          <Tooltip content="Export as JSON">
            <Button
              isIconOnly
              aria-label="Export as JSON"
              color="secondary"
              isDisabled={messages.length === 0}
              onPress={handleExportConversation}
            >
              <Download size={18} />
            </Button>
          </Tooltip>
          <Tooltip content="Clear conversation">
            <Button
              isIconOnly
              aria-label="Clear conversation"
              color="danger"
              isDisabled={messages.length === 0 || isLoading}
              onPress={handleClearConversation}
            >
              <Trash size={18} />
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{maxHeight: 'calc(100vh - 210px)'}}>
        {error && (
          <div className="bg-red-50 p-4 rounded-md border border-red-200 flex items-start space-x-3">
            <AlertCircle className="text-red-500 mt-0.5" size={18} />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              {apiKey ? (
                <button
                  type="button"
                  onClick={() => {
                    setError(null)
                    initializeAssistant()
                  }}
                  className="mt-3 text-sm text-red-600 hover:text-red-500 font-medium"
                >
                  Try again
                </button>
              ) : (
                <p className="mt-2 text-sm text-red-700">Please set your OpenAI API key in settings.</p>
              )}
            </div>
          </div>
        )}

        {messages.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500">Start testing your GPT by sending a message below</p>
          </div>
        ) : (
          messages.map(message => (
            <div
              key={message.id}
              className={`p-3 rounded-lg max-w-[85%] ${
                message.role === 'user' ? 'ml-auto bg-blue-100 text-blue-900' : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm font-medium mb-1">
                {message.role === 'user' ? 'You' : gptConfig?.name || 'Assistant'}
              </p>
              <p className="whitespace-pre-wrap">{message.content}</p>
              <p className="text-xs text-gray-500 mt-1 text-right">{message.timestamp.toLocaleTimeString()}</p>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
            <Spinner size="sm" />
            <span className="text-sm text-gray-600">{processingMessage}</span>
          </div>
        )}

        {/* This div is used for scrolling to the bottom of messages */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t">
        <form
          onSubmit={e => {
            e.preventDefault()
            if (userInput.trim() && !isLoading) {
              handleSendMessage()
            }
          }}
          className="flex space-x-2"
        >
          <Input
            type="text"
            value={userInput}
            onChange={handleInputChange}
            placeholder="Type your message..."
            className="flex-1"
            disabled={isLoading}
            onKeyDown={handleKeyPress}
            aria-label="Message input"
          />
          <Button
            type="submit"
            color="primary"
            isDisabled={!userInput.trim() || isLoading}
            isIconOnly
            aria-label="Send message"
          >
            <Send size={18} />
          </Button>
        </form>
      </div>
    </div>
  )
}
