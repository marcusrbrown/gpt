# Text Color Usage Audit Report

**Created**: 2025-08-13
**Purpose**: Complete inventory of text color patterns requiring migration to semantic design tokens

## Summary Statistics

### Manual Color Classes Found
- **text-gray-700**: 5 occurrences (form labels, headings)
- **text-gray-600**: 4 occurrences (descriptions, metadata)
- **text-gray-500**: 3 occurrences (empty states, timestamps)
- **text-gray-900**: 2 occurrences (message text)
- **text-indigo-900**: 1 occurrence (user message)
- **text-blue-900**: 1 occurrence (user message)

### CSS Custom Properties Found
- **text-[var(--text-primary)]**: 2 occurrences (headings)
- **text-[var(--text-secondary)]**: 7 occurrences (descriptions, hover states)
- **text-[var(--text-tertiary)]**: 2 occurrences (breadcrumbs, icons)
- **text-[var(--accent-color)]**: 1 occurrence (active navigation)

### Semantic Tokens Already in Use ✅
- **text-content-primary**: 3 occurrences
- **text-content-secondary**: 6 occurrences
- **text-content-tertiary**: 5 occurrences

## Detailed Migration Requirements

### gpt-editor.tsx - Color Token Migration Needed

**High Priority (Primary Text)**
```typescript
// Line 139: Form label
"text-gray-700" → "text-content-primary"

// Line 718: Form label
"text-gray-700" → "text-content-primary"

// Line 753: Section header
"text-gray-700" → "text-content-primary"

// Line 803: Section header
"text-gray-700" → "text-content-primary"

// Line 808: Section header
"text-gray-700" → "text-content-primary"
```

**Medium Priority (Secondary Text)**
```typescript
// Line 118: Description text
"text-gray-600" → "text-content-secondary"

// Line 182: Metadata text
"text-gray-600" → "text-content-secondary"

// Line 586: Progress text
"text-gray-600" → "text-content-secondary"

// Line 804: Content text
"text-gray-600" → "text-content-secondary"
```

**Low Priority (Tertiary Text)**
```typescript
// Line 142: Empty state text
"text-gray-500" → "text-content-tertiary"

// Line 175: Empty state text
"text-gray-500" → "text-content-tertiary"
```

**Special Cases (Message Colors)**
```typescript
// Line 814: User/Assistant message distinction
'bg-indigo-50 text-indigo-900' : 'bg-gray-50 text-gray-900'
→ Should use semantic message styling or design system state colors

// Line 822: Message content
"text-gray-900" → "text-content-primary"
```

### gpt-test-pane.tsx - Color Token Migration Needed

```typescript
// Line 469: Empty state text
"text-gray-500" → "text-content-tertiary"

// Line 476: Message styling
'bg-blue-100 text-blue-900' : 'bg-gray-100 text-gray-900'
→ Should use semantic message colors or design system patterns

// Line 483: Timestamp
"text-gray-500" → "text-content-tertiary"
```

### docs/ Components - CSS Custom Property Migration

**docs-index.tsx**
```typescript
// Line 36: Hero description
"text-[var(--text-secondary)]" → "text-content-secondary"

// Line 43: Section title
"text-[var(--text-primary)]" → "text-content-primary"

// Line 44: Section description
"text-[var(--text-secondary)]" → "text-content-secondary"

// Line 57, 63, 67: Feature descriptions
"text-[var(--text-secondary)]" → "text-content-secondary"
```

**doc-layout.tsx**
```typescript
// Line 31: Breadcrumb separator
"text-[var(--text-tertiary)]" → "text-content-tertiary"
```

**docs-sidebar.tsx**
```typescript
// Line 96: Navigation link states
"text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
→ "text-content-secondary hover:text-content-primary"

// Line 106: Active navigation indicator
"text-[var(--accent-color)]" → Use design system accent color or "text-primary"

// Line 106: Inactive icon
"text-[var(--text-tertiary)]" → "text-content-tertiary"

// Line 127: Child navigation links
"text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
→ "text-content-secondary hover:text-content-primary"
```

**agent-tutorial.tsx**
```typescript
// Line 40: Tutorial description
"text-gray-600 dark:text-gray-300" → "text-content-secondary"
```

**interactive-notebook.tsx**
```typescript
// Line 57: Cell type indicator
"text-gray-500" → "text-content-tertiary"
```

## Components Already Compliant ✅

### Excellent Implementation Examples

**knowledge-configuration.tsx**
- All text uses semantic tokens: `text-content-primary`, `text-content-secondary`, `text-content-tertiary`
- Table headers properly use `text-content-tertiary` for less important information
- Consistent hierarchy maintained throughout

**file-upload.tsx**
- Uses conditional semantic tokens: `disabled ? 'text-content-tertiary' : 'text-content-primary'`
- Proper state-based color application
- Design system integration with `ds.text.body.small`

**card-group.tsx**
- Uses `text-content-secondary` for empty state text
- Proper semantic meaning applied

**user-gpt-card.tsx**
- No manual color classes found - all using design system utilities
- Proper error state handling with danger color

## Migration Priority Matrix

### Critical Priority (Breaks Consistency)
1. **gpt-editor.tsx** - 5 instances of `text-gray-700` (form labels)
2. **docs-sidebar.tsx** - 4 instances of CSS custom properties (navigation)
3. **docs-index.tsx** - 4 instances of CSS custom properties (content hierarchy)

### High Priority (Frequent Usage)
1. **gpt-editor.tsx** - 4 instances of `text-gray-600` (descriptions)
2. **gpt-test-pane.tsx** - 3 color-related updates needed

### Medium Priority (Special Cases)
1. Message styling patterns in `gpt-editor.tsx` and `gpt-test-pane.tsx`
2. Dark mode considerations in `agent-tutorial.tsx`

### Low Priority (Individual Cases)
1. **interactive-notebook.tsx** - Single `text-gray-500` instance
2. Empty state colors in various components

## Implementation Strategy

### Phase 1: Core Components
- Target `gpt-editor.tsx` first (most instances)
- Focus on form labels and primary content text
- Ensure semantic hierarchy is maintained

### Phase 2: Documentation Components
- Migrate all CSS custom property usage in `docs/` folder
- Ensure navigation states work correctly
- Test theme switching functionality

### Phase 3: Message & State Components
- Update `gpt-test-pane.tsx` color usage
- Implement consistent message styling patterns
- Ensure proper state indication (loading, error, success)

### Phase 4: Edge Cases & Validation
- Handle remaining individual instances
- Validate dark mode compatibility
- Ensure accessibility contrast ratios

## Validation Checklist

After migration, verify:
- [ ] All `text-gray-*` classes removed from target components
- [ ] All `text-[var(--text-*)]` patterns replaced with semantic tokens
- [ ] Color contrast ratios meet WCAG 2.1 AA standards (4.5:1 minimum)
- [ ] Theme switching works correctly (light/dark modes)
- [ ] Visual hierarchy maintained or improved
- [ ] No hardcoded color values remain in target files

## Expected Impact

### Before Migration
- **Manual color classes**: 16 instances across target components
- **CSS custom properties**: 12 instances in docs components
- **Inconsistent hierarchy**: Mixed approaches to text color

### After Migration
- **Semantic tokens only**: 100% usage of `text-content-*` classes
- **Consistent hierarchy**: Primary → Secondary → Tertiary clearly defined
- **Theme compatibility**: Automatic light/dark mode support
- **Maintainable system**: Single source of truth for text colors

## Related Files for Reference

### Design System Definition
- `src/lib/design-system.ts` - Typography and color utilities
- `tailwind.config.ts` - Semantic color token definitions

### Example Implementations
- `knowledge-configuration.tsx` - Excellent semantic token usage
- `file-upload.tsx` - Proper conditional color application
- `user-gpt-card.tsx` - Clean design system integration
