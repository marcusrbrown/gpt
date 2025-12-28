import type {
  CachedURLDB,
  CachedURLStatus,
  CreateSnippetInput,
  ExtractionOptions,
  ExtractionStatus,
  KnowledgeFileCategory,
  KnowledgeFileDB,
  KnowledgeSummary,
  SearchResult,
  TextSnippetDB,
  UpdateSnippetInput,
} from '@/types/knowledge'
import {db} from '@/lib/database'
import {KNOWLEDGE_CONSTANTS} from '@/types/knowledge'
import {v4 as uuidv4} from 'uuid'

export class KnowledgeService {
  async addKnowledgeFiles(gptId: string, files: File[]): Promise<KnowledgeFileDB[]> {
    const results: KnowledgeFileDB[] = []

    for (const file of files) {
      if (file.size > KNOWLEDGE_CONSTANTS.MAX_FILE_SIZE) {
        throw new Error(`File ${file.name} exceeds maximum size of ${KNOWLEDGE_CONSTANTS.MAX_FILE_SIZE} bytes`)
      }

      const category = this.detectCategory(file.type)
      const extractionStatus = this.determineExtractionStatus(file.type)

      const knowledgeFile: KnowledgeFileDB = {
        id: uuidv4(),
        gptId,
        name: file.name,
        mimeType: file.type,
        size: file.size,
        content: file,
        category,
        extractionStatus,
        uploadedAtISO: new Date().toISOString(),
        updatedAtISO: new Date().toISOString(),
      }

      await db.knowledgeFiles.add(knowledgeFile)
      results.push(knowledgeFile)
    }

    return results
  }

  async removeKnowledgeFile(id: string): Promise<void> {
    await db.knowledgeFiles.delete(id)
  }

  async extractKnowledgeFile(id: string, options: ExtractionOptions = {}): Promise<void> {
    const file = await db.knowledgeFiles.get(id)
    if (!file) {
      throw new Error(`Knowledge file ${id} not found`)
    }

    await db.knowledgeFiles.update(id, {
      extractionStatus: 'processing',
      extractionError: undefined,
      updatedAtISO: new Date().toISOString(),
    })

    try {
      const extractedText = await this.performExtraction(file, options)

      await db.knowledgeFiles.update(id, {
        extractedText,
        extractionStatus: 'completed',
        updatedAtISO: new Date().toISOString(),
      })
    } catch (error_) {
      const error = error_ as Error
      if (error.message.includes('Unsupported file type')) {
        await db.knowledgeFiles.update(id, {
          extractionStatus: 'unsupported',
          extractionError: error.message,
          updatedAtISO: new Date().toISOString(),
        })
        return
      }

      await db.knowledgeFiles.update(id, {
        extractionStatus: 'failed',
        extractionError: error.message,
        updatedAtISO: new Date().toISOString(),
      })
      throw error
    }
  }

  async extractAllPending(gptId: string, options: ExtractionOptions = {}): Promise<void> {
    const pendingFiles = await db.knowledgeFiles.where({gptId, extractionStatus: 'pending'}).toArray()

    for (const file of pendingFiles) {
      try {
        await this.extractKnowledgeFile(file.id, options)
      } catch (error_) {
        console.error(`Failed to extract ${file.name}:`, error_)
      }
    }
  }

  async listKnowledgeFiles(gptId: string): Promise<KnowledgeFileDB[]> {
    return db.knowledgeFiles.where({gptId}).toArray()
  }

  async addCachedUrl(gptId: string, url: string): Promise<CachedURLDB> {
    const existing = await db.cachedURLs.where({gptId, url}).first()
    if (existing) {
      return existing
    }

    const cachedUrl: CachedURLDB = {
      id: uuidv4(),
      gptId,
      url,
      status: 'pending',
    }

    await db.cachedURLs.add(cachedUrl)
    await this.fetchUrlContent(cachedUrl.id)

    const updated = await db.cachedURLs.get(cachedUrl.id)
    return updated || cachedUrl
  }

  async refreshCachedUrl(id: string): Promise<CachedURLDB> {
    const cachedUrl = await db.cachedURLs.get(id)
    if (!cachedUrl) {
      throw new Error(`Cached URL ${id} not found`)
    }

    await this.fetchUrlContent(id)
    const updated = await db.cachedURLs.get(id)
    if (!updated) {
      throw new Error(`Cached URL ${id} not found after refresh`)
    }

    return updated
  }

  async removeCachedUrl(id: string): Promise<void> {
    await db.cachedURLs.delete(id)
  }

  async listCachedUrls(gptId: string): Promise<CachedURLDB[]> {
    return db.cachedURLs.where({gptId}).toArray()
  }

  async createSnippet(gptId: string, data: CreateSnippetInput): Promise<TextSnippetDB> {
    if (data.content.length > KNOWLEDGE_CONSTANTS.MAX_SNIPPET_SIZE) {
      throw new Error(`Snippet content exceeds maximum size of ${KNOWLEDGE_CONSTANTS.MAX_SNIPPET_SIZE} characters`)
    }

    const snippet: TextSnippetDB = {
      id: uuidv4(),
      gptId,
      title: data.title,
      content: data.content,
      tags: data.tags,
      createdAtISO: new Date().toISOString(),
      updatedAtISO: new Date().toISOString(),
    }

    await db.textSnippets.add(snippet)
    return snippet
  }

  async updateSnippet(id: string, data: UpdateSnippetInput): Promise<TextSnippetDB> {
    const snippet = await db.textSnippets.get(id)
    if (!snippet) {
      throw new Error(`Snippet ${id} not found`)
    }

    if (data.content && data.content.length > KNOWLEDGE_CONSTANTS.MAX_SNIPPET_SIZE) {
      throw new Error(`Snippet content exceeds maximum size of ${KNOWLEDGE_CONSTANTS.MAX_SNIPPET_SIZE} characters`)
    }

    const updates: Partial<TextSnippetDB> = {
      ...data,
      updatedAtISO: new Date().toISOString(),
    }

    await db.textSnippets.update(id, updates)

    const updated = await db.textSnippets.get(id)
    if (!updated) {
      throw new Error(`Snippet ${id} not found after update`)
    }

    return updated
  }

  async deleteSnippet(id: string): Promise<void> {
    await db.textSnippets.delete(id)
  }

  async listSnippets(gptId: string): Promise<TextSnippetDB[]> {
    return db.textSnippets.where({gptId}).toArray()
  }

  async searchKnowledge(gptId: string, query: string): Promise<SearchResult[]> {
    if (!query.trim()) {
      return []
    }

    const results: SearchResult[] = []
    const searchTerm = query.toLowerCase()

    const files = await this.listKnowledgeFiles(gptId)
    for (const file of files) {
      if (!file.extractedText) continue

      const index = file.extractedText.toLowerCase().indexOf(searchTerm)
      if (index !== -1) {
        const start = Math.max(0, index - 50)
        const end = Math.min(file.extractedText.length, index + query.length + 50)
        const excerpt = file.extractedText.slice(start, end)

        results.push({
          type: 'file',
          id: file.id,
          title: file.name,
          snippet: start > 0 ? `...${excerpt}` : excerpt,
          score: 1,
          source: file.id,
        })
      }
    }

    const urls = await this.listCachedUrls(gptId)
    for (const url of urls) {
      if (!url.content) continue

      const index = url.content.toLowerCase().indexOf(searchTerm)
      if (index !== -1) {
        const start = Math.max(0, index - 50)
        const end = Math.min(url.content.length, index + query.length + 50)
        const excerpt = url.content.slice(start, end)

        results.push({
          type: 'url',
          id: url.id,
          title: url.title || url.url,
          snippet: start > 0 ? `...${excerpt}` : excerpt,
          score: 1,
          source: url.url,
        })
      }
    }

    const snippets = await this.listSnippets(gptId)
    for (const snippet of snippets) {
      const titleMatch = snippet.title.toLowerCase().includes(searchTerm)
      const contentMatch = snippet.content.toLowerCase().includes(searchTerm)
      const tagsMatch = snippet.tags?.some(tag => tag.toLowerCase().includes(searchTerm))

      if (titleMatch || contentMatch || tagsMatch) {
        const index = snippet.content.toLowerCase().indexOf(searchTerm)
        let excerpt = snippet.content

        if (index !== -1 && snippet.content.length > 100) {
          const start = Math.max(0, index - 50)
          const end = Math.min(snippet.content.length, index + query.length + 50)
          excerpt = snippet.content.slice(start, end)
          if (start > 0) excerpt = `...${excerpt}`
        }

        results.push({
          type: 'snippet',
          id: snippet.id,
          title: snippet.title,
          snippet: excerpt,
          score: titleMatch ? 2 : 1,
          source: snippet.id,
        })
      }
    }

    results.sort((a, b) => b.score - a.score)

    return results
  }

  async getKnowledgeSummary(gptId: string): Promise<KnowledgeSummary> {
    const files = await this.listKnowledgeFiles(gptId)
    const urls = await this.listCachedUrls(gptId)
    const snippets = await this.listSnippets(gptId)

    const extractedFilesCount = files.filter(f => f.extractionStatus === 'completed').length
    const pendingExtractionCount = files.filter(f => f.extractionStatus === 'pending').length
    const totalSize = files.reduce((sum, file) => sum + file.size, 0)
    const extractedTextLength = files.reduce((sum, file) => sum + (file.extractedText?.length || 0), 0)

    return {
      filesCount: files.length,
      extractedFilesCount,
      pendingExtractionCount,
      urlsCount: urls.length,
      snippetsCount: snippets.length,
      totalSize,
      extractedTextLength,
    }
  }

  private detectCategory(mimeType: string): KnowledgeFileCategory {
    if (
      mimeType.includes('javascript') ||
      mimeType.includes('typescript') ||
      mimeType.includes('python') ||
      mimeType.includes('java')
    ) {
      return 'code'
    }

    if (
      mimeType.includes('pdf') ||
      mimeType.includes('word') ||
      mimeType.includes('document') ||
      mimeType === 'text/plain'
    ) {
      return 'document'
    }

    if (mimeType.includes('json') || mimeType.includes('xml')) {
      return 'data'
    }

    return 'other'
  }

  private determineExtractionStatus(mimeType: string): ExtractionStatus {
    const supportedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/',
      'application/json',
    ]

    const isSupported = supportedTypes.some(type => mimeType.startsWith(type))
    return isSupported ? 'pending' : 'unsupported'
  }

  private async performExtraction(file: KnowledgeFileDB, options: ExtractionOptions): Promise<string> {
    const maxChars = options.maxTextLength || KNOWLEDGE_CONSTANTS.MAX_EXTRACTED_TEXT_LENGTH
    const timeout = options.timeout || KNOWLEDGE_CONSTANTS.EXTRACTION_TIMEOUT_MS

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Extraction timeout')), timeout)
    })

    const extractionPromise = (async () => {
      if (file.mimeType === 'application/pdf') {
        return this.extractPDF(file.content, maxChars)
      }

      if (file.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        return this.extractDOCX(file.content, maxChars)
      }

      if (file.mimeType.startsWith('text/') || file.mimeType.includes('json')) {
        return this.extractText(file.content, maxChars)
      }

      throw new Error(`Unsupported file type: ${file.mimeType}`)
    })()

    return Promise.race([extractionPromise, timeoutPromise])
  }

  private async extractPDF(blob: Blob, maxChars: number): Promise<string> {
    const pdfjs = await import('pdfjs-dist')
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

    const arrayBuffer = await blob.arrayBuffer()
    const pdf = await pdfjs.getDocument({data: arrayBuffer}).promise

    let text = ''
    for (let i = 1; i <= pdf.numPages && text.length < maxChars; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items.map((item: any) => item.str).join(' ')
      text += `${pageText}\n`
    }

    return text.slice(0, maxChars)
  }

  private async extractDOCX(blob: Blob, maxChars: number): Promise<string> {
    const mammoth = await import('mammoth')
    const arrayBuffer = await blob.arrayBuffer()
    const result = await mammoth.extractRawText({arrayBuffer})
    return result.value.slice(0, maxChars)
  }

  private async extractText(blob: Blob, maxChars: number): Promise<string> {
    if (blob instanceof File || blob instanceof Blob) {
      try {
        if (typeof blob.text === 'function') {
          const text = await blob.text()
          return text.slice(0, maxChars)
        }
      } catch {}

      try {
        if (typeof blob.arrayBuffer === 'function') {
          const arrayBuffer = await blob.arrayBuffer()
          const text = new TextDecoder().decode(arrayBuffer)
          return text.slice(0, maxChars)
        }
      } catch {}

      // Fallback for test environments (fake-indexeddb doesn't support blob.text())
      try {
        const reader = new FileReader()
        const text = await new Promise<string>((resolve, reject) => {
          reader.addEventListener('load', () => resolve(reader.result as string))
          reader.addEventListener('error', () => reject(reader.error))
          // eslint-disable-next-line unicorn/prefer-blob-reading-methods
          reader.readAsText(blob)
        })
        return text.slice(0, maxChars)
      } catch {}
    }

    // Special handling for fake-indexeddb Blob implementation
    if (blob && '_buffer' in blob) {
      const buffer = (blob as {_buffer: unknown})._buffer
      if (buffer instanceof ArrayBuffer) {
        const text = new TextDecoder().decode(buffer)
        return text.slice(0, maxChars)
      }
      if (buffer instanceof Uint8Array) {
        const text = new TextDecoder().decode(buffer)
        return text.slice(0, maxChars)
      }
      if (Array.isArray(buffer)) {
        const uint8Array = new Uint8Array(buffer)
        const text = new TextDecoder().decode(uint8Array)
        return text.slice(0, maxChars)
      }
      if (buffer && typeof buffer === 'object' && 'length' in buffer) {
        try {
          const text = new TextDecoder().decode(buffer as unknown as BufferSource)
          return text.slice(0, maxChars)
        } catch {
          const arr = Array.from(buffer as unknown as Iterable<number>)
          const uint8Array = new Uint8Array(arr)
          const text = new TextDecoder().decode(uint8Array)
          return text.slice(0, maxChars)
        }
      }
    }

    throw new Error('Unable to extract text from blob: incompatible format')
  }

  private async fetchUrlContent(id: string): Promise<void> {
    const cachedUrl = await db.cachedURLs.get(id)
    if (!cachedUrl) {
      throw new Error(`Cached URL ${id} not found`)
    }

    await db.cachedURLs.update(id, {status: 'fetching'})

    try {
      const response = await fetch(cachedUrl.url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const mimeType = response.headers.get('content-type') || 'text/html'
      const text = await response.text()

      let content = text
      let title: string | undefined

      if (mimeType.includes('text/html')) {
        const parser = new DOMParser()
        const doc = parser.parseFromString(text, 'text/html')
        title = doc.querySelector('title')?.textContent || undefined
        content = doc.body.textContent || text
      }

      if (content.length > KNOWLEDGE_CONSTANTS.MAX_URL_CONTENT_SIZE) {
        await db.cachedURLs.update(id, {
          status: 'failed' as CachedURLStatus,
          error: 'Content too large',
        })
        return
      }

      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 24)

      await db.cachedURLs.update(id, {
        status: 'ready' as CachedURLStatus,
        content,
        title,
        mimeType,
        size: content.length,
        fetchedAtISO: new Date().toISOString(),
        expiresAtISO: expiresAt.toISOString(),
        error: undefined,
      })
    } catch (error_) {
      const error = error_ as Error
      await db.cachedURLs.update(id, {
        status: 'failed' as CachedURLStatus,
        error: error.message,
      })
    }
  }
}

export const knowledgeService = new KnowledgeService()
