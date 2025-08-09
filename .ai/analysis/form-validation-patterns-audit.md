# Form Validation Patterns Audit

**Date:** 2025-08-08
**Purpose:** Audit current form validation patterns and create mapping to HeroUI error handling for Phase 1 migration

## Current Validation Patterns Analysis

### 1. Primary Validation Hook: `useGPTValidation`

**Location:** `src/hooks/use-gpt-validation.ts`

**Current Pattern:**
- Returns `{errors, validateForm, clearFieldError}`
- Error structure matches form hierarchy (name, description, systemPrompt, tools)
- Validation logic includes length limits, required fields, and field-specific rules
- Tool validation includes name, description, endpoint, and authentication fields

**Error Structure:**
```typescript
interface FormErrors {
  name?: string
  description?: string
  systemPrompt?: string
  tools: {
    [key: number]: {
      name?: string
      description?: string
      endpoint?: string
      authentication?: string
    }
  }
  knowledge: {
    urls: {
      [key: number]: string
    }
  }
}
```

### 2. Component-Specific Validation Patterns

#### A. GPT Editor (`src/components/gpt-editor.tsx`)

**Current Error Display:**
- Custom `FormFieldError` component: `<p className="text-red-500 text-sm mt-1">{error}</p>`
- Manual error styling with hardcoded colors (`text-red-500`, `bg-red-50`)
- Vector store errors: `<div className="text-red-500 bg-red-50 p-2 rounded text-sm">{error}</div>`

**HeroUI Migration Path:**
- ✅ **Replace FormFieldError** → Use HeroUI `errorMessage` prop directly
- ✅ **Update Input components** → Add `isInvalid={!!errors.name}` and `errorMessage={errors.name}`
- ✅ **Replace hardcoded colors** → Use design system error utilities (`ds.form.errorText`)

#### B. Tools Configuration (`src/components/tools-configuration.tsx`)

**Current Error Display:**
- ✅ **Already using HeroUI pattern**: `isInvalid={!!errors.tools[index]?.name}` + `errorMessage={errors.tools[index]?.name}`
- ✅ **Good pattern for replication** across other components

**Status:** Already properly implemented for HeroUI

#### C. Knowledge Configuration (`src/components/knowledge-configuration.tsx`)

**Current Error Display:**
- ✅ **Already using HeroUI pattern**: `isInvalid={!!errors.knowledge.urls[index]}` + `errorMessage={errors.knowledge.urls[index]}`

**Status:** Already properly implemented for HeroUI

#### D. Capabilities Configuration (`src/components/capabilities-configuration.tsx`)

**Current Error Display:**
- ❌ **No validation/error handling currently implemented**
- Uses native HTML checkboxes with hardcoded styling

**HeroUI Migration Path:**
- ✅ **Replace native checkboxes** → HeroUI Checkbox components
- ✅ **Add validation** → Extend useGPTValidation hook if needed
- ✅ **Apply error handling** → Use HeroUI error pattern

#### E. File Upload (`src/components/file-upload/file-upload.tsx`)

**Current Error Display:**
- Local error state: `const [errorMessage, setErrorMessage] = useState('')`
- Manual error display: `<div className="mt-2 text-sm text-red-500">{errorMessage}</div>`

**HeroUI Migration Path:**
- ✅ **Convert to HeroUI styling** → Use `ds.form.errorText` utility
- ✅ **Consider integration** with main validation system vs local state

#### F. API Settings (`src/components/settings/api-settings.tsx`)

**Current Error Display:**
- ✅ **Uses HeroUI Input components** but no explicit error handling visible
- Likely relies on browser validation or parent component error handling

**Status:** Needs error handling integration

## Validation Pattern Mapping: Current → HeroUI

### ❌ Current Pattern (to be replaced):
```tsx
// Custom error component
const FormFieldError = ({error}: {error?: string}) => {
  if (!error) return null
  return <p className="text-red-500 text-sm mt-1">{error}</p>
}

// Manual error styling
<input className={`border ${errors.name ? 'border-red-300' : 'border-gray-300'}`} />
{errors.name && <FormFieldError error={errors.name} />}
```

### ✅ Target HeroUI Pattern:
```tsx
// Direct HeroUI integration
<Input
  isInvalid={!!errors.name}
  errorMessage={errors.name}
  className={cn(errors.name && ds.state.error)}
/>
```

### ✅ Design System Integration:
```tsx
// Using design system utilities
<Input
  isInvalid={!!errors.name}
  errorMessage={errors.name}
  className={cn(ds.form.fieldGroup, errors.name && ds.state.error)}
/>
```

## Native HTML Elements → HeroUI Component Mapping

### Input Elements
- ❌ `<input type="text">` → ✅ `<Input>`
- ❌ `<input type="email">` → ✅ `<Input type="email">`
- ❌ `<input type="url">` → ✅ `<Input type="url">`
- ❌ `<textarea>` → ✅ `<Textarea>`

### Selection Elements
- ❌ `<select>` → ✅ `<Select>`
- ❌ `<input type="checkbox">` → ✅ `<Checkbox>`
- ❌ `<input type="radio">` → ✅ `<Radio>`

### Error Display
- ❌ Custom `FormFieldError` component → ✅ HeroUI `errorMessage` prop
- ❌ Manual error classes (`text-red-500`) → ✅ Design system (`ds.form.errorText`)
- ❌ Conditional className logic → ✅ HeroUI `isInvalid` prop

## Recommendations for Migration

### Phase 1: Infrastructure (Current)
1. ✅ **COMPLETED**: Import design system utilities
2. ✅ **IN PROGRESS**: Document current patterns (this analysis)
3. 🔄 **NEXT**: Create migration mapping and priority list

### Phase 2: Core Components
1. **gpt-editor.tsx**: Replace FormFieldError with HeroUI patterns
2. **capabilities-configuration.tsx**: Add HeroUI Checkbox components
3. **file-upload.tsx**: Integrate with design system error utilities

### Phase 3: Validation Enhancement
1. **Extend useGPTValidation**: Add capabilities validation if needed
2. **Standardize error timing**: Consistent validation triggers (blur, change, submit)
3. **Success states**: Add positive feedback using `ds.state.success`

## Technical Constraints

### Must Preserve
- ✅ **Existing validation logic** in useGPTValidation hook
- ✅ **Error message content** and validation rules
- ✅ **Form submission behavior** and data flow
- ✅ **Test compatibility** with existing test suites

### Must Improve
- ✅ **Visual consistency** across all form components
- ✅ **Accessibility** with proper ARIA labels and error announcements
- ✅ **Design system integration** for maintainable styling
- ✅ **TypeScript safety** with proper HeroUI component types

## Next Steps (TASK-003 preparation)

1. **Complete component inventory** with specific native elements
2. **Priority ranking** based on user impact and complexity
3. **Create implementation checklist** for each component migration
4. **Define testing strategy** for validation behavior preservation

---

**Status:** TASK-002 Complete - Validation patterns documented and HeroUI migration path established
