# AGENTS.md

## Project Overview

This is a research platform for developing LLM-powered AI agents and assistants with complete data sovereignty. It supports multiple AI platforms (Ollama, Anthropic, Azure OpenAI) and provides both a web interface and Jupyter notebook environment for agent development using LangChain/LangGraph.

**Core Architecture**: Local-first design - all GPT configurations, conversations, and user data are stored locally in the browser using localStorage with Zod validation. No external data persistence required.

**Tech Stack**: React 19 + TypeScript + Vite | HeroUI + TailwindCSS 4 | OpenAI SDK + LangChain + LangGraph | Jupyter notebooks with Deno kernel

## Setup Commands

Install dependencies:

```bash
pnpm install
```

Start development server with HMR:

```bash
pnpm dev
```

The dev server runs on `http://localhost:5173` by default.

## Development Workflow

### Starting Development

- Run `pnpm dev` to start Vite dev server with hot module reloading
- Access the app at `http://localhost:5173`
- Changes to React components auto-reload
- TypeScript errors appear in the terminal and browser

### Environment Setup

- No environment variables required by default
- API keys are stored in browser localStorage (user-provided)
- For Jupyter notebooks, ensure Deno is installed: `curl -fsSL https://deno.land/install.sh | sh`

### Import Path Convention

- Always use `@/` alias for src/ directory imports
- Example: `import {cn} from '@/lib/design-system'`
- Never use relative paths like `../../../lib/design-system`

## Testing Instructions

### Run All Tests

```bash
pnpm test           # Run all unit tests
pnpm test:coverage  # Generate coverage reports
```

### Unit Tests (Vitest + React Testing Library)

- Test files located in `__tests__/` directories alongside source files
- Run specific test: `pnpm test -t "test name pattern"`
- Watch mode: `pnpm test --watch`
- Focus on testing context providers and service integrations, not individual functions

### End-to-End Tests (Playwright)

```bash
pnpm test:e2e        # Run all e2e tests headless
pnpm test:e2e:ui     # Run with interactive UI
pnpm test:e2e:debug  # Debug tests step-by-step
pnpm test:e2e:headed # Run with visible browser
```

- Tests use Page Object Model pattern in `tests/e2e/page-objects/`
- Test real user workflows and localStorage persistence

### Visual Regression Tests

```bash
pnpm test:visual        # Compare against baselines
pnpm test:visual:update # Update approved baselines
pnpm test:visual:ui     # Run with interactive UI
```

- Screenshot baselines in `tests/visual/__screenshots__/`
- Only update baselines when intentional UI changes are made

### Accessibility Tests (WCAG 2.1 AA)

```bash
pnpm test:accessibility       # Run accessibility audit
pnpm test:accessibility:ui    # Run with interactive UI
pnpm test:accessibility:debug # Debug failures
```

- Uses @axe-core/playwright for WCAG compliance
- Custom fixtures in `tests/accessibility/fixtures.ts`
- Tests keyboard navigation, screen readers, color contrast

### Before Every Commit

```bash
pnpm lint  # ESLint with auto-fix
pnpm test  # Run unit test suite
```

## Code Style and Conventions

### Critical Patterns

- **Event handlers**: Always prefix with "handle" (e.g., `handleSubmit`, `handleChange`)
- **Early returns**: Prefer early returns over nested conditions for readability
- **Type safety**: Define Zod schemas first, then infer TypeScript types with `z.infer<typeof Schema>`
- **Functional style**: Prefer functional/immutable patterns unless significantly more verbose
- **Minimal changes**: Only modify code related to the task; lines of code = debt

### State Management

- Access state via custom hooks: `useStorage()`, `useOpenAIService()`, `useConversationContext()`
- Never access localStorage directly - always use `StorageProvider` and `useStorage()` hook
- Use React 19 `use()` hook for context consumption with automatic error boundaries

### Error Handling

- Wrap errors in try/catch blocks
- Re-throw errors to allow component-level handling
- Include comprehensive error messages with context
- All service methods must have proper error propagation

### Example Correct Pattern

```typescript
import {cn, ds, compose} from '@/lib/design-system'

const handleSubmit = useCallback(async (data: FormData): Promise<void> => {
  try {
    const validated = FormSchema.parse(data) // Zod validation
    await storageService.saveGPT(validated)
  } catch (error_) {
    console.error('Error saving GPT:', error_)
    throw error_ // Re-throw for component handling
  }
}, [storageService])
```

## Architecture Patterns

### Context Provider Hierarchy

The app uses hierarchical context providers with specific initialization order:

1. `OpenAIProvider` (`src/contexts/openai-provider.tsx`) - API keys and service instances
2. `StorageProvider` (`src/contexts/storage-provider.tsx`) - localStorage and GPT configurations
3. `Providers` (`src/providers.tsx`) - wraps HeroUI, theme providers, ConversationProvider
4. `ConversationProvider` (`src/contexts/conversation-provider.tsx`) - chat state

Always wrap new features in the appropriate provider and access via custom hooks.

### Service Layer Pattern

Services in `src/services/` are stateless classes that:

- Return promises for async operations
- Include comprehensive error messages
- Use exponential backoff for API calls
- Validate inputs with Zod schemas before processing

When adding external integrations, follow this pattern: create a service class, provide it via context, access through custom hooks.

### Type System (Zod-First)

```typescript
// 1. Define Zod schema
export const GPTConfigurationSchema = z.object({
  name: z.string(),
  description: z.string(),
  // ...
})

// 2. Infer TypeScript type
export type GPTConfiguration = z.infer<typeof GPTConfigurationSchema>

// 3. Validate at runtime
const validated = GPTConfigurationSchema.parse(userInput)
```

Always define schemas in `src/types/`, then infer types. Use `.parse()` for validation at boundaries.

## Design System Guidelines

### CRITICAL: Never Hardcode Styles

- ❌ Don't use raw Tailwind classes: `className="bg-white text-black p-6"`
- ✅ Always use design system utilities: `className={compose.card()}`
- ❌ Don't hardcode colors: `className="bg-white"`
- ✅ Use semantic tokens: `className="bg-surface-primary"`

### Design System Imports

```typescript
import {cn, ds, compose, theme} from '@/lib/design-system'
```

### Utility Functions

- **`cn()`**: Combines class names with deduplication via tailwind-merge
- **`ds.*`**: Predefined tokens (cards, buttons, typography, layout, forms, states, animations)
- **`compose.*`**: High-level composition functions (page, card, button patterns)
- **`theme.*`**: Theme-aware utilities (surface, content, border)

### Semantic Color Tokens

Use these instead of hardcoded colors:

- **Surface**: `surface-primary`, `surface-secondary`, `surface-tertiary`, `surface-elevated`
- **Content**: `content-primary`, `content-secondary`, `content-tertiary`, `content-inverse`
- **Border**: `border-default`, `border-subtle`, `border-strong`

### HeroUI Component Library

- Always prefer HeroUI components over custom implementations
- Available components: Button, Card, Input, Modal, Dropdown, etc.
- Import from `@heroui/react`
- Check `.cursor/rules/heroui.mdc` for component-specific patterns

### Accessibility Requirements

- Include ARIA labels for icon buttons: `aria-label="Close dialog"`
- Maintain focus management with visible focus rings
- Use semantic HTML elements
- Ensure 4.5:1 color contrast ratio minimum
- Test with `pnpm test:accessibility` before committing

## Build and Deployment

### Production Build

```bash
pnpm build  # TypeScript compilation + Vite build
```

Build output goes to `dist/` directory with optimized chunking:

- Core libraries (React, Router) in dedicated chunks
- AI libraries (OpenAI, LangChain) bundled separately
- Monaco Editor and UI components in separate chunks
- Chunk size warning limit: 1MB for AI libraries

### Preview Production Build

```bash
pnpm preview  # Serve production build locally
```

### Build Optimization

- Vite uses manual chunking for performance
- Code splitting for lazy-loaded routes
- Tree shaking for unused imports
- Minification and compression enabled

## Notebook Development

### Jupyter Notebooks with Deno Kernel

Notebooks in `notebooks/` use **Deno kernel** for TypeScript development.

**Setup Deno**:

```bash
curl -fsSL https://deno.land/install.sh | sh
```

**Install Deno Jupyter kernel**:

```bash
deno jupyter --install
```

### Notebook Structure

- `notebooks/agents/` - Production agent implementations
- `notebooks/assistants/` - Assistant prototypes
- `notebooks/experiments/` - Research and testing
- `notebooks/research/` - Documentation and analysis
- `notebooks/templates/` - Templates for new agents

### Creating New Agents

1. Start with `notebooks/templates/agent.ipynb`
2. Import types from `src/types/agent.ts`
3. Use Zod validation for all inputs
4. Implement `BaseAgent` interface for cross-platform compatibility
5. Include test cells with proper error handling

### Example Notebook Cell Pattern

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

## Common Pitfalls to Avoid

❌ **Don't access localStorage directly** - Always use `StorageProvider` and `useStorage()` hook

❌ **Don't hardcode colors** - Use semantic tokens (`surface-primary`, `content-primary`, etc.)

❌ **Don't create custom UI components** - Leverage HeroUI component library first

❌ **Don't skip Zod validation** - Parse user inputs and external data at boundaries

❌ **Don't forget error boundaries** - Use React 19 `use()` hook for automatic error handling

❌ **Don't use relative imports** - Always use `@/` alias for src/ directory

❌ **Don't modify unrelated code** - Minimal changes philosophy; only touch relevant sections

❌ **Don't nest conditions deeply** - Prefer early returns for readability

## Pull Request Guidelines

### Before Submitting

1. **Run linting**: `pnpm lint` (auto-fixes issues)
2. **Run unit tests**: `pnpm test`
3. **Run e2e tests**: `pnpm test:e2e`
4. **Check accessibility**: `pnpm test:accessibility` (if UI changes)
5. **Update visual baselines**: `pnpm test:visual:update` (if intentional UI changes)

### Title Format

Use clear, descriptive titles with component/area prefix:

- `[components] Add loading state to GPT editor`
- `[services] Implement retry logic for OpenAI API`
- `[docs] Update agent development guide`

### Required Checks

All PRs must pass:

- ✅ ESLint (no errors or warnings)
- ✅ TypeScript compilation (no type errors)
- ✅ Unit tests (100% passing)
- ✅ E2E tests (critical paths)
- ✅ Accessibility tests (WCAG 2.1 AA for UI changes)

### Commit Message Guidelines

- Use imperative mood: "Add feature" not "Added feature"
- Keep first line under 72 characters
- Include context in body if needed
- Reference issues: `Fixes #123`

## Additional Notes

### Development Philosophy

- **System 2 Thinking**: Break down requirements analytically before implementation
- **Tree of Thoughts**: Evaluate multiple solutions and select the optimal path
- **Minimal Changes**: Modify only code related to the task; avoid cleanup unless instructed

### Technology-Specific Guidelines

Detailed guidelines available in `.cursor/rules/`:

- `react-best-practices.mdc` - React patterns and hooks
- `typescript-best-practices.mdc` - TypeScript conventions
- `design-system.mdc` - Design system usage
- `heroui.mdc` - HeroUI component patterns
- `langchain.mdc` - LangChain/LangGraph best practices
- `zod-best-practices.mdc` - Schema validation patterns

### Performance Considerations

- Lazy load routes with `React.lazy()` and `Suspense`
- Use React 19 `use()` hook for automatic suspense boundaries
- Implement proper loading states with design system utilities
- Optimize bundle size by checking chunk sizes in build output

### Debugging Tips

- Check browser console for React errors and warnings
- Use React DevTools to inspect component state
- Use Playwright UI mode for debugging e2e test failures: `pnpm test:e2e:ui`
- Check localStorage in browser DevTools for persistence issues

### Security Considerations

- API keys stored locally in browser (never in code)
- No sensitive data in repository
- Validate all user inputs with Zod schemas
- Sanitize data before rendering to prevent XSS

### Multi-Platform AI Support

The project supports three AI platforms:

- **Ollama**: Local LLM inference
- **Anthropic**: Claude API integration
- **Azure OpenAI**: Enterprise OpenAI deployment

All platform integrations use the unified service layer pattern in `src/services/openai-service.ts`.
