import {cn, ds} from '@/lib/design-system'
import {Button} from '@heroui/react'
import {Paperclip, Send} from 'lucide-react'
import React, {useRef, useState} from 'react'

interface ChatInputProps {
  onSendMessage: (message: string) => void
  isDisabled?: boolean
  placeholder?: string
}

export function ChatInput({onSendMessage, isDisabled, placeholder = 'Type a message...'}: ChatInputProps) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const adjustHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    adjustHeight()
  }

  const handleSend = () => {
    if (message.trim() && !isDisabled) {
      onSendMessage(message)
      setMessage('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
        textareaRef.current.focus()
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      className={cn(ds.chat.inputArea, 'relative bg-surface-primary/80 backdrop-blur-md transition-all duration-300')}
    >
      <div className="max-w-3xl mx-auto relative flex items-end gap-2 bg-surface-secondary/50 rounded-3xl p-2 border border-border-default shadow-sm focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500 focus-within:shadow-md transition-all duration-200 hover:border-border-strong hover:shadow-md">
        {/* Attachment Button (Future Feature) */}
        <Button
          isIconOnly
          variant="light"
          size="sm"
          className="text-content-tertiary hover:text-content-primary transition-colors data-[hover=true]:bg-surface-tertiary rounded-full h-9 w-9 shrink-0 mb-0.5"
          isDisabled={isDisabled}
          aria-label="Attach file"
        >
          <Paperclip size={18} />
        </Button>

        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={isDisabled}
          aria-label="Enter your message to send to the GPT"
          className="flex-1 max-h-[200px] min-h-[40px] py-2 px-1 bg-transparent border-none outline-none resize-none text-content-primary placeholder:text-content-tertiary disabled:opacity-50 text-sm leading-6"
          style={{scrollbarWidth: 'thin'}}
        />

        <Button
          isIconOnly
          size="sm"
          color={message.trim() ? 'primary' : 'default'}
          variant={message.trim() ? 'solid' : 'flat'}
          isDisabled={!message.trim() || isDisabled}
          onPress={handleSend}
          className={cn(
            'transition-all duration-200 rounded-full h-9 w-9 shrink-0 mb-0.5 shadow-sm',
            message.trim()
              ? 'opacity-100 hover:scale-105 active:scale-95'
              : 'opacity-40 hover:opacity-100 bg-surface-tertiary text-content-secondary',
          )}
          aria-label="Send message to GPT assistant"
        >
          <Send size={16} className={cn(message.trim() && 'ml-0.5')} />
        </Button>
      </div>
      <div className="text-center mt-3">
        <p className="text-[10px] text-content-tertiary select-none">
          AI generated content may be inaccurate. Verify important information.
        </p>
      </div>
    </div>
  )
}
