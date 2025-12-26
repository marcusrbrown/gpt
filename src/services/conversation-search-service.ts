import type {Conversation} from '@/types/gpt'

export interface SearchMatch {
  field: 'title' | 'message'
  messageId?: string
  snippet: string
  position: number
}

export interface SearchResult {
  conversation: Conversation
  matches: SearchMatch[]
  score: number
}

const SNIPPET_CONTEXT_LENGTH = 50

function extractSnippet(text: string, position: number, contextLength: number): string {
  const start = Math.max(0, position - contextLength)
  const end = Math.min(text.length, position + contextLength)

  let snippet = text.slice(start, end)

  if (start > 0) {
    snippet = `...${snippet}`
  }

  if (end < text.length) {
    snippet = `${snippet}...`
  }

  return snippet
}

export class ConversationSearchService {
  search(conversations: Conversation[], query: string, options: {caseSensitive?: boolean} = {}): SearchResult[] {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      return []
    }

    const normalizedQuery = options.caseSensitive ? trimmedQuery : trimmedQuery.toLowerCase()
    const results: SearchResult[] = []

    for (const conversation of conversations) {
      const matches = this.findMatches(conversation, normalizedQuery, options.caseSensitive)

      if (matches.length > 0) {
        const score = this.calculateScore(matches)
        results.push({conversation, matches, score})
      }
    }

    results.sort((a, b) => b.score - a.score)

    return results
  }

  private findMatches(conversation: Conversation, query: string, caseSensitive?: boolean): SearchMatch[] {
    const matches: SearchMatch[] = []

    if (conversation.title) {
      const titleToSearch = caseSensitive ? conversation.title : conversation.title.toLowerCase()
      const position = titleToSearch.indexOf(query)

      if (position !== -1) {
        matches.push({
          field: 'title',
          snippet: extractSnippet(conversation.title, position, SNIPPET_CONTEXT_LENGTH),
          position,
        })
      }
    }

    for (const message of conversation.messages) {
      const contentToSearch = caseSensitive ? message.content : message.content.toLowerCase()
      const position = contentToSearch.indexOf(query)

      if (position !== -1) {
        matches.push({
          field: 'message',
          messageId: message.id,
          snippet: extractSnippet(message.content, position, SNIPPET_CONTEXT_LENGTH),
          position,
        })
      }
    }

    return matches
  }

  private calculateScore(matches: SearchMatch[]): number {
    let score = 0

    for (const match of matches) {
      if (match.field === 'title') {
        score += 10
      } else {
        score += 1
      }
    }

    return score
  }

  highlightMatches(text: string, query: string, caseSensitive?: boolean): string {
    if (!query.trim()) {
      return text
    }

    const flags = caseSensitive ? 'g' : 'gi'
    const escapedQuery = query.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
    const regex = new RegExp(`(${escapedQuery})`, flags)

    return text.replace(regex, '<mark>$1</mark>')
  }

  countMatches(text: string, query: string, caseSensitive?: boolean): number {
    if (!query.trim()) {
      return 0
    }

    const textToSearch = caseSensitive ? text : text.toLowerCase()
    const queryToFind = caseSensitive ? query : query.toLowerCase()

    let count = 0

    for (
      let position = textToSearch.indexOf(queryToFind);
      position !== -1;
      position = textToSearch.indexOf(queryToFind, position + queryToFind.length)
    ) {
      count++
    }

    return count
  }
}

export const conversationSearchService = new ConversationSearchService()
