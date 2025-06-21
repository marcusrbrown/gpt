import {use} from 'react'
import {ConversationContext} from '../contexts/conversation-context'

/**
 * Hook to access conversation management functionality
 *
 * Provides access to methods for managing conversations with GPTs,
 * including creating, loading, and sending messages.
 *
 * @example
 * ```tsx
 * function ChatComponent({ gptId }) {
 *   const {
 *     createConversation,
 *     sendMessage,
 *     currentConversation,
 *     isLoading,
 *     error
 *   } = useConversationContext();
 *
 *   useEffect(() => {
 *     if (!currentConversation) {
 *       createConversation(gptId);
 *     }
 *   }, [gptId, currentConversation, createConversation]);
 *
 *   // ...
 * }
 * ```
 *
 * @returns Conversation context with methods for managing conversations
 * @throws Error if used outside of a ConversationProvider
 */
export function useConversationContext() {
  const context = use(ConversationContext)

  if (!context) {
    throw new Error('useConversationContext must be used within a ConversationProvider')
  }

  return context
}
