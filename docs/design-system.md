# GPT Design System

The GPT AI platform uses a unified design system built on TailwindCSS and HeroUI, ensuring consistency, accessibility, and maintainability across all components and documentation.

## Design Principles

### 1. Consistency

- Use standardized spacing, typography, and color scales
- Apply consistent component patterns across the application
- Maintain visual hierarchy through systematic sizing and spacing

### 2. Accessibility

- Ensure minimum 4.5:1 contrast ratio for text
- Support keyboard navigation and screen readers
- Provide clear focus indicators and semantic markup

### 3. Modularity

- Build reusable components with clear APIs
- Separate presentation from logic
- Enable easy theme switching between light and dark modes

### 4. Performance

- Optimize for bundle size with tree-shaking
- Use CSS-in-JS patterns that compile to static CSS
- Minimize runtime style calculations

## Color System

### Brand Colors

```css
/* Primary brand color - used for CTAs, links, and active states */
--brand-500: #3b82f6; /* Primary blue */
--brand-600: #2563eb; /* Hover state */
--brand-700: #1d4ed8; /* Pressed state */
```

### Semantic Colors

```css
/* Surface colors - backgrounds and containers */
--surface-primary: 0 0% 100%;     /* Main background */
--surface-secondary: 0 0% 98%;    /* Card backgrounds */
--surface-tertiary: 0 0% 96%;     /* Subtle backgrounds */
--surface-elevated: 0 0% 100%;    /* Floating elements */

/* Content colors - text and icons */
--content-primary: 220 9% 11%;    /* Primary text */
--content-secondary: 220 9% 25%;  /* Secondary text */
--content-tertiary: 220 9% 42%;   /* Subtle text */
--content-inverse: 0 0% 100%;     /* Text on dark backgrounds */

/* Border colors */
--border-default: 220 13% 91%;    /* Standard borders */
--border-subtle: 220 13% 95%;     /* Subtle separators */
--border-strong: 220 13% 82%;     /* Emphasized borders */
```

### Usage Guidelines

- **Primary Brand**: Use `brand-500` for primary CTAs, active states, and key UI elements
- **Surface Colors**: Use the semantic surface tokens for consistent layering
- **Content Colors**: Follow the content hierarchy for text contrast
- **Error/Success/Warning**: Use HeroUI's built-in semantic colors (`danger`, `success`, `warning`)

## Typography

### Font Scale

```css
/* Headings */
text-6xl: 3.75rem (60px) - Hero titles
text-5xl: 3rem (48px) - Page titles
text-4xl: 2.25rem (36px) - Section headers
text-3xl: 1.875rem (30px) - Subsection headers
text-2xl: 1.5rem (24px) - Card titles
text-xl: 1.25rem (20px) - Component titles

/* Body text */
text-lg: 1.125rem (18px) - Large body text
text-base: 1rem (16px) - Default body text
text-sm: 0.875rem (14px) - Small text, captions
text-xs: 0.75rem (12px) - Labels, metadata
```

### Font Families

- **Sans Serif**: Inter (primary) - for UI elements and body text
- **Monospace**: Fira Code (code) - for code blocks and technical content

### Usage Patterns

```tsx
// Page titles
<h1 className="text-4xl font-bold text-content-primary">

// Section headers
<h2 className="text-2xl font-semibold text-content-primary">

// Body text
<p className="text-base text-content-secondary leading-relaxed">

// Captions and metadata
<span className="text-sm text-content-tertiary">
```

## Spacing System

### Scale

Based on 4px base unit with consistent increments:

- `0.5` = 2px (micro spacing)
- `1` = 4px (tight spacing)
- `2` = 8px (small spacing)
- `3` = 12px (base spacing)
- `4` = 16px (medium spacing)
- `6` = 24px (large spacing)
- `8` = 32px (extra large spacing)
- `12` = 48px (section spacing)
- `16` = 64px (page spacing)

### Component Spacing

```tsx
// Card internal spacing
<Card className="p-6"> // 24px internal padding

// Component gaps
<div className="space-y-4"> // 16px vertical spacing

// Section separation
<section className="mb-12"> // 48px bottom margin
```

## Component Patterns

### Cards

> `Card` is on HeroUI v3 (`@heroui-v3/react`). The v2 examples below (`CardHeader`, `CardBody`, `isPressable`) are kept for reference; see "Card (v3)" under v2/v3 Coexistence for the current API.

```tsx
// Standard card
<Card className="p-6 shadow-sm hover:shadow-md transition-shadow">
  <CardHeader className="pb-4">
    <h3 className="text-xl font-semibold">Title</h3>
  </CardHeader>
  <CardBody>
    <p className="text-content-secondary">Content</p>
  </CardBody>
</Card>

// Interactive card
<Card
  isPressable
  className="p-6 hover:scale-[1.02] transition-transform"
>
  {/* Card content */}
</Card>
```

### Buttons

> `Button` is on HeroUI v3 (`@heroui-v3/react`). The v2 examples below (`color`, `startContent`, `isLoading`) are kept for the components still on v2; see "Button (v3)" under v2/v3 Coexistence for the current API.

```tsx
// Primary action
<Button color="primary" variant="solid" size="md">
  Primary Action
</Button>

// Secondary action
<Button color="primary" variant="bordered" size="md">
  Secondary Action
</Button>

// Tertiary action
<Button color="default" variant="light" size="md">
  Tertiary Action
</Button>

// Destructive action
<Button color="danger" variant="solid" size="md">
  Delete
</Button>
```

### Form Elements

```tsx
// Text input (HeroUI v3, see "Input / TextField (v3)" under v2/v3 Coexistence)
<TextField value={value} onChange={setValue} fullWidth>
  <Label>Label</Label>
  <Input placeholder="Placeholder text" />
</TextField>
```

`Select`, `Input` / `Textarea`, `Switch`, `Checkbox` and `Radio` are on HeroUI v3: see "Select (v3)", "Input / TextField (v3)" and "Switch, Checkbox, Radio (v3)" under v2/v3 Coexistence.

## Layout Patterns

### Container Patterns

```tsx
// Page container
<div className="container mx-auto px-4 py-8 max-w-7xl">

// Content section
<section className="mb-12">
  <h2 className="text-2xl font-semibold mb-6">Section Title</h2>
  {/* Section content */}
</section>

// Card grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Cards */}
</div>
```

### Navigation

```tsx
// Navbar structure
<nav className="sticky top-0 z-fixed bg-surface-primary border-b border-border-default">
  <div className="container mx-auto px-4 h-16 flex items-center justify-between">
    {/* Navigation content */}
  </div>
</nav>
```

## State Patterns

### Loading States

```tsx
// Button loading
<Button isLoading color="primary">
  Save Changes
</Button>

// Content loading
<div className="flex justify-center p-8">
  <Spinner size="lg" color="primary" />
</div>
```

### Error States

```tsx
// Form field error
<TextField isInvalid={hasError} isRequired fullWidth>
  <Label>Name</Label>
  <Input />
  <FieldError>This field is required</FieldError>
</TextField>

// Error message
<div className="p-4 bg-danger-50 border border-danger-200 rounded-lg">
  <p className="text-danger-700">Error message here</p>
</div>
```

### Empty States

```tsx
<div className="text-center py-12">
  <div className="text-content-tertiary mb-4">
    <Icon size={48} />
  </div>
  <h3 className="text-lg font-medium text-content-primary mb-2">
    No items found
  </h3>
  <p className="text-content-secondary mb-6">
    Get started by creating your first item.
  </p>
  <Button color="primary">Create Item</Button>
</div>
```

## Responsive Design

### Breakpoint System

- `sm`: 640px - Small tablets
- `md`: 768px - Large tablets
- `lg`: 1024px - Small desktops
- `xl`: 1280px - Large desktops
- `2xl`: 1536px - Extra large screens

### Responsive Patterns

```tsx
// Responsive grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

// Responsive text
<h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">

// Mobile-first navigation
<div className="hidden lg:flex items-center gap-4">
  {/* Desktop nav items */}
</div>
<Button className="lg:hidden" variant="light" isIconOnly>
  <MenuIcon />
</Button>
```

## Accessibility Guidelines

### Focus Management

```tsx
// Visible focus rings
<Button className="focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">

// Skip links
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary-500 text-white px-4 py-2 rounded">
  Skip to main content
</a>
```

### ARIA Labels

```tsx
// Icon buttons
<Button isIconOnly aria-label="Close dialog">
  <CloseIcon />
</Button>

// Complex components
<div role="tabpanel" aria-labelledby="tab-1">
  {/* Tab content */}
</div>
```

### Color Contrast

- Ensure all text meets WCAG AA standards (4.5:1 contrast ratio)
- Use semantic colors that maintain contrast in both light and dark themes
- Test with colorblind-friendly tools

## Animation & Transitions

### Micro-interactions

```tsx
// Hover effects
<Card className="transition-all hover:scale-[1.02] hover:shadow-md">

// Focus effects
<Input className="transition-colors focus:border-primary-500">

// Loading animations
<Spinner className="animate-spin" />
```

### Page Transitions

Use consistent timing and easing for all transitions:

- `transition-fast`: 150ms - micro-interactions
- `transition-base`: 300ms - standard transitions
- `transition-slow`: 500ms - page transitions

## Dark Mode Support

All design tokens automatically support dark mode through CSS custom properties. Components should use semantic tokens rather than specific color values:

```tsx
// Good - uses semantic tokens
<div className="bg-surface-primary text-content-primary">

// Avoid - hardcoded colors
<div className="bg-white text-black">
```

## Performance Considerations

### Bundle Optimization

- Use HeroUI's tree-shaking capabilities
- Import only needed components
- Prefer CSS-in-JS patterns that compile to static CSS

### Responsive Images

```tsx
<img
  src="/images/hero.jpg"
  srcSet="/images/hero-sm.jpg 640w, /images/hero-lg.jpg 1280w"
  sizes="(max-width: 640px) 100vw, 50vw"
  alt="Description"
  loading="lazy"
/>
```

## v2/v3 Coexistence (HeroUI migration, #2162)

HeroUI v2 and v3 are installed side by side until cutover. v2 stays the default; a component moves to v3 only in its own migration PR.

### Packages and imports

| Import from         | Version | Notes                                                  |
| ------------------- | ------- | ------------------------------------------------------ |
| `@heroui/react`     | v2      | Default. `HeroUIProvider` and `src/hero.ts` stay.      |
| `@heroui-v3/react`  | v3      | Alias of `@heroui/react@3.2.7` (`npm:` alias).         |
| `@heroui-v3/styles` | v3      | Alias of `@heroui/styles@3.2.7`, used only by the CSS. |

- A file may import from both packages. Never import the same name from both without an `as` alias (`import {Button as ButtonV3} from '@heroui-v3/react'`).
- Keep both `@heroui-v3/*` aliases on the same exact version.
- Renovate holds `@heroui/react` below v3 (`.github/renovate.json5`, matched by `depName`). Remove that rule at cutover.

### Styles: a separate Tailwind root

v3 styles live in `src/styles/heroui-v3.css`, which is its own Tailwind compile. `src/index.css` does not import `@heroui-v3/styles`.

Why: v3's `@theme inline` block defines `background`, `foreground`, `overlay`, `focus`, `default`, `success`, `warning`, `danger` (and their `-foreground` keys). Inside the app's root those keys re-point the v2 plugin utilities (`bg-background`, `text-default-foreground`, `border-danger`, ...) to v3 oklch colours, and import order does not change that. A separate root keeps v3's theme bridge out of the app's utilities, so v2 components render unchanged.

Rules:

- A migrated component module imports `@/styles/heroui-v3.css` (a side-effect import) next to its `@heroui-v3/react` import.
- Add one `@import '@heroui-v3/styles/components/<name>.css' layer(components);` per migrated component family to `src/styles/heroui-v3.css`.
- Component CSS is not self-contained. The file already imports the prelude (`utilities`, `variants`, `themes/default`). Shared components must be imported before the components that use them: `close-button`, `description`, `error-message`, `field-error`, `label`.
- Skipped on purpose: `base/base.css` and `base/scrollbar.css`. They add global rules (`*` border colour, `--z-index-toast`, view-transition) that would change v2 components. Overlay components (Modal, Drawer, Popover, Tooltip, Dropdown, Select) need `@heroui-v3/styles/base/overlay-motion.css` (import it with `layer(base)`).
- v3 components use v3 tokens (radius, colours, spacing), not the app's `@theme` overrides.
- Dark mode works through the `.dark` class set by `next-themes`; v3's variables follow it.

Remaining overlaps are plain CSS variables and do not affect v2 utilities: the app's `:root`/`.dark` also defines `--surface-secondary`, `--surface-tertiary`, `--background-secondary`, `--background-tertiary` and `--accent-hover`, and wins over v3's values of the same names.

### Button (v3)

```tsx
import '@/styles/heroui-v3.css'
import {Button, Spinner} from '@heroui-v3/react'
import {buttonVariants} from '@heroui-v3/styles'

<Button variant="primary" onPress={save}>
  <Save size={16} />
  Save
</Button>

// Pending: not pressable, stays focusable, keeps its label
<Button variant="primary" isPending={isSaving}>
  {({isPending}) => (
    <>
      {isPending && <Spinner size="sm" color="current" />}
      Save
    </>
  )}
</Button>

// Link: v3 Button renders a <button> only, so style the router link
<RouterLink to="/backup" className={buttonVariants({variant: 'outline'})}>Manage Backups</RouterLink>
```

| v2 | v3 |
| --- | --- |
| `color="primary"`, `variant="solid"` | `variant="primary"` |
| `variant="light"`, `variant="flat"` | `variant="tertiary"` |
| `variant="bordered"` | `variant="outline"` |
| `variant="ghost"` | `variant="ghost"` |
| `color="danger"` (solid) | `variant="danger"` |
| `color="danger"` with `light`, `flat`, `ghost` | `variant="danger-soft"` |
| `color="success"` / `color="warning"` | `variant="primary"` plus `bg-success text-success-foreground hover:bg-success/90` (or `warning`) |
| `isLoading` | `isPending` and a `Spinner` in the children render prop |
| `startContent` / `endContent` | icons as children |
| `as={Link}` / `as="a"` | `buttonVariants()` on the `<Link>` / `<a>` |
| `title` | not accepted by the v3 types; wrap in a `Tooltip` |

v3 sizing differs from v2: no minimum width (add `min-w-*` where layout needs it), pill radius, and `svg` children are sized by the button (`size-4` from `sm`, `size-5` below), so a `size` prop on the icon is overridden. v3 draws its own focus ring and press scale; do not add `ds.focus.ring`, `ds.animation.buttonPress` or `ds.animation.transition` to a v3 Button.

`src/styles/heroui-v3.css` re-points v3's `--accent` and `--danger` at the v2 `--heroui-primary` and `--heroui-danger`. v3's own values give white button text 3.6:1 and 3.5:1, which fails the axe contrast rule (4.5:1) on `primary`; the v2 values are 4.5:1 and 4.0:1. Remove the override at cutover and re-check contrast.

### Modal (v3)

```tsx
import '@/styles/heroui-v3.css'
import {Button, Modal, useOverlayState} from '@heroui-v3/react'

const state = useOverlayState()

<Button onPress={() => state.open()}>Open</Button>

<Modal.Backdrop isOpen={state.isOpen} onOpenChange={open => state.setOpen(open)} variant="opaque">
  <Modal.Container size="md" placement="center">
    <Modal.Dialog>
      <Modal.CloseTrigger />
      <Modal.Header className="pr-8">
        <Modal.Heading>Clear all data</Modal.Heading>
      </Modal.Header>
      <Modal.Body>...</Modal.Body>
      <Modal.Footer>
        <Button variant="tertiary" onPress={() => state.close()}>Cancel</Button>
      </Modal.Footer>
    </Modal.Dialog>
  </Modal.Container>
</Modal.Backdrop>
```

Wrapper components keep their `isOpen` / `onClose` props and pass `onOpenChange={open => { if (!open) onClose() }}`. Escape, backdrop click and `Modal.CloseTrigger` all go through `onOpenChange(false)`, so the parent's handler runs once. `isDismissable` is `true` by default, same as v2. Do not use the `<Modal state={state}>` root without a trigger: it renders a `PressResponder` with no pressable child and React Aria warns.

| v2 | v3 |
| --- | --- |
| `<Modal isOpen onClose>` | `<Modal.Backdrop isOpen onOpenChange>` |
| `useDisclosure()` | `useOverlayState()`: `onOpen` → `open()`, `onClose` → `close()`, `onOpenChange` → `setOpen(isOpen)` / `toggle()`. The methods are not `this`-bound (`@typescript-eslint/unbound-method`), so wrap them: `onPress={() => state.open()}` |
| `ModalContent` | `Modal.Container` > `Modal.Dialog` |
| `ModalHeader` / `ModalBody` / `ModalFooter` | `Modal.Header` + `Modal.Heading` / `Modal.Body` / `Modal.Footer` |
| built-in close button, `hideCloseButton` | `Modal.CloseTrigger` (accessible name `Close`); leave it out where v2 had `hideCloseButton` |
| `size="md"` / `"lg"` / `"2xl"` | `size` on `Modal.Container`: `md`, `lg`; no `2xl`, use `lg` plus `max-w-2xl` on `Modal.Dialog` |
| `placement` | `placement` on `Modal.Container` (default `auto`; the app always sets `center`) |
| `backdrop="opaque"` | `variant="opaque"` on `Modal.Backdrop` (its colour, `black/50`, matches the v2 `bg-black/50` override, so drop the override) |
| `scrollBehavior="inside"` | `scroll="inside"` (v3 default) |
| default scroll (`normal`) | `scroll="outside"` (the backdrop scrolls) |
| `classNames.base` | `className` on `Modal.Dialog` |
| `classNames.header` / `footer` | `className` on `Modal.Header` / `Modal.Footer` |
| `data-testid` on `Modal` | `data-testid` on `Modal.Dialog` |

Differences to expect, and what the app does about them:

- `Modal.Body` is not a flex column and sets `text-sm text-muted`. Where v2 relied on `gap-*` or on inherited text, add `flex flex-col gap-*` and `text-base text-foreground` to `Modal.Body`.
- The dialog has uniform 24px padding instead of v2's per-section padding, so dialogs are a few px taller. Header, body and footer are spaced by v3 (8px / 20px).
- `Modal.Heading` is `text-base font-medium`; the app uses `text-lg font-semibold` (v2's `text-large`).
- v3 rounds the dialog to 32px and fills the close button. `src/styles/heroui-v3.css` keeps the v2 radius (`--heroui-radius-large`) and a transparent close button. Drop both at cutover.
- The v2 menu that opens a dialog (the GPT actions `Dropdown`) is still animating out when the dialog mounts, and v3 does not set `aria-hidden` on it, so it briefly counts as a second `role="dialog"`. Locate the dialog by name in tests: `getByRole('dialog', {name: /export/i})`.

**Do not put a v2 overlay (`Select`, `Dropdown`, `Popover`) inside a v3 `Modal`.** The two majors resolve different `@react-aria/focus` and `@react-aria/overlays` versions, so their focus scopes do not nest: the v3 modal pulls focus back from the v2 popover and the popover closes on open. (Seen on a v2 `Select` in `mcp/mcp-server-form.tsx`: `aria-expanded` flipped back to `false`, and a `portalContainer` inside the dialog did not fix it.) Use the v3 `Select` (below), which nests in the v3 modal; `mcp-server-form.tsx` is the reference. A v3 `Tooltip` and non-overlay components (the v3 `TextField`, v2 `Progress` and `Accordion`) work inside a v3 modal.

The v3 import list in `src/styles/heroui-v3.css` gains `base/overlay-motion.css` (`layer(base)`), `close-button.css` (shared, before `modal.css`) and `modal.css`.

### Select (v3)

```tsx
import '@/styles/heroui-v3.css'
import {FieldError, Label, ListBox, Select} from '@heroui-v3/react'

<Select value={transport} onChange={key => { if (key === 'stdio' || key === 'streamable-http') setTransport(key) }} fullWidth>
  <Label>Transport</Label>
  <Select.Trigger>
    <Select.Value />
    <Select.Indicator />
  </Select.Trigger>
  <Select.Popover>
    <ListBox>
      <ListBox.Item id="streamable-http" textValue="SSE / HTTP">
        SSE / HTTP (Remote)
        <ListBox.ItemIndicator />
      </ListBox.Item>
    </ListBox>
  </Select.Popover>
</Select>
```

| v2 | v3 |
| --- | --- |
| `Select` + `SelectItem` | `Select` > `Select.Trigger` (`Select.Value`, `Select.Indicator`) + `Select.Popover` > `ListBox` > `ListBox.Item` |
| `label` + `labelPlacement="outside"` | `<Label>` as a child of `Select`; with no visible label, `aria-label` on `Select` |
| `selectedKeys={[k]}` + `onSelectionChange` / `onChange(e)` | `value={k}` (`null` for none) + `onChange(key)`; `key` is `Key \| null`, so narrow it. There is no `disallowEmptySelection`: guard against `null` in `onChange` |
| `SelectItem key` / `textValue` | `ListBox.Item id` / `textValue` (set `textValue` when the children are not plain text) |
| `startContent` | children of `ListBox.Item` (the selected item is rendered into `Select.Value` as is) |
| `placeholder` | `placeholder` on `Select` |
| `isInvalid` + `errorMessage` | `isInvalid` on `Select` + `<FieldError>` as a child |
| `popoverProps.classNames.content` | `className` on `Select.Popover` |
| `variant="bordered"`, `size` | none; v3 has `variant="primary" \| "secondary"` and one size |
| full width by default | `fullWidth` |

Differences to expect:

- `Select.Value` shows the selected item's full children, not its `textValue` (the MCP form's Transport now reads `SSE / HTTP (Remote)` in the trigger). An icon beside the text needs `className="flex items-center gap-2"` on `Select.Value`.
- The selected item gets a checkmark (`ListBox.ItemIndicator`) instead of a filled row.
- v3's trigger has no border (`--border-width-field` is 0), so on a plain dialog it reads as a row, not a control. `src/styles/heroui-v3.css` gives it the shared field border (see "Field border" under Input / TextField (v3)): the same rule serves `Input`, `TextArea` and `InputGroup`. Drop it at cutover and re-check contrast.
- The trigger is a plain `button` with the `aria-haspopup="listbox"` attribute and a `data-slot="select-trigger"` (v2 used `data-slot="trigger"`). Its accessible name is the selected value plus the label (`Light Theme selection`), so match names with a substring or regex.
- The popover is a v3 overlay: put it in a v3 `Modal`, never in a v2 one. Escape closes the popover first, then the modal.
- Pass `aria-label` when there is no `<Label>`; v3 does not name the select from `placeholder`.

`src/styles/heroui-v3.css` gains `label.css` and `field-error.css` (shared, first), then `list-box-item.css`, `list-box.css` and `select.css`.

### Switch, Checkbox, Radio (v3)

```tsx
import '@/styles/heroui-v3.css'
import {Checkbox, Description, Label, Radio, RadioGroup, Switch} from '@heroui-v3/react'

<Switch isSelected={on} onChange={setOn} size="sm">
  <Switch.Content>
    <Switch.Control><Switch.Thumb /></Switch.Control>
    <Label className="font-normal">Include metadata</Label>
  </Switch.Content>
  <Description className="text-content-tertiary">Model info, token usage</Description>
</Switch>

<Checkbox id="webBrowsing" isSelected={on} onChange={setOn}>
  <Checkbox.Content>
    <Checkbox.Control className="size-5"><Checkbox.Indicator /></Checkbox.Control>
    Web browsing
  </Checkbox.Content>
</Checkbox>

<RadioGroup name="format" aria-labelledby={headingId} value={format} onChange={setFormat}>
  <Radio value="json" className="mt-0">
    <Radio.Content>
      <Radio.Control><Radio.Indicator /></Radio.Control>
      JSON
    </Radio.Content>
  </Radio>
</RadioGroup>
```

| v2 | v3 |
| --- | --- |
| `onValueChange` | `onChange` (same `(value) => void`) |
| `<Switch>label</Switch>` | `Switch.Content` > `Switch.Control` > `Switch.Thumb`, then the `Label`. A label-less switch keeps `aria-label` on `Switch` |
| `size="sm"` on `Switch` | `size="sm"` (kept) |
| `color` on `Switch` / `Checkbox` | none. The checked fill follows `--accent`. `color="danger"`: `className="[--accent:var(--danger)]"` on `Checkbox` |
| `size` on `Checkbox` | none: `size-5` on `Checkbox.Control` (default `size-4`, v2's `sm`) |
| `<Checkbox>label</Checkbox>` | `Checkbox.Content` > `Checkbox.Control` > `Checkbox.Indicator`, then the label. Put `id` on `Checkbox`: it lands on the `<input>` as before |
| `description` slot / a second `<span>` in the label | `Description` as a sibling of `*.Content` (outside the clickable label) |
| `RadioGroup` + `Radio` | `RadioGroup` + `Radio` > `Radio.Content` > `Radio.Control` > `Radio.Indicator`. `name` is needed for forms |
| `Radio aria-label` with no label | the same, keep `aria-label` on `Radio` and still render `Radio.Content` > `Radio.Control` |
| `classNames.base` on `Radio` | `className` on `Radio.Content` (the clickable label): put a card's padding, background and border there so the whole card is the click target. `data-selected` is set on `Radio.Content` |
| `classNames.wrapper` on `RadioGroup` | `className` on `RadioGroup` |

Differences to expect, and what the app does about them:

- Selected switches, checkboxes and radios are the Button accent, not v2's colours. The backup switches were neutral grey when on; they are blue now. `src/styles/heroui-v3.css` already re-points `--accent` at `--heroui-primary`.
- The app's `:root` / `.dark` define their own `--accent-hover` (`#e5e5e5` in dark), which beats v3's. `heroui-v3.css` derives it from `--accent` for these controls so a white checkmark never sits on pale grey on hover.
- v3's unchecked checkbox and radio have no border (`--border-width-field` is 0), so on a plain page or dialog they have no edge. `heroui-v3.css` gives them the 2px `default-500` border the Select trigger has, and the unchecked switch track is `default-500` too. Contrast against the surface behind: 4.1:1 to 4.8:1 (light), 6.5:1 to 8.2:1 (dark), and 4.6:1 / 6.8:1 for the switch track. v2 was 1.5:1 (checkbox border) and 1.2:1 / 1.7:1 (switch track). WCAG 1.4.11 needs 3:1. Drop the overrides at cutover and re-check.
- A selected radio is a filled disc with a white dot; v2 was a ring with a dot. v3's default radio is 16px; the app passes `size-5` to `Radio.Control` where v2's 20px radio was used.
- `RadioGroup` adds `mt-4` to every radio in a vertical group. Pass `mt-0` / `m-0` on `Radio` and use `gap-*` on the group.
- The label sits in `font-medium`. Rows that used v2's normal weight pass `font-normal` to `Label`.
- The description sits below the row with the `gap-1` of the root, a few px looser than v2's stacked label.
- A `Label` and `Description` must be children of the control for the accessible name and description to be wired up. The old backup switches had a bare `<span>` beside them and no accessible name; their label is now the switch's.
- The checkbox's hidden input is the focus target. `getByRole('checkbox', {name})` and `getByLabel` work; a force click on the input still toggles it.

`src/styles/heroui-v3.css` gains `description.css` (shared, first), `switch.css`, `checkbox.css`, `radio.css` and `radio-group.css`, plus one override block for the points above.

### Card (v3)

```tsx
import '@/styles/heroui-v3.css'
import {Card} from '@heroui-v3/react'

<Card className="max-w-sm">
  <Card.Header>
    <Card.Title>Title</Card.Title>
  </Card.Header>
  <Card.Content>...</Card.Content>
  <Card.Footer>...</Card.Footer>
</Card>

// A card that does one thing: a link or button inside it, stretched over the card
<Card className="has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-primary-500 has-[a:focus-visible]:ring-offset-2">
  <Card.Content>
    <h3>
      <RouterLink to="/settings" className="outline-none after:absolute after:inset-0 after:content-['']">
        Settings
      </RouterLink>
    </h3>
  </Card.Content>
</Card>
```

| v2 | v3 |
| --- | --- |
| `CardHeader` / `CardBody` / `CardFooter` | `Card.Header` / `Card.Content` / `Card.Footer` (`Card.Title` and `Card.Description` are new) |
| `isPressable` + `onPress` | removed. Put one `<button>` or link inside and stretch it over the card (`after:absolute after:inset-0`; the card is `relative`). The card is not a button, so it holds no other interactive element as a nested child of a button |
| `isHoverable` | `hover:bg-content2` (v2 used `data-hover` on `content2`) |
| `shadow="sm"` | `shadow-small` (v2 plugin class) |
| `as`, `radius`, `fullWidth`, `isBlurred`, `isDisabled`, `classNames` | removed; Tailwind classes and conditional rendering |

`src/styles/heroui-v3.css` keeps v2 parity (drop it with the v2 plugin at cutover): no padding or gap on the card, 12px on header / content / footer (the header is a row), 14px radius (`--heroui-radius-large`), `overflow: hidden`, `content1` surface, the v2 medium shadow and `foreground` text. v3's own card is `p-4 gap-3`, `rounded-3xl`, `bg-surface` and `shadow-surface`. Class names on the call site still win (they are Tailwind utilities).

The `[data-slot='card'], .heroui-card` rule that used to sit in `src/index.css` is gone. v2's card never carried `data-slot="card"`, so it matched nothing; v3's card does, and the rule is unlayered, so it would have beaten every `bg-*` and `border-*` class on a card. Style cards through classes.

Focus: the card has no focus ring of its own; show it from the inner link or button with `has-[a:focus-visible]` / `has-[button:focus-visible]` (`transition-all` makes it appear over 200 ms, so wait before a screenshot). A stretched link activates on Enter only; a `<button>` also activates on Space.

### Link (v3)

```tsx
import {Link} from '@heroui-v3/react'

<Link href="https://example.com" target="_blank" rel="noopener noreferrer">
  Open in ChatGPT
  <Link.Icon />
</Link>
```

| v2 | v3 |
| --- | --- |
| `isExternal` | `target="_blank" rel="noopener noreferrer"` |
| `showAnchorIcon` | `<Link.Icon />` child (a smaller external-link arrow; pass `className="size-[1em] pb-0"` to size it to the text) |
| `color="primary"`, `size`, `underline` | removed. `font-medium text-primary`, a `text-*` class (the v2 plugin's `text-primary` still works), `underline` classes. v3 underlines on hover; v2 faded |
| `title` | not in the v3 types and not forwarded; wrap the link in a `Tooltip` (the footer does) |
| `as` | removed; style a router link with Tailwind |

v3's `.link` is `font-medium`; add `font-normal` where v2 text was regular. A router link is still react-router's `Link` (with `buttonVariants()` for a button look); the v3 `Link` is for `href`s.

### Avatar (v3)

```tsx
<Avatar size="md" className="rounded-full ring-2 ring-default ring-offset-2 ring-offset-background">
  <Avatar.Image alt="GPT Logo" src={url} />
  <Avatar.Fallback>{title.slice(0, 1).toUpperCase()}</Avatar.Fallback>
</Avatar>
```

| v2 | v3 |
| --- | --- |
| `src`, `alt` | `Avatar.Image` (`src`, `alt`) |
| `name` | removed. `Avatar.Fallback` shows when the image fails or is loading, so render the initials yourself |
| `isBordered`, `radius="full"` | `ring-2 ring-default ring-offset-2 ring-offset-background`, `rounded-full` |
| `size`, `color` | `size` `sm` / `md` / `lg` (same pixel sizes); `color` `primary` → `accent`, `secondary` → `default` |

### Tooltip (v3)

```tsx
import {Button, Tooltip} from '@heroui-v3/react'

// A Button is already focusable: it is the trigger, no Tooltip.Trigger
<Tooltip delay={0}>
  <Button isIconOnly aria-label="Back" onPress={back}>
    <ChevronLeft />
  </Button>
  <Tooltip.Content>Back to Library</Tooltip.Content>
</Tooltip>

// Anything else needs Tooltip.Trigger, which renders a focusable role="button" div
<Tooltip delay={0}>
  <Tooltip.Trigger>
    <Chip>Failed</Chip>
  </Tooltip.Trigger>
  <Tooltip.Content>{error}</Tooltip.Content>
</Tooltip>
```

| v2 | v3 |
| --- | --- |
| `<Tooltip content="…">trigger</Tooltip>` | `<Tooltip delay={0}>` trigger + `<Tooltip.Content>…</Tooltip.Content>` |
| default delay 0 | default 1500 ms (`--tooltip-delay`); pass `delay={0}` to keep v2 timing |
| `placement`, `offset`, `showArrow` | on `Tooltip.Content` (`<Tooltip.Arrow />` inside). v3's default offset is 3px; v2's was 7px |
| `color`, `size`, `radius`, `shadow`, `classNames` | removed |

Do not wrap a `Button` in `Tooltip.Trigger`: that nests a button in a `role="button"` div. The tooltip still needs the `aria-label` on an icon-only `Button`; it adds the text as the description (`aria-describedby`) on hover or keyboard focus, and Escape closes it. A non-interactive trigger (the showcase capability badge) becomes a tab stop through `Tooltip.Trigger`, and its content is the accessible name.

`src/styles/heroui-v3.css` keeps the v2 look until cutover: 12px radius, `4px 10px` padding at 14px / 20px, the small shadow and the `content1` surface (v3: 24px radius, `p-2` at 12px, `bg-overlay`). Playwright's single `hover()` can miss a React Aria tooltip; move the mouse in two steps.

The v3 import list in `src/styles/heroui-v3.css` gains `card.css`, `link.css`, `avatar.css` and `tooltip.css` (all standalone).

### Input / TextField (v3)

```tsx
import '@/styles/heroui-v3.css'
import {Description, FieldError, Input, InputGroup, Label, TextArea, TextField} from '@heroui-v3/react'

// Labelled field with description and error
<TextField value={name} onChange={setName} isInvalid={!!error} isRequired fullWidth>
  <Label>Folder Name</Label>
  <Input placeholder="Enter folder name" maxLength={50} />
  <Description>Created inside the selected folder</Description>
  <FieldError>{error}</FieldError>
</TextField>

// Icon (search): InputGroup inside TextField; no visible label, so aria-label on TextField
<TextField type="search" value={query} onChange={setQuery} aria-label="Search GPTs" fullWidth>
  <InputGroup fullWidth>
    <InputGroup.Prefix>
      <Search size={16} aria-hidden="true" />
    </InputGroup.Prefix>
    <InputGroup.Input placeholder="Search GPTs..." />
  </InputGroup>
</TextField>

// Multi-line
<TextField value={prompt} onChange={setPrompt} fullWidth>
  <Label>System Prompt</Label>
  <TextArea rows={5} fullWidth />
</TextField>
```

| v2 | v3 |
| --- | --- |
| `Input` (a whole field) | `TextField` (state, label, validation) > `Input` (the control) |
| `Textarea` | `TextField` > `TextArea` |
| `label`, `labelPlacement="outside"` | `<Label>` child of `TextField`; with no visible label, `aria-label` on `TextField` (RAC puts it on the `<input>`) |
| `description` / `classNames.description` | `<Description>` child (`className` for colour); hidden while the field is invalid |
| `errorMessage` | `<FieldError>` child; renders only while `isInvalid` is set |
| `value`, `onValueChange(value)` | `value`, `onChange(value)` on `TextField` (a string, not an event) |
| `onChange(event)`, then `event.target.value` | `onChange(value)` on `TextField`. A handler that read `e.target.name` takes the name as an argument |
| `isInvalid`, `isRequired`, `isDisabled`, `type`, `name`, `autoComplete`, `autoFocus`, `maxLength`, `validationBehavior` | same names, on `TextField` |
| `required` (native attribute) | `isRequired` on `TextField` (sets `required` under native validation, `aria-required` under `validationBehavior="aria"`, and the Label asterisk) |
| `placeholder`, `onKeyDown`, `aria-expanded`, `aria-controls`, `role` | on `Input` / `InputGroup.Input` (DOM attributes of the control) |
| `onFocus`, `onBlur` | `TextField` accepts both; use `Input` for handlers that need the DOM event of the control only |
| `startContent` / `endContent` | `InputGroup.Prefix` / `InputGroup.Suffix` around `InputGroup.Input` |
| `variant="bordered"`, `size`, `radius`, `color` | none; `variant="primary" \| "secondary"` and one size. The field border is added in CSS (below) |
| `classNames.*`, `className` (wrapper) | `className` on `TextField`, `Input`, `InputGroup`, `Label` |
| `minRows` | `rows` on `TextArea` (no autosize) |
| full width by default | `fullWidth` on `TextField` (and on `Input` / `TextArea` when the field sits in a flex row) |

**Validation.** `TextField` is a React Aria field with the same `validationBehavior` switch as v2: default `native` (sets `required` and runs the browser's form validation), `aria` (no native attributes; only `aria-invalid`). `passphrase-modal.tsx` keeps `validationBehavior="aria"` on both fields. Controlled `isInvalid` plus a `<FieldError>` child works without `validate`: the input gets `aria-invalid="true"` and `aria-describedby` pointing at the error text.

**Field border.** v3 fields have no border (`--border-width-field` is 0), and v2's `default-200` resting border is 1.2:1 against white, below the 3:1 WCAG 1.4.11 needs. One rule in `src/styles/heroui-v3.css` serves `.select__trigger`, `.input`, `.textarea` and `.input-group`: 2px (`--heroui-border-width-medium`), `--heroui-radius-medium`, `default-500` at rest, `default-600` on hover, `default-foreground` on focus. It sets v3's own `--field-border*` variables, so v3's hover, focus and invalid rules still apply and the invalid state keeps its danger colour. The prefix / suffix divider is set to 0 so it does not double the group border. Measured against the page, a v2 `Card` and a dialog (`bg-surface-secondary`):

| State                        | Light          | Dark             |
| ---------------------------- | -------------- | ---------------- |
| Rest (`default-500`)         | 4.6:1 to 4.8:1 | 6.8:1 to 8.2:1   |
| Hover (`default-600`)        | 7.4:1 to 7.7:1 | 11.8:1 to 14.2:1 |
| Focus (`default-foreground`) | 20.1:1 to 21:1 | 17.4:1 to 21:1   |

Drop the rule at cutover and re-check contrast.

Differences to expect:

- Flat v2 fields (no `variant="bordered"`) now have a border. Fields keep the v3 fill (`bg-field`, white in light, `default` in dark) instead of v2's `default-100`.
- Heights follow v3 (`min-h-9` for `InputGroup`, `py-2` for `Input`), so a few are 2-4px different from v2.
- `Label` is `text-sm font-medium`, and a required field shows a red asterisk. The two `<label htmlFor>` rows in the GPT editor are now `Label`s inside the `TextField`, so the label is tied to the control and the whole row is the `TextField` (`flex flex-col sm:flex-row`).
- `type="search"` inputs have the browser's native clear button; v2's `pr-9` padding for it is gone. v3 `SearchField` is not used (the epic excludes new v3-only components).
- v2 `Textarea` grew with its content; v3 `TextArea` is `rows` plus the browser's resize handle.
- `Input` is not an overlay, so a v3 `TextField` works inside a v3 `Modal` (the folder, passphrase and MCP server dialogs) and next to v2 components. The focus problem in the Modal section is only about v2 overlays.

`src/styles/heroui-v3.css` gains `description.css` (shared, first), then `input.css`, `textarea.css`, `input-group.css` and `textfield.css`.

### Cutover

After the last component migrates and the v2 plugin is removed: replace the per-component imports with `@import '@heroui/styles';` in `src/index.css` (the full package, as upstream documents), delete `src/styles/heroui-v3.css` and the side-effect imports, rename the aliases back to `@heroui/*`, and drop the Renovate hold. The colour-key collision no longer exists once v2 utilities are gone.

## Migration Guidelines

When updating existing components to use the design system:

1. **Colors**: Replace CSS custom properties with semantic tokens
2. **Spacing**: Use the standardized spacing scale
3. **Typography**: Apply consistent font sizes and weights
4. **Components**: Migrate to HeroUI components where possible
5. **States**: Implement standard loading, error, and empty states
