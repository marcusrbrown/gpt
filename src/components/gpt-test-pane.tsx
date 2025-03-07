import React, {useState, useEffect, useCallback, useRef} from 'react';
import {Input, Button, Spinner} from '@heroui/react';
import {ConversationMessage, GPTConfiguration} from '../types/gpt';
import {openAIService} from '../services/openai-service';

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
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingCount = useRef(0);
  const MAX_POLLING_ATTEMPTS = 60; // 1 minute at 1 poll per second

  // Initialize API key
  useEffect(() => {
    if (apiKey) {
      openAIService.setApiKey(apiKey);
    }
  }, [apiKey]);

  // Cleanup function for polling
  const clearPollingInterval = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      pollingCount.current = 0;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return clearPollingInterval;
  }, [clearPollingInterval]);

  // Initialize Assistant
  useEffect(() => {
    const initializeAssistant = async () => {
      if (gptConfig && apiKey) {
        try {
          setIsLoading(true);
          setProcessingMessage('Creating assistant...');

          // Apply the API key before creating the assistant
          openAIService.setApiKey(apiKey);

          // Create the assistant without direct type casting
          const assistant = await openAIService.createAssistant(gptConfig);
          setAssistantId(assistant.id);

          setProcessingMessage('Creating thread...');
          const thread = await openAIService.createThread();
          setThreadId(thread.id);

          setProcessingMessage('Ready');
          setIsLoading(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to initialize assistant');
          console.error('Error initializing assistant:', err);
          setIsLoading(false);
        }
      }
    };

    void initializeAssistant();
  }, [gptConfig, apiKey]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserInput(e.target.value);
  };

  // Handle tool calls from the OpenAI API
  const handleToolCalls = useCallback(
    async (
      toolCalls: Array<{
        id: string;
        function: {
          name: string;
          arguments: string;
        };
        type: string;
      }>,
      currentThreadId: string,
      currentRunId: string,
    ) => {
      try {
        // Process tool calls and prepare outputs
        const toolOutputs = toolCalls.map((toolCall) => {
          // This is where you would implement custom tool functionality
          // For now, we'll return mock responses based on the function name
          let result: string;

          switch (toolCall.function.name) {
            case 'get_weather':
              result = JSON.stringify({temperature: 72, condition: 'sunny'});
              break;
            case 'search_web':
              result = JSON.stringify({results: ['Mock search result 1', 'Mock search result 2']});
              break;
            default:
              result = JSON.stringify({message: 'Function not implemented'});
          }

          return {
            tool_call_id: toolCall.id,
            output: result,
          };
        });

        // Submit all tool outputs at once
        if (currentThreadId && currentRunId) {
          setProcessingMessage('Processing tool calls...');
          return openAIService.submitToolOutputs(currentThreadId, currentRunId, toolOutputs);
        }

        // Return a resolved promise if no tool outputs were submitted
        return Promise.resolve();
      } catch (err) {
        console.error('Error handling tool calls:', err);
        setError('Failed to process tool calls');
        // Return a resolved promise to ensure all paths return a value
        return Promise.resolve();
      }
    },
    [setProcessingMessage, setError],
  );

  // Fix the checkRunStatus function to avoid type casting
  const checkRunStatus = useCallback(async () => {
    if (!threadId || !runId) return;

    try {
      pollingCount.current += 1;

      // Update the processing message periodically to show progress
      if (pollingCount.current % 5 === 0) {
        setProcessingMessage(`Waiting for response${'.'.repeat(pollingCount.current % 4)}`);
      }

      if (pollingCount.current > MAX_POLLING_ATTEMPTS) {
        clearPollingInterval();
        setError('Request timed out. Please try again.');
        setIsLoading(false);
        return;
      }

      // Use the run without type casting
      const runStatus = await openAIService.checkRunStatus(threadId, runId);
      let messageResponse;
      let newMessages;
      let toolCalls;

      switch (runStatus.status) {
        case 'completed':
          // Run is complete, get the messages
          setProcessingMessage('Receiving response...');
          messageResponse = await openAIService.getMessages(threadId);

          // Convert API message format to our ConversationMessage format
          // Safely extract and transform the data without direct type assertions
          newMessages = messageResponse.data
            .filter((msg) => msg.role && msg.content && Array.isArray(msg.content) && msg.content.length > 0)
            .map((msg) => {
              // Find the first text content if available
              // Use a more type-safe approach for handling the content
              const textContent = msg.content.find((content) => {
                if (typeof content === 'object' && content !== null && 'type' in content) {
                  const typedContent = content as {type: string; text?: {value: string}};
                  return typedContent.type === 'text' && typedContent.text?.value !== undefined;
                }
                return false;
              });

              // Use optional chaining and nullish coalescing to safely access nested properties
              // Use a properly typed approach instead of any
              type TextContent = {type: 'text'; text: {value: string}};
              const typedContent = textContent as TextContent | undefined;
              const messageText = typedContent?.text?.value || '';

              return {
                id: msg.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                role: msg.role as 'user' | 'assistant' | 'system',
                content: messageText,
                timestamp: new Date(msg.created_at * 1000),
              };
            })
            .reverse();

          setMessages(newMessages);
          setIsLoading(false);

          // Clear the polling interval
          clearPollingInterval();
          setRunId(null);
          break;

        case 'requires_action':
          // Handle tool calls
          if (runStatus.required_action?.submit_tool_outputs?.tool_calls) {
            toolCalls = runStatus.required_action.submit_tool_outputs.tool_calls;

            // Process tool calls and submit outputs
            await handleToolCalls(toolCalls, threadId, runId);

            // Continue polling after submitting tool outputs
          }
          break;

        case 'failed':
        case 'cancelled':
        case 'expired':
          // Handle failure cases
          setError(`Run ${runStatus.status}: ${runStatus.last_error?.message || 'Unknown error'}`);
          setIsLoading(false);
          clearPollingInterval();
          setRunId(null);
          break;

        default:
          // Still in progress, continue polling
          break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check run status');
      console.error('Error checking run status:', err);
      setIsLoading(false);
      clearPollingInterval();
      setRunId(null);
    }
  }, [threadId, runId, clearPollingInterval, handleToolCalls]);

  const handleSendMessage = async () => {
    if (!userInput.trim() || !threadId || !assistantId) return;

    try {
      setIsLoading(true);
      setError(null);
      setProcessingMessage('Sending message...');

      // Add the user message to our state
      const newUserMessage: ConversationMessage = {
        id: 'user-' + Date.now(),
        role: 'user',
        content: userInput,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, newUserMessage]);
      setUserInput('');

      // Add the message to the thread
      await openAIService.addMessage(threadId, userInput);

      // Create a run
      setProcessingMessage('Starting assistant...');
      const run = await openAIService.createRun(threadId, assistantId);
      setRunId(run.id);

      // Reset polling counter
      pollingCount.current = 0;

      // Start polling for run status
      setProcessingMessage('Processing...');
      clearPollingInterval(); // Clear any existing interval
      pollingIntervalRef.current = setInterval(() => {
        void checkRunStatus();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      console.error('Error sending message:', err);
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
