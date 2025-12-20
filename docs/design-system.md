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
// Text input
<Input
  label="Label"
  placeholder="Placeholder text"
  variant="bordered"
  size="md"
  className="max-w-xs"
/>

// Select dropdown
<Select
  label="Choose option"
  variant="bordered"
  size="md"
  className="max-w-xs"
>
  <SelectItem key="option1">Option 1</SelectItem>
</Select>
```

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
<Input
  isInvalid={hasError}
  errorMessage="This field is required"
/>

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

## Migration Guidelines

When updating existing components to use the design system:

1. **Colors**: Replace CSS custom properties with semantic tokens
2. **Spacing**: Use the standardized spacing scale
3. **Typography**: Apply consistent font sizes and weights
4. **Components**: Migrate to HeroUI components where possible
5. **States**: Implement standard loading, error, and empty states
