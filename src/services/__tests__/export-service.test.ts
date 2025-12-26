import type {Conversation, GPTConfiguration} from '@/types/gpt'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {createExportMetadata, exportConversation, exportGPT, sanitizeFilename} from '../export-service'

vi.mock('@/lib/database', () => ({
  db: {
    knowledgeFiles: {where: vi.fn()},
    gptVersions: {where: vi.fn()},
  },
  toISOString: (date: Date) => date.toISOString(),
}))

const createMockGPT = (overrides: Partial<GPTConfiguration> = {}): GPTConfiguration => ({
  id: 'test-gpt-1',
  name: 'Test GPT',
  description: 'A test GPT configuration',
  systemPrompt: 'You are a helpful assistant',
  instructions: 'Follow these instructions',
  conversationStarters: ['Hello', 'Help me'],
  modelProvider: 'openai',
  modelName: 'gpt-4',
  modelSettings: {
    temperature: 0.7,
    maxTokens: 4096,
  },
  tools: [],
  knowledge: {
    files: [],
    urls: [],
  },
  capabilities: {
    webBrowsing: false,
    imageGeneration: false,
    codeInterpreter: false,
    fileSearch: {enabled: false},
  },
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
  version: 1,
  tags: ['test'],
  isArchived: false,
  folderId: null,
  archivedAt: null,
  ...overrides,
})

const createMockConversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  id: 'conv-1',
  gptId: 'test-gpt-1',
  title: 'Test Conversation',
  messages: [
    {id: 'msg-1', role: 'user', content: 'Hello', timestamp: new Date()},
    {id: 'msg-2', role: 'assistant', content: 'Hi there!', timestamp: new Date()},
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
  messageCount: 2,
  tags: [],
  isPinned: false,
  isArchived: false,
  pinnedAt: null,
  archivedAt: null,
  ...overrides,
})

describe('exportGPT', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exports a GPT configuration with metadata', async () => {
    const mockGPT = createMockGPT()
    const {db} = await import('@/lib/database')
    vi.mocked(db.knowledgeFiles.where).mockReturnValue({
      equals: vi.fn().mockReturnValue({toArray: vi.fn().mockResolvedValue([])}),
    } as never)
    vi.mocked(db.gptVersions.where).mockReturnValue({
      equals: vi.fn().mockReturnValue({sortBy: vi.fn().mockResolvedValue([])}),
    } as never)

    const result = await exportGPT(mockGPT)

    expect(result.metadata.version).toBe('1.0')
    expect(result.gpt.id).toBe('test-gpt-1')
    expect(result.gpt.name).toBe('Test GPT')
  })

  it('includes knowledge when requested', async () => {
    const mockGPT = createMockGPT()
    const {db} = await import('@/lib/database')
    vi.mocked(db.knowledgeFiles.where).mockReturnValue({
      equals: vi.fn().mockReturnValue({toArray: vi.fn().mockResolvedValue([])}),
    } as never)
    vi.mocked(db.gptVersions.where).mockReturnValue({
      equals: vi.fn().mockReturnValue({sortBy: vi.fn().mockResolvedValue([])}),
    } as never)

    const result = await exportGPT(mockGPT, {includeKnowledge: true})

    expect(result.knowledge).toBeDefined()
    expect(result.knowledge?.files).toEqual([])
  })
})

describe('exportConversation', () => {
  it('exports conversation with metadata', async () => {
    const mockConversation = createMockConversation()

    const result = await exportConversation(mockConversation, 'Test GPT')

    expect(result.metadata.version).toBe('1.0')
    expect(result.conversation.id).toBe('conv-1')
    expect(result.conversation.messages).toHaveLength(2)
    expect(result.conversation.gptName).toBe('Test GPT')
  })

  it('includes all message data', async () => {
    const mockConversation = createMockConversation()

    const result = await exportConversation(mockConversation, 'Test GPT')
    const messages = result.conversation.messages

    expect(messages[0]).toBeDefined()
    expect(messages[0]?.role).toBe('user')
    expect(messages[0]?.content).toBe('Hello')
    expect(messages[1]?.role).toBe('assistant')
  })
})

describe('sanitizeFilename', () => {
  it('removes invalid characters', () => {
    expect(sanitizeFilename('test/file:name?.txt')).toBe('test_file_name_.txt')
  })

  it('replaces spaces with hyphens', () => {
    expect(sanitizeFilename('my file name')).toBe('my-file-name')
  })

  it('converts to lowercase', () => {
    expect(sanitizeFilename('MyFileName')).toBe('myfilename')
  })

  it('truncates long filenames', () => {
    const longName = 'a'.repeat(150)
    expect(sanitizeFilename(longName).length).toBeLessThanOrEqual(100)
  })
})

describe('createExportMetadata', () => {
  it('creates metadata with correct version', () => {
    const metadata = createExportMetadata()

    expect(metadata.version).toBe('1.0')
    expect(metadata.source).toBe('gpt-platform')
    expect(metadata.exportedAt).toBeDefined()
  })

  it('includes app version in metadata', () => {
    const metadata = createExportMetadata()

    expect(metadata.sourceVersion).toBeDefined()
    expect(typeof metadata.sourceVersion).toBe('string')
  })

  it('generates valid ISO timestamp', () => {
    const metadata = createExportMetadata()
    const date = new Date(metadata.exportedAt)

    expect(date.toString()).not.toBe('Invalid Date')
  })
})

describe('exportGPT edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('handles GPT with empty knowledge', async () => {
    const mockGPT = createMockGPT({
      knowledge: {files: [], urls: []},
    })
    const {db} = await import('@/lib/database')
    vi.mocked(db.knowledgeFiles.where).mockReturnValue({
      equals: vi.fn().mockReturnValue({toArray: vi.fn().mockResolvedValue([])}),
    } as never)
    vi.mocked(db.gptVersions.where).mockReturnValue({
      equals: vi.fn().mockReturnValue({sortBy: vi.fn().mockResolvedValue([])}),
    } as never)

    const result = await exportGPT(mockGPT, {includeKnowledge: true})

    expect(result.knowledge?.files).toEqual([])
  })

  it('handles GPT with special characters in name', async () => {
    const mockGPT = createMockGPT({
      name: 'Test/GPT:With<Special>Characters',
    })
    const {db} = await import('@/lib/database')
    vi.mocked(db.knowledgeFiles.where).mockReturnValue({
      equals: vi.fn().mockReturnValue({toArray: vi.fn().mockResolvedValue([])}),
    } as never)
    vi.mocked(db.gptVersions.where).mockReturnValue({
      equals: vi.fn().mockReturnValue({sortBy: vi.fn().mockResolvedValue([])}),
    } as never)

    const result = await exportGPT(mockGPT)

    expect(result.gpt.name).toBe('Test/GPT:With<Special>Characters')
  })

  it('includes version history when requested', async () => {
    const mockGPT = createMockGPT()
    const mockVersions = [
      {
        id: 'v1',
        gptId: 'test-gpt-1',
        version: 1,
        createdAtISO: '2024-01-01T00:00:00.000Z',
        snapshot: JSON.stringify({name: 'Test GPT v1'}),
        changeDescription: 'Initial version',
      },
      {
        id: 'v2',
        gptId: 'test-gpt-1',
        version: 2,
        createdAtISO: '2024-01-02T00:00:00.000Z',
        snapshot: JSON.stringify({name: 'Test GPT v2'}),
        changeDescription: 'Updated version',
      },
    ]
    const {db} = await import('@/lib/database')
    vi.mocked(db.knowledgeFiles.where).mockReturnValue({
      equals: vi.fn().mockReturnValue({toArray: vi.fn().mockResolvedValue([])}),
    } as never)
    vi.mocked(db.gptVersions.where).mockReturnValue({
      equals: vi.fn().mockReturnValue({sortBy: vi.fn().mockResolvedValue(mockVersions)}),
    } as never)

    const result = await exportGPT(mockGPT, {includeVersionHistory: true})

    expect(result.versionHistory).toBeDefined()
    expect(result.versionHistory).toHaveLength(2)
  })

  it('preserves all GPT configuration fields', async () => {
    const mockGPT = createMockGPT({
      modelSettings: {
        temperature: 0.5,
        maxTokens: 2048,
        topP: 0.9,
      },
      capabilities: {
        webBrowsing: true,
        imageGeneration: true,
        codeInterpreter: true,
        fileSearch: {enabled: true},
      },
    })
    const {db} = await import('@/lib/database')
    vi.mocked(db.knowledgeFiles.where).mockReturnValue({
      equals: vi.fn().mockReturnValue({toArray: vi.fn().mockResolvedValue([])}),
    } as never)
    vi.mocked(db.gptVersions.where).mockReturnValue({
      equals: vi.fn().mockReturnValue({sortBy: vi.fn().mockResolvedValue([])}),
    } as never)

    const result = await exportGPT(mockGPT)

    expect(result.gpt.modelSettings?.temperature).toBe(0.5)
    expect(result.gpt.capabilities?.webBrowsing).toBe(true)
  })
})

describe('exportConversation edge cases', () => {
  it('handles conversation with no messages', async () => {
    const mockConversation = createMockConversation({
      messages: [],
      messageCount: 0,
    })

    const result = await exportConversation(mockConversation, 'Test GPT')

    expect(result.conversation.messages).toHaveLength(0)
  })

  it('handles conversation with many messages', async () => {
    const messages = Array.from({length: 100}, (_, i) => ({
      id: `msg-${i}`,
      role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: `Message ${i}`,
      timestamp: new Date(),
    }))
    const mockConversation = createMockConversation({
      messages,
      messageCount: 100,
    })

    const result = await exportConversation(mockConversation, 'Test GPT')

    expect(result.conversation.messages).toHaveLength(100)
  })

  it('preserves message metadata', async () => {
    const mockConversation = createMockConversation({
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date('2024-01-01T12:00:00Z'),
        },
      ],
    })

    const result = await exportConversation(mockConversation, 'Test GPT')
    const message = result.conversation.messages[0]

    expect(message?.role).toBe('user')
    expect(message?.content).toBe('Hello')
    expect(message?.timestamp).toBeDefined()
  })
})

describe('sanitizeFilename edge cases', () => {
  it('handles empty string', () => {
    expect(sanitizeFilename('')).toBe('')
  })

  it('handles string with only invalid characters', () => {
    const result = sanitizeFilename('/:*?"<>|')
    expect(result).not.toContain('/')
    expect(result).not.toContain(':')
    expect(result).not.toContain('*')
  })

  it('handles unicode characters', () => {
    const result = sanitizeFilename('tëst-fïlé-nàmé')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('handles consecutive spaces', () => {
    const result = sanitizeFilename('test   file   name')
    expect(result).not.toContain('   ')
  })
})
