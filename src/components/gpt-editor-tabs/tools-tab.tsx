import type {GPTConfiguration, MCPTool} from '@/types/gpt'
import {ToolsConfiguration} from '@/components/tools-configuration'
import {responsive} from '@/lib/design-system'

interface ToolsTabProps {
  gpt: GPTConfiguration
  onUpdate: (updates: Partial<GPTConfiguration>) => void
  errors: Record<string, any>
}

export function ToolsTab({gpt, onUpdate, errors}: ToolsTabProps) {
  const handleAddTool = () => {
    const newTool: MCPTool = {
      name: '',
      description: '',
      schema: {},
      endpoint: '',
    }

    onUpdate({tools: [...gpt.tools, newTool]})
  }

  const handleRemoveTool = (index: number) => {
    onUpdate({tools: gpt.tools.filter((_, i) => i !== index)})
  }

  const handleToolChange = (index: number, field: keyof MCPTool, value: MCPTool[keyof MCPTool]) => {
    onUpdate({
      tools: gpt.tools.map((tool, i) => (i === index ? {...tool, [field]: value} : tool)),
    })
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4">
      <h2 className={responsive.heading.medium}>Tools Configuration</h2>
      <ToolsConfiguration
        tools={gpt.tools}
        errors={{tools: errors.tools}}
        onAddTool={handleAddTool}
        onRemoveTool={handleRemoveTool}
        onToolChange={handleToolChange}
      />
    </div>
  )
}
