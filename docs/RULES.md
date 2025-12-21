# RULES.md - GPT Platform Development Guidelines

<!-- prettier-ignore-start -->

**Version:** 1.0
**Last Updated:** December 20, 2025
**Source:** PRD v2.0, Features List v1.0, Codebase Analysis

<!-- prettier-ignore-end -->

---

## 1. Project Overview

This is a **local-first GPT creation platform** enabling technical users to create, customize, and use AI assistants with complete data sovereignty. The platform supports multiple LLM providers (OpenAI, Anthropic, Ollama) while keeping all data locally controlled.

### Core Principles

1. **Local-First**: All data stored locally; zero data sent to non-user-selected endpoints
2. **Privacy by Default**: API keys encrypted; no telemetry without consent
3. **Offline Capable**: Core features work fully offline after initial load
4. **Provider Agnostic**: Abstract LLM providers; no vendor lock-in
5. **Accessible**: WCAG 2.1 AA compliance is mandatory

---

## 2. Technology Stack

### Required Versions

| Technology  | Version | Purpose                   |
| ----------- | ------- | ------------------------- |
| React       | 19.x    | UI framework              |
| TypeScript  | 5.9+    | Type safety               |
| Vite        | 7.x     | Build tool                |
| HeroUI      | 2.8+    | Component library         |
| TailwindCSS | 4.x     | Styling                   |
| Zod         | 4.x     | Runtime validation        |
| Vitest      | 4.x     | Unit testing              |
| Playwright  | 1.57+   | E2E/accessibility testing |
| pnpm        | 10.x    | Package manager           |

### AI/LLM Stack

| Package              | Version | Purpose            |
| -------------------- | ------- | ------------------ |
| @langchain/core      | 1.1+    | LLM abstraction    |
| @langchain/openai    | 1.2+    | OpenAI provider    |
| @langchain/anthropic | 1.3+    | Anthropic provider |
| @langchain/langgraph | 1.0+    | Agent workflows    |
| openai               | 6.x     | OpenAI SDK         |

### Storage Architecture (CRITICAL)

```
MUST USE: IndexedDB with Dexie.js wrapper for structured data
MUST NOT USE: localStorage for:
  - GPT configurations
  - Conversations/messages
  - Knowledge files
  - API keys or secrets

localStorage is ONLY permitted for:
  - User preferences (theme, locale)
  - Non-sensitive UI state
```

---

## 3. Naming Conventions

### Files

| Type       | Convention               | Example                                   |
| ---------- | ------------------------ | ----------------------------------------- |
| Components | kebab-case               | `card.tsx`, `gpt-editor.tsx`              |
| Hooks      | kebab-case, use- prefix  | `use-storage.ts`, `use-openai-service.ts` |
| Tests      | kebab-case + .test/.spec | `card.test.tsx`, `home.spec.ts`           |
| Types      | kebab-case               | `gpt.ts`, `agent.ts`                      |
| Services   | kebab-case               | `openai-service.ts`, `storage.ts`         |

### Code

| Type             | Convention               | Example                                |
| ---------------- | ------------------------ | -------------------------------------- |
| Components       | PascalCase               | `GPTEditor`, `UserGPTCard`             |
| Hooks            | camelCase, use prefix    | `useStorage`, `useOpenAIService`       |
| Functions        | camelCase                | `handleSubmit`, `createConfig`         |
| Event handlers   | camelCase, handle prefix | `handleClick`, `handleSave`            |
| Variables        | camelCase                | `isLoading`, `gptConfig`               |
| Constants        | UPPER_SNAKE_CASE         | `ACCEPTED_FILE_TYPES`, `MAX_FILE_SIZE` |
| Types/Interfaces | PascalCase               | `GPTConfiguration`, `ProviderConfig`   |
| Zod Schemas      | PascalCase + Schema      | `GPTConfigurationSchema`               |
| Error variables  | error\_ prefix           | `error_validation`, `error_network`    |

---

## 4. Folder Structure

```
src/
├── components/           # React components
│   ├── __tests__/       # Component unit tests
│   ├── [feature]/       # Feature-specific subdirectories
│   └── *.tsx            # Shared components
├── contexts/            # React Context providers
│   └── __tests__/       # Context tests
├── hooks/               # Custom React hooks
├── lib/                 # Utility libraries
│   └── design-system.ts # Design tokens and utilities
├── pages/               # Route-level page components
├── services/            # Business logic and API clients
│   └── __tests__/       # Service tests
├── types/               # TypeScript type definitions
│   └── __tests__/       # Type/schema tests
├── test/                # Test setup and utilities
└── assets/              # Static assets

tests/                   # Integration test suites
├── accessibility/       # WCAG compliance tests
├── e2e/                 # End-to-end tests
│   ├── fixtures/        # Test data factories
│   └── page-objects/    # Page object models
├── performance/         # Lighthouse audits
└── visual/              # Visual regression tests
```

---

## 5. Code Style Guidelines

### Imports

```typescript
import type {GPTConfiguration} from "@/types/gpt"

import {useStorage} from "@/hooks/use-storage"
import {cn, ds} from "@/lib/design-system"

import {Button, Card} from "@heroui/react"
// Order: React → Third-party → Internal → Types
import {useCallback, useState} from "react"

import {z} from "zod"
```

**MUST**:

- Use `@/` alias for src/ imports
- Separate type imports with `import type`
- Group imports logically with blank lines

### Component Structure

```tsx
// 1. Type definitions
interface CardProps {
  title: string
  description?: string
  onSave: (data: FormData) => void
}

// 2. Component
export function Card({title, description, onSave}: CardProps) {
  // 3. Hooks first
  const {saveGPT} = useStorage()
  const [isLoading, setIsLoading] = useState(false)

  // 4. Callbacks
  const handleSubmit = useCallback(async (data: FormData) => {
    setIsLoading(true)
    try {
      await onSave(data)
    } catch (error_) {
      // Handle error
      throw error_
    } finally {
      setIsLoading(false)
    }
  }, [onSave])

  // 5. Early returns for edge cases
  if (!title) return null

  // 6. Render
  return (
    <div className={cn(ds.surface.primary, ds.padding.md)}>
      {/* ... */}
    </div>
  )
}
```

### Error Handling

```typescript
// CORRECT: Named error variable, re-throw for component handling
try {
  await saveData(config)
} catch (error_) {
  console.error("Failed to save:", error_)
  throw error_ // Re-throw for component error boundary
}

// WRONG: Empty catch, generic error variable
try {
  await saveData(config)
} catch {} // NEVER do this
```

### Control Flow

- **MUST** prefer early returns over nested conditions
- **MUST** use explicit boolean checks (`if (value !== undefined)` not `if (value)`)
- **SHOULD** limit function length to ~50 lines
- **SHOULD** extract complex conditions to named variables

---

## 6. UI and Design System

### Component Usage

```tsx
// CORRECT: Use HeroUI components with design system utilities
import {Button, Card} from '@heroui/react'
import {cn, ds, theme} from '@/lib/design-system'

<Card className={cn(ds.surface.primary, ds.border.default)}>
  <Button color={theme.colors.primary}>Save</Button>
</Card>

// WRONG: Hardcoded colors or raw Tailwind
<div className="bg-gray-800 border-gray-600">  // NEVER
<div className="bg-[#1a1a2e]">                 // NEVER
```

### Color Tokens

**MUST** use semantic color tokens:

| Token               | Use Case         |
| ------------------- | ---------------- |
| `surface-primary`   | Main background  |
| `surface-secondary` | Card backgrounds |
| `content-primary`   | Primary text     |
| `content-secondary` | Muted text       |
| `border-default`    | Standard borders |

**MUST NOT** hardcode hex colors or use raw Tailwind color classes.

### Accessibility Requirements

| Requirement         | Standard                         | Priority |
| ------------------- | -------------------------------- | -------- |
| WCAG Compliance     | Level AA                         | MUST     |
| Keyboard Navigation | Full app navigable               | MUST     |
| Screen Reader       | Semantic HTML + ARIA             | MUST     |
| Color Contrast      | 4.5:1 minimum                    | MUST     |
| Focus Indicators    | Visible focus rings              | MUST     |
| Reduced Motion      | Respect `prefers-reduced-motion` | SHOULD   |

---

## 7. State Management

### Context Hierarchy

```
App
├── StorageProvider      # IndexedDB persistence
│   └── OpenAIProvider   # API service configuration
│       └── ConversationProvider  # Chat state
│           └── [Components]
```

### Access Patterns

```tsx
// CORRECT: Access state through hooks
const {gpts, saveGPT} = useStorage()
const {service} = useOpenAIService()

// WRONG: Direct storage access
localStorage.getItem("gpts") // NEVER
indexedDB.open("mydb") // Use Dexie.js wrapper
```

### Data Validation

```typescript
// MUST: Define Zod schema, then infer type
const GPTConfigurationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  systemPrompt: z.string().min(1),
  modelProvider: z.enum(["openai", "anthropic", "ollama"]),
  // ...
})

type GPTConfiguration = z.infer<typeof GPTConfigurationSchema>

// MUST: Validate data at boundaries
const validated = GPTConfigurationSchema.parse(rawData)
```

---

## 8. Security Requirements

### API Key Storage (CRITICAL)

```typescript
// MUST: Encrypt API keys before storage
// - Use Web Crypto API (SubtleCrypto)
// - AES-GCM encryption
// - PBKDF2 key derivation (100k iterations)
// - Unique IV per secret
// - Store only in IndexedDB (never localStorage)

// MUST NOT:
// - Store plaintext API keys
// - Log API keys to console
// - Include keys in error messages
// - Transmit keys except to user-selected endpoints
```

### Content Security Policy

| Directive     | Requirement                       |
| ------------- | --------------------------------- |
| `script-src`  | Restrict to self and trusted CDNs |
| `style-src`   | Use nonces for inline styles      |
| `connect-src` | Only configured API endpoints     |

### Session Security

- Session timeout: 30 minutes (configurable)
- Derived keys kept in memory only
- Clear on tab close/timeout

---

## 9. Performance Requirements

### Targets

| Metric                    | Target    | Priority |
| ------------------------- | --------- | -------- |
| Initial page load         | <3s on 4G | MUST     |
| Time to interactive       | <5s on 4G | MUST     |
| Local operation latency   | <100ms    | MUST     |
| IndexedDB query time      | <50ms     | SHOULD   |
| Memory (10 conversations) | <500MB    | SHOULD   |
| Initial bundle size       | <2MB      | SHOULD   |

### Optimization Rules

- **MUST** use route-based code splitting
- **MUST** lazy load heavy components (editors, PDF parser)
- **SHOULD** preload likely next routes
- **SHOULD** implement virtual scrolling for long lists

---

## 10. Testing Standards

### Test Types and Commands

```bash
pnpm test                  # Unit tests (Vitest)
pnpm test:coverage         # With coverage report
pnpm test:e2e              # End-to-end (Playwright)
pnpm test:accessibility    # WCAG compliance (axe-core)
pnpm test:visual           # Visual regression
pnpm test:performance      # Lighthouse audits
```

### Coverage Requirements

| Type          | Minimum Coverage    |
| ------------- | ------------------- |
| Unit tests    | 80% statements      |
| E2E tests     | Critical user flows |
| Accessibility | Zero AA violations  |

### Test File Locations

| Test Type         | Location                    | Naming                    |
| ----------------- | --------------------------- | ------------------------- |
| Unit (components) | `src/components/__tests__/` | `*.test.tsx`              |
| Unit (services)   | `src/services/__tests__/`   | `*.test.ts`               |
| E2E               | `tests/e2e/`                | `*.spec.ts`               |
| Accessibility     | `tests/accessibility/`      | `*.accessibility.spec.ts` |
| Visual            | `tests/visual/`             | `*.visual.spec.ts`        |

### Testing Patterns

```tsx
// Unit test structure
describe('ComponentName', () => {
  it('should render with required props', () => {
    render(<Component title="Test" />)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })

  it('should handle user interaction', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(<Component onClick={handleClick} />)
    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalled()
  })
})

// E2E test with page objects
test('should create new GPT', async ({page}) => {
  const gptPage = new GPTEditorPage(page)
  await gptPage.navigate()
  await gptPage.fillForm({name: 'My GPT', systemPrompt: '...'})
  await gptPage.save()
  await expect(gptPage.successMessage).toBeVisible()
})
```

---

## 11. Feature Priorities (MoSCoW)

### MUST HAVE (Phase 1 - MVP)

- GPT CRUD operations (create, edit, archive, delete)
- OpenAI provider integration with streaming
- Basic chat interface with message composition
- IndexedDB storage layer with Dexie.js
- API key encryption (Web Crypto API)
- Offline capability for local operations
- WCAG AA accessibility compliance

### SHOULD HAVE (Phase 2)

- Knowledge base (file upload, URLs, text snippets)
- Anthropic provider integration
- Export/import GPT configurations
- MCP tool integration (connection, discovery, visualization)
- Conversation search and management
- Cross-tab synchronization

### COULD HAVE (Phase 3-4)

- Ollama integration (local models)
- Custom tool definitions
- Code execution sandbox
- Tauri desktop application
- P2P sync via WebRTC

---

## 12. Implementation Rules

### General Guidelines

1. **Follow requirements precisely** - Implement exactly what's specified
2. **No placeholders** - Never leave TODOs, FIXMEs, or incomplete implementations
3. **Minimal changes** - Make focused, surgical edits; don't refactor unrelated code
4. **Type safety first** - Never use `as any`, `@ts-ignore`, or `@ts-expect-error`
5. **Test coverage** - Write tests for new functionality before marking complete

### Before Starting Work

1. Understand the full scope of the requirement
2. Check for related existing code patterns
3. Identify affected components and tests
4. Create a plan for incremental, testable changes

### Code Review Checklist

- [ ] Follows naming conventions
- [ ] Uses design system (no hardcoded colors)
- [ ] Includes proper error handling
- [ ] Has sufficient test coverage
- [ ] Passes lint checks (`pnpm lint`)
- [ ] Passes type checks (`pnpm build`)
- [ ] No accessibility violations
- [ ] Performance within targets

### When Uncertain

If requirements are ambiguous or conflicting:

1. Check PRD and features list for clarification
2. Review existing code patterns for precedent
3. Ask specific questions rather than making assumptions
4. Document any assumptions made

---

## 13. Git and CI/CD

### Branch Strategy

- `main` - Production-ready code
- Feature branches for development
- PR required for all changes to main

### Commit Messages

```
<type>: <description>

Types: feat, fix, refactor, test, docs, chore
Example: feat: add GPT export functionality
```

### CI Pipeline Requirements

All PRs must pass:

- [ ] TypeScript compilation
- [ ] ESLint checks
- [ ] Unit tests (80%+ coverage)
- [ ] E2E tests
- [ ] Accessibility audit
- [ ] Visual regression (no unexpected changes)

---

## 14. Quick Reference

### Commands

```bash
pnpm install           # Install dependencies
pnpm dev               # Start dev server
pnpm build             # Production build
pnpm lint              # Lint with auto-fix
pnpm test              # Run unit tests
pnpm test:e2e          # Run E2E tests
pnpm test:accessibility # WCAG audit
```

### Import Aliases

```txt
@/ → src/
```

### Key Files

| Purpose          | Location                           |
| ---------------- | ---------------------------------- |
| Design system    | `src/lib/design-system.ts`         |
| Type definitions | `src/types/`                       |
| Storage context  | `src/contexts/storage-context.tsx` |
| Test setup       | `src/test/setup.ts`                |

---

## Related Documents

- [PRD v2.0](./prd.md) - Full product requirements
- [Features List](./features.md) - Detailed feature breakdown
- [Design System](./design-system.md) - UI component guidelines
- [Overview](./overview.md) - Project overview
