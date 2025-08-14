# Typography Audit Report

**Created**: 2025-08-13
**Purpose**: Complete inventory of heading elements and text styling across target components

## Heading Elements Inventory

### card-group.tsx
- **Line 23**: `<h2 className={ds.text.heading.h2}>Your GPTs</h2>` ✅ Already using design system
- **Line 47**: `<h2 className={ds.text.heading.h2 mb-4}>Example GPTs</h2>` ✅ Already using design system

### gpt-editor.tsx
- **Line 117**: `<h3 className="text-lg font-medium">Vector Knowledge Stores</h3>` ❌ Needs conversion to `ds.text.heading.h3`
- **Line 173**: `<h4 className="text-md font-medium mb-2">Existing Vector Stores</h4>` ❌ Needs conversion to `ds.text.heading.h4`
- **Line 181**: `<h5 className="font-medium">{store.name}</h5>` ❌ Needs conversion to `ds.text.heading.h4` (no h5 in design system)
- **Line 584**: `<h2 className="text-xl font-bold">GPT Configuration</h2>` ❌ Needs conversion to `ds.text.heading.h2`

### gpt-test-pane.tsx
- **Line 443**: `<h3 className={cn('text-sm font-medium', ds.form.errorText)}>Error</h3>` ❌ Needs conversion to `ds.text.heading.h4`

### feature-card.tsx
- **Line 63**: `<h3 className={cn(ds.text.heading.h4, 'text-danger')}>Error Loading Feature</h3>` ✅ Already using design system
- **Line 83**: `<h3 className={cn(ds.text.heading.h4)}>{title}</h3>` ✅ Already using design system

### tools-configuration.tsx
- **Line 42**: `<h4 className={cn(ds.form.label)}>Tool {index + 1}</h4>` ❌ Needs conversion to `ds.text.heading.h4`

## Text Styling Patterns Inventory

### Text Size Classes Found
- `text-xs` - Used for metadata, timestamps, file counts
- `text-sm` - Used for labels, descriptions, helper text
- `text-base` - Used for main content
- `text-lg` - Used for section headers
- `text-xl` - Used for component titles
- `text-2xl` - Used for major section headers
- `text-md` - Non-standard class found in some components

### Font Weight Classes Found
- `font-medium` - Used for labels, section headers
- `font-semibold` - Used for component titles
- `font-bold` - Used for page titles and important headers

### Text Color Patterns Found

#### Manual Color Classes (Need Conversion)
- `text-gray-700` - Used for form labels → Should be `text-content-primary`
- `text-gray-600` - Used for descriptions → Should be `text-content-secondary`
- `text-gray-500` - Used for metadata → Should be `text-content-tertiary`

#### CSS Custom Properties (Need Conversion)
- `text-[var(--text-primary)]` - Found in some components → Should be `text-content-primary`
- `text-[var(--text-secondary)]` - Found in some components → Should be `text-content-secondary`
- `text-[var(--text-tertiary)]` - Found in some components → Should be `text-content-tertiary`

## Detailed Component Analysis

### gpt-editor.tsx - Typography Issues Found
```typescript
// Line 118: Description text
<p className="text-sm text-gray-600"> → Should be: cn(ds.text.body.small, 'text-content-secondary')

// Line 139: Form label
<label className="block text-sm font-medium text-gray-700 mb-2"> → Should be: cn(ds.text.heading.h4, 'text-content-primary')

// Line 142: Empty state text
<p className="text-gray-500 text-sm p-2"> → Should be: cn(ds.text.body.small, 'text-content-tertiary')

// Line 153: Checkbox label
<label htmlFor="file-${file.name}" className="text-sm"> → Should be: ds.text.body.small

// Line 175: Empty state text
<p className="text-gray-500 text-sm"> → Should be: cn(ds.text.body.small, 'text-content-tertiary')

// Line 182: Metadata text
<p className="text-xs text-gray-600"> → Should be: cn(ds.text.caption, 'text-content-secondary')

// Line 586: Progress text
<div className="flex justify-between text-xs text-gray-600 mb-1"> → Should be: cn(ds.text.caption, 'text-content-secondary')

// Line 718: Form label
<label className="block text-sm font-medium text-gray-700"> → Should be: cn(ds.text.heading.h4, 'text-content-primary')
```

### gpt-test-pane.tsx - Typography Issues Found
```typescript
// Line 444: Error text
<p className={cn('text-sm mt-1', ds.form.errorText)}> → Should be: cn(ds.text.body.small, ds.form.errorText)

// Line 453: Button text
'mt-3 text-sm font-medium hover:opacity-80' → Should be: cn(ds.text.body.small, 'font-medium')

// Line 461: Error message
<p className={cn('mt-2 text-sm', ds.form.errorText)}> → Should be: cn(ds.text.body.small, ds.form.errorText)

// Line 479: Message sender
<p className="text-sm font-medium mb-1"> → Should be: cn(ds.text.body.small, 'font-medium')

// Line 483: Timestamp
<p className="text-xs text-gray-500 mt-1 text-right"> → Should be: cn(ds.text.caption, 'text-content-tertiary')

// Line 497: Processing message
<span className={cn('text-sm', ds.text.body.base)}> → Should be: ds.text.body.small
```

### file-upload.tsx - Typography Issues Found
```typescript
// Line 180: Upload status
<div className={cn(ds.text.body.small, 'font-medium')}> → ✅ Already using design system
```

### knowledge-configuration.tsx - Typography Assessment ✅
- **Line 40**: `<h3 className={cn(ds.text.heading.h3)}>Files</h3>` ✅ Already using design system
- **Line 52**: `<h4 className={cn(ds.text.heading.h4, 'mb-2')}>Uploaded Files</h4>` ✅ Already using design system
- **Line 86**: `<h3 className={cn(ds.text.heading.h3)}>Web URLs</h3>` ✅ Already using design system
- **Table headers**: Using `text-xs font-medium text-content-tertiary uppercase` ✅ Already using semantic tokens
- **Table cells**: Using `text-sm text-content-primary/secondary` ✅ Already using semantic tokens

### api-settings.tsx - Typography Assessment ✅
- **Line 44**: `<h2 className={cn(ds.text.heading.h2, 'mb-4')}>OpenAI API Settings</h2>` ✅ Already using design system
- **Line 105**: `<h3 className={cn(ds.text.heading.h4, 'mb-2')}>Using Your API Key</h3>` ✅ Already using design system

### user-gpt-card.tsx - Typography Assessment ✅
- **Line 31**: `<p className={cn(ds.text.heading.h4, 'text-danger')}>Error Loading GPT</p>` ✅ Already using design system
- **Line 32**: `<p className={cn(ds.text.body.small, 'text-danger')}>{error}</p>` ✅ Already using design system
- **Line 40**: `<p className={cn(ds.text.heading.h4)} data-testid="gpt-name">` ✅ Already using design system
- **Line 43**: `<p className={cn(ds.text.body.small)}>Updated: {new Date(gpt.updatedAt).toLocaleDateString()}</p>` ✅ Already using design system
- **Line 51**: `<p className={cn(ds.text.body.base, 'text-danger')}>Unable to load GPT data...</p>` ✅ Already using design system
- **Line 58**: `<p className={cn(ds.text.body.base, 'line-clamp-3')}>{gpt.description || 'No description provided.'}</p>` ✅ Already using design system

## Summary Statistics

### Current State
- **Total heading elements found**: 12
- **Using design system**: 8 ✅
- **Need conversion**: 4 ❌

### Well-Implemented Components ✅
- `card-group.tsx` - All headings use design system
- `feature-card.tsx` - All headings use design system
- `knowledge-configuration.tsx` - All headings and text use design system
- `api-settings.tsx` - All headings use design system
- `user-gpt-card.tsx` - All text uses design system

### Components Needing Updates ❌
- `gpt-editor.tsx` - 4 heading elements + multiple text color issues
- `gpt-test-pane.tsx` - 1 heading element + text color issues
- `tools-configuration.tsx` - 1 heading element needs update

### Typography Class Distribution
- **text-xs**: 4 occurrences (metadata, timestamps)
- **text-sm**: 12 occurrences (labels, descriptions, buttons)
- **text-lg**: 2 occurrences (section headers)
- **text-xl**: 1 occurrence (page title)
- **text-md**: 1 occurrence (non-standard, needs fix)

### Color Token Migration Needed
- **text-gray-700**: 3 occurrences → `text-content-primary`
- **text-gray-600**: 3 occurrences → `text-content-secondary`
- **text-gray-500**: 4 occurrences → `text-content-tertiary`

## Priority Order for Implementation

### High Priority (Heading Hierarchy)
1. `gpt-editor.tsx` - 4 heading elements need conversion
2. `gpt-test-pane.tsx` - 1 heading element needs conversion
3. `tools-configuration.tsx` - 1 heading element needs conversion

### Medium Priority (Text Color Migration)
1. `gpt-editor.tsx` - Multiple gray color classes
2. `gpt-test-pane.tsx` - Timestamp and error text colors
3. Other components with color token needs

### Low Priority (Text Size Standardization)
1. Replace remaining manual text size classes with design system utilities
2. Ensure consistent body text hierarchy

## Implementation Notes

- **Heading Hierarchy**: Maintain semantic meaning (h1 → h2 → h3 → h4)
- **Color Consistency**: All text-gray-* classes should use semantic tokens
- **Size Consistency**: Standardize on design system text utilities
- **Responsive Behavior**: Add responsive typography to major headings
