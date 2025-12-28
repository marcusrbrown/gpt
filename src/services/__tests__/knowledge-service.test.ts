import type {CreateSnippetInput, UpdateSnippetInput} from '@/types/knowledge'
import {db} from '@/lib/database'
import {KnowledgeService} from '@/services/knowledge-service'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import 'fake-indexeddb/auto'

describe('KnowledgeService', () => {
  let service: KnowledgeService
  const testGptId = 'test-gpt-123'

  beforeEach(async () => {
    await db.delete()
    await db.open()
    service = new KnowledgeService()
  })

  describe('File Operations', () => {
    it('should add knowledge files', async () => {
      const file = new File(['test content'], 'test.txt', {type: 'text/plain'})
      const files = await service.addKnowledgeFiles(testGptId, [file])

      expect(files).toHaveLength(1)
      expect(files[0]?.name).toBe('test.txt')
      expect(files[0]?.gptId).toBe(testGptId)
      expect(files[0]?.extractionStatus).toBe('pending')
    })

    it('should reject files exceeding size limit', async () => {
      const largeContent = new Uint8Array(51 * 1024 * 1024)
      const file = new File([largeContent], 'large.bin', {type: 'application/octet-stream'})

      await expect(service.addKnowledgeFiles(testGptId, [file])).rejects.toThrow('exceeds maximum')
    })

    it('should list knowledge files for GPT', async () => {
      const file = new File(['content'], 'doc.txt', {type: 'text/plain'})
      await service.addKnowledgeFiles(testGptId, [file])

      const files = await service.listKnowledgeFiles(testGptId)
      expect(files).toHaveLength(1)
      expect(files[0]?.name).toBe('doc.txt')
    })

    it('should remove knowledge file', async () => {
      const file = new File(['content'], 'remove.txt', {type: 'text/plain'})
      const [added] = await service.addKnowledgeFiles(testGptId, [file])
      if (!added) throw new Error('File not added')

      await service.removeKnowledgeFile(added.id)
      const files = await service.listKnowledgeFiles(testGptId)
      expect(files).toHaveLength(0)
    })

    it('should extract text from plain text file', async () => {
      const file = new File(['Hello World'], 'text.txt', {type: 'text/plain'})
      const [added] = await service.addKnowledgeFiles(testGptId, [file])
      if (!added) throw new Error('File not added')

      vi.spyOn(service as any, 'extractText').mockResolvedValue('Hello World')

      await service.extractKnowledgeFile(added.id)

      const files = await service.listKnowledgeFiles(testGptId)
      expect(files[0]?.extractionStatus).toBe('completed')
      expect(files[0]?.extractedText).toBe('Hello World')
    })

    it('should mark unsupported file types', async () => {
      const file = new File(['binary'], 'video.mp4', {type: 'video/mp4'})
      const [added] = await service.addKnowledgeFiles(testGptId, [file])
      if (!added) throw new Error('File not added')

      await service.extractKnowledgeFile(added.id)

      const files = await service.listKnowledgeFiles(testGptId)
      expect(files[0]?.extractionStatus).toBe('unsupported')
    })

    it('should detect file category', async () => {
      const txtFile = new File(['text'], 'doc.txt', {type: 'text/plain'})
      const jsFile = new File(['code'], 'app.js', {type: 'text/javascript'})

      const [txt, js] = await service.addKnowledgeFiles(testGptId, [txtFile, jsFile])
      if (!txt || !js) throw new Error('Files not added')

      expect(txt.category).toBe('document')
      expect(js.category).toBe('code')
    })
  })

  describe('URL Operations', () => {
    beforeEach(() => {
      globalThis.fetch = vi.fn()
    })

    it('should add cached URL', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
        headers: new Headers({'content-type': 'text/html'}),
        text: async () => '<html><head><title>Test</title></head><body>Content</body></html>',
      } as Response)

      const cached = await service.addCachedUrl(testGptId, 'https://example.com')

      expect(cached.url).toBe('https://example.com')
      expect(cached.status).toBe('ready')
      expect(cached.title).toBe('Test')
      expect(cached.content).toContain('Content')
    })

    it('should handle fetch failures', async () => {
      vi.mocked(globalThis.fetch).mockRejectedValue(new Error('Network error'))

      const cached = await service.addCachedUrl(testGptId, 'https://invalid.example')

      expect(cached.status).toBe('failed')
      expect(cached.error).toContain('Network error')
    })

    it('should list cached URLs for GPT', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
        headers: new Headers({'content-type': 'text/plain'}),
        text: async () => 'text',
      } as Response)

      await service.addCachedUrl(testGptId, 'https://example.com')

      const urls = await service.listCachedUrls(testGptId)
      expect(urls).toHaveLength(1)
      expect(urls[0]?.url).toBe('https://example.com')
    })

    it('should refresh cached URL', async () => {
      vi.mocked(globalThis.fetch)
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({'content-type': 'text/plain'}),
          text: async () => 'old',
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({'content-type': 'text/plain'}),
          text: async () => 'new',
        } as Response)

      const cached = await service.addCachedUrl(testGptId, 'https://example.com')
      const refreshed = await service.refreshCachedUrl(cached.id)

      expect(refreshed.content).toBe('new')
    })

    it('should remove cached URL', async () => {
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
        headers: new Headers({'content-type': 'text/plain'}),
        text: async () => 'text',
      } as Response)

      const cached = await service.addCachedUrl(testGptId, 'https://example.com')
      await service.removeCachedUrl(cached.id)

      const urls = await service.listCachedUrls(testGptId)
      expect(urls).toHaveLength(0)
    })

    it('should enforce content size limit', async () => {
      const largeContent = 'x'.repeat(600 * 1024)
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
        headers: new Headers({'content-type': 'text/plain'}),
        text: async () => largeContent,
      } as Response)

      const cached = await service.addCachedUrl(testGptId, 'https://example.com')

      expect(cached.status).toBe('failed')
      expect(cached.error).toContain('Content too large')
    })
  })

  describe('Snippet Operations', () => {
    it('should create text snippet', async () => {
      const input: CreateSnippetInput = {
        title: 'Test Snippet',
        content: 'Snippet content here',
        tags: ['test', 'example'],
      }

      const snippet = await service.createSnippet(testGptId, input)

      expect(snippet.title).toBe('Test Snippet')
      expect(snippet.content).toBe('Snippet content here')
      expect(snippet.tags).toEqual(['test', 'example'])
      expect(snippet.gptId).toBe(testGptId)
    })

    it('should update snippet', async () => {
      const created = await service.createSnippet(testGptId, {
        title: 'Original',
        content: 'Original content',
      })

      const update: UpdateSnippetInput = {
        title: 'Updated',
        content: 'Updated content',
        tags: ['updated'],
      }

      const updated = await service.updateSnippet(created.id, update)

      expect(updated.title).toBe('Updated')
      expect(updated.content).toBe('Updated content')
      expect(updated.tags).toEqual(['updated'])
    })

    it('should delete snippet', async () => {
      const snippet = await service.createSnippet(testGptId, {
        title: 'Delete me',
        content: 'Content',
      })

      await service.deleteSnippet(snippet.id)

      const snippets = await service.listSnippets(testGptId)
      expect(snippets).toHaveLength(0)
    })

    it('should list snippets for GPT', async () => {
      await service.createSnippet(testGptId, {title: 'Snippet 1', content: 'Content 1'})
      await service.createSnippet(testGptId, {title: 'Snippet 2', content: 'Content 2'})

      const snippets = await service.listSnippets(testGptId)
      expect(snippets).toHaveLength(2)
    })

    it('should enforce snippet size limit', async () => {
      const largeContent = 'x'.repeat(150 * 1024)

      await expect(
        service.createSnippet(testGptId, {
          title: 'Large',
          content: largeContent,
        }),
      ).rejects.toThrow('exceeds maximum')
    })
  })

  describe('Search', () => {
    beforeEach(async () => {
      vi.spyOn(service as any, 'extractText').mockResolvedValue('File contains searchable text')

      const file = new File(['File contains searchable text'], 'doc.txt', {type: 'text/plain'})
      const [added] = await service.addKnowledgeFiles(testGptId, [file])
      if (!added) throw new Error('File not added')
      await service.extractKnowledgeFile(added.id)

      await service.createSnippet(testGptId, {
        title: 'Search Test',
        content: 'This snippet has searchable content',
      })

      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
        headers: new Headers({'content-type': 'text/plain'}),
        text: async () => 'URL content with searchable keywords',
      } as Response)

      await service.addCachedUrl(testGptId, 'https://example.com')
    })

    it('should search across all knowledge sources', async () => {
      const results = await service.searchKnowledge(testGptId, 'searchable')

      expect(results.length).toBeGreaterThan(0)
      expect(results.some(r => r.type === 'file')).toBe(true)
      expect(results.some(r => r.type === 'snippet')).toBe(true)
      expect(results.some(r => r.type === 'url')).toBe(true)
    })

    it('should return empty for non-matching query', async () => {
      const results = await service.searchKnowledge(testGptId, 'nonexistent')
      expect(results).toHaveLength(0)
    })

    it('should be case-insensitive', async () => {
      const results = await service.searchKnowledge(testGptId, 'SEARCHABLE')
      expect(results.length).toBeGreaterThan(0)
    })
  })

  describe('Knowledge Summary', () => {
    it('should provide accurate summary', async () => {
      const file = new File(['content'], 'test.txt', {type: 'text/plain'})
      await service.addKnowledgeFiles(testGptId, [file])

      await service.createSnippet(testGptId, {title: 'Snippet', content: 'Content'})

      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
        headers: new Headers({'content-type': 'text/plain'}),
        text: async () => 'text',
      } as Response)

      await service.addCachedUrl(testGptId, 'https://example.com')

      const summary = await service.getKnowledgeSummary(testGptId)

      expect(summary.filesCount).toBe(1)
      expect(summary.snippetsCount).toBe(1)
      expect(summary.urlsCount).toBe(1)
      expect(summary.pendingExtractionCount).toBe(1)
    })
  })
})
