# RULES.md - GPT Platform Development Guidelines

<!-- prettier-ignore-start -->

**Version:** 1.3
**Last Updated:** December 29, 2025
**Source:** PRD v2.1, Features List v1.1, Codebase Analysis, RFC-007 Learnings

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
  const handleSubmit = useCallback(
    async (data: FormData) => {
      setIsLoading(true)
      try {
        await onSave(data)
      } catch (error_) {
        // Handle error
        throw error_
      } finally {
        setIsLoading(false)
      }
    },
    [onSave],
  )

  // 5. Early returns for edge cases
  if (!title) return null

  // 6. Render
  return <div className={cn(ds.surface.primary, ds.padding.md)}>{/* ... */}</div>
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

### Async Handlers in Event Callbacks (CRITICAL)

When using async functions in HeroUI `onPress` or React `onClick` handlers, **MUST** use `.catch(console.error)` pattern:

```tsx
// CORRECT: Use .catch(console.error) for async handlers
<Button
  onPress={() => {
    handleAsyncAction().catch(console.error)
  }}
>
  Save
</Button>

// CORRECT: Alternative with explicit error handling
<Button
  onPress={() => {
    handleAsyncAction().catch((error_) => {
      console.error("Action failed:", error_)
      setErrorState(error_.message)
    })
  }}
>
  Save
</Button>

// WRONG: Using void operator (ESLint error: @typescript-eslint/no-confusing-void-expression)
<Button
  onPress={() => {
    void handleAsyncAction()  // NEVER - causes lint errors
  }}
>
  Save
</Button>

// WRONG: Unhandled promise (ESLint error: @typescript-eslint/no-floating-promises)
<Button
  onPress={() => {
    handleAsyncAction()  // NEVER - unhandled promise rejection
  }}
>
  Save
</Button>
```

**Key Rules:**

- **Always use `.catch()`**: Async handlers must have explicit error handling
- **Never use `void`**: The `void` operator causes `@typescript-eslint/no-confusing-void-expression` errors
- **Log errors**: At minimum, use `.catch(console.error)` to log failures

### Control Flow

- **MUST** prefer early returns over nested conditions
- **MUST** use explicit boolean checks (`if (value !== undefined)` not `if (value)`)
- **SHOULD** limit function length to ~50 lines
- **SHOULD** extract complex conditions to named variables

### String Sanitization

When sanitizing strings (removing control characters, special chars, etc.), avoid regex patterns with literal control characters:

```typescript
// CORRECT: Use character code filtering (avoids ESLint no-control-regex error)
function sanitizeFilename(name: string): string {
  return name
    .split("")
    .filter(char => char.charCodeAt(0) >= 32)
    .join("")
    .replaceAll(/[<>:"/\\|?*]/g, "_")
}

// WRONG: Regex with Unicode escapes for control characters triggers lint error
// Do NOT use: name.replace(/[\u0000-\u001F]/g, "")
// Instead, filter by character code as shown above
```

### Array Keys in JSX

When rendering lists, use unique content-based keys, not array indices:

```tsx
// CORRECT: Use unique identifier from data
{
  items.map(item => <li key={item.id}>{item.name}</li>)
}

// CORRECT: Use content as key when items are unique strings
{
  errors.map(error => <li key={error}>{error}</li>)
}

// WRONG: Using array index as key (ESLint warning, causes React reconciliation issues)
{
  items.map((item, index) => (
    <li key={index}>{item.name}</li> // AVOID - use unique identifier
  ))
}
```

### Responsive Design Considerations

When adding navigation elements, ensure they don't cause horizontal overflow on mobile viewports:

```tsx
// CORRECT: Hide non-essential nav items on mobile, show in mobile menu
<Button
  as={Link}
  href="/backup"
  isIconOnly
  variant="light"
  aria-label="Backup & Restore"
  className="hidden sm:flex"  // Hidden on mobile, visible on sm+ screens
>
  <ArchiveIcon className="h-5 w-5" />
</Button>

// WRONG: Adding nav items without mobile consideration causes overflow
<Button as={Link} href="/backup" isIconOnly variant="light">
  <ArchiveIcon />  // May cause horizontal scroll on 375px viewport
</Button>
```

**Key Rules:**

- **Test at 375px width**: Mobile viewport must not have horizontal scroll
- **Use responsive classes**: `hidden sm:flex` to hide on mobile
- **Provide mobile alternative**: Include items in mobile menu (`NavbarMenuContent`)

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

### HeroUI Component Styling (CRITICAL)

HeroUI components with icons require explicit flex styling in TailwindCSS 4:

```tsx
// CORRECT: Button with icon - add flex alignment
<Button
  color="primary"
  className="flex items-center gap-2"
  startContent={<PlusIcon className="h-4 w-4" />}
>
  Create New
</Button>

// CORRECT: Input with icon - use classNames prop
<Input
  placeholder="Search..."
  startContent={<SearchIcon className="h-4 w-4" />}
  isClearable={searchQuery.length > 0}
  classNames={{
    inputWrapper: 'flex items-center',
    innerWrapper: 'flex items-center',
  }}
/>

// WRONG: Missing flex alignment causes icons to stack vertically
<Button startContent={<PlusIcon />}>Create</Button>  // Icons appear ABOVE text
<Input startContent={<SearchIcon />} />              // Icons appear ABOVE input
```

**Key Rules:**

- **Buttons with `startContent`/`endContent`**: Add `className="flex items-center gap-2"`
- **Input with `startContent`/`endContent`**: Add `classNames={{ inputWrapper: 'flex items-center', innerWrapper: 'flex items-center' }}`
- **`isClearable` prop**: Use conditional `isClearable={value.length > 0}` to hide clear button when empty

### HeroUI Interactive Components (CRITICAL)

Avoid nested interactive elements which cause HTML validation errors and React hydration failures:

```tsx
// WRONG: Card isPressable creates a <button> wrapper, containing another button
<Card isPressable onPress={handleSelect}>
  <CardBody>
    <Button onPress={handleAction}>Action</Button>  // NESTED BUTTON ERROR
  </CardBody>
</Card>

// CORRECT: Remove isPressable, use dedicated clickable areas
<Card>
  <CardHeader>
    <button
      type="button"
      onClick={handleSelect}
      className="flex-1 text-left cursor-pointer"
    >
      <span className="font-semibold">{title}</span>
    </button>
    <Button onPress={handleAction}>Action</Button>
  </CardHeader>
</Card>

// CORRECT: Alternative - use role="group" with separate interactive children
<Card className="group">
  <CardBody
    role="button"
    tabIndex={0}
    onClick={handleSelect}
    onKeyDown={(e) => e.key === 'Enter' && handleSelect()}
  >
    {content}
  </CardBody>
  <CardFooter>
    <Button onPress={handleAction}>Action</Button>
  </CardFooter>
</Card>
```

**Key Rules:**

- **Never use `isPressable` on Card** when the card contains buttons, dropdowns, checkboxes, or other interactive elements
- **Separate selection from actions**: Use a dedicated clickable area (title, body section) for selection, keep action buttons outside that area
- **Stop propagation when needed**: Action handlers should call `e.stopPropagation()` if they're inside a clickable container

### HeroUI Dropdown Styling

Dropdown menus need explicit styling to ensure proper appearance:

```tsx
// CORRECT: Dropdown with explicit styling
<Dropdown placement="bottom-end">
  <DropdownTrigger>
    <Button variant="light" isIconOnly>
      <MoreVerticalIcon />
    </Button>
  </DropdownTrigger>
  <DropdownMenu
    aria-label="Actions"
    classNames={{
      base: 'bg-surface-primary border border-border-default shadow-lg rounded-lg',
      list: 'p-1',
    }}
  >
    <DropdownItem key="edit">Edit</DropdownItem>
    <DropdownItem key="delete" className="text-danger">Delete</DropdownItem>
  </DropdownMenu>
</Dropdown>

// WRONG: Dropdown without explicit styling may appear transparent or overlap content poorly
<Dropdown>
  <DropdownTrigger>
    <Button>Menu</Button>
  </DropdownTrigger>
  <DropdownMenu>  // Missing classNames - may have styling issues
    <DropdownItem>Item</DropdownItem>
  </DropdownMenu>
</Dropdown>
```

**Key Rules:**

- **Always set `placement`**: Use `bottom-end`, `bottom-start`, `top-end` etc. to control positioning
- **Add `classNames.base`**: Include `bg-surface-primary border border-border-default shadow-lg` for consistent appearance
- **Use semantic colors**: Reference design system tokens, not hardcoded colors

### HeroUI Modal Configuration (CRITICAL)

Modals require explicit configuration to ensure proper overlay behavior:

```tsx
// CORRECT: Modal with explicit backdrop and placement
<Modal
  isOpen={isOpen}
  onClose={onClose}
  placement="center"
  backdrop="opaque"
  hideCloseButton
>
  <ModalContent>
    <ModalHeader className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5" />
        <span>{title}</span>
      </div>
      <Button isIconOnly variant="light" size="sm" onPress={onClose}>
        <XIcon className="h-4 w-4" />
      </Button>
    </ModalHeader>
    <ModalBody>{content}</ModalBody>
    <ModalFooter>
      <Button variant="light" onPress={onClose}>Cancel</Button>
      <Button color="primary" onPress={onConfirm}>Confirm</Button>
    </ModalFooter>
  </ModalContent>
</Modal>

// WRONG: Modal without explicit configuration
<Modal isOpen={isOpen} onClose={onClose}>  // May have positioning/backdrop issues
  <ModalContent>
    <ModalHeader>{title}</ModalHeader>  // Close button may overlap content
    <ModalBody>{content}</ModalBody>
  </ModalContent>
</Modal>
```

**Key Rules:**

- **Always set `placement="center"`**: Ensures modal is centered, not anchored to bottom
- **Always set `backdrop="opaque"` or `backdrop="blur"`**: Ensures content behind modal is properly dimmed
- **Use `hideCloseButton` + custom close button**: Prevents built-in close button from overlapping header content
- **Header layout**: Use `flex items-center justify-between` to properly position title and close button

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

### Layout and Navigation Standards (CRITICAL)

All pages must follow consistent layout patterns for v1.0 readiness:

#### Global Settings Access

```tsx
// CORRECT: Settings accessible from navbar on all pages
<Navbar>
  <NavbarContent justify="end">
    <Button
      as={Link}
      href="/settings"
      isIconOnly
      variant="light"
      aria-label="Settings"
    >
      <CogIcon className="h-5 w-5" />
    </Button>
  </NavbarContent>
</Navbar>

// Settings page with organized sections
// Route: /settings
<SettingsPage>
  <Tabs>
    <Tab key="providers" title="AI Providers">...</Tab>
    <Tab key="integrations" title="Integrations">...</Tab>
    <Tab key="appearance" title="Appearance">...</Tab>
    <Tab key="data" title="Data">...</Tab>
  </Tabs>
</SettingsPage>
```

**Key Rules:**

- **Settings MUST be globally accessible**: Add Settings icon to navbar, visible on all pages
- **Settings route at `/settings`**: Dedicated page, not inline in other components
- **Never hide settings in editor-only views**: Users must configure providers before creating GPTs

#### Layout Components

```tsx
// CORRECT: Use standardized layout wrappers
// DefaultLayout - Standard container with consistent padding
<DefaultLayout>
  <main className="container mx-auto px-4 py-6">
    {children}
  </main>
</DefaultLayout>

// FullHeightLayout - For editors and chat interfaces
<FullHeightLayout>
  <main className="h-[calc(100vh-var(--header-height)-var(--footer-height))]">
    {children}
  </main>
</FullHeightLayout>

// SidebarLayout - For pages with navigation sidebar
<SidebarLayout sidebar={<FolderSidebar />}>
  <main>{children}</main>
</SidebarLayout>

// WRONG: Ad-hoc layout wrappers per route
<div className="min-h-screen">  // Inconsistent height calculation
<div className="p-4">           // Inconsistent padding
```

**Key Rules:**

- **Always use `<main>` landmark**: Required for accessibility
- **Consistent height calculations**: Use CSS variables (`--header-height`, `--footer-height`)
- **Layout components in `src/components/layouts/`**: Reusable across pages

#### Feature Discoverability

| Feature             | Entry Point               | Max Clicks from Home |
| ------------------- | ------------------------- | -------------------- |
| Settings            | Navbar icon               | 1                    |
| Theme Toggle        | Navbar                    | 1                    |
| Folder Organization | Home page sidebar         | 1                    |
| Conversation Search | Home page or GPT test     | 1                    |
| Backup/Restore      | Navbar or Settings > Data | 2                    |
| Version History     | GPT card menu or editor   | 2                    |
| Export/Import GPT   | GPT card menu             | 2                    |

**Key Rules:**

- **2-click maximum**: Any implemented feature must be accessible within 2 clicks from home
- **Empty states guide users**: Show helpful prompts when no data exists
- **New user onboarding**: First-time visitors see guidance to configure settings

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
describe("ComponentName", () => {
  it("should render with required props", () => {
    render(<Component title="Test" />)
    expect(screen.getByText("Test")).toBeInTheDocument()
  })

  it("should handle user interaction", async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(<Component onClick={handleClick} />)
    await user.click(screen.getByRole("button"))
    expect(handleClick).toHaveBeenCalled()
  })
})

// E2E test with page objects
test("should create new GPT", async ({page}) => {
  const gptPage = new GPTEditorPage(page)
  await gptPage.navigate()
  await gptPage.fillForm({name: "My GPT", systemPrompt: "..."})
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

### Mandatory Quality Gates (CRITICAL)

**Before considering ANY implementation task complete, you MUST run and pass ALL of the following quality gates in order:**

```bash
# 1. Lint check - MUST pass with 0 errors
pnpm lint

# 2. Unit tests - MUST pass all tests
pnpm test --run

# 3. Build check - MUST complete successfully
pnpm build

# 4. Accessibility audit - MUST pass all tests
pnpm test:accessibility

# 5. E2E tests - MUST pass all tests (run specific suite if available)
pnpm test:e2e
```

| Gate          | Command                   | Success Criteria               |
| ------------- | ------------------------- | ------------------------------ |
| Lint          | `pnpm lint`               | 0 errors (warnings acceptable) |
| Unit Tests    | `pnpm test`               | All tests passing              |
| Build         | `pnpm build`              | Successful compilation         |
| Accessibility | `pnpm test:accessibility` | All tests passing              |
| E2E           | `pnpm test:e2e`           | All tests passing              |

**IMPORTANT:**

- If ANY gate fails, you MUST fix the issue before proceeding
- If a test was passing before your changes and now fails, YOUR CHANGES broke it - fix it
- Run related E2E tests for the feature you modified (e.g., `pnpm test:e2e tests/e2e/export-import.spec.ts`)
- Never assume a task is complete without running all gates

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
