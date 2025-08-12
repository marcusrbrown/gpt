# GPT AI Coding Instructions

This project is a research platform for developing LLM-powered AI agents and assistants with complete data sovereignty, supporting multiple AI platforms (Ollama, Anthropic, Azure OpenAI). It provides both a web interface and Jupyter notebook environment for agent development using LangChain/LangGraph.

Key architectural principle: **Local-first data architecture** - all GPT configurations, conversations, and user data are stored locally in the browser using localStorage with Zod validation. No external data persistence required.

## Architecture Patterns

### Context Provider Pattern
The app uses a hierarchical context provider pattern for state management with specific initialization order:
- `OpenAIProvider` (`src/contexts/openai-provider.tsx`) - manages API keys and service instances
- `StorageProvider` (`src/contexts/storage-provider.tsx`) - handles local storage and GPT configurations
- `Providers` (`src/providers.tsx`) - wraps HeroUI, theme providers, and ConversationProvider
- `ConversationProvider` (`src/contexts/conversation-provider.tsx`) - manages chat state

Always wrap new features requiring state in the appropriate provider and access via custom hooks like `useOpenAIService()`, `useStorage()`, or `useConversationContext()`. Use the React 19 `use()` hook for context consumption with automatic error boundaries.

### Service Layer Abstraction
The `src/services/` directory contains abstracted service classes:
- `openai-service.ts` - OpenAI API abstraction with error handling and type safety
- `storage.ts` - localStorage wrapper with JSON serialization

When adding new external integrations, follow this pattern: create a service class, provide it via context, and access through custom hooks.

### Type System with Runtime Validation
Uses Zod schemas in `src/types/` for both TypeScript types and runtime validation:
```typescript
// Example from src/types/gpt.ts
export const GPTConfigurationSchema = z.object({
  name: z.string(),
  description: z.string(),
  // ...
})
export type GPTConfiguration = z.infer<typeof GPTConfigurationSchema>
```

Always define Zod schemas first, then infer TypeScript types. Use `.parse()` for validation at runtime.

## Component Architecture

### Key Components
- **Form Components**: Large forms use controlled components with validation state.
- **Code Editor**: Monaco Editor integration for code editing.
- **Error Boundaries**: Error boundaries for graceful failure handling.

### Lazy Loading Pattern
Components are lazy-loaded for performance (see `src/App.tsx`):
```typescript
const DocLayout = lazy(async () => import('@/components/docs/doc-layout').then(m => ({default: m.DocLayout})))
```

### HeroUI Component Library
Uses HeroUI components with custom theming via `next-themes`. Prefer HeroUI components over custom implementations for consistency.

### Route Structure
- `/` - Home page with GPT cards
- `/gpt/new` - GPT editor for creation
- `/gpt/edit/:gptId` - GPT editor for existing GPTs
- `/gpt/test/:gptId` - Testing interface for GPTs
- `/docs/*` - Documentation pages

## Key Directories

- `src/components/`: Reusable UI components, notably `gpt-editor.tsx` for the main GPT editor
- `src/contexts/`: React context providers for global state
- `src/hooks/`: Custom hooks for state management and service access
- `src/types/`: Zod schemas and TypeScript type definitions
- `src/services/`: API integrations and data persistence
- `notebooks/`: Jupyter notebooks for agent development and research
- `.cursor/rules/`: Technology-specific coding guidelines

## Essential Development Patterns

### Error Handling Strategy
All providers use consistent error handling with state management:
```tsx
const saveGPT = useCallback((gpt: GPTConfiguration): void => {
  try {
    storageService.saveGPT(gpt)
    setVersion(v => v + 1) // Trigger re-render
  } catch (error_) {
    console.error('Error saving GPT:', error_)
    setError(error_ instanceof Error ? error_ : new Error('Failed to save GPT'))
    throw error_ // Re-throw to allow component to handle the error
  }
}, [storageService])
```

### React 19 Hook Usage
Use `use()` hook for context consumption with automatic error boundaries:
```tsx
export function ConversationProvider({children}: ConversationProviderProps) {
  const storageContext = use(StorageContext) // Automatic error boundary
  // ... rest of component
}
```

### Service Layer Pattern
Services are stateless classes with error handling and retry logic:
- Return promises for async operations
- Include comprehensive error messages with context
- Use exponential backoff for API calls
- Validate inputs with Zod schemas before processing

## Design System & UI Patterns

The project uses a sophisticated design system built on TailwindCSS, HeroUI, and custom utility functions. Always follow these patterns:

### Design System Utilities (`src/lib/design-system.ts`)
The project provides powerful composition helpers and utility functions:
- **`cn()`**: Combines class names with deduplication via `tailwind-merge`
- **`ds` object**: Predefined design tokens for cards, buttons, typography, layout, forms, states, animations, and focus
- **`responsive` object**: Responsive patterns for grids, typography, and spacing
- **`compose` helpers**: High-level composition functions for common patterns
- **`theme` functions**: Theme-aware utilities for surfaces, content, and borders

```tsx
import {cn, ds, compose, theme} from '@/lib/design-system'

// Use composition helpers for common patterns
<div className={compose.page()}>
  <Card className={compose.card('mb-6')}>
    <h2 className={ds.text.heading.h2}>Title</h2>
    <p className={ds.text.body.base}>Content</p>
  </Card>
</div>

// Use responsive patterns
<div className={ds.layout.cardGrid}>
  {/* Cards automatically responsive */}
</div>
```

### Component Architecture
- **HeroUI First**: Use HeroUI components as the primary building blocks (`Button`, `Card`, `Input`, etc.)
- **Design System Layer**: Prefer design system utilities over custom classes
- **Consistent Spacing**: Follow the 4px-based spacing scale (1, 2, 3, 4, 6, 8, 12, 16)
- **Typography Scale**: Use `ds.text.heading.*` and `ds.text.body.*` utilities

### Color Usage & CSS Custom Properties
The project uses CSS custom properties for semantic color tokens that support both light and dark themes:

```tsx
// ✅ Good - using semantic tokens
<div className="bg-surface-secondary text-content-primary border-border-default">

// ✅ Also good - using theme utilities
<div className={cn(theme.surface(1), theme.content('primary'), theme.border())}>

// ❌ Avoid - hardcoded colors
<div className="bg-white text-black border-gray-200">
```

Available semantic tokens:
- **Surface**: `surface-primary`, `surface-secondary`, `surface-tertiary`, `surface-elevated`
- **Content**: `content-primary`, `content-secondary`, `content-tertiary`, `content-inverse`
- **Border**: `border-default`, `border-subtle`, `border-strong`

### Component Patterns
```tsx
// Standard card pattern using design system utilities
<Card className={compose.card()}>
  <CardHeader className="pb-4">
    <h3 className={ds.text.heading.h3}>{title}</h3>
  </CardHeader>
  <CardBody>
    <p className={ds.text.body.base}>{description}</p>
  </CardBody>
</Card>

// Interactive card with state handling
<Card className={cn(ds.card.base, ds.card.interactive, ds.animation.transition, 'p-6')}>
  {/* Card content */}
</Card>

// Button hierarchy with design system
<Button color="primary" variant="solid">Primary Action</Button>
<Button color="primary" variant="bordered">Secondary</Button>
<Button color="default" variant="light">Tertiary</Button>
<Button color="danger" variant="solid">Destructive</Button>
```

### Theme Integration
The project uses a three-layer theming system:
1. **HeroUI**: Base component theming with brand color integration
2. **next-themes**: System/manual theme switching
3. **CSS Custom Properties**: Semantic tokens that adapt to theme changes

Theme setup in `src/providers.tsx` with automatic theme detection and proper SSR handling.

### Responsive Design
- Use mobile-first approach with `sm:`, `md:`, `lg:`, `xl:` breakpoints
- Implement responsive grids: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Ensure proper spacing on all screen sizes

### Accessibility Requirements
- Include proper ARIA labels for icon buttons: `aria-label="Close dialog"`
- Maintain focus management with visible focus rings
- Use semantic HTML elements and proper heading hierarchy
- Ensure 4.5:1 color contrast ratio minimum

### Loading & Error States
```tsx
// Loading states with design system
<Button isLoading color="primary" className={ds.animation.transition}>Save Changes</Button>
<div className={cn(ds.state.loading, 'flex justify-center p-8')}>
  <Spinner size="lg" color="primary" />
</div>

// Error states using state utilities
<Input isInvalid={hasError} errorMessage="This field is required"
       className={cn(hasError && ds.state.error)} />

// Empty states with composition helper
<div className={ds.state.empty}>
  <Icon className="mx-auto h-12 w-12 text-content-tertiary mb-4" />
  <h3 className={ds.text.heading.h4}>No items found</h3>
  <p className={cn(ds.text.body.base, 'mb-6')}>Get started by creating your first item.</p>
  <Button color="primary">Create Item</Button>
</div>
```

### Migration Guidelines
When updating existing components:
1. **Import Design System**: Add `import {cn, ds, compose, theme} from '@/lib/design-system'`
2. **Replace Custom Classes**: Use design system utilities instead of hardcoded Tailwind classes
3. **Apply Semantic Tokens**: Replace CSS custom properties with semantic token classes
4. **Use Composition Helpers**: Leverage `compose.*` functions for common patterns
5. **Implement Standard States**: Use `ds.state.*` utilities for loading, error, and empty states
6. **Add Type Safety**: Ensure proper TypeScript types and Zod validation

Example migration:
```tsx
// Before
<div className="bg-white text-black border-gray-200 p-6 rounded-lg shadow-sm hover:shadow-md transition-all">

// After
<div className={compose.card('hover:shadow-md')}>
```

## Development Workflow

### Build System
Vite configuration includes optimized manual chunking for performance:
- Core libraries (React, Router) are separated into dedicated chunks
- AI libraries (OpenAI, LangChain) are bundled separately
- Monaco Editor and UI components have their own chunks
- Chunk size warning limit increased to 1MB for AI libraries

### Commands
- `pnpm dev` - Start Vite development server with HMR
- `pnpm build` - Production build (TypeScript + Vite) with optimized chunking
- `pnpm test` - Run Vitest unit test suite
- `pnpm test:coverage` - Generate test coverage reports
- `pnpm test:e2e` - Run Playwright end-to-end tests
- `pnpm test:e2e:ui` - Run E2E tests with interactive UI
- `pnpm test:e2e:debug` - Debug E2E tests step-by-step
- `pnpm test:visual` - Run Playwright visual regression tests
- `pnpm test:visual:update` - Update visual test baselines
- `pnpm test:visual:ui` - Run visual tests with interactive UI
- `pnpm test:accessibility` - Run comprehensive accessibility tests
- `pnpm test:accessibility:ui` - Run accessibility tests with interactive UI
- `pnpm test:accessibility:debug` - Debug accessibility test failures
- `pnpm lint` - ESLint with auto-fix capability
- `pnpm fix` - Apply code fixes using ESLint

### File Patterns
- Components: Use HeroUI imports, functional components with hooks
- Services: Return `Promise<Result>` with proper error handling
- Types: Define Zod schema first, then infer TypeScript types
- Tests: Co-located in `__tests__/` directories alongside source files

### Testing Pattern
Uses a comprehensive testing strategy with Vitest, Playwright, and accessibility testing:

#### Unit Testing
- **Vitest** with React Testing Library for component and utility testing
- Test files in `__tests__/` directories alongside source files
- Focus on context providers and service integrations rather than individual functions
- Mock providers and test hooks in isolation using wrapper components

#### End-to-End Testing
- **Playwright** for browser automation and user workflow testing
- Page Object Model pattern in `tests/e2e/page-objects/`
- Test real user interactions and data persistence

#### Visual Regression Testing
- **Playwright** screenshot comparison with approved baselines
- Dedicated configuration in `playwright-visual.config.ts`
- Tests in `tests/visual/` with custom fixtures and utilities
- Ensures UI consistency across updates and releases

#### Accessibility Testing
- **@axe-core/playwright** integration for WCAG compliance
- Comprehensive test suite in `tests/accessibility/`
- Custom fixtures extend base Playwright tests with accessibility utilities
- Tests keyboard navigation, screen reader compatibility, and color contrast

Key testing patterns:
- **Context Testing**: Mock providers and test hooks in isolation using wrapper components
- **Service Integration**: Focus on testing context providers and service integrations rather than individual functions
- **Error Boundaries**: Test error states by suppressing console.error during error scenario tests
- **Persistence Testing**: Verify localStorage interactions across component unmount/remount cycles
- **Storage Quota Testing**: Test localStorage quota exceeded scenarios with proper error handling
- **Provider Initialization**: Test context provider lifecycle and error states with proper cleanup
- **Accessibility Testing**: Use custom fixtures with page objects for comprehensive WCAG compliance testing
- **Visual Testing**: Leverage Playwright's screenshot comparison for UI consistency validation

Example accessibility test pattern:
```tsx
import {test, expect} from '../accessibility/fixtures'

test.describe('Component Accessibility', () => {
  test('should meet WCAG 2.1 AA standards', async ({page, homePage}) => {
    await homePage.goto()
    await homePage.runAccessibilityAudit()
    // Custom accessibility assertions and reporting
  })
})
```

Example context provider test:
```tsx
function TestComponent() {
  const {getAllGPTs, saveGPT} = useStorage()
  return (
    <div>
      <div data-testid="gpt-count">{getAllGPTs().length}</div>
      <button onClick={() => saveGPT(mockGPT)}>Add GPT</button>
    </div>
  )
}

it('should persist state across renders', async () => {
  const {unmount} = render(
    <StorageProvider><TestComponent /></StorageProvider>
  )
  // Add data, unmount, remount, verify persistence
})

it('should handle quota exceeded errors', () => {
  const originalSetItem = localStorage.setItem
  localStorage.setItem = vi.fn().mockImplementation(() => {
    throw new Error('QuotaExceededError')
  })

  expect(() => storageService.saveGPT(mockGPT)).toThrow('QuotaExceededError')
  localStorage.setItem = originalSetItem
})
```

### Code Style
Follow `.cursorrules` conventions prioritizing simplicity and maintainability:
- **Early Returns**: Prefer early returns over nested conditions for readability
- **Descriptive Names**: Use "handle" prefix for event handlers (handleSubmit, handleChange)
- **Minimal Changes**: Focus on DRY principles, modify only code related to the task
- **Functional Style**: Use functional/immutable patterns unless verbose
- **Error Handling**: All service methods include comprehensive try/catch with proper error propagation

## AI Integration Patterns

- GPT configurations support capabilities: code interpreter, web browsing, file search
- Vector stores and file uploads handled through OpenAI service
- Conversation state persists locally with export/import functionality

### OpenAI Service Usage
Access OpenAI functionality through the service layer:
```typescript
const {service} = useOpenAIService()
const response = await service.createChatCompletion(messages, gptConfig)
```

### GPT Configuration
GPT configs stored in localStorage with Zod validation. Use `useStorage()` hook for CRUD operations on GPT configurations.

### Conversation Management
Conversations are managed through the `ConversationProvider` context:
```typescript
const {createConversation, addMessage, currentConversation} = useConversationContext()
// Conversations are automatically persisted to localStorage per GPT
const conversation = await createConversation(gptId, "Initial message")
```

### Notebook Integration
Jupyter notebooks in `notebooks/` directory use Deno kernel for TypeScript development. Templates available in `notebooks/templates/`. Notebooks follow this structure:
- `notebooks/agents/` - Production agent implementations
- `notebooks/assistants/` - Assistant prototypes
- `notebooks/experiments/` - Research and testing
- `notebooks/research/` - Documentation and analysis

#### Notebook Development Workflow
1. **Use Template**: Start with `notebooks/templates/agent.ipynb` for new agents
2. **Deno Integration**: Notebooks run TypeScript directly with Deno kernel
3. **Type Safety**: Import types from `src/types/agent.ts` and use Zod validation
4. **Platform Agnostic**: Implement BaseAgent interface for cross-platform compatibility
5. **Testing**: Include test cells with proper error handling and validation

Example notebook cell pattern:
```typescript
import { z } from 'zod';
import { BaseAgent, AgentResponse, Platform } from '../../../src/types/agent';

const ConfigSchema = z.object({
  platform: z.nativeEnum(Platform),
  model: z.string(),
  temperature: z.number().min(0).max(1),
});

class MyAgent implements BaseAgent {
  async process(input: string): Promise<AgentResponse> {
    // Implementation with proper error handling
    return { success: true, result: 'Processed' };
  }
}
```

#### Interactive Notebook Components
React components in `src/components/docs/` provide notebook-like experiences in the web interface:
- `InteractiveNotebook` - Renders markdown and code cells with execution
- `getting-started.tsx` - Tutorial notebook component
- `agent-tutorial.tsx` - Agent development guide

Use these components for documentation that combines explanatory text with executable code examples.

### LangChain/LangGraph Integration
The project leverages LangChain for AI workflows and LangGraph for stateful agent development:
- Use LangGraph for building stateful agents with conversation memory
- Model agent interactions as graphs with nodes (states) and edges (transitions)
- Implement chains using LangChain Expression Language (LCEL) for production deployment
- Follow `.cursor/rules/langchain.mdc` for comprehensive LangChain best practices

---
When adding features, prioritize type safety, follow existing patterns, and maintain the service layer abstraction.
