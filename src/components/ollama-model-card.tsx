import type {OllamaModelInfo} from '@/types/ollama'

import {cn, ds} from '@/lib/design-system'
import {formatModelSize, supportsThinking, supportsVision} from '@/types/ollama'
import {Button, Card, CardBody, Chip} from '@heroui/react'
import {Box, Brain, Check, Cpu, Eye, Trash2, Wrench} from 'lucide-react'

interface OllamaModelCardProps {
  model: OllamaModelInfo
  isSelected?: boolean
  onSelect?: (modelName: string) => void
  onDelete?: (modelName: string) => void
}

/**
 * Heuristic to detect tool support based on model name
 * This is a visual aid only, as actual tool support depends on the provider implementation
 */
function supportsTools(name: string): boolean {
  const lower = name.toLowerCase()
  return (
    lower.includes('llama3.1') ||
    lower.includes('qwen2.5') ||
    lower.includes('mistral-nemo') ||
    lower.includes('command-r') ||
    lower.includes('firefunction') ||
    lower.includes('nexus')
  )
}

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    const diff = Math.max(0, Date.now() - date.getTime())

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days > 365) return `${Math.floor(days / 365)}y ago`
    if (days > 30) return `${Math.floor(days / 30)}mo ago`
    if (days > 0) return `${days}d ago`

    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours > 0) return `${hours}h ago`

    const minutes = Math.floor(diff / (1000 * 60))
    if (minutes > 0) return `${minutes}m ago`

    return 'just now'
  } catch {
    return 'unknown'
  }
}

export function OllamaModelCard({model, isSelected, onSelect, onDelete}: OllamaModelCardProps) {
  const isVision = supportsVision(model.name)
  const isReasoning = supportsThinking(model.name)
  const isTools = supportsTools(model.name)

  const handleSelect = () => {
    Promise.resolve(onSelect?.(model.name)).catch(console.error)
  }

  const handleDelete = () => {
    Promise.resolve(onDelete?.(model.name)).catch(console.error)
  }

  return (
    <Card
      isPressable={!!onSelect}
      onPress={handleSelect}
      className={cn(
        ds.card.base,
        'w-full transition-all duration-200 border-2',
        isSelected
          ? 'border-primary-500 bg-primary-50/10 shadow-md ring-1 ring-primary-500/20'
          : 'border-transparent hover:border-border-subtle hover:bg-surface-tertiary/50',
      )}
      shadow="sm"
    >
      <CardBody className="p-4 gap-4">
        {/* Header: Name and Status */}
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={cn(ds.text.heading.h4, 'truncate font-bold tracking-tight')}>
                {model.name.split(':')[0]}
              </h3>
              {isSelected && (
                <div className="bg-primary-500 text-white rounded-full p-0.5 animate-in zoom-in duration-200">
                  <Check className="w-3 h-3" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-content-tertiary">
              <span className="flex items-center gap-1 font-mono">
                <Box className="w-3 h-3" />
                {model.details.parameter_size || 'Unknown'}
              </span>
              <span className="w-1 h-1 rounded-full bg-border-strong" />
              <span className="font-mono">{formatModelSize(model.size)}</span>
              <span className="w-1 h-1 rounded-full bg-border-strong" />
              <span className="truncate max-w-25">{model.details.quantization_level}</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className={cn(ds.text.caption, 'text-[10px]')}>{formatRelativeTime(model.modified_at)}</span>
          </div>
        </div>

        {/* Badges & Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border-subtle/50">
          <div className="flex gap-2 flex-wrap">
            {isVision && (
              <Chip
                startContent={<Eye className="w-3 h-3" />}
                variant="flat"
                color="secondary"
                size="sm"
                className="h-6 px-1.5 gap-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200/50"
              >
                Vision
              </Chip>
            )}
            {isReasoning && (
              <Chip
                startContent={<Brain className="w-3 h-3" />}
                variant="flat"
                color="warning"
                size="sm"
                className="h-6 px-1.5 gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/50"
              >
                Reasoning
              </Chip>
            )}
            {isTools && (
              <Chip
                startContent={<Wrench className="w-3 h-3" />}
                variant="flat"
                color="primary"
                size="sm"
                className="h-6 px-1.5 gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200/50"
              >
                Tools
              </Chip>
            )}
            {!isVision && !isReasoning && !isTools && (
              <Chip
                startContent={<Cpu className="w-3 h-3" />}
                variant="flat"
                size="sm"
                className="h-6 px-1.5 gap-1 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-200/50"
              >
                Text
              </Chip>
            )}
          </div>

          <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
            {onDelete && (
              <Button
                isIconOnly
                size="sm"
                variant="light"
                color="danger"
                onPress={handleDelete}
                className="w-8 h-8 min-w-8 text-danger-400 hover:text-danger-600 hover:bg-danger-50"
                aria-label={`Delete ${model.name}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
