---
Status: Pending
Priority: MUST HAVE (F-1201), SHOULD HAVE (F-1202, F-1203)
Complexity: Medium
Phase: 1 (v1.0 Critical)
Created: December 29, 2025
Source: PRD v2.1, Features v1.1
---

# RFC-013: UI/UX Improvements

## Summary

This RFC addresses critical UI/UX gaps identified for v1.0 readiness. It consolidates three related features that improve user experience, feature discoverability, and application consistency:

1. **Global Settings Page (F-1201)** - MUST HAVE: Dedicated settings page accessible from navbar
2. **Consistent Page Layout (F-1202)** - SHOULD HAVE: Standardized layout components
3. **Feature Discoverability (F-1203)** - SHOULD HAVE: All features accessible within 2 clicks

These improvements are critical because:

- Settings are currently only accessible from the GPT Editor page
- Layout patterns are inconsistent across pages
- Implemented features lack discoverable entry points

---

## Dependencies

### Builds Upon

| RFC     | Reason                                      |
| ------- | ------------------------------------------- |
| RFC-001 | Settings persisted to IndexedDB             |
| RFC-002 | Provider settings use encrypted storage     |
| RFC-003 | Provider configuration UI moves to settings |
| RFC-004 | GPT management integration                  |

### Required By

| RFC  | Reason                         |
| ---- | ------------------------------ |
| None | This is a UX improvement layer |

---

## Features Covered

| Feature ID | Name                    | Priority    | Description                                       |
| ---------- | ----------------------- | ----------- | ------------------------------------------------- |
| F-1201     | Global Settings Page    | MUST HAVE   | Dedicated /settings route with organized sections |
| F-1202     | Consistent Page Layout  | SHOULD HAVE | Reusable layout components                        |
| F-1203     | Feature Discoverability | SHOULD HAVE | 2-click access to all features                    |

---

## Technical Architecture

### Component Structure

```
src/
├── components/
│   ├── layouts/                    # NEW: Layout components
│   │   ├── default-layout.tsx      # Standard container layout
│   │   ├── full-height-layout.tsx  # Full viewport minus header/footer
│   │   ├── sidebar-layout.tsx      # With collapsible sidebar
│   │   └── index.ts                # Exports
│   ├── settings/                   # ENHANCED: Settings components
│   │   ├── settings-page.tsx       # NEW: Main settings page
│   │   ├── provider-settings.tsx   # MOVE: From GPT editor
│   │   ├── appearance-settings.tsx # NEW: Theme, motion preferences
│   │   ├── data-settings.tsx       # NEW: Storage, backup links
│   │   └── index.ts
│   └── navbar.tsx                  # MODIFY: Add settings icon
├── pages/
│   └── settings-page.tsx           # NEW: Route component
└── App.tsx                         # MODIFY: Add /settings route, use layouts
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         App.tsx                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                     Navbar                               │    │
│  │  [Logo] [Home] [Docs]           [Theme] [Settings] [...]│    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                    ┌─────────┴─────────┐                        │
│                    ▼                   ▼                        │
│         ┌──────────────────┐  ┌──────────────────┐             │
│         │  DefaultLayout   │  │ FullHeightLayout │             │
│         │  (Home, Backup)  │  │ (Editor, Test)   │             │
│         └──────────────────┘  └──────────────────┘             │
│                    │                   │                        │
│                    └─────────┬─────────┘                        │
│                              ▼                                   │
│                    ┌──────────────────┐                         │
│                    │      Footer      │                         │
│                    └──────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### Phase 1: Layout Components (F-1202)

#### 1.1 Create `src/components/layouts/default-layout.tsx`

```tsx
import type {ReactNode} from "react"
import {cn, ds} from "@/lib/design-system"

interface DefaultLayoutProps {
  children: ReactNode
  className?: string
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full"
}

export function DefaultLayout({children, className, maxWidth = "xl"}: DefaultLayoutProps) {
  const maxWidthClasses = {
    sm: "max-w-screen-sm",
    md: "max-w-screen-md",
    lg: "max-w-screen-lg",
    xl: "max-w-screen-xl",
    full: "max-w-full",
  }

  return (
    <main
      className={cn(
        "container mx-auto px-4 py-6",
        "min-h-[calc(100vh-var(--header-height)-var(--footer-height))]",
        maxWidthClasses[maxWidth],
        className,
      )}
    >
      {children}
    </main>
  )
}
```

#### 1.2 Create `src/components/layouts/full-height-layout.tsx`

```tsx
import type {ReactNode} from "react"
import {cn} from "@/lib/design-system"

interface FullHeightLayoutProps {
  children: ReactNode
  className?: string
}

export function FullHeightLayout({children, className}: FullHeightLayoutProps) {
  return (
    <main className={cn("h-[calc(100vh-var(--header-height)-var(--footer-height))]", "overflow-hidden", className)}>
      {children}
    </main>
  )
}
```

#### 1.3 Create `src/components/layouts/sidebar-layout.tsx`

```tsx
import type {ReactNode} from "react"
import {cn} from "@/lib/design-system"

interface SidebarLayoutProps {
  children: ReactNode
  sidebar: ReactNode
  sidebarWidth?: string
  className?: string
}

export function SidebarLayout({children, sidebar, sidebarWidth = "w-64", className}: SidebarLayoutProps) {
  return (
    <div className={cn("flex h-[calc(100vh-var(--header-height)-var(--footer-height))]", className)}>
      <aside className={cn(sidebarWidth, "flex-shrink-0 border-r border-border-default overflow-y-auto")}>
        {sidebar}
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
```

#### 1.4 Add CSS Variables to `src/index.css`

```css
:root {
  --header-height: 64px;
  --footer-height: 48px;
}
```

### Phase 2: Global Settings Page (F-1201)

#### 2.1 Create `src/pages/settings-page.tsx`

```tsx
import {Tabs, Tab, Card, CardBody} from "@heroui/react"
import {DefaultLayout} from "@/components/layouts"
import {ProviderSettings} from "@/components/settings/provider-settings"
import {AppearanceSettings} from "@/components/settings/appearance-settings"
import {DataSettings} from "@/components/settings/data-settings"
import {MCPSettings} from "@/components/settings/mcp-settings"
import {CogIcon, PaletteIcon, DatabaseIcon, PlugIcon} from "@/components/icons"

export function SettingsPage() {
  return (
    <DefaultLayout maxWidth="lg">
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-content-secondary">Configure your AI providers, integrations, and preferences</p>
        </header>

        <Tabs aria-label="Settings sections" color="primary" variant="underlined">
          <Tab
            key="providers"
            title={
              <div className="flex items-center gap-2">
                <CogIcon className="h-4 w-4" />
                <span>AI Providers</span>
              </div>
            }
          >
            <Card className="mt-4">
              <CardBody>
                <ProviderSettings />
              </CardBody>
            </Card>
          </Tab>

          <Tab
            key="integrations"
            title={
              <div className="flex items-center gap-2">
                <PlugIcon className="h-4 w-4" />
                <span>Integrations</span>
              </div>
            }
          >
            <Card className="mt-4">
              <CardBody>
                <MCPSettings />
              </CardBody>
            </Card>
          </Tab>

          <Tab
            key="appearance"
            title={
              <div className="flex items-center gap-2">
                <PaletteIcon className="h-4 w-4" />
                <span>Appearance</span>
              </div>
            }
          >
            <Card className="mt-4">
              <CardBody>
                <AppearanceSettings />
              </CardBody>
            </Card>
          </Tab>

          <Tab
            key="data"
            title={
              <div className="flex items-center gap-2">
                <DatabaseIcon className="h-4 w-4" />
                <span>Data</span>
              </div>
            }
          >
            <Card className="mt-4">
              <CardBody>
                <DataSettings />
              </CardBody>
            </Card>
          </Tab>
        </Tabs>
      </div>
    </DefaultLayout>
  )
}
```

#### 2.2 Create `src/components/settings/appearance-settings.tsx`

```tsx
import {Switch, Select, SelectItem} from "@heroui/react"
import {useTheme} from "@heroui/use-theme"
import {useReducedMotion} from "@/hooks/use-reduced-motion"

export function AppearanceSettings() {
  const {theme, setTheme} = useTheme()
  const {reducedMotion, setReducedMotion} = useReducedMotion()

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Appearance</h2>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Theme</p>
            <p className="text-sm text-content-secondary">Choose your preferred color scheme</p>
          </div>
          <Select
            aria-label="Theme selection"
            selectedKeys={[theme]}
            onSelectionChange={keys => setTheme(Array.from(keys)[0] as string)}
            className="w-32"
          >
            <SelectItem key="light">Light</SelectItem>
            <SelectItem key="dark">Dark</SelectItem>
            <SelectItem key="system">System</SelectItem>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Reduce Motion</p>
            <p className="text-sm text-content-secondary">Minimize animations and transitions</p>
          </div>
          <Switch isSelected={reducedMotion} onValueChange={setReducedMotion} aria-label="Reduce motion toggle" />
        </div>
      </div>
    </div>
  )
}
```

#### 2.3 Create `src/components/settings/data-settings.tsx`

```tsx
import {Button, Progress, Link} from "@heroui/react"
import {useStorageQuota} from "@/hooks/use-storage-quota"
import {ArchiveIcon, TrashIcon} from "@/components/icons"

export function DataSettings() {
  const {used, total, percentage, isLoading} = useStorageQuota()

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Data Management</h2>

      <div className="space-y-4">
        {/* Storage Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-medium">Storage Usage</p>
            <p className="text-sm text-content-secondary">
              {isLoading ? "Calculating..." : `${formatBytes(used)} / ${formatBytes(total)}`}
            </p>
          </div>
          <Progress
            value={percentage}
            color={percentage > 90 ? "danger" : percentage > 70 ? "warning" : "primary"}
            aria-label="Storage usage"
          />
        </div>

        {/* Backup & Restore Link */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Backup & Restore</p>
            <p className="text-sm text-content-secondary">Export or import your data</p>
          </div>
          <Button
            as={Link}
            href="/backup"
            variant="bordered"
            startContent={<ArchiveIcon className="h-4 w-4" />}
            className="flex items-center gap-2"
          >
            Manage Backups
          </Button>
        </div>

        {/* Clear Data */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-danger">Clear All Data</p>
            <p className="text-sm text-content-secondary">Permanently delete all local data</p>
          </div>
          <Button
            color="danger"
            variant="light"
            startContent={<TrashIcon className="h-4 w-4" />}
            className="flex items-center gap-2"
          >
            Clear Data
          </Button>
        </div>
      </div>
    </div>
  )
}
```

#### 2.4 Update `src/components/navbar.tsx`

Add settings icon to navbar:

```tsx
// Add to imports
import {CogIcon} from "@/components/icons"
import {Link} from "react-router-dom"

// Add to NavbarContent (end section)
;<NavbarItem>
  <Button as={Link} to="/settings" isIconOnly variant="light" aria-label="Settings">
    <CogIcon className="h-5 w-5" />
  </Button>
</NavbarItem>
```

#### 2.5 Update `src/App.tsx`

Add settings route:

```tsx
import {SettingsPage} from "@/pages/settings-page"

// Add to routes
;<Route path="/settings" element={<SettingsPage />} />
```

### Phase 3: Feature Discoverability (F-1203)

#### 3.1 Update Empty States

Create `src/components/empty-states/no-providers-prompt.tsx`:

```tsx
import {Card, CardBody, Button, Link} from "@heroui/react"
import {CogIcon, SparklesIcon} from "@/components/icons"

export function NoProvidersPrompt() {
  return (
    <Card className="border-dashed border-2 border-border-default bg-surface-secondary/50">
      <CardBody className="flex flex-col items-center justify-center py-12 text-center">
        <SparklesIcon className="h-12 w-12 text-primary mb-4" />
        <h2 className="text-xl font-semibold mb-2">Welcome to GPT Platform</h2>
        <p className="text-content-secondary mb-6 max-w-md">
          Configure your AI provider to start creating custom GPT assistants. You'll need an API key from OpenAI,
          Anthropic, or a local Ollama instance.
        </p>
        <Button
          as={Link}
          href="/settings"
          color="primary"
          size="lg"
          startContent={<CogIcon className="h-5 w-5" />}
          className="flex items-center gap-2"
        >
          Configure Settings
        </Button>
      </CardBody>
    </Card>
  )
}
```

#### 3.2 Add Conversation Search to Home Page

Update `src/pages/home-page.tsx` to include search functionality prominently:

```tsx
// Add search input to header section
<Input
  placeholder="Search conversations..."
  startContent={<SearchIcon className="h-4 w-4" />}
  classNames={{
    inputWrapper: "flex items-center",
    innerWrapper: "flex items-center",
  }}
  onValueChange={handleSearch}
  className="max-w-xs"
/>
```

#### 3.3 Feature Entry Points Matrix

Ensure the following entry points exist:

| Feature             | Entry Point              | Component to Modify               |
| ------------------- | ------------------------ | --------------------------------- |
| Settings            | Navbar icon              | `navbar.tsx`                      |
| Theme Toggle        | Navbar                   | `navbar.tsx` (existing)           |
| Backup/Restore      | Navbar + Settings > Data | `navbar.tsx`, `data-settings.tsx` |
| Conversation Search | Home page header         | `home-page.tsx`                   |
| Version History     | GPT card dropdown menu   | `user-gpt-card.tsx`               |
| Folder Organization | Home page sidebar        | `home-page.tsx` (existing)        |
| Export/Import GPT   | GPT card dropdown menu   | `user-gpt-card.tsx`               |

---

## Acceptance Criteria

### F-1201: Global Settings Page

```gherkin
Scenario: Access settings from navbar
  Given I am on any page in the application
  When I click the Settings icon in the navbar
  Then I am navigated to /settings
  And I see tabs for: AI Providers, Integrations, Appearance, Data

Scenario: Configure AI provider from settings
  Given I am on the Settings page
  When I select the "AI Providers" tab
  Then I can configure OpenAI, Anthropic, and Ollama providers
  And changes are auto-saved
  And a success indicator confirms the save

Scenario: First-time user guidance
  Given I have no providers configured
  When I visit the home page
  Then I see a prompt to configure settings
  And a "Configure Settings" button links to /settings
```

### F-1202: Consistent Page Layout

```gherkin
Scenario: Consistent layout across pages
  Given I navigate to any page
  When the page loads
  Then the navbar is visible with consistent styling
  And the main content uses a <main> landmark
  And the page height is calculated consistently

Scenario: Layout components are used
  Given a developer creates a new page
  When they implement the page component
  Then they use DefaultLayout, FullHeightLayout, or SidebarLayout
  And the layout includes proper ARIA landmarks
```

### F-1203: Feature Discoverability

```gherkin
Scenario: Settings accessible in 1 click
  Given I am on the home page
  When I click the Settings icon in the navbar
  Then I reach the Settings page (1 click)

Scenario: Backup accessible in 2 clicks
  Given I am on the home page
  When I click Settings, then click "Manage Backups" in Data tab
  Then I reach the Backup/Restore page (2 clicks)

Scenario: All features within 2 clicks
  Given I am on the home page
  Then each implemented feature is accessible within 2 clicks:
    | Feature | Clicks |
    | Settings | 1 |
    | Theme Toggle | 1 |
    | Backup/Restore | 2 |
    | Conversation Search | 1 |
    | Version History | 2 |
    | Export/Import GPT | 2 |
```

---

## Testing Strategy

### Unit Tests

```typescript
// src/components/layouts/__tests__/default-layout.test.tsx
describe('DefaultLayout', () => {
  it('renders children within main landmark', () => {
    render(<DefaultLayout><div>Content</div></DefaultLayout>)
    expect(screen.getByRole('main')).toContainHTML('Content')
  })

  it('applies max-width class based on prop', () => {
    render(<DefaultLayout maxWidth="lg"><div>Content</div></DefaultLayout>)
    expect(screen.getByRole('main')).toHaveClass('max-w-screen-lg')
  })
})

// src/pages/__tests__/settings-page.test.tsx
describe('SettingsPage', () => {
  it('renders all settings tabs', () => {
    render(<SettingsPage />)
    expect(screen.getByRole('tab', { name: /ai providers/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /integrations/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /appearance/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /data/i })).toBeInTheDocument()
  })

  it('shows provider settings by default', () => {
    render(<SettingsPage />)
    expect(screen.getByRole('tabpanel')).toContainElement(
      screen.getByText(/openai/i)
    )
  })
})
```

### E2E Tests

```typescript
// tests/e2e/settings.spec.ts
test.describe("Settings Page", () => {
  test("navigate to settings from navbar", async ({page}) => {
    await page.goto("/")
    await page.getByRole("button", {name: /settings/i}).click()
    await expect(page).toHaveURL("/settings")
    await expect(page.getByRole("heading", {name: "Settings"})).toBeVisible()
  })

  test("settings tabs are accessible", async ({page}) => {
    await page.goto("/settings")
    const tabs = ["AI Providers", "Integrations", "Appearance", "Data"]
    for (const tab of tabs) {
      await page.getByRole("tab", {name: new RegExp(tab, "i")}).click()
      await expect(page.getByRole("tabpanel")).toBeVisible()
    }
  })
})

// tests/e2e/feature-discoverability.spec.ts
test.describe("Feature Discoverability", () => {
  test("all features accessible within 2 clicks", async ({page}) => {
    await page.goto("/")

    // Settings - 1 click
    await page.getByRole("button", {name: /settings/i}).click()
    await expect(page).toHaveURL("/settings")

    // Backup - 2 clicks from home
    await page.goto("/")
    await page.getByRole("button", {name: /settings/i}).click()
    await page.getByRole("tab", {name: /data/i}).click()
    await page.getByRole("link", {name: /manage backups/i}).click()
    await expect(page).toHaveURL("/backup")
  })
})
```

### Accessibility Tests

```typescript
// tests/accessibility/settings.accessibility.spec.ts
test.describe("Settings Accessibility", () => {
  test("settings page has no a11y violations", async ({page, makeAxeBuilder}) => {
    await page.goto("/settings")
    const results = await makeAxeBuilder().analyze()
    expect(results.violations).toEqual([])
  })

  test("tabs are keyboard navigable", async ({page}) => {
    await page.goto("/settings")
    await page.keyboard.press("Tab")
    await expect(page.getByRole("tab", {name: /ai providers/i})).toBeFocused()
    await page.keyboard.press("ArrowRight")
    await expect(page.getByRole("tab", {name: /integrations/i})).toBeFocused()
  })

  test("main landmark is present", async ({page}) => {
    await page.goto("/settings")
    await expect(page.getByRole("main")).toBeVisible()
  })
})
```

---

## Migration Guide

### Refactoring GPT Editor

The GPT Editor page currently contains inline settings. These should be moved:

1. Remove `showSettings` toggle and inline settings panel
2. Add link to global settings: "Configure providers in Settings"
3. Keep model selector (uses configured providers)

```tsx
// Before (gpt-editor-page.tsx)
;<Button onPress={() => setShowSettings(!showSettings)}>Show API Settings</Button>
{
  showSettings && <ProviderSettings />
}

// After
;<p className="text-sm text-content-secondary">
  <Link href="/settings" className="text-primary">
    Configure AI providers
  </Link>{" "}
  to use different models
</p>
```

### Route Updates

Update App.tsx to use layout components:

```tsx
// Before
<Route path="/" element={<div className="min-h-screen p-4"><HomePage /></div>} />

// After
<Route path="/" element={<HomePage />} />
// HomePage internally uses DefaultLayout or SidebarLayout
```

---

## Performance Considerations

- **Lazy load settings tabs**: Load provider settings only when tab is active
- **Debounce auto-save**: Settings changes auto-save with 500ms debounce
- **Memoize layout components**: Prevent unnecessary re-renders

---

## Security Considerations

- **No sensitive data in URL**: Settings state not reflected in URL
- **Provider credentials**: Continue using encrypted storage from RFC-002
- **Input sanitization**: Validate all settings inputs

---

## Related Documents

- [PRD v2.1](../docs/prd.md) - Section 3.7 UI/UX Requirements
- [Features v1.1](../docs/features.md) - Category 12: UI/UX
- [RULES.md v1.3](../docs/RULES.md) - Layout and Navigation Standards
- [Design System](../docs/design-system.md) - UI tokens and patterns

---

## Implementation Checklist

- [ ] Create layout components (`default-layout.tsx`, `full-height-layout.tsx`, `sidebar-layout.tsx`)
- [ ] Add CSS variables for header/footer heights
- [ ] Create settings page with tabs
- [ ] Create appearance settings component
- [ ] Create data settings component
- [ ] Move provider settings from GPT editor
- [ ] Add settings icon to navbar
- [ ] Add /settings route to App.tsx
- [ ] Create no-providers-prompt component
- [ ] Update home page with empty state
- [ ] Add conversation search to home page
- [ ] Refactor GPT editor to remove inline settings
- [ ] Migrate existing pages to use layout components
- [ ] Write unit tests for layout components
- [ ] Write unit tests for settings page
- [ ] Write E2E tests for settings navigation
- [ ] Write E2E tests for feature discoverability
- [ ] Write accessibility tests
- [ ] Update visual regression baselines
