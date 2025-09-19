# Animation Mapping Document

**Created**: 2025-09-18
**Purpose**: Map current custom transition classes to design system equivalents for systematic migration

## Design System Animation Utilities Available

From `src/lib/design-system.ts`:

```typescript
animation: {
  fadeIn: 'animate-in fade-in duration-300',
  slideIn: 'animate-in slide-in-from-bottom-4 duration-300',
  scaleIn: 'animate-in zoom-in-95 duration-200',
  transition: 'transition-all duration-200 ease-in-out',
}
```

## Current Custom Transition Classes Found

### 1. Component-Level Custom Transitions

#### file-upload.tsx
- **Current**: `'transition-all duration-200'` (line 127)
- **Design System Equivalent**: `ds.animation.transition`
- **Status**: ⚠️ Needs migration
- **Context**: Drag-and-drop area hover effects

- **Current**: `'transition-colors'` (line 175)
- **Design System Equivalent**: `ds.animation.transition`
- **Status**: ⚠️ Needs migration
- **Context**: Icon color transitions

#### docs-sidebar.tsx
- **Current**: `'transition-colors'` (line 95, 131)
- **Design System Equivalent**: `ds.animation.transition`
- **Status**: ⚠️ Needs migration
- **Context**: Navigation link hover states

- **Current**: `'transition-transform'` (line 109)
- **Design System Equivalent**: `ds.animation.transition`
- **Status**: ⚠️ Needs migration
- **Context**: Chevron rotation for expandable sections

- **Current**: `'transition-all duration-200'` (line 120)
- **Design System Equivalent**: `ds.animation.transition`
- **Status**: ⚠️ Needs migration
- **Context**: Collapsible content height transitions

#### gpt-editor.tsx
- **Current**: `'transition-colors duration-200'` (lines 663, 687, 711)
- **Design System Equivalent**: `ds.animation.transition`
- **Status**: ⚠️ Needs migration
- **Context**: Capability card hover states

### 2. Global CSS Custom Transitions

#### src/index.css
- **Current**: `transition-all hover:shadow-lg` (line 106)
- **Design System Equivalent**: `ds.animation.transition` + hover classes
- **Status**: ⚠️ Needs migration to components
- **Context**: `.card` class definition

- **Current**: `transition-all hover:shadow-xl shadow-md hover:scale-[1.02]` (line 110)
- **Design System Equivalent**: `ds.animation.transition` + `ds.card.interactive`
- **Status**: ⚠️ Needs migration to components
- **Context**: `.card-interactive` class definition

- **Current**: `transition-colors` (lines 120, 146, 169)
- **Design System Equivalent**: `ds.animation.transition`
- **Status**: ⚠️ Needs migration to components
- **Context**: Various button and link states

### 3. Already Migrated (✅ Good Examples)

#### feature-card.tsx
- **Current**: `ds.animation.transition` (lines 44, 77, 79, 111)
- **Status**: ✅ Already using design system
- **Context**: Card hover effects and icon transitions

#### gpt-test-pane.tsx
- **Current**: `ds.animation.transition` (lines 395, 409, 421, 433, 462, 538, 549)
- **Status**: ✅ Already using design system
- **Context**: Button and input focus states

#### user-gpt-card.tsx
- **Current**: `ds.animation.transition` (lines 77, 87)
- **Status**: ✅ Already using design system
- **Context**: Button hover effects

## Migration Priority

### High Priority (Active Component Usage)
1. **file-upload.tsx** - Drag-and-drop interactions need consistent feedback
2. **docs-sidebar.tsx** - Navigation animations impact user experience
3. **gpt-editor.tsx** - Form field animations affect usability

### Medium Priority (Global CSS Classes)
4. **index.css** - Global card classes used across application
5. **index.css** - Link and button state transitions

## Design System Patterns for Enhancement

### Hover Effects Available
- `ds.card.interactive` - Consistent card hover with shadow and cursor
- `ds.card.elevated` - Enhanced shadow transitions
- `hover:shadow-md`, `hover:shadow-lg` - Standardized shadow progression

### Focus States Available
- `ds.focus.ring` - Accessible focus indicators
- `ds.focus.visible` - Focus-visible for keyboard navigation

### Loading States Available
- `ds.state.loading` - Loading container styles
- HeroUI `Spinner` components with consistent sizing (`sm`, `md`, `lg`)

### Micro-interactions to Implement
- Scale on hover: `group-hover:scale-105` (already in feature-card.tsx)
- Color transitions: Design system handles via `ds.animation.transition`
- Shadow progression: `hover:shadow-sm` → `hover:shadow-md` → `hover:shadow-lg`

## Replacement Strategy

### Phase 1: Direct Replacements
Replace custom `transition-*` classes with `ds.animation.transition`:

```typescript
// Before
className="transition-colors hover:text-primary"

// After
className={cn(ds.animation.transition, "hover:text-primary")}
```

### Phase 2: Enhanced Patterns
Use design system composition utilities:

```typescript
// Before
className="transition-all hover:shadow-md cursor-pointer"

// After
className={cn(ds.card.interactive)}
```

### Phase 3: Micro-interaction Enhancements
Add sophisticated interactions using design system patterns:

```typescript
// Enhanced card interaction
className={cn(ds.card.base, ds.card.interactive, 'group-hover:scale-[1.02]')}
```

## Notes

- **Performance**: Design system `ds.animation.transition` uses optimized timing (200ms ease-in-out)
- **Accessibility**: All transitions respect `prefers-reduced-motion` through Tailwind defaults
- **Consistency**: Standardized duration and easing across all components
- **Composability**: Design system utilities can be combined with custom hover/focus classes

---

**Next Steps**:
1. Begin systematic migration starting with high-priority components
2. Test hover/focus states after each component migration
3. Validate accessibility and performance impact
4. Update component tests to verify animation behavior
