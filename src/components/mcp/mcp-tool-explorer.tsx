import {useMCPTools} from '@/hooks/use-mcp'
import {cn, ds, theme} from '@/lib/design-system'
import {Accordion, AccordionItem, Chip} from '@heroui/react'

interface MCPToolExplorerProps {
  serverId: string
}

export function MCPToolExplorer({serverId}: MCPToolExplorerProps) {
  const tools = useMCPTools(serverId)

  if (tools.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-default-200 rounded-lg">
        <p className={cn(ds.text.body.large, 'text-default-500 font-medium')}>No Tools Available</p>
        <p className={cn(ds.text.body.small, 'text-default-400 max-w-xs mt-1')}>
          This server doesn't expose any tools, or hasn't finished discovering capabilities yet.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className={cn(ds.text.heading.h4)}>Available Tools</h3>
        <Chip size="sm" variant="flat">
          {tools.length} Tools
        </Chip>
      </div>

      <Accordion variant="splitted" className="px-0">
        {tools.map(tool => (
          <AccordionItem
            key={tool.name}
            aria-label={tool.name}
            title={
              <div className="flex items-center gap-2">
                <span className="font-mono font-medium">{tool.name}</span>
              </div>
            }
            subtitle={
              <span className="text-default-500 text-sm truncate max-w-md block">
                {tool.description || 'No description provided'}
              </span>
            }
            classNames={{
              base: cn(theme.surface(1), 'border', theme.border()),
              title: 'text-sm',
              content: 'text-sm text-default-600',
            }}
          >
            <div className="flex flex-col gap-4 pb-2">
              {tool.description && (
                <div>
                  <h4 className="text-xs font-semibold text-default-500 uppercase tracking-wider mb-1">Description</h4>
                  <p>{tool.description}</p>
                </div>
              )}

              <div>
                <h4 className="text-xs font-semibold text-default-500 uppercase tracking-wider mb-1">Input Schema</h4>
                <div className="bg-default-50 rounded-lg p-3 border border-default-100 overflow-x-auto">
                  <pre className="text-xs font-mono text-default-700">{JSON.stringify(tool.inputSchema, null, 2)}</pre>
                </div>
              </div>
            </div>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
