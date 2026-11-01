import type {Conversation, ConversationMessage, GPTConfiguration} from '@/types/gpt'
import type {ChatLoadError, ChatProviderStatus, ChatTurnError} from '@/hooks/use-chat-completion'
import {GPTProviderPrompt} from '@/components/empty-states/gpt-provider-prompt'
import '@/styles/heroui-v3.css'
import {Button} from '@heroui-v3/react'
import {Drawer, DrawerBody, DrawerContent, DrawerHeader, Tooltip, useDisclosure} from '@heroui/react'
import {Menu, MessageSquare, MoreVertical, Trash2} from 'lucide-react'
import React, {useEffect, useRef, useState} from 'react'
import {Link} from 'react-router-dom'

import {ChatInput} from './chat-input'
import {MessageBubble} from './message-bubble'
import {SidebarContent} from './sidebar-content'

function turnErrorMessage(error: ChatTurnError, providerName: string): string {
  switch (error.type) {
    case 'authentication':
      return 'Your API key was rejected.'
    case 'permission':
      return 'Your API key does not have permission for this request.'
    case 'rate_limit':
      return 'Rate limit reached. Try again shortly.'
    case 'connection':
    case 'server':
      return providerName === 'Ollama'
        ? "Couldn't reach Ollama. Check that it's running."
        : `Couldn't reach ${providerName}. Try again shortly.`
    case 'timeout':
      return 'The request timed out. Try again.'
    case 'not_implemented':
      return 'This provider is not supported yet.'
    default: {
      const message = error.message.trim()
      const readable =
        message.length > 0 &&
        message.length <= 160 &&
        /[a-z]/i.test(message) &&
        !/[{}<>[\]\n\r]/.test(message) &&
        !message.startsWith('"') &&
        !/^(?:null|true|false)$/.test(message)
      return readable
        ? message
        : error.type === 'not_found'
          ? 'The requested model was not found.'
          : 'Something went wrong. Try again.'
    }
  }
}

interface ChatInterfaceProps {
  gptConfig: GPTConfiguration
  messages: ConversationMessage[]
  conversations: Conversation[]
  currentConversationId?: string
  isLoading: boolean
  onSendMessage: (message: string) => void
  onSelectConversation: (id: string) => void
  onClearConversation: () => void
  onRegenerate?: () => void
  conversationName?: string
  error?: string | null
  providerName: string
  model: string
  status: ChatProviderStatus
  isStreaming: boolean
  streamingMessageId: string | null
  turnErrors: Record<string, ChatTurnError>
  onStop: () => void
  onRetry: (id: string) => void
  /** Set when the saved conversation can't be used. Replaces the input so nothing can overwrite its history. */
  loadError?: ChatLoadError | null
  onReload?: () => void
  /** Set when the conversation could not be saved. The messages are still on screen; the input stays available. */
  saveError?: string | null
  onRetrySave?: () => void
}

export function ChatInterface({
  gptConfig,
  messages,
  conversations,
  currentConversationId,
  isLoading,
  onSendMessage,
  onSelectConversation,
  onClearConversation,
  onRegenerate,
  conversationName = 'New Chat',
  error,
  providerName,
  model,
  status,
  isStreaming,
  streamingMessageId,
  turnErrors,
  onStop,
  onRetry,
  loadError,
  onReload,
  saveError,
  onRetrySave,
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const nearBottomRef = useRef(true)
  const {isOpen, onOpen, onOpenChange} = useDisclosure()
  const [isMobile, setIsMobile] = useState(false)

  // Auto-scroll to bottom
  useEffect(() => {
    if (!isStreaming || nearBottomRef.current) messagesEndRef.current?.scrollIntoView({behavior: 'smooth'})
  }, [messages, isLoading, isStreaming])

  // Responsive check
  useEffect(() => {
    const checkMobile = () => {
      // Avoid calling setState during effect if the value hasn't changed
      const mobile = window.innerWidth < 1024
      setIsMobile(previous => (previous === mobile ? previous : mobile))
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Date grouping logic
  const groupMessagesByDate = (msgs: ConversationMessage[]) => {
    const groups: {[key: string]: ConversationMessage[]} = {}

    msgs.forEach(msg => {
      const date = new Date(msg.timestamp).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      if (!groups[date]) groups[date] = []
      groups[date].push(msg)
    })

    return groups
  }

  const messageGroups = groupMessagesByDate(messages)

  return (
    <div className="flex h-full bg-surface-primary overflow-hidden rounded-xl border border-border-default shadow-sm relative group/chat">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-64 flex-col border-r border-border-default bg-surface-secondary/30 transition-all duration-300">
        <SidebarContent
          gptConfig={gptConfig}
          conversations={conversations}
          currentConversationId={currentConversationId}
          onSelectConversation={onSelectConversation}
          onClearConversation={onClearConversation}
        />
      </div>

      {/* Mobile Drawer */}
      <Drawer
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        placement="left"
        size="xs"
        backdrop="blur"
        classNames={{
          base: 'bg-surface-primary/95 backdrop-blur-md',
          header: 'border-b border-border-subtle',
        }}
      >
        <DrawerContent>
          <DrawerHeader>Menu</DrawerHeader>
          <DrawerBody className="p-0">
            <SidebarContent
              gptConfig={gptConfig}
              conversations={conversations}
              currentConversationId={currentConversationId}
              onSelectConversation={onSelectConversation}
              onClearConversation={onClearConversation}
            />
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative bg-linear-to-b from-surface-primary to-surface-secondary/10">
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-4 border-b border-border-subtle bg-surface-primary/80 backdrop-blur-md z-10 transition-colors">
          <div className="flex items-center gap-2 min-w-0">
            {isMobile && (
              <Button
                isIconOnly
                variant="tertiary"
                size="sm"
                onPress={onOpen}
                className="-ml-2 flex items-center gap-2"
                aria-label="Open menu"
              >
                <Menu size={20} className="text-content-secondary" />
              </Button>
            )}
            <div className="flex flex-col min-w-0">
              <h1 className="text-sm font-semibold text-content-primary truncate">{conversationName}</h1>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full bg-success-500 ${isStreaming ? 'animate-pulse' : ''}`} />
                <span className="text-[10px] text-content-tertiary font-medium">
                  {model ? `${providerName} · ${model}` : 'No model set'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip content="Clear conversation">
              <Button
                isIconOnly
                variant="tertiary"
                size="sm"
                className="flex items-center gap-2 text-content-tertiary hover:text-danger hover:bg-danger-50"
                onPress={onClearConversation}
                aria-label="Clear conversation"
              >
                <Trash2 size={18} />
              </Button>
            </Tooltip>
            <Button
              isIconOnly
              variant="tertiary"
              size="sm"
              className="flex items-center gap-2 text-content-tertiary hover:text-content-primary"
              aria-label="More options"
            >
              <MoreVertical size={18} />
            </Button>
          </div>
        </header>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth custom-scrollbar"
          onScroll={event => {
            const element = event.currentTarget
            nearBottomRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 100
          }}
        >
          <div className="max-w-3xl mx-auto space-y-8">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4 animate-in fade-in zoom-in-95 duration-500">
                <div className="relative mb-8 group">
                  <div className="absolute inset-0 bg-primary-500/20 rounded-3xl blur-xl transition-all duration-500 group-hover:bg-primary-500/30 group-hover:blur-2xl" />
                  <div className="relative w-20 h-20 rounded-3xl bg-linear-to-br from-surface-elevated to-surface-secondary border border-border-default shadow-lg flex items-center justify-center text-content-primary">
                    <MessageSquare size={36} className="text-primary-500" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-content-primary mb-3">How can I help you?</h2>
                <p className="text-content-secondary max-w-md text-sm leading-relaxed">
                  I'm configured to help with{' '}
                  <span className="font-medium text-content-primary">{gptConfig.description}</span>. Start a
                  conversation below.
                </p>
              </div>
            ) : (
              Object.entries(messageGroups).map(([date, msgs]) => (
                <div key={date} className="space-y-8">
                  <div className="sticky top-2 z-10 flex justify-center pointer-events-none">
                    <span className="px-3 py-1 rounded-full bg-surface-elevated/90 backdrop-blur border border-border-subtle text-[10px] font-medium text-content-tertiary shadow-sm uppercase tracking-wide">
                      {date}
                    </span>
                  </div>
                  <div className="space-y-6">
                    {msgs.map(msg => {
                      const turnError = turnErrors[msg.id]
                      return (
                        <React.Fragment key={msg.id}>
                          <MessageBubble
                            key={msg.id}
                            role={msg.role === 'tool' ? 'system' : msg.role}
                            content={msg.content}
                            timestamp={new Date(msg.timestamp)}
                            assistantName={gptConfig.name}
                            onRegenerate={
                              msg.role === 'assistant' && msg.id === messages.at(-1)?.id ? onRegenerate : undefined
                            }
                            regenerateDisabled={isStreaming}
                            isLoading={msg.id === streamingMessageId && !msg.content}
                            stopped={msg.metadata?.stopped}
                            truncated={msg.metadata?.truncated}
                          />
                          {turnError && (
                            <div role="alert" className="text-danger-700 text-sm text-right">
                              {turnErrorMessage(turnError, providerName)}{' '}
                              <Button variant="tertiary" size="sm" onPress={() => onRetry(msg.id)}>
                                Retry
                              </Button>
                            </div>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </div>
                </div>
              ))
            )}

            {/* Error Message */}
            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="mx-auto max-w-md p-4 rounded-xl bg-danger-50/50 border border-danger-200/50 backdrop-blur text-danger-700 text-sm flex items-start gap-3 shadow-sm animate-in slide-in-from-bottom-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-danger-500 mt-2 shrink-0" />
                <div className="flex-1">{error}</div>
              </div>
            )}

            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Unsaved warning */}
        {saveError && !loadError && (
          <div
            role="alert"
            className="flex items-center justify-center gap-2 border-t border-border-default p-3 text-sm text-danger-700"
          >
            <span>Couldn't save this conversation.</span>
            <Button
              variant="tertiary"
              size="sm"
              onPress={() => {
                onRetrySave?.()
              }}
            >
              Try again
            </Button>
          </div>
        )}

        {/* Input Area */}
        {loadError ? (
          <div
            role="alert"
            className="flex items-center justify-center gap-2 border-t border-border-default p-4 text-sm text-danger-700"
          >
            <span>{loadError.message}</span>
            {loadError.kind === 'read-failed' && (
              <Button
                variant="tertiary"
                size="sm"
                onPress={() => {
                  onReload?.()
                }}
              >
                Try again
              </Button>
            )}
          </div>
        ) : status === 'not-configured' ? (
          <GPTProviderPrompt providerName={providerName} />
        ) : status === 'unsupported' ? (
          <div className="border-t border-border-default p-4 text-center text-sm text-content-secondary">
            Azure isn’t supported yet.{' '}
            <Link className="text-primary-600 underline" to={`/gpt/edit/${gptConfig.id}`}>
              Edit GPT
            </Link>
          </div>
        ) : (
          <ChatInput
            onSendMessage={onSendMessage}
            isDisabled={isLoading || status === 'loading'}
            isStreaming={isStreaming}
            onStop={onStop}
          />
        )}
      </div>
    </div>
  )
}
