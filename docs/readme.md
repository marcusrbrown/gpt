# GPT Agent Documentation System

A comprehensive documentation system that combines traditional API documentation with interactive notebooks for experimenting with and extending GPT agents.

## Directory Structure

```
docs/
├── api/          # API reference documentation
├── guides/       # Step-by-step guides and tutorials
├── examples/     # Code examples and use cases
└── research/     # Academic papers and research findings

notebooks/
├── tutorials/    # Interactive tutorial notebooks
├── research/     # Research-focused notebooks
└── experiments/  # Experimental notebooks
```

## Features

- **Interactive Notebooks**: Live code execution environment for experimenting with GPT agents
- **API Documentation**: Comprehensive API reference with type information
- **Research Integration**: Academic papers with accompanying code examples
- **Tutorial System**: Step-by-step guides with executable code
- **Dark Mode Support**: Full dark mode support for better readability

## Development

### Prerequisites

- Node.js 18+
- pnpm

### Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Start the development server:

   ```bash
   pnpm dev
   ```

3. Build the documentation:
   ```bash
   pnpm build
   ```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Add or update documentation
4. Create a pull request

## Writing Documentation

### Interactive Notebooks

Interactive notebooks are React components that combine markdown and executable code cells. To create a new notebook:

1. Create a new `.tsx` file in the appropriate directory
2. Import the `InteractiveNotebook` component
3. Define your cells with markdown and code
4. Add any necessary execution handlers

Example:

```tsx
import { InteractiveNotebook } from '@/components/docs/interactive-notebook';

const CELLS = [
  {
    id: '1',
    type: 'markdown',
    content: '# My Tutorial\n\nLet\'s learn about...'
  },
  {
    id: '2',
    type: 'code',
    content: 'console.log("Hello, World!");'
  }
];

export function MyTutorial() {
  return <InteractiveNotebook initialCells={CELLS} />;
}
```

### API Documentation

API documentation should follow these guidelines:

1. Use TypeScript for type information
2. Include example code
3. Document all parameters and return types
4. Provide real-world use cases
5. Include error handling examples

## License

MIT
