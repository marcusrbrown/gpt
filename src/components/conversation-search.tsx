import type {SearchResult} from '@/services/conversation-search-service'
import type {Conversation} from '@/types/gpt'
import {useConversationContext} from '@/hooks/use-conversation-context'
import {cn, ds} from '@/lib/design-system'
import {Input, Spinner} from '@heroui/react'
import {MessageSquare, Search, X} from 'lucide-react'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'

interface ConversationSearchProps {
  gptId?: string
  onSelect: (conversation: Conversation) => void
  placeholder?: string
  className?: string
  includeArchived?: boolean
}

export function ConversationSearch({
  gptId,
  onSelect,
  placeholder = 'Search conversations...',
  className,
  includeArchived = false,
}: ConversationSearchProps) {
  const {searchConversations} = useConversationContext()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const searchTimeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const debouncedSearch = useMemo(() => {
    return (searchQuery: string) => {
      if (searchTimeoutIdRef.current) {
        clearTimeout(searchTimeoutIdRef.current)
        searchTimeoutIdRef.current = null
      }
      if (!searchQuery.trim()) {
        setResults([])
        setIsSearching(false)
        return
      }
      setIsSearching(true)

      searchTimeoutIdRef.current = setTimeout(() => {
        ;(async () => {
          try {
            const searchResults = await searchConversations(searchQuery, {gptId, includeArchived})
            setResults(searchResults)
          } catch {
            setResults([])
          } finally {
            setIsSearching(false)
          }
        })().catch(console.error)
      }, 300)
    }
  }, [searchConversations, gptId, includeArchived])

  useEffect(() => {
    return () => {
      if (searchTimeoutIdRef.current) {
        clearTimeout(searchTimeoutIdRef.current)
        searchTimeoutIdRef.current = null
      }
    }
  }, [])

  const handleSelect = useCallback(
    (conversation: Conversation) => {
      onSelect(conversation)
      setQuery('')
      setResults([])
      setIsOpen(false)
    },
    [onSelect],
  )

  const handleClear = useCallback(() => {
    setQuery('')
    setResults([])
    setIsSearching(false)
  }, [])

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value)
      debouncedSearch(value)
    },
    [debouncedSearch],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        handleClear()
      }
    },
    [handleClear],
  )

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date)
  }

  return (
    <div className={cn('relative', className)} onKeyDown={handleKeyDown}>
      <Input
        type="search"
        placeholder={placeholder}
        value={query}
        onValueChange={handleQueryChange}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        startContent={<Search className="w-4 h-4 text-content-tertiary" />}
        endContent={
          query ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-surface-tertiary rounded-full transition-colors"
              aria-label="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          ) : isSearching ? (
            <Spinner size="sm" />
          ) : null
        }
        classNames={{
          inputWrapper: 'bg-surface-secondary',
        }}
        aria-label="Search conversations"
        aria-expanded={isOpen && results.length > 0}
        aria-controls="search-results"
        role="combobox"
      />

      {isOpen && query.trim() && (
        <div
          id="search-results"
          role="listbox"
          className={cn(
            'absolute z-50 w-full mt-2 max-h-96 overflow-y-auto',
            'bg-surface-primary border border-border-default rounded-lg shadow-lg',
          )}
        >
          {isSearching ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size="md" />
            </div>
          ) : results.length === 0 ? (
            <div className={cn(ds.state.empty, 'py-6')}>
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No conversations found</p>
            </div>
          ) : (
            <ul className="py-2">
              {results.map(result => (
                <li key={result.conversation.id}>
                  <button
                    type="button"
                    role="option"
                    className={cn(
                      'w-full px-4 py-3 text-left',
                      'hover:bg-surface-secondary transition-colors',
                      'focus:outline-none focus:bg-surface-secondary',
                    )}
                    onClick={() => handleSelect(result.conversation)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-content-primary truncate">
                          {result.conversation.title || 'Untitled Conversation'}
                        </p>
                        {result.matches.length > 0 && result.matches[0] && (
                          <p className="text-sm text-content-tertiary mt-1 line-clamp-2">{result.matches[0].snippet}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-xs text-content-tertiary">
                          {formatDate(result.conversation.updatedAt)}
                        </span>
                        <span className="text-xs text-content-tertiary">
                          {result.conversation.messageCount} messages
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
