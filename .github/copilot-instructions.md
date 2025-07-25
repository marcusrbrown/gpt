# GPT AI Coding Instructions

This project is a research platform for developing LLM-powered AI agents and assistants with data sovereignty, supporting multiple AI platforms (Ollama, Anthropic, Azure OpenAI). It provides both a web interface and Jupyter notebook environment for agent development using LangChain/LangGraph.

## Architecture Patterns

### Context Provider Pattern
The app uses a hierarchical context provider pattern for state management:
- `OpenAIProvider` (`src/contexts/openai-provider.tsx`) - manages API keys and service instances
- `StorageProvider` (`src/contexts/storage-provider.tsx`) - handles local storage and GPT configurations
- `ConversationProvider` (`src/contexts/conversation-provider.tsx`) - manages chat state

Always wrap new features requiring state in the appropriate provider and access via custom hooks like `useOpenAIService()` or `useStorage()`.

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

## Design System & UI Patterns

The project uses a comprehensive design system built on TailwindCSS and HeroUI. Always follow these patterns:

### Component Architecture
- **HeroUI First**: Use HeroUI components as the primary building blocks (`Button`, `Card`, `Input`, etc.)
- **Semantic Tokens**: Use design system color tokens instead of hardcoded values
- **Consistent Spacing**: Follow the 4px-based spacing scale (1, 2, 3, 4, 6, 8, 12, 16)
- **Typography Scale**: Use the standardized font sizes and maintain proper hierarchy

### Color Usage
```tsx
// ✅ Good - using semantic tokens
<div className="bg-surface-secondary text-content-primary border-border-default">

// ❌ Avoid - hardcoded colors
<div className="bg-white text-black border-gray-200">
```

### Component Patterns
```tsx
// Standard card pattern
<Card className="p-6 shadow-sm hover:shadow-md transition-all">
  <CardHeader className="pb-4">
    <h3 className="text-xl font-semibold text-content-primary">{title}</h3>
  </CardHeader>
  <CardBody>
    <p className="text-content-secondary">{description}</p>
  </CardBody>
</Card>

// Button hierarchy
<Button color="primary" variant="solid">Primary Action</Button>
<Button color="primary" variant="bordered">Secondary</Button>
<Button color="default" variant="light">Tertiary</Button>
<Button color="danger" variant="solid">Destructive</Button>
```

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
// Loading states
<Button isLoading color="primary">Save Changes</Button>
<Spinner size="lg" color="primary" />

// Error states
<Input isInvalid={hasError} errorMessage="This field is required" />

// Empty states
<div className="text-center py-12">
  <Icon className="mx-auto h-12 w-12 text-content-tertiary mb-4" />
  <h3 className="text-lg font-medium text-content-primary mb-2">No items found</h3>
  <p className="text-content-secondary mb-6">Get started by creating your first item.</p>
  <Button color="primary">Create Item</Button>
</div>
```

### Migration Guidelines
When updating existing components:
1. Replace CSS custom properties (`--text-primary`) with semantic tokens (`text-content-primary`)
2. Migrate custom classes to HeroUI components where possible
3. Apply consistent spacing using the design system scale
4. Ensure all states (loading, error, empty) follow the standard patterns
5. Add proper TypeScript types and Zod validation

## Development Workflow

### Commands
- `pnpm dev` - Start Vite development server
- `pnpm build` - Production build (TypeScript + Vite)
- `pnpm test` - Run Vitest test suite
- `pnpm test:coverage` - Generate test coverage
- `pnpm lint` - ESLint with auto-fix capability
- `pnpm fix` - Apply code fixes using ESLint

### File Patterns
- Components: Use HeroUI imports, functional components with hooks
- Services: Return `Promise<Result>` with proper error handling
- Types: Define Zod schema first, then infer TypeScript types
- Tests: Co-located in `__tests__/` directories

### Testing Pattern
Uses Vitest with React Testing Library. Test files in `__tests__/` directories alongside source files. Focus on testing context providers and service integrations.

### Code Style
Follow `.cursorrules` conventions:
- Prefer early returns over nested conditions
- Use descriptive names with "handle" prefix for event handlers
- Minimize code changes, focus on DRY principles
- Use functional/immutable patterns unless verbose.

## AI Integration Patterns

- GPT configurations support capabilities: code interpreter, web browsing, file search
- Vector stores and file uploads handled through OpenAI service
- Conversation state persists locally with export/import functionality

### OpenAI Service Usage
Access OpenAI functionality through the service layer:
```typescript
const { service } = useOpenAIService()
const response = await service.createChatCompletion(messages, gptConfig)
```

### GPT Configuration
GPT configs stored in localStorage with Zod validation. Use `useStorage()` hook for CRUD operations on GPT configurations.

### Notebook Integration
Jupyter notebooks in `notebooks/` directory use Deno kernel for TypeScript development. Templates available in `notebooks/templates/`.

---
When adding features, prioritize type safety, follow existing patterns, and maintain the service layer abstraction.
