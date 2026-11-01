import type {Conversation, GPTConfiguration} from '@/types/gpt'
import {ChatInterface} from '@/components/chat'
import {useChatCompletion, type ConversationSavedInfo} from '@/hooks/use-chat-completion'
import {useStorage} from '@/hooks/use-storage'
import {cn, ds} from '@/lib/design-system'
import {useCallback, useEffect, useState} from 'react'
import {useLocation, useNavigate, useParams} from 'react-router-dom'

export function GPTTestPage() {
  const {gptId, conversationId} = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const storage = useStorage()
  const [gptConfig, setGptConfig] = useState<GPTConfiguration | undefined>()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isConfigLoading, setIsConfigLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        if (!gptId) return
        const [config, list] = await Promise.all([storage.getGPT(gptId), storage.getConversationsForGPT(gptId)])
        if (!cancelled) {
          setGptConfig(config)
          setConversations(list)
        }
      } catch (error_) {
        console.error('Failed to load GPT data', error_)
        if (!cancelled) setGptConfig(undefined)
      } finally {
        if (!cancelled) setIsConfigLoading(false)
      }
    }
    load().catch(console.error)
    return () => {
      cancelled = true
    }
  }, [gptId, storage])

  const handleInitialPromptSent = useCallback(() => {
    window.history.replaceState({...window.history.state, usr: null}, '')
  }, [])
  const handleConversationSaved = useCallback(
    (conversation: Conversation, {isNew, isCurrent}: ConversationSavedInfo) => {
      // A save can land after the route moved to another GPT, whose list this is not.
      if (conversation.gptId !== gptId) return
      setConversations(previous => [conversation, ...previous.filter(item => item.id !== conversation.id)])
      // Only the chat still on screen moves to its own URL; a save for one the user left must not pull them back.
      if (isNew && isCurrent) {
        const result = navigate(`/gpt/test/${gptId}/c/${conversation.id}`, {replace: true})
        if (result instanceof Promise) result.catch(console.error)
      }
    },
    [gptId, navigate],
  )
  const chat = useChatCompletion({
    gpt: gptConfig,
    conversationId,
    initialPrompt: (location.state as {initialPrompt?: string} | null)?.initialPrompt,
    onInitialPromptSent: handleInitialPromptSent,
    onConversationSaved: handleConversationSaved,
  })

  const handleClearConversation = () => {
    if (!conversationId) chat.reset()
    else if (gptId) {
      const result = navigate(`/gpt/test/${gptId}`)
      if (result instanceof Promise) result.catch(console.error)
    }
  }
  const handleSelectConversation = (id: string) => {
    if (!gptId) return
    const result = navigate(`/gpt/test/${gptId}/c/${id}`)
    if (result instanceof Promise) result.catch(console.error)
  }

  if (isConfigLoading)
    return (
      <div className="flex flex-col h-screen p-4">
        <p className={cn(ds.text.body.large, 'text-content-tertiary')}>Loading...</p>
      </div>
    )
  if (!gptConfig)
    return (
      <div className="flex flex-col h-screen p-4">
        <p className={cn(ds.text.body.large, 'text-content-tertiary')}>GPT not found. Please select a valid GPT.</p>
      </div>
    )

  return (
    <div className="h-[calc(100vh-var(--header-height))]">
      <ChatInterface
        gptConfig={gptConfig}
        messages={chat.messages}
        conversations={conversations}
        currentConversationId={chat.conversationId}
        isLoading={chat.isLoadingConversation}
        isStreaming={chat.isStreaming}
        streamingMessageId={chat.streamingMessageId}
        status={chat.status}
        providerName={chat.providerName}
        model={chat.model}
        turnErrors={chat.turnErrors}
        loadError={chat.loadError}
        onReload={chat.reloadConversation}
        saveError={chat.saveError}
        onRetrySave={chat.retrySave}
        onSendMessage={content => {
          chat.send(content).catch(console.error)
        }}
        onStop={chat.stop}
        onRetry={id => {
          chat.retry(id).catch(console.error)
        }}
        onClearConversation={handleClearConversation}
        onSelectConversation={handleSelectConversation}
        onRegenerate={() => {
          chat.regenerate().catch(console.error)
        }}
        conversationName={chat.conversationTitle}
      />
    </div>
  )
}
