import {cn, ds} from '@/lib/design-system'
import {Copy, RefreshCw} from 'lucide-react'
import React, {useState} from 'react'

interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  isLoading?: boolean
  isTyping?: boolean
  onCopy?: (content: string) => void
  onRegenerate?: () => void
  assistantName?: string
}

export function MessageBubble({
  role,
  content,
  timestamp,
  isLoading,
  isTyping,
  onCopy,
  onRegenerate,
  assistantName = 'Assistant',
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false)
  const isUser = role === 'user'

  const handleCopy = () => {
    if (onCopy) {
      onCopy(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else {
      navigator.clipboard.writeText(content).catch(console.error)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className={cn(ds.chat.messageGroup, isUser ? 'flex-row-reverse' : 'flex-row', 'group', ds.animation.slideIn)}>
      {/* Avatar */}
      <div className={cn('shrink-0 flex flex-col items-center gap-1')}>
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center select-none text-xs font-medium border shadow-sm transition-transform hover:scale-105',
            isUser
              ? 'bg-surface-elevated text-content-primary border-border-subtle'
              : 'bg-primary-100 text-primary-700 border-primary-200 dark:bg-primary-900/30 dark:text-primary-300 dark:border-primary-800',
          )}
        >
          {isUser ? 'You' : assistantName.slice(0, 1).toUpperCase()}
        </div>
      </div>

      <div className={cn('flex flex-col max-w-[85%] md:max-w-[75%]', isUser ? 'items-end' : 'items-start')}>
        {/* Name Header (only for assistant) */}
        {!isUser && <span className="text-xs font-medium text-content-tertiary ml-1 mb-1">{assistantName}</span>}

        {/* Bubble */}
        <div
          className={cn(
            'relative shadow-sm wrap-break-word min-w-[60px] transition-all duration-200',
            isUser
              ? 'bg-surface-elevated text-content-primary rounded-2xl rounded-tr-sm border border-border-subtle'
              : 'bg-surface-secondary text-content-primary rounded-2xl rounded-tl-sm border border-border-default',
            isLoading && 'animate-pulse',
          )}
        >
          {isLoading ? (
            <div className="flex items-center gap-1.5 py-3 px-4">
              <span className="w-1.5 h-1.5 rounded-full bg-content-tertiary animate-bounce [animation-delay:-0.32s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-content-tertiary animate-bounce [animation-delay:-0.16s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-content-tertiary animate-bounce" />
            </div>
          ) : (
            <div className={cn('whitespace-pre-wrap text-sm leading-7 px-4 py-3')}>
              {content}
              {isTyping && (
                <span className="inline-flex gap-0.5 ml-1 align-baseline translate-y-[2px]">
                  <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:-0.32s]" />
                  <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:-0.16s]" />
                  <span className="w-1 h-1 rounded-full bg-current animate-bounce" />
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer: Timestamp & Actions */}
        <div
          className={cn(
            'flex items-center gap-2 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200',
            isUser ? 'flex-row-reverse' : 'flex-row',
          )}
        >
          <span className={ds.chat.timestamp}>
            {timestamp.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
          </span>

          {!isLoading && !isTyping && (
            <div className={cn(ds.chat.messageActions, 'flex items-center gap-1')}>
              <button
                type="button"
                onClick={handleCopy}
                className="p-1 rounded hover:bg-surface-tertiary text-content-tertiary hover:text-content-primary transition-colors"
                title="Copy message"
                aria-label="Copy message"
              >
                {copied ? <span className="text-[10px] font-medium">Copied</span> : <Copy size={12} />}
              </button>

              {!isUser && onRegenerate && (
                <button
                  type="button"
                  onClick={onRegenerate}
                  className="p-1 rounded hover:bg-surface-tertiary text-content-tertiary hover:text-content-primary transition-colors"
                  title="Regenerate response"
                  aria-label="Regenerate response"
                >
                  <RefreshCw size={12} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
