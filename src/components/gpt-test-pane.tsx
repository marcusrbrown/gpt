import React, {useState, useEffect, useCallback, useRef} from 'react';
import {Input, Button, Spinner} from '@heroui/react';
import {ConversationMessage, GPTConfiguration} from '../types/gpt';
import {useOpenAIService} from '../hooks/use-openai-service';

interface GPTTestPaneProps {
  gptConfig?: GPTConfiguration | undefined;
  apiKey?: string | undefined;
}

export function GPTTestPane({gptConfig, apiKey}: GPTTestPaneProps) {
  // State for managing the conversation
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingMessage, setProcessingMessage] = useState('Starting...');

  // Thread and Assistant state
  const [threadId, setThreadId] = useState<string | null>(null);
  const [assistantId, setAssistantId] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);

  // Used for polling the run status
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const pollingCount = useRef(0);
  const MAX_POLLING_ATTEMPTS = 60; // 1 minute at 1 poll per second

  // Get an instance of the OpenAI service
  const openAIService = useOpenAIService();

  // Initialize API key
  useEffect(() => {
    if (apiKey) {
      openAIService.setApiKey(apiKey);
    }
  }, [apiKey, openAIService]);

  // Cleanup function for polling
  const clearPollingInterval = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
      pollingCount.current = 0;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return clearPollingInterval;
  }, [clearPollingInterval]);

  // Initialize the assistant and thread
  const initializeAssistant = useCallback(async () => {
    if (!gptConfig || !apiKey) {
      setError('Missing GPT configuration or API key');
      return;
    }

    try {
      setIsLoading(true);
      setProcessingMessage('Creating assistant...');

      // Create the assistant without direct type casting
      const assistant = await openAIService.createAssistant(gptConfig);
      setAssistantId(assistant.id);

      setProcessingMessage('Creating thread...');
      const thread = await openAIService.createThread();
      setThreadId(thread.id);

      setProcessingMessage('Ready');
      setIsLoading(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to initialize assistant');
      setIsLoading(false);
    }
  }, [gptConfig, apiKey, openAIService, setError, setIsLoading, setProcessingMessage]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserInput(e.target.value);
  };

  // Tool call handling
  interface ToolCall {
    id: string;
    function: {
      name: string;
      arguments: string;
    };
    type: string;
  }

  const handleToolCalls = useCallback(
    async (toolCalls: ToolCall[], currentThreadId: string | null, currentRunId: string | null) => {
      if (!toolCalls || toolCalls.length === 0) return null;

      try {
        // Build tool outputs
        const toolOutputs = toolCalls.map((toolCall) => {
          return {
            tool_call_id: toolCall.id,
            output: JSON.stringify({result: 'This is a mock result for ' + toolCall.function.name}),
          };
        });

        // Submit tool outputs
        if (currentThreadId && currentRunId) {
          setProcessingMessage('Processing tool calls...');
          return openAIService.submitToolOutputs(currentThreadId, currentRunId, toolOutputs);
        }

        // If we don't have thread ID or run ID, return null
        return null;
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Error processing tool calls');
        return null; // Return null on error
      }
    },
    [setProcessingMessage, setError, openAIService],
  );

  // Define types for API responses
  interface ApiMessage {
    id: string;
    role: string;
    content: Array<{
      type?: string;
      text?: {
        value: string;
      };
    }>;
    created_at: number;
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
            const typedContent = content as {type: string; text?: {value: string}};
            return typedContent.type === 'text' && typedContent.text?.value !== undefined;
          }
          return false;
        });

        return {
          id: msg.id,
          role: msg.role as 'user' | 'assistant' | 'system',
          content: textContent?.text?.value || '',
          timestamp: new Date(msg.created_at * 1000),
        };
      })
      .reverse();

    return newMessages;
  };

  // For state setters, use type assertion for IDs when we know they're valid strings
  const checkRunStatus = useCallback(async () => {
    if (!threadId || !runId) return;

    pollingCount.current += 1;

    if (pollingCount.current > MAX_POLLING_ATTEMPTS) {
      clearPollingInterval();
      setError('Timeout waiting for response');
      setIsLoading(false);
      return;
    }

    try {
      // Use the run without type casting
      const runStatus = await openAIService.checkRunStatus(threadId, runId);
      let messageResponse;
      let newMessages;

      // Check status
      if (runStatus.status === 'completed') {
        // Run is complete, get the messages
        setProcessingMessage('Receiving response...');
        messageResponse = await openAIService.getMessages(threadId);

        // Convert API message format to our ConversationMessage format
        newMessages = processMessages(messageResponse);

        setMessages(newMessages);
        setIsLoading(false);

        // Clear the polling interval
        clearPollingInterval();
      } else if (runStatus.status === 'requires_action') {
        // Handle tool calls
        setProcessingMessage('Executing tools...');
        const {required_action} = runStatus;
        const toolCalls = required_action?.submit_tool_outputs?.tool_calls as ToolCall[];

        // Process tool calls and submit outputs
        await handleToolCalls(toolCalls, threadId, runId);

        // Continue polling after submitting tool outputs
      }
    } catch (error) {
      clearPollingInterval();
      setError(error instanceof Error ? error.message : 'Error checking run status');
      setIsLoading(false);
    }
  }, [threadId, runId, clearPollingInterval, handleToolCalls, openAIService]);

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!userInput.trim() || !gptConfig || !apiKey || isLoading) return;

    setIsLoading(true);
    setError(null);

    // Add the user message to the local messages
    const userMessage: ConversationMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userInput,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setUserInput('');

    try {
      // If we don't have a thread and assistant yet, create them
      if (!threadId || !assistantId) {
        await initializeAssistant();
        if (!threadId || !assistantId) {
          throw new Error('Failed to initialize assistant');
        }
      }

      // Add the message to the thread
      await openAIService.addMessage(threadId, userInput);

      // Create a run
      setProcessingMessage('Starting assistant...');
      const run = await openAIService.createRun(threadId, assistantId);
      // Use a type assertion when we know the ID is a valid string
      setRunId(run.id);

      // Reset polling counter
      pollingCount.current = 0;

      // Start polling for status
      setProcessingMessage('Processing...');
      clearPollingInterval(); // Clear any existing interval
      pollingRef.current = setInterval(() => {
        void checkRunStatus();
      }, 1000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error sending message');
      setIsLoading(false);
    }
  };

  // Handle keypress events - submit on Enter
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      void handleSendMessage();
    }
  };

  return (
    <div className='flex flex-col h-full p-4 space-y-4 bg-white'>
      {error && <div className='p-3 text-sm text-red-700 bg-red-100 rounded-md'>{error}</div>}

      <div className='flex-1 overflow-y-auto bg-gray-100 p-4 rounded-lg'>
        {messages.length === 0 ? (
          <div className='flex items-center justify-center h-full text-gray-500'>
            Start a conversation with your GPT
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`p-3 my-2 rounded-lg ${
                message.role === 'user' ? 'bg-blue-100 text-blue-900 ml-10' : 'bg-gray-200 text-gray-900 mr-10'
              }`}
            >
              <div className='text-xs font-medium mb-1'>{message.role === 'user' ? 'You' : 'Assistant'}</div>
              <div className='text-sm whitespace-pre-wrap'>{message.content}</div>
            </div>
          ))
        )}

        {isLoading && (
          <div className='flex justify-center items-center my-4'>
            <Spinner className='w-6 h-6 text-blue-600' />
            <span className='ml-2 text-sm text-gray-600'>{processingMessage}</span>
          </div>
        )}
      </div>

      <div className='flex items-center space-x-2'>
        <Input
          value={userInput}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder='Type your message...'
          className='flex-1'
          disabled={isLoading || !threadId || !assistantId}
        />
        <Button
          onPress={() => {
            void handleSendMessage();
          }}
          color='primary'
          isDisabled={isLoading || !threadId || !assistantId || !userInput.trim()}
        >
          {isLoading ? <Spinner className='w-4 h-4' /> : 'Send'}
        </Button>
      </div>
    </div>
  );
}
