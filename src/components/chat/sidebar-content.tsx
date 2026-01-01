import type {Conversation, GPTConfiguration} from '@/types/gpt'
import {Button, Tooltip} from '@heroui/react'
import {MessageSquare, Settings} from 'lucide-react'
import React from 'react'

interface SidebarContentProps {
  gptConfig: GPTConfiguration
  conversations: Conversation[]
  currentConversationId?: string
  onSelectConversation: (id: string) => void
  onClearConversation: () => void
}

export function SidebarContent({
  gptConfig,
  conversations,
  currentConversationId,
  onSelectConversation,
  onClearConversation,
}: SidebarContentProps) {
  // Group conversations by date (Today, Yesterday, Previous 7 Days, Older)
  const groupedConversations = React.useMemo(() => {
    const groups: {
      today: Conversation[]
      yesterday: Conversation[]
      previous7Days: Conversation[]
      older: Conversation[]
    } = {
      today: [],
      yesterday: [],
      previous7Days: [],
      older: [],
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const yesterday = new Date(today - 86400000).getTime()
    const lastWeek = new Date(today - 86400000 * 7).getTime()

    conversations.forEach(conv => {
      const convDate = new Date(conv.updatedAt).getTime()
      if (convDate >= today) {
        groups.today.push(conv)
      } else if (convDate >= yesterday) {
        groups.yesterday.push(conv)
      } else if (convDate >= lastWeek) {
        groups.previous7Days.push(conv)
      } else {
        groups.older.push(conv)
      }
    })

    // Sort within groups by date desc
    const sortFn = (a: Conversation, b: Conversation) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()

    groups.today.sort(sortFn)
    groups.yesterday.sort(sortFn)
    groups.previous7Days.sort(sortFn)
    groups.older.sort(sortFn)

    return groups
  }, [conversations])

  const renderGroup = (title: string, items: Conversation[]) => {
    if (items.length === 0) return null
    return (
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-content-tertiary uppercase tracking-wider px-2 mb-2">{title}</h3>
        <div className="space-y-1">
          {items.map(conv => (
            <Button
              key={conv.id}
              variant={conv.id === currentConversationId ? 'flat' : 'light'}
              color={conv.id === currentConversationId ? 'primary' : 'default'}
              className="w-full justify-start text-left h-auto py-2 px-2 text-sm truncate"
              onPress={() => onSelectConversation(conv.id)}
            >
              <span className="truncate">{conv.title || 'New Conversation'}</span>
            </Button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border-default">
        <Button
          fullWidth
          variant="flat"
          color="primary"
          startContent={<MessageSquare size={16} />}
          onPress={onClearConversation}
        >
          New Chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <div className="px-4 py-8 text-center opacity-50">
            <p className="text-xs text-content-tertiary italic">No previous history</p>
          </div>
        ) : (
          <>
            {renderGroup('Today', groupedConversations.today)}
            {renderGroup('Yesterday', groupedConversations.yesterday)}
            {renderGroup('Previous 7 Days', groupedConversations.previous7Days)}
            {renderGroup('Older', groupedConversations.older)}
          </>
        )}
      </div>

      <div className="p-4 border-t border-border-default">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold">
            {gptConfig.name.slice(0, 1)}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-content-primary truncate">{gptConfig.name}</p>
            <p className="text-xs text-content-tertiary truncate">v{gptConfig.version}</p>
          </div>
          <Tooltip content="GPT Settings">
            <Button isIconOnly size="sm" variant="light">
              <Settings size={16} />
            </Button>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
