import {InteractiveNotebook} from './interactive-notebook'

const INITIAL_CELLS = [
  {
    id: '1',
    type: 'markdown' as const,
    content:
      '# Creating Your First GPT Agent\n\nThis tutorial will guide you through creating a simple GPT agent using our framework.',
  },
  {
    id: '2',
    type: 'code' as const,
    content: `import { createAgent } from '@gpt/core';

const agent = createAgent({
  name: 'SimpleAgent',
  description: 'A simple agent that can respond to basic queries',
  capabilities: ['text-generation'],
});

// Test the agent
const response = await agent.respond('Hello, how are you?');
console.log(response);`,
  },
]

export function AgentTutorial() {
  const handleExecute = async (cell: {content: string}) => {
    // In a real implementation, this would execute the code in a sandbox
    // and return the result. For now, we'll just return a mock response.
    await new Promise(resolve => setTimeout(resolve, 500)) // Simulate execution time
    // eslint-disable-next-line no-console -- Tutorial demonstration code
    console.log('Executing cell:', cell.content)
    return 'Hello! I am doing well. How can I assist you today?'
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Interactive Agent Tutorial</h1>
      <p className="mb-6 text-content-secondary">
        Experiment with the code below to learn how to create and interact with GPT agents. Each code cell is fully
        editable and executable.
      </p>

      <InteractiveNotebook initialCells={INITIAL_CELLS} onExecute={handleExecute} />
    </div>
  )
}
