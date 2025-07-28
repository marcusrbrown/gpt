# GPT AI Coding Instructions

This project is a research platform for developing LLM-powered AI agents and assistants with complete data sovereignty, supporting multiple AI platforms (Ollama, Anthropic, Azure OpenAI). It provides both a web interface and Jupyter notebook environment for agent development using LangChain/LangGraph.

Key architectural principle: **Local-first data architecture** - all GPT configurations, conversations, and user data are stored locally in the browser using localStorage with Zod validation. No external data persistence required.

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

### LangChain/LangGraph Integration
The project leverages LangChain for AI workflows and LangGraph for stateful agent development:
- Use LangGraph for building stateful agents with conversation memory
- Model agent interactions as graphs with nodes (states) and edges (transitions)
- Implement chains using LangChain Expression Language (LCEL) for production deployment
- Follow `.cursor/rules/langchain.mdc` for comprehensive LangChain best practices

---
When adding features, prioritize type safety, follow existing patterns, and maintain the service layer abstraction.
