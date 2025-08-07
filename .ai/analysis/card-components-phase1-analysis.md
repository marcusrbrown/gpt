# Card Components Analysis - Phase 1

## TASK-002: CSS Custom Property Usage Analysis in feature-card.tsx

### Current CSS Custom Properties Found:
1. `--background-tertiary` → Used for icon container background
2. `--accent-color` → Used for icon color and hover text color
3. `--text-primary` → Used for card title text
4. `--text-tertiary` → Used for domain text
5. `--text-secondary` → Used for description text
6. `--accent-hover` → Used for hover state text color
7. `--border-color` → Used for card border
8. `--background-secondary` → Used for card background

### Semantic Token Mapping:
| CSS Custom Property | Semantic Token | Design System Utility |
|-------------------|----------------|---------------------|
| `--background-tertiary` | `bg-surface-tertiary` | `theme.surface(2)` |
| `--accent-color` | `text-primary-500` | HeroUI primary color |
| `--text-primary` | `text-content-primary` | `theme.content('primary')` |
| `--text-tertiary` | `text-content-tertiary` | `theme.content('tertiary')` |
| `--text-secondary` | `text-content-secondary` | `theme.content('secondary')` |
| `--accent-hover` | `text-primary-600` | HeroUI primary hover |
| `--border-color` | `border-border-default` | `theme.border('default')` |
| `--background-secondary` | `bg-surface-secondary` | `theme.surface(1)` |

## TASK-003: Current Spacing Patterns Analysis

### Spacing Usage Across Components:

#### user-gpt-card.tsx:
- `max-w-[400px]` - Card container max width
- `gap-3` - CardHeader flex gap (12px)
- No explicit padding (uses HeroUI defaults)

#### feature-card.tsx:
- `gap-4` - Icon and text gap (16px)
- `p-3` - Icon container padding (12px)
- `p-6` - Card padding (24px)
- `mt-4` - Margin top for description and link (16px)

#### card.tsx:
- `max-w-[400px]` - Card container max width
- `gap-3` - CardHeader flex gap (12px)
- No explicit padding (uses HeroUI defaults)

### 4px-Based Scale Mapping:
| Current | 4px Scale | Tailwind Class | Design System |
|---------|-----------|----------------|---------------|
| `gap-3` (12px) | 3 units | `gap-3` | ✓ Already aligned |
| `gap-4` (16px) | 4 units | `gap-4` | ✓ Already aligned |
| `p-3` (12px) | 3 units | `p-3` | ✓ Already aligned |
| `p-6` (24px) | 6 units | `p-6` | ✓ Already aligned |
| `mt-4` (16px) | 4 units | `mt-4` | ✓ Already aligned |
| `max-w-[400px]` | Custom | Consider `max-w-sm` (384px) | Needs standardization |

**Recommendation**: Most spacing is already 4px-aligned. Consider using `max-w-sm` for consistency.

## TASK-004: HeroUI Component Usage Audit

### user-gpt-card.tsx ✅ Good HeroUI Usage:
- ✅ Uses `Card, CardHeader, CardBody, CardFooter`
- ✅ Uses `Divider` for section separation
- ✅ Uses `Button` with proper props
- ⚠️ Uses hardcoded classes: `text-small text-default-500`
- ⚠️ No consistent padding patterns (relies on HeroUI defaults)

### card.tsx ✅ Good HeroUI Usage:
- ✅ Uses `Card as NextUICard, CardHeader, CardBody, CardFooter`
- ✅ Uses `Avatar` with proper sizing
- ✅ Uses `Link` component with external link handling
- ✅ Uses `Divider` for section separation
- ⚠️ Uses hardcoded classes: `text-small text-default-500`
- ⚠️ No consistent padding patterns (relies on HeroUI defaults)

### feature-card.tsx ❌ Poor HeroUI Usage:
- ❌ Uses `div` structure instead of HeroUI Card components
- ❌ Manual border and background styling instead of Card props
- ❌ Custom hover effects instead of HeroUI interactions
- ❌ No HeroUI component usage at all - complete rewrite needed

### Consistency Issues:
1. **Text styling**: Both user-gpt-card and card use `text-small text-default-500` - should use design system utilities
2. **Padding**: Inconsistent between manual padding and HeroUI defaults
3. **Hover effects**: feature-card uses custom CSS, others use HeroUI `isHoverable`

## TASK-005: Integration Points Analysis

### Primary Integration Point: card-group.tsx
- **Uses**: `UserGPTCard` component directly
- **Pattern**: `{userGPTs.map(gpt => <UserGPTCard key={gpt.id} gpt={gpt} />)}`
- **Critical**: Changes to UserGPTCard props interface would break this
- **Safety**: Current interface `{ gpt: GPTConfiguration }` must be preserved

### Secondary Usage Points:
- `Card` component: Used for external GPT showcases (mine.json data)
- `FeatureCard`: No direct usage found in codebase (safe for complete rewrite)

### Dependencies to Preserve:
1. **UserGPTCard interface**: `UserGPTCardProps.gpt: GPTConfiguration`
2. **Card interface**: `CardProps` must remain compatible
3. **Routing**: Link components must continue working with react-router-dom
4. **Event handlers**: Button onClick behaviors must be preserved
5. **Data flow**: Storage hooks and GPT data structure integration

### Risk Mitigation:
- ✅ UserGPTCard: Low risk - only styling changes, interface preserved
- ✅ Card: Low risk - only styling changes, interface preserved
- ✅ FeatureCard: No risk - no existing usage found, safe for complete rewrite
- ✅ card-group.tsx: Protected - no changes needed to integration code

## Phase 1 Completion Status

| Task | Status | Notes |
|------|--------|-------|
| TASK-001 | ✅ Complete | Design system utilities imported in all components |
| TASK-002 | ✅ Complete | CSS custom properties mapped to semantic tokens |
| TASK-003 | ✅ Complete | Spacing patterns analyzed and 4px scale verified |
| TASK-004 | ✅ Complete | HeroUI usage audited, inconsistencies identified |
| TASK-005 | ✅ Complete | Integration points identified and safety confirmed |

## Next Steps for Phase 2
1. Start with `feature-card.tsx` complete rewrite (highest priority - no usage risk)
2. Apply semantic tokens based on mapping table above
3. Implement HeroUI Card components with proper structure
4. Test integration to ensure no breaking changes
