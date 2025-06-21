import {InteractiveNotebook} from './interactive-notebook'

const INITIAL_CELLS = [
  {
    id: '1',
    type: 'markdown' as const,
    content: `# Getting Started with GPT Agents

Welcome to the GPT Agent Framework! This guide will help you get started with building your own AI agents.

## Prerequisites

Before you begin, make sure you have:
- Node.js 18 or higher installed
- pnpm package manager
- Basic understanding of TypeScript and React
- API keys for the LLM providers you plan to use

## Installation

First, create a new project using our starter template:`,
  },
  {
    id: '2',
    type: 'code' as const,
    content: `pnpm create gpt-agent my-agent
cd my-agent
pnpm install`,
  },
  {
    id: '3',
    type: 'markdown' as const,
    content: `## Basic Agent Creation

Let's create your first agent. We'll start with a simple conversational agent:`,
  },
  {
    id: '4',
    type: 'code' as const,
    content: `import { createAgent, type AgentConfig } from '@gpt/core';

const config: AgentConfig = {
  name: 'MyFirstAgent',
  description: 'A simple conversational agent',
  model: 'gpt-4',
  temperature: 0.7,
  capabilities: ['chat', 'memory'],
};

const agent = createAgent(config);

// Test the agent
const response = await agent.chat('Hello! Can you help me learn about AI agents?');
console.log(response);`,
  },
]

export function GettingStarted() {
  const handleExecute = async () => {
    // In a real implementation, this would execute the code in a sandbox
    await new Promise(resolve => setTimeout(resolve, 500))
    return "Hello! I'd be happy to help you learn about AI agents. What specific aspects would you like to explore?"
  }

  return (
    <div className="max-w-4xl mx-auto">
      <InteractiveNotebook initialCells={INITIAL_CELLS} onExecute={handleExecute} />
    </div>
  )
}
