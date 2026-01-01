import type {MCPToolCall} from '@/types/mcp'
import {cn, compose, ds, theme} from '@/lib/design-system'
import {Accordion, AccordionItem, Button, Chip, Code, Spinner} from '@heroui/react'
import {CheckCircle, ChevronRight, Clock, Code as CodeIcon, Server, XCircle} from 'lucide-react'
import {useMemo} from 'react'

interface MCPToolCallVisualizationProps {
  toolCall: MCPToolCall
  serverName?: string
  onRetry?: () => void
}

export function MCPToolCallVisualization({toolCall, serverName, onRetry}: MCPToolCallVisualizationProps) {
  const duration = useMemo(() => {
    if (!toolCall.completedAt || !toolCall.startedAt) return null
    const start = new Date(toolCall.startedAt).getTime()
    const end = new Date(toolCall.completedAt).getTime()
    return `${((end - start) / 1000).toFixed(2)}s`
  }, [toolCall.startedAt, toolCall.completedAt])

  const statusConfig = useMemo(() => {
    switch (toolCall.status) {
      case 'running':
        return {
          color: 'warning' as const,
          icon: <Spinner size="sm" color="current" />,
          label: 'Running',
        }
      case 'success':
        return {
          color: 'success' as const,
          icon: <CheckCircle className="w-3 h-3" />,
          label: 'Success',
        }
      case 'error':
        return {
          color: 'danger' as const,
          icon: <XCircle className="w-3 h-3" />,
          label: 'Error',
        }
      case 'cancelled':
        return {
          color: 'default' as const,
          icon: <XCircle className="w-3 h-3" />,
          label: 'Cancelled',
        }
      default:
        return {
          color: 'default' as const,
          icon: <Clock className="w-3 h-3" />,
          label: 'Pending',
        }
    }
  }, [toolCall.status])

  const hasContent = Boolean(toolCall.content || toolCall.structuredContent || toolCall.error)

  return (
    <div className={cn(compose.card(), 'p-0 overflow-hidden border my-2', theme.surface(1), theme.border())}>
      {/* Header Section */}
      <div className="flex items-center justify-between px-3 py-2 bg-default-50/50">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className={cn('p-1.5 rounded-md', 'bg-default-100 text-default-600')}>
            <CodeIcon className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn(ds.text.body.small, 'font-medium truncate')}>{toolCall.toolName}</span>
              {serverName && (
                <span className={cn(ds.text.caption, 'flex items-center gap-1 text-default-400 truncate')}>
                  <Server className="w-3 h-3" />
                  {serverName}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {duration && <span className={cn(ds.text.caption, 'text-default-400')}>{duration}</span>}
          <Chip
            size="sm"
            color={statusConfig.color}
            variant="flat"
            startContent={statusConfig.icon}
            classNames={{
              base: 'h-6 px-1',
              content: 'font-medium text-xs',
            }}
          >
            {statusConfig.label}
          </Chip>
        </div>
      </div>

      {/* Content Section */}
      <Accordion
        isCompact
        variant="light"
        showDivider={false}
        className="px-0"
        itemClasses={{
          base: 'px-0 w-full',
          trigger: 'px-3 py-2 h-auto data-[hover=true]:bg-default-100',
          content: 'px-3 pb-3 pt-0',
          title: cn(ds.text.caption, 'text-default-500 font-medium'),
          indicator: 'text-default-400',
        }}
      >
        <AccordionItem
          key="args"
          aria-label="Arguments"
          title="Arguments"
          indicator={<ChevronRight className="w-4 h-4" />}
        >
          <div className={cn('rounded-lg p-2 overflow-x-auto', 'bg-default-50 border border-default-100')}>
            <Code size="sm" className="bg-transparent p-0 whitespace-pre-wrap font-mono text-xs">
              {JSON.stringify(toolCall.arguments, null, 2)}
            </Code>
          </div>
        </AccordionItem>

        {hasContent ? (
          <AccordionItem
            key="result"
            aria-label="Result"
            title="Result"
            indicator={<ChevronRight className="w-4 h-4" />}
          >
            <div
              className={cn(
                'rounded-lg p-2 overflow-x-auto',
                toolCall.isError || toolCall.error
                  ? 'bg-danger-50 border border-danger-100 text-danger-900'
                  : 'bg-default-50 border border-default-100',
              )}
            >
              {toolCall.error ? (
                <div className="text-xs font-mono">{toolCall.error}</div>
              ) : (
                <Code size="sm" className="bg-transparent p-0 whitespace-pre-wrap font-mono text-xs">
                  {JSON.stringify(toolCall.structuredContent || toolCall.content, null, 2)}
                </Code>
              )}
            </div>
            {toolCall.status === 'error' && onRetry && (
              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  color="danger"
                  variant="flat"
                  onPress={onRetry}
                  className="min-w-16 h-7 text-xs font-medium"
                >
                  Retry
                </Button>
              </div>
            )}
          </AccordionItem>
        ) : null}
      </Accordion>
    </div>
  )
}
