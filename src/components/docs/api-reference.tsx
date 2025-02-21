import {InteractiveNotebook} from './interactive-notebook';

const INITIAL_CELLS = [
  {
    id: '1',
    type: 'markdown' as const,
    content: `# API Reference

This is the complete API reference for the GPT Agent Framework.

## Core Concepts

### Agent

The main class for creating and managing AI agents.

\`\`\`typescript
interface AgentConfig {
  name: string;
  description: string;
  model: string;
  temperature?: number;
  capabilities: string[];
  maxTokens?: number;
  systemPrompt?: string;
}

class Agent {
  constructor(config: AgentConfig);
  chat(message: string): Promise<string>;
  analyze(text: string): Promise<Analysis>;
  remember(key: string, value: any): void;
  recall(key: string): any;
}
\`\`\`

## Example Usage`,
  },
  {
    id: '2',
    type: 'code' as const,
    content: `import { createAgent } from '@gpt/core';

// Create a new agent
const agent = createAgent({
  name: 'CodeReviewer',
  description: 'An agent that reviews code and suggests improvements',
  model: 'gpt-4',
  capabilities: ['code-analysis', 'memory'],
});

// Use the agent to analyze code
const analysis = await agent.analyze(\`
function add(a, b) {
  return a + b;
}
\`);

console.log(analysis);`,
  },
  {
    id: '3',
    type: 'markdown' as const,
    content: `## Advanced Features

### Memory System

Agents can maintain state and remember information across interactions:

\`\`\`typescript
interface Memory {
  store(key: string, value: any): void;
  retrieve(key: string): any;
  forget(key: string): void;
  clear(): void;
}
\`\`\`

### Capabilities

Agents can be extended with various capabilities:

- \`text-generation\`: Basic text generation and chat
- \`code-analysis\`: Code review and analysis
- \`memory\`: State persistence across interactions
- \`search\`: Web search and information retrieval
- \`tool-use\`: Use of external tools and APIs`,
  },
];

export function ApiReference() {
  const handleExecute = async () => {
    // In a real implementation, this would execute the code in a sandbox
    await new Promise((resolve) => setTimeout(resolve, 500));
    return `Analysis Results:
- Function is simple and well-named
- Consider adding type annotations
- Add input validation
- Add JSDoc comments for better documentation

Suggested Improvement:
/**
 * Adds two numbers together
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {number} The sum of a and b
 */
function add(a: number, b: number): number {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new Error('Arguments must be numbers');
  }
  return a + b;
}`;
  };

  return (
    <div className='max-w-4xl mx-auto'>
      <InteractiveNotebook initialCells={INITIAL_CELLS} onExecute={handleExecute} />
    </div>
  );
}
