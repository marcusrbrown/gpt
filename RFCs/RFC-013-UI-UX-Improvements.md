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

### External Dependencies

| Package          | Version | Purpose                          |
| ---------------- | ------- | -------------------------------- |
| @heroui/react    | ^2.x    | UI components (Tabs, Buttons)    |
| react-router-dom | ^6.x    | Navigation                       |
| react-swipeable  | ^7.x    | Touch gesture handling (Phase 4) |
| lucide-react     | ^0.x    | Icon library                     |

---

## Features Covered

| Feature ID | Name                    | Priority    | Description                                       |
| ---------- | ----------------------- | ----------- | ------------------------------------------------- |
| F-1201     | Global Settings Page    | MUST HAVE   | Dedicated /settings route with organized sections |
| F-1202     | Consistent Page Layout  | SHOULD HAVE | Reusable layout components                        |
| F-1203     | Feature Discoverability | SHOULD HAVE | 2-click access to all features                    |
| F-1204     | Mobile UX Enhancements  | SHOULD HAVE | Settings quick-access + swipe tab navigation      |

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

### Phase 4: Mobile UX Enhancements (F-1204)

#### 4.1 Mobile Menu Header with Settings Quick-Access

**Problem**: Settings icon is buried in mobile menu list alongside other items, requiring two taps (hamburger → scroll → settings). On desktop, Settings has prominent navbar placement.

**Solution**: Add Settings as a quick-access button in the mobile menu header, separate from the navigation list.

**Implementation** (`src/components/navbar.tsx`):

```tsx
// Update mobile menu structure
<div
  className={cn('fixed top-[var(--header-height)] left-0 right-0 bottom-0 z-50 lg:hidden', theme.surface(0))}
  role="dialog"
  aria-label="Mobile navigation menu"
>
  {/* NEW: Mobile menu header with quick-access */}
  <div className={cn('border-b', theme.border(), 'px-4 py-3 flex items-center justify-between')}>
    <h2 className={cn(ds.text.heading.h4, 'text-content-primary')}>Menu</h2>
    <ButtonLink
      to="/settings"
      isIconOnly
      variant="light"
      color="primary"
      size="lg"
      className={cn('min-w-[44px] h-[44px] flex items-center justify-center')}
      onPress={() => setIsMobileMenuOpen(false)}
      aria-label="Settings (Quick Access)"
    >
      <Settings size={24} className={theme.content('primary')} />
    </ButtonLink>
  </div>

  {/* Navigation content - Settings REMOVED from list */}
  <nav className={cn(ds.layout.container, 'flex flex-col gap-4 py-6')} aria-label="Mobile navigation">
    <Input ... />
    <ButtonLink to="/backup" ... />
    <ButtonLink to="/docs" ... />
    <Button as="a" href="https://github.com..." ... />
  </nav>
</div>
```

**Changes**:

- Add mobile menu header with "Menu" title + Settings icon (44×44px touch target)
- Remove Settings from navigation items list (eliminate duplicate)
- Settings becomes 1-tap from hamburger menu (vs 2-taps previously)

**Accessibility**:

- `aria-label="Settings (Quick Access)"` distinguishes from regular settings link
- Touch target meets WCAG 2.1 AA minimum (44×44px)
- Focus management: Settings button receives focus when menu opens

#### 4.2 Swipe Gesture Navigation for Settings Tabs

**Problem**: Settings tabs require tapping small tab buttons on mobile. Swipe navigation is expected mobile UX pattern for tabbed interfaces.

**Solution**: Add horizontal swipe gestures to navigate between Settings tabs using `react-swipeable` library.

**Installation**:

```bash
pnpm add react-swipeable
```

**Implementation** (`src/pages/settings-page.tsx`):

```tsx
import {useSwipeable} from "react-swipeable"
import {useCallback} from "react"

export function SettingsPage() {
  const tabs: SettingsTab[] = ["providers", "integrations", "appearance", "data"]
  const [selectedTab, setSelectedTab] = useState<SettingsTab>("providers")

  const handleSwipe = useCallback(
    (direction: "left" | "right") => {
      const currentIndex = tabs.indexOf(selectedTab)

      if (direction === "left" && currentIndex < tabs.length - 1) {
        setSelectedTab(tabs[currentIndex + 1])
      } else if (direction === "right" && currentIndex > 0) {
        setSelectedTab(tabs[currentIndex - 1])
      }
    },
    [selectedTab],
  )

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => handleSwipe("left"),
    onSwipedRight: () => handleSwipe("right"),
    preventScrollOnSwipe: true,
    trackTouch: true,
    trackMouse: false,
    delta: 50,
    swipeDuration: 500,
  })

  return (
    <DefaultLayout maxWidth="lg">
      <div className="space-y-6">
        <header>
          <h1 className={cn(ds.text.heading.h1)}>Settings</h1>
          <p className={cn(ds.text.body.base, "mt-2")}>Configure your AI providers, integrations, and preferences</p>
          {/* Mobile hint */}
          <p className={cn(ds.text.body.small, "mt-1 sm:hidden text-content-secondary")}>
            Swipe left or right to navigate tabs
          </p>
        </header>

        {/* Wrap Tabs with swipe handler */}
        <div {...swipeHandlers} className="touch-pan-y">
          <Tabs
            aria-label="Settings sections"
            selectedKey={selectedTab}
            onSelectionChange={handleTabChange}
            variant="underlined"
            color="primary"
          >
            {/* Tab content unchanged */}
          </Tabs>
        </div>
      </div>
    </DefaultLayout>
  )
}
```

**Changes**:

- Add `react-swipeable` dependency
- Wrap `Tabs` component with swipe handlers
- Add mobile hint text for discoverability
- 50px swipe threshold prevents accidental triggers
- `touch-pan-y` allows vertical scrolling while horizontal swipes trigger navigation

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
  When settings are saved successfully
  Then a toast notification appears at bottom-right confirming success
  And the toast displays the message "API Key Saved" with description
  And the toast auto-dismisses after 4 seconds

Scenario: Settings save failure shows error toast
  Given I am on the Settings page
  When I attempt to save an invalid API key
  Then a toast notification appears indicating failure
  And the toast displays with danger color (red)
  And the toast includes actionable error message
  And the toast auto-dismisses after 5 seconds

Scenario: Clear API key shows confirmation toast
  Given I have a configured API key
  When I click "Clear API Key" button
  Then the API key is removed
  And a toast notification confirms "API Key Cleared"

Scenario: First-time user guidance
  Given I have no providers configured
  When I visit the home page
  Then I see a prompt to configure settings
  And a "Configure Settings" button links to /settings

Scenario: MCP server configuration shows toast
  Given I am on the Settings page Integrations tab
  When I add or update an MCP server configuration
  Then a toast notification confirms "Server Added" or "Server Updated"
  When I delete an MCP server
  Then a toast notification confirms "Server Deleted"

Scenario: Theme change shows toast
  Given I am on the Settings page Appearance tab
  When I change the theme selection
  Then a toast notification confirms "Theme Updated"
  And the toast displays which theme was selected

Scenario: Clear all data shows toast before reload
  Given I am on the Settings page Data tab
  When I confirm clearing all data
  Then a toast notification appears "Data Cleared"
  And the page reloads after 1.5 seconds
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

### F-1204: Mobile UX Enhancements

```gherkin
Scenario: Settings quick-access in mobile menu header
  Given I am on any page in the application
  And I am viewing on a mobile device (viewport < 1024px)
  When I tap the hamburger menu icon
  Then the mobile menu opens
  And I see a "Menu" header with a Settings icon in the top-right
  When I tap the Settings icon
  Then I navigate to /settings (1 tap from menu)
  And the mobile menu closes

Scenario: Settings removed from mobile menu list
  Given I open the mobile menu
  When I view the navigation items list
  Then I see: Search input, Backup & Restore, Documentation, GitHub
  And I do NOT see Settings in the list (it's in the header)

Scenario: Swipe right to navigate tabs
  Given I am on the Settings page
  And I am on the "AI Providers" tab
  And I am viewing on a touch device
  When I swipe left (50px minimum)
  Then the "Integrations" tab is selected
  And the tab content updates

Scenario: Swipe left to navigate tabs backward
  Given I am on the "Data" tab
  When I swipe right (50px minimum)
  Then the "Appearance" tab is selected

Scenario: Swipe boundaries respected
  Given I am on the first tab ("AI Providers")
  When I swipe right
  Then nothing happens (already at start)

  Given I am on the last tab ("Data")
  When I swipe left
  Then nothing happens (already at end)

Scenario: Swipe doesn't conflict with vertical scroll
  Given I am on a Settings tab with scrollable content
  When I scroll vertically
  Then the page scrolls normally
  And tab navigation does NOT trigger

Scenario: Keyboard navigation still works
  Given I am on the Settings page
  When I use arrow keys or Tab to navigate
  Then tabs are keyboard-accessible (existing HeroUI behavior)
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

### Mobile UX Tests

```typescript
// tests/e2e/mobile-settings-ux.spec.ts
import {test, expect, devices} from "@playwright/test"

test.use({...devices["iPhone 13 Pro"]})

test.describe("Mobile Settings Quick-Access", () => {
  test("settings icon in mobile menu header", async ({page}) => {
    await page.goto("/")

    // Open mobile menu
    await page.getByRole("button", {name: /open menu/i}).click()

    // Verify menu header
    await expect(page.getByRole("heading", {name: "Menu"})).toBeVisible()

    // Verify Settings quick-access button
    const settingsButton = page.getByRole("button", {name: /settings.*quick access/i})
    await expect(settingsButton).toBeVisible()

    // Verify touch target size (44x44px minimum)
    const box = await settingsButton.boundingBox()
    expect(box?.width).toBeGreaterThanOrEqual(44)
    expect(box?.height).toBeGreaterThanOrEqual(44)

    // Navigate to settings
    await settingsButton.click()
    await expect(page).toHaveURL("/settings")
  })

  test("settings not duplicated in menu list", async ({page}) => {
    await page.goto("/")
    await page.getByRole("button", {name: /open menu/i}).click()

    // Count Settings links - should only be 1 (in header)
    const settingsLinks = await page.getByRole("button", {name: /settings/i}).all()
    expect(settingsLinks.length).toBe(1)
  })
})

test.describe("Settings Tab Swipe Navigation", () => {
  test("swipe left navigates to next tab", async ({page}) => {
    await page.goto("/settings")

    // Verify starting tab
    await expect(page.getByRole("tab", {name: /ai providers/i})).toHaveAttribute("aria-selected", "true")

    // Swipe left on tabs area
    const tabsContainer = page.locator("[data-swipeable]")
    const box = await tabsContainer.boundingBox()
    if (box) {
      await page.touchscreen.tap(box.x + box.width * 0.8, box.y + box.height / 2)
      await page.touchscreen.swipe(
        {x: box.x + box.width * 0.8, y: box.y + box.height / 2},
        {x: box.x + box.width * 0.2, y: box.y + box.height / 2},
      )
    }

    // Verify next tab selected
    await expect(page.getByRole("tab", {name: /integrations/i})).toHaveAttribute("aria-selected", "true")
  })

  test("swipe respects boundaries", async ({page}) => {
    await page.goto("/settings")

    // Try swiping right on first tab (should stay on first)
    const tabsContainer = page.locator("[data-swipeable]")
    const box = await tabsContainer.boundingBox()
    if (box) {
      await page.touchscreen.swipe(
        {x: box.x + box.width * 0.2, y: box.y + box.height / 2},
        {x: box.x + box.width * 0.8, y: box.y + box.height / 2},
      )
    }

    // Still on first tab
    await expect(page.getByRole("tab", {name: /ai providers/i})).toHaveAttribute("aria-selected", "true")
  })
})

// tests/accessibility/mobile-settings.accessibility.spec.ts
test.describe("Mobile Settings Accessibility", () => {
  test("settings quick-access meets touch target size", async ({page}) => {
    await page.goto("/")
    await page.getByRole("button", {name: /open menu/i}).click()

    const settingsButton = page.getByRole("button", {name: /settings.*quick access/i})
    const box = await settingsButton.boundingBox()

    // WCAG 2.1 Level AA: minimum 44x44px
    expect(box?.width).toBeGreaterThanOrEqual(44)
    expect(box?.height).toBeGreaterThanOrEqual(44)
  })

  test("swipe navigation preserves keyboard access", async ({page}) => {
    await page.goto("/settings")

    // Tab navigation still works
    await page.keyboard.press("Tab")
    await expect(page.getByRole("tab", {name: /ai providers/i})).toBeFocused()

    await page.keyboard.press("ArrowRight")
    await expect(page.getByRole("tab", {name: /integrations/i})).toBeFocused()
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
- **Swipe gesture optimization**: `react-swipeable` uses passive event listeners for 60fps touch tracking
- **Mobile menu animations**: Use `motion-safe:` prefix to respect prefers-reduced-motion

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

### Phase 4: Mobile UX Enhancements

- [ ] Add Settings quick-access button to mobile menu header (`navbar.tsx`)
- [ ] Remove Settings from mobile menu items list (eliminate duplicate)
- [ ] Install `react-swipeable`: `pnpm add react-swipeable`
- [ ] Add swipe gesture handlers to SettingsPage
- [ ] Add `data-swipeable` attribute to swipe container for testing
- [ ] Add mobile hint text for swipe navigation (visible on sm breakpoint only)
- [ ] Test swipe gestures don't conflict with vertical scroll
- [ ] Write E2E tests for mobile menu settings quick-access
- [ ] Write E2E tests for swipe navigation
- [ ] Update accessibility tests for touch target sizes (44×44px minimum)
- [ ] Update visual regression baselines for mobile menu header
