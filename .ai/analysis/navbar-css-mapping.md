# Navbar Component CSS Custom Property Mapping Analysis

## Overview
Analysis of current CSS custom property usage in `src/components/navbar.tsx` and mapping to semantic design system tokens for Phase 1 migration.

## Current CSS Custom Properties

### Background Properties
| Current Property | Usage Location | Semantic Token Mapping | Notes |
|------------------|----------------|------------------------|-------|
| `var(--background-primary)` | Header background, Mobile menu background | `bg-surface-primary` | Primary surface level |
| `var(--background-secondary)` | Search input wrapper background | `bg-surface-secondary` | Secondary surface level |

### Text Properties
| Current Property | Usage Location | Semantic Token Mapping | Notes |
|------------------|----------------|------------------------|-------|
| `var(--text-secondary)` | Subtitle text ("Agent Framework") | `text-content-secondary` | Secondary text hierarchy |
| `var(--text-tertiary)` | Search icon color | `text-content-tertiary` | Tertiary text hierarchy |

### Border Properties
| Current Property | Usage Location | Semantic Token Mapping | Notes |
|------------------|----------------|------------------------|-------|
| `var(--border-color)` | Header bottom border | `border-border-default` | Default border styling |

### Layout Properties
| Current Property | Usage Location | Semantic Token Mapping | Notes |
|------------------|----------------|------------------------|-------|
| `var(--header-height)` | Header height, mobile menu top positioning | **Keep as CSS custom property** | Used for layout calculations, not semantic styling |

## Migration Strategy

### Phase 2 Target Replacements
```tsx
// Current usage → Target replacement
className="bg-[var(--background-primary)]" → className="bg-surface-primary"
className="bg-[var(--background-secondary)]" → className="bg-surface-secondary"
className="border-[var(--border-color)]" → className="border-border-default"
className="text-[var(--text-secondary)]" → className="text-content-secondary"
className="text-[var(--text-tertiary)]" → className="text-content-tertiary"
```

### CSS Custom Properties to Retain
- `var(--header-height)` - Required for layout positioning, not semantic styling

## Design System Integration Opportunities

### Theme Function Usage
- Can use `theme.surface(0)` for primary background
- Can use `theme.surface(1)` for secondary background
- Can use `theme.content('secondary')` for secondary text
- Can use `theme.content('tertiary')` for tertiary text
- Can use `theme.border()` for default borders

### Utility Classes Available
- Surface levels: `bg-surface-primary`, `bg-surface-secondary`, `bg-surface-tertiary`, `bg-surface-elevated`
- Content hierarchy: `text-content-primary`, `text-content-secondary`, `text-content-tertiary`, `text-content-inverse`
- Border styles: `border-border-default`, `border-border-subtle`, `border-border-strong`

## Validation
- ✅ All CSS custom properties identified and mapped
- ✅ Semantic token equivalents confirmed in design system
- ✅ Layout-specific properties identified for retention
- ✅ Theme function alternatives documented
