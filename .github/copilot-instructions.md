# GPT Project - AI Coding Agent Instructions

## Project Overview

This is a TypeScript/React research platform for developing LLM-powered AI agents and assistants. It supports multiple AI platforms (OpenAI, Anthropic, Ollama) and provides both a web interface and Jupyter notebook environment for agent development using LangChain/LangGraph.

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

## Development Workflow

### Commands
- `pnpm dev` - Start development server (Vite)
- `pnpm build` - Production build (TypeScript + Vite)
- `pnpm test` - Run Vitest tests
- `pnpm test:coverage` - Generate test coverage
- `pnpm lint` - ESLint checking

### Testing Pattern
Uses Vitest with React Testing Library. Test files in `__tests__/` directories alongside source files. Focus on testing context providers and service integrations.

### Code Style
Follow `.cursorrules` conventions:
- Prefer early returns over nested conditions
- Use descriptive names with "handle" prefix for event handlers
- Minimize code changes, focus on DRY principles
- Use functional/immutable patterns unless verbose

## AI Integration Patterns

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

## Key Files for Context
- `src/App.tsx` - Main app structure and routing
- `src/contexts/` - State management providers
- `src/services/openai-service.ts` - Core AI integration logic
- `src/types/gpt.ts` - Type definitions and validation schemas
- `package.json` - Dependencies and scripts
