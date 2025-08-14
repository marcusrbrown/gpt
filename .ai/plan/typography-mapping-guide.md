# Typography Mapping Document

**Created**: 2025-08-13
**Purpose**: Mapping guide for consistent transformation from manual typography classes to design system utilities

## Overview

This document provides systematic mapping patterns for transforming existing manual typography classes to unified design system utilities across all components. It ensures consistent application of typography tokens and responsive behavior.

## Design System Typography Utilities

### Available Utilities from `@/lib/design-system`

```typescript
// Heading hierarchy
ds.text.heading.h1  // text-4xl font-bold text-content-primary leading-tight
ds.text.heading.h2  // text-2xl font-semibold text-content-primary leading-tight
ds.text.heading.h3  // text-xl font-semibold text-content-primary leading-tight
ds.text.heading.h4  // text-lg font-medium text-content-primary leading-tight

// Body text hierarchy
ds.text.body.large  // text-lg text-content-secondary leading-relaxed
ds.text.body.base   // text-base text-content-secondary leading-relaxed
ds.text.body.small  // text-sm text-content-tertiary leading-relaxed

// Caption text
ds.text.caption    // text-xs text-content-tertiary uppercase tracking-wide

// Responsive heading utilities
responsive.heading.responsive // text-2xl sm:text-3xl lg:text-4xl font-bold
responsive.heading.large      // text-xl sm:text-2xl lg:text-3xl font-semibold
responsive.heading.medium     // text-lg sm:text-xl lg:text-2xl font-medium
```

### Available Color Tokens

```typescript
// Semantic text color tokens
text-content-primary    // Main text, headings
text-content-secondary  // Body text, descriptions
text-content-tertiary   // Metadata, captions, disabled text
text-content-inverse    // Text on dark backgrounds
```

## Transformation Mapping Patterns

### 1. Heading Elements Mapping

| Current Manual Class | → | Design System Utility | Context |
|---------------------|---|----------------------|---------|
| `text-4xl font-bold` | → | `ds.text.heading.h1` | Hero titles, page headers |
| `text-3xl font-bold` | → | `ds.text.heading.h1` | Hero titles, page headers |
| `text-2xl font-semibold` | → | `ds.text.heading.h2` | Section headers |
| `text-xl font-semibold` | → | `ds.text.heading.h3` | Component titles |
| `text-lg font-medium` | → | `ds.text.heading.h3` | Component titles |
| `text-lg font-semibold` | → | `ds.text.heading.h3` | Component titles |
| `text-md font-semibold` | → | `ds.text.heading.h4` | Card titles |
| `text-sm font-medium` | → | `ds.text.heading.h4` | Form section headers |

### 2. Body Text Mapping

| Current Manual Class | → | Design System Utility | Context |
|---------------------|---|----------------------|---------|
| `text-lg` | → | `ds.text.body.large` | Prominent descriptions |
| `text-base` | → | `ds.text.body.base` | Main content, paragraphs |
| `text-sm` | → | `ds.text.body.small` | Helper text, captions |
| `text-xs` | → | `ds.text.body.small` or `ds.text.caption` | Metadata, timestamps |

### 3. Color Token Mapping

| Current Manual Class | → | Design System Token | Usage |
|---------------------|---|---------------------|-------|
| `text-gray-700` | → | `text-content-primary` | Main headings, primary text |
| `text-gray-600` | → | `text-content-secondary` | Body text, descriptions |
| `text-gray-500` | → | `text-content-tertiary` | Metadata, captions |
| `text-black` | → | `text-content-primary` | Main headings, primary text |
| `text-white` | → | `text-content-inverse` | Text on dark backgrounds |
| `text-[var(--text-primary)]` | → | `text-content-primary` | Custom property → semantic token |
| `text-[var(--text-secondary)]` | → | `text-content-secondary` | Custom property → semantic token |
| `text-[var(--text-tertiary)]` | → | `text-content-tertiary` | Custom property → semantic token |

### 4. Responsive Typography Mapping

| Current Manual Classes | → | Design System Utility | Context |
|------------------------|---|----------------------|---------|
| `text-2xl sm:text-3xl lg:text-4xl` | → | `responsive.heading.responsive` | Hero titles |
| `text-xl sm:text-2xl lg:text-3xl` | → | `responsive.heading.large` | Major section headers |
| `text-lg sm:text-xl lg:text-2xl` | → | `responsive.heading.medium` | Component headers |

## Component-Specific Mapping Guide

### Card Components

```typescript
// Card titles
"text-md font-semibold" → ds.text.heading.h4
"text-lg font-medium" → ds.text.heading.h3

// Card descriptions
"text-sm text-gray-600" → cn(ds.text.body.small, 'text-content-secondary')
"text-base text-gray-500" → cn(ds.text.body.base, 'text-content-tertiary')

// Card metadata
"text-xs text-gray-500" → ds.text.caption
"text-small text-default-500" → cn(ds.text.caption, 'text-content-tertiary')
```

### Form Components

```typescript
// Form section headers
"text-xl font-semibold" → ds.text.heading.h3
"text-lg font-medium" → ds.text.heading.h3

// Form labels
"text-sm font-medium text-gray-700" → cn(ds.text.heading.h4, 'text-content-primary')

// Helper text
"text-xs text-gray-500" → cn(ds.text.body.small, 'text-content-tertiary')

// Error text
"text-xs text-red-500" → cn(ds.text.body.small, 'text-danger')
```

### Chat/Message Components

```typescript
// Message text
"text-base" → ds.text.body.base
"text-sm" → ds.text.body.small

// Timestamps
"text-xs text-gray-500" → ds.text.caption

// User/System labels
"text-sm font-medium" → ds.text.heading.h4
```

## Implementation Guidelines

### 1. Semantic Hierarchy Rules

- **h1**: Use for page titles and hero sections only
- **h2**: Use for major section headers
- **h3**: Use for component titles and subsection headers
- **h4**: Use for card titles, form section headers, and small headings
- **body.large**: Use for prominent descriptions and lead text
- **body.base**: Use for main content, paragraphs, and standard text
- **body.small**: Use for helper text, captions, and secondary information
- **caption**: Use for metadata, timestamps, and uppercase labels

### 2. Color Usage Rules

- **content-primary**: Main headings, important text, form labels
- **content-secondary**: Body text, descriptions, standard content
- **content-tertiary**: Metadata, captions, less important information
- **content-inverse**: Text on dark/colored backgrounds

### 3. Responsive Considerations

- Use `responsive.heading.*` utilities for main page/section titles
- Apply responsive behavior to hero text and major headings
- Keep body text consistent across breakpoints unless specific design requires scaling
- Test at key breakpoints: 320px (mobile), 768px (tablet), 1024px (desktop)

### 4. Combination Patterns

```typescript
// Combining utilities with cn()
cn(ds.text.heading.h3, 'text-content-secondary')     // H3 with secondary color
cn(ds.text.body.base, 'text-content-tertiary')      // Base text with tertiary color
cn(responsive.heading.large, 'text-content-primary') // Responsive heading with primary color
```

## Validation Checklist

Before applying transformations, verify:

- [ ] Semantic heading hierarchy is maintained (h1 → h2 → h3 → h4)
- [ ] Color contrast ratios meet accessibility standards
- [ ] Text remains readable at all breakpoints
- [ ] Visual hierarchy is preserved or improved
- [ ] Design system utilities are imported in the component
- [ ] No manual font-size, font-weight, or color classes remain

## Component File Reference

### Files Requiring Heading Hierarchy Updates
- `src/components/card-group.tsx` - Section headings
- `src/components/gpt-editor.tsx` - Form labels and section headers
- `src/components/feature-card.tsx` - Card titles
- `src/components/api-settings.tsx` - Settings headers
- `src/components/knowledge-configuration.tsx` - Section headers
- `src/components/tools-configuration.tsx` - Form labels
- `src/components/user-gpt-card.tsx` - Card titles

### Files Requiring Color Token Updates
- All components with `text-gray-*` classes
- Components using CSS custom properties: `text-[var(--text-*)]`
- Error states and status indicators

### Files Requiring Responsive Typography
- Hero sections and page headers
- Main navigation and section titles
- Cards and component headers requiring mobile optimization

---

**Next Steps**: Use this mapping guide during Implementation Phases 1-3 to ensure consistent typography transformation across all components.
