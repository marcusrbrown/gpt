import type {Conversation} from '@/types/gpt'
import {z} from 'zod'

export const ExportFormatSchema = z.enum(['json', 'markdown'])
export type ExportFormat = z.infer<typeof ExportFormatSchema>

export const ExportOptionsSchema = z.object({
  format: ExportFormatSchema,
  includeMetadata: z.boolean().default(true),
  includeTimestamps: z.boolean().default(true),
})
export type ExportOptions = z.infer<typeof ExportOptionsSchema>

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
    .slice(0, 50)
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0] ?? ''
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function formatRoleName(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1)
}

export class ConversationExportService {
  export(conversation: Conversation, options: ExportOptions): string {
    const validatedOptions = ExportOptionsSchema.parse(options)

    if (validatedOptions.format === 'json') {
      return this.exportToJSON(conversation, validatedOptions)
    }

    return this.exportToMarkdown(conversation, validatedOptions)
  }

  exportToJSON(conversation: Conversation, options: ExportOptions): string {
    const data: Record<string, unknown> = {
      id: conversation.id,
      gptId: conversation.gptId,
      title: conversation.title ?? 'Untitled Conversation',
      messages: conversation.messages.map(msg => {
        const messageData: Record<string, unknown> = {
          role: msg.role,
          content: msg.content,
        }

        if (options.includeTimestamps) {
          messageData.timestamp = msg.timestamp.toISOString()
        }

        if (options.includeMetadata && msg.metadata) {
          messageData.metadata = msg.metadata
        }

        return messageData
      }),
    }

    if (options.includeMetadata) {
      data.createdAt = conversation.createdAt.toISOString()
      data.updatedAt = conversation.updatedAt.toISOString()
      data.messageCount = conversation.messageCount
      data.tags = conversation.tags
      data.isPinned = conversation.isPinned
      data.isArchived = conversation.isArchived
    }

    return JSON.stringify(data, null, 2)
  }

  exportToMarkdown(conversation: Conversation, options: ExportOptions): string {
    const lines: string[] = []
    const title = conversation.title ?? 'Untitled Conversation'

    lines.push(`# ${title}`)
    lines.push('')

    if (options.includeMetadata) {
      lines.push(`**Created**: ${conversation.createdAt.toISOString()}`)
      lines.push(`**Messages**: ${conversation.messageCount}`)

      if (conversation.tags.length > 0) {
        lines.push(`**Tags**: ${conversation.tags.join(', ')}`)
      }

      if (conversation.isPinned) {
        lines.push(`**Pinned**: Yes`)
      }

      lines.push('')
      lines.push('---')
      lines.push('')
    }

    for (const message of conversation.messages) {
      const roleName = formatRoleName(message.role)

      if (options.includeTimestamps) {
        lines.push(`## ${roleName} (${formatTime(message.timestamp)})`)
      } else {
        lines.push(`## ${roleName}`)
      }

      lines.push('')
      lines.push(message.content)
      lines.push('')
    }

    return lines.join('\n')
  }

  generateFilename(conversation: Conversation, format: ExportFormat, gptName?: string): string {
    const title = conversation.title ?? 'conversation'
    const sanitizedTitle = sanitizeFilename(title)
    const sanitizedGptName = gptName ? sanitizeFilename(gptName) : 'gpt'
    const dateStr = formatDate(conversation.createdAt)
    const extension = format === 'json' ? 'json' : 'md'

    return `${sanitizedGptName}-${sanitizedTitle}-${dateStr}.${extension}`
  }

  downloadExport(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], {type: `${mimeType};charset=utf-8`})
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.style.display = 'none'

    document.body.append(link)
    link.click()
    link.remove()

    URL.revokeObjectURL(url)
  }
}

export const conversationExportService = new ConversationExportService()
