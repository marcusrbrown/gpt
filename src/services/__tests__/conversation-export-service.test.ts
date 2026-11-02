import type {Conversation} from '@/types/gpt'
import {describe, expect, it} from 'vitest'
import {ConversationExportService} from '../conversation-export-service'

const replay = {openai: [{type: 'reasoning', id: 'rs_1', encrypted_content: 'secret-blob'}]}

function createConversation(): Conversation {
  return {
    id: 'conv-1',
    gptId: 'gpt-1',
    title: 'Reasoning chat',
    messages: [
      {id: 'm1', role: 'user', content: 'Hi', timestamp: new Date('2024-01-01T12:00:00Z')},
      {
        id: 'm2',
        role: 'assistant',
        content: 'Hello',
        timestamp: new Date('2024-01-01T12:00:01Z'),
        metadata: {provider: 'openai', model: 'o3-mini', stopped: true, truncated: true, replay},
      },
    ],
    createdAt: new Date('2024-01-01T12:00:00Z'),
    updatedAt: new Date('2024-01-01T12:00:02Z'),
    messageCount: 2,
    tags: [],
    isPinned: false,
    isArchived: false,
    pinnedAt: null,
    archivedAt: null,
  }
}

describe('ConversationExportService replay handling', () => {
  const service = new ConversationExportService()

  it('omits replay from a JSON export with metadata and keeps the other message metadata', () => {
    const conversation = createConversation()

    const json = service.exportToJSON(conversation, {format: 'json', includeMetadata: true, includeTimestamps: true})
    const parsed = JSON.parse(json) as {messages: {metadata?: Record<string, unknown>}[]}

    expect(parsed.messages[0]?.metadata).toBeUndefined()
    expect(parsed.messages[1]?.metadata).toEqual({
      provider: 'openai',
      model: 'o3-mini',
      stopped: true,
      truncated: true,
    })
    expect(json).not.toContain('secret-blob')
    // The stored conversation is untouched.
    expect(conversation.messages[1]?.metadata?.replay).toEqual(replay)
  })

  it('leaves out a message\u2019s metadata when replay was all it held', () => {
    const conversation = createConversation()
    conversation.messages = [
      {id: 'm2', role: 'assistant', content: 'Hello', timestamp: new Date('2024-01-01T12:00:01Z'), metadata: {replay}},
    ]

    const json = service.export(conversation, {format: 'json', includeMetadata: true, includeTimestamps: false})
    const parsed = JSON.parse(json) as {messages: {metadata?: unknown}[]}

    expect(parsed.messages[0]?.metadata).toEqual({})
    expect(json).not.toContain('secret-blob')
  })
})
