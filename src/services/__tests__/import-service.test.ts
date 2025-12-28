import {APP_VERSION, ConversationExportSchema, CURRENT_EXPORT_VERSION, GPTExportSchema} from '@/types/export-import'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {importGPT, previewImport, validateImport} from '../import-service'

function createMockFile(content: string, name: string, type = 'application/json'): File {
  const blob = new Blob([content], {type})
  const file = new File([blob], name, {type})
  Object.defineProperty(file, 'text', {
    value: async () => Promise.resolve(content),
  })
  return file
}

vi.mock('@/lib/database', () => ({
  db: {
    gpts: {
      get: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue('test-id'),
      delete: vi.fn().mockResolvedValue(undefined),
      toArray: vi.fn().mockResolvedValue([]),
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(undefined),
          delete: vi.fn().mockResolvedValue(0),
        }),
      }),
    },
    conversations: {
      get: vi.fn(),
      put: vi.fn(),
      toArray: vi.fn().mockResolvedValue([]),
    },
    messages: {
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
      bulkPut: vi.fn(),
    },
    knowledgeFiles: {
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
      bulkPut: vi.fn(),
    },
    gptVersions: {
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
      bulkPut: vi.fn(),
    },
    folders: {
      get: vi.fn(),
      put: vi.fn(),
      toArray: vi.fn().mockResolvedValue([]),
    },
    settings: {
      toArray: vi.fn().mockResolvedValue([]),
      bulkPut: vi.fn(),
    },
    transaction: vi.fn().mockImplementation((_mode, _tables, callback) => callback()),
  },
  toISOString: vi.fn((date: Date) => date.toISOString()),
}))

function createValidGPTExport() {
  return {
    metadata: {
      version: CURRENT_EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      source: 'gpt-platform' as const,
      sourceVersion: APP_VERSION,
    },
    gpt: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Test GPT',
      description: 'A test GPT configuration',
      systemPrompt: 'You are a helpful assistant.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  }
}

function createValidConversationExport() {
  return {
    metadata: {
      version: CURRENT_EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      source: 'gpt-platform' as const,
      sourceVersion: APP_VERSION,
    },
    conversation: {
      id: '550e8400-e29b-41d4-a716-446655440001',
      gptId: '550e8400-e29b-41d4-a716-446655440000',
      gptName: 'Test GPT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          role: 'user' as const,
          content: 'Hello',
          timestamp: new Date().toISOString(),
        },
        {
          role: 'assistant' as const,
          content: 'Hi there!',
          timestamp: new Date().toISOString(),
        },
      ],
    },
  }
}

describe('import-service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validateImport', () => {
    it('validates a correct GPT export file', async () => {
      const exportData = createValidGPTExport()
      const file = createMockFile(JSON.stringify(exportData), 'test-gpt.json')

      const result = await validateImport(file)

      expect(result.valid).toBe(true)
      expect(result.type).toBe('gpt')
      expect(result.errors).toHaveLength(0)
    })

    it('validates a correct conversation export file', async () => {
      const exportData = createValidConversationExport()
      const file = createMockFile(JSON.stringify(exportData), 'test-conversation.json')

      const result = await validateImport(file)

      expect(result.valid).toBe(true)
      expect(result.type).toBe('conversation')
      expect(result.errors).toHaveLength(0)
    })

    it('rejects invalid JSON', async () => {
      const file = createMockFile('not valid json {', 'invalid.json')

      const result = await validateImport(file)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects data with missing required fields', async () => {
      const invalidData = {
        metadata: {
          version: '1.0',
        },
      }
      const file = createMockFile(JSON.stringify(invalidData), 'invalid.json')

      const result = await validateImport(file)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('previewImport', () => {
    it('generates preview for GPT import', async () => {
      const exportData = createValidGPTExport()
      const file = createMockFile(JSON.stringify(exportData), 'test-gpt.json')

      const preview = await previewImport(file)

      expect(preview.type).toBe('gpt')
      expect(preview.items).toHaveLength(1)
      expect(preview.items[0]?.name).toBe('Test GPT')
      expect(preview.items[0]?.type).toBe('gpt')
    })

    it('detects conflicts with existing GPTs by ID', async () => {
      const {db} = await import('@/lib/database')
      const exportData = createValidGPTExport()

      const existingGPT = {
        id: exportData.gpt.id,
        name: 'Existing GPT',
        description: '',
        systemPrompt: '',
        tools: [],
        knowledge: {files: [], urls: [], extractionMode: 'manual' as const},
        capabilities: {
          webBrowsing: false,
          codeInterpreter: false,
          imageGeneration: false,
          fileSearch: {enabled: false},
        },
        createdAtISO: new Date().toISOString(),
        updatedAtISO: new Date().toISOString(),
        version: 1,
        tags: [],
        isArchived: false,
        folderId: null,
        archivedAtISO: null,
      }

      vi.mocked(db.gpts.get).mockResolvedValueOnce(existingGPT)

      const file = createMockFile(JSON.stringify(exportData), 'test-gpt.json')

      const preview = await previewImport(file)

      expect(preview.items[0]?.hasConflict).toBe(true)
      expect(preview.items[0]?.existingId).toBe(exportData.gpt.id)
    })

    it('detects conflicts with existing GPTs by name', async () => {
      const {db} = await import('@/lib/database')
      const exportData = createValidGPTExport()

      const existingGPT = {
        id: 'different-id',
        name: exportData.gpt.name,
        description: '',
        systemPrompt: '',
        tools: [],
        knowledge: {files: [], urls: [], extractionMode: 'manual' as const},
        capabilities: {
          webBrowsing: false,
          codeInterpreter: false,
          imageGeneration: false,
          fileSearch: {enabled: false},
        },
        createdAtISO: new Date().toISOString(),
        updatedAtISO: new Date().toISOString(),
        version: 1,
        tags: [],
        isArchived: false,
        folderId: null,
        archivedAtISO: null,
      }

      vi.mocked(db.gpts.get).mockResolvedValueOnce(undefined)
      vi.mocked(db.gpts.where).mockReturnValueOnce({
        equals: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(existingGPT),
          delete: vi.fn().mockResolvedValue(0),
        }),
      } as unknown as ReturnType<typeof db.gpts.where>)

      const file = createMockFile(JSON.stringify(exportData), 'test-gpt.json')

      const preview = await previewImport(file)

      expect(preview.items[0]?.hasConflict).toBe(true)
      expect(preview.items[0]?.existingId).toBe('different-id')
    })
  })

  describe('importGPT', () => {
    it('imports a GPT with skip resolution when conflict exists', async () => {
      const {db} = await import('@/lib/database')
      const exportData = createValidGPTExport()
      vi.mocked(db.gpts.get).mockResolvedValueOnce({
        id: exportData.gpt.id,
        name: 'Existing GPT',
        description: '',
        systemPrompt: '',
        tools: [],
        knowledge: {files: [], urls: [], extractionMode: 'manual' as const},
        capabilities: {
          webBrowsing: false,
          codeInterpreter: false,
          imageGeneration: false,
          fileSearch: {enabled: false},
        },
        createdAtISO: new Date().toISOString(),
        updatedAtISO: new Date().toISOString(),
        version: 1,
        tags: [],
        isArchived: false,
        folderId: null,
        archivedAtISO: null,
      })

      const result = await importGPT(exportData, 'skip')

      expect(result.success).toBe(true)
      expect(result.skipped).toBe(1)
      expect(result.imported).toBe(0)
      expect(db.gpts.put).not.toHaveBeenCalled()
    })

    it('imports a GPT with overwrite resolution', async () => {
      const {db} = await import('@/lib/database')
      const exportData = createValidGPTExport()
      const existingGPT = {
        id: exportData.gpt.id,
        name: 'Existing GPT',
        description: '',
        systemPrompt: '',
        tools: [],
        knowledge: {files: [], urls: [], extractionMode: 'manual' as const},
        capabilities: {
          webBrowsing: false,
          codeInterpreter: false,
          imageGeneration: false,
          fileSearch: {enabled: false},
        },
        createdAtISO: new Date().toISOString(),
        updatedAtISO: new Date().toISOString(),
        version: 1,
        tags: [],
        isArchived: false,
        folderId: null,
        archivedAtISO: null,
      }

      vi.mocked(db.gpts.get).mockResolvedValueOnce(existingGPT)
      vi.mocked(db.gpts.delete).mockResolvedValueOnce(undefined)
      vi.mocked(db.knowledgeFiles.where).mockReturnValue({
        equals: vi.fn().mockReturnValue({
          delete: vi.fn().mockResolvedValue(0),
          toArray: vi.fn().mockResolvedValue([]),
        }),
      } as unknown as ReturnType<typeof db.knowledgeFiles.where>)
      vi.mocked(db.gptVersions.where).mockReturnValue({
        equals: vi.fn().mockReturnValue({
          delete: vi.fn().mockResolvedValue(0),
          toArray: vi.fn().mockResolvedValue([]),
        }),
      } as unknown as ReturnType<typeof db.gptVersions.where>)

      const result = await importGPT(exportData, 'overwrite')

      expect(result.success).toBe(true)
      expect(result.imported).toBe(1)
      expect(db.gpts.put).toHaveBeenCalled()
    })

    it('imports a new GPT without conflict', async () => {
      const {db} = await import('@/lib/database')
      vi.mocked(db.gpts.get).mockResolvedValueOnce(undefined)

      const exportData = createValidGPTExport()

      const result = await importGPT(exportData, 'skip')

      expect(result.success).toBe(true)
      expect(result.imported).toBe(1)
      expect(db.gpts.put).toHaveBeenCalled()
    })
  })

  describe('schema validation', () => {
    it('GPTExportSchema validates correct data', () => {
      const data = createValidGPTExport()
      const result = GPTExportSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('ConversationExportSchema validates correct data', () => {
      const data = createValidConversationExport()
      const result = ConversationExportSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('GPTExportSchema rejects missing metadata', () => {
      const data = {gpt: createValidGPTExport().gpt}
      const result = GPTExportSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('GPTExportSchema rejects invalid version', () => {
      const data = createValidGPTExport()
      data.metadata.version = '99.0' as '1.0'
      const result = GPTExportSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('ConversationExportSchema rejects missing messages array', () => {
      const data = createValidConversationExport()
      // @ts-expect-error Testing invalid data
      delete data.conversation.messages
      const result = ConversationExportSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('importGPT edge cases', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('imports GPT with rename resolution when conflict exists', async () => {
      const {db} = await import('@/lib/database')
      const exportData = createValidGPTExport()
      vi.mocked(db.gpts.get).mockResolvedValueOnce({
        id: exportData.gpt.id,
        name: 'Test GPT',
        description: '',
        systemPrompt: '',
        tools: [],
        knowledge: {files: [], urls: [], extractionMode: 'manual' as const},
        capabilities: {
          webBrowsing: false,
          codeInterpreter: false,
          imageGeneration: false,
          fileSearch: {enabled: false},
        },
        createdAtISO: new Date().toISOString(),
        updatedAtISO: new Date().toISOString(),
        version: 1,
        tags: [],
        isArchived: false,
        folderId: null,
        archivedAtISO: null,
      })

      const result = await importGPT(exportData, 'rename')

      expect(result.success).toBe(true)
      expect(result.imported).toBe(1)
      expect(db.gpts.put).toHaveBeenCalled()
    })

    it('handles GPT with all optional fields', async () => {
      const {db} = await import('@/lib/database')
      vi.mocked(db.gpts.get).mockResolvedValueOnce(undefined)

      const exportData = createValidGPTExport()

      const result = await importGPT(exportData, 'skip')

      expect(result.success).toBe(true)
      expect(result.imported).toBe(1)
    })
  })

  describe('previewImport edge cases', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('handles empty import file', async () => {
      const file = createMockFile('{}', 'empty.json', 'application/json')

      const preview = await previewImport(file)

      expect(preview.items).toHaveLength(0)
    })

    it('handles malformed JSON gracefully', async () => {
      const file = createMockFile('not valid json', 'bad.json', 'application/json')

      const preview = await previewImport(file)

      expect(preview.items).toHaveLength(0)
    })
  })

  describe('validateImport edge cases', () => {
    it('rejects invalid export structure', async () => {
      const invalidData = {notAGPT: true}
      const file = createMockFile(JSON.stringify(invalidData), 'invalid.json', 'application/json')

      const result = await validateImport(file)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('handles file with BOM marker', async () => {
      const exportData = createValidGPTExport()
      const jsonWithBOM = `\uFEFF${JSON.stringify(exportData)}`
      const file = createMockFile(jsonWithBOM, 'bom.json', 'application/json')

      const result = await validateImport(file)

      expect(result.type).toBeDefined()
    })

    it('handles nested JSON parsing errors gracefully', async () => {
      const malformedData = '{"metadata": {"version": "1.0"}, "gpt": {invalid}}'
      const file = createMockFile(malformedData, 'malformed.json', 'application/json')

      const result = await validateImport(file)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })
})
