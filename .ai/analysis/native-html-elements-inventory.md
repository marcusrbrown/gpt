# Native HTML Form Elements Inventory and HeroUI Migration Mapping

**Date:** 2025-08-08
**Purpose:** Complete inventory of native HTML form elements and their HeroUI equivalents for Phase 1 migration

## Native HTML Form Elements Found

### 1. Text Input Elements

#### A. `<input type="text">` - GPT Name Field
**Location:** `src/components/gpt-editor.tsx:616`
```tsx
<input
  type="text"
  name="name"
  id="name"
  value={gpt.name}
  onChange={handleInputChange}
  className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
    errors.name
      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
  }`}
  required
/>
```

**Migration to HeroUI:**
```tsx
<Input
  name="name"
  id="name"
  value={gpt.name}
  onChange={handleInputChange}
  isInvalid={!!errors.name}
  errorMessage={errors.name}
  isRequired
  className={cn(ds.form.fieldGroup)}
/>
```

**Priority:** 🔴 **HIGH** - Core GPT creation functionality

---

### 2. Textarea Elements

#### A. `<textarea>` - GPT Description
**Location:** `src/components/gpt-editor.tsx:635`
```tsx
<textarea
  name="description"
  id="description"
  value={gpt.description}
  onChange={handleInputChange}
  rows={3}
  className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
    errors.description
      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
  }`}
  required
/>
```

**Migration to HeroUI:**
```tsx
<Textarea
  name="description"
  id="description"
  value={gpt.description}
  onChange={handleInputChange}
  minRows={3}
  isInvalid={!!errors.description}
  errorMessage={errors.description}
  isRequired
  className={cn(ds.form.fieldGroup)}
/>
```

**Priority:** 🔴 **HIGH** - Core GPT creation functionality

#### B. `<textarea>` - System Prompt
**Location:** `src/components/gpt-editor.tsx:654`
```tsx
<textarea
  name="systemPrompt"
  id="systemPrompt"
  value={gpt.systemPrompt}
  onChange={handleInputChange}
  rows={5}
  className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
    errors.systemPrompt
      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
  }`}
  required
/>
```

**Migration to HeroUI:**
```tsx
<Textarea
  name="systemPrompt"
  id="systemPrompt"
  value={gpt.systemPrompt}
  onChange={handleInputChange}
  minRows={5}
  isInvalid={!!errors.systemPrompt}
  errorMessage={errors.systemPrompt}
  isRequired
  className={cn(ds.form.fieldGroup)}
/>
```

**Priority:** 🔴 **HIGH** - Core GPT creation functionality

---

### 3. Checkbox Elements

#### A. `<input type="checkbox">` - GPT Capabilities
**Location:** `src/components/capabilities-configuration.tsx:16`
```tsx
<input
  type="checkbox"
  id={key}
  checked={typeof value === 'boolean' ? value : value.enabled}
  onChange={() => onCapabilityChange(key as keyof GPTCapabilities)}
  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
/>
```

**Migration to HeroUI:**
```tsx
<Checkbox
  id={key}
  isSelected={typeof value === 'boolean' ? value : value.enabled}
  onValueChange={() => onCapabilityChange(key as keyof GPTCapabilities)}
  className={cn(ds.form.fieldRow)}
>
  {key.replaceAll(/([A-Z])/g, ' $1').trim()}
</Checkbox>
```

**Priority:** 🟡 **MEDIUM** - Important functionality, affects GPT behavior settings

---

### 4. Select Elements

#### A. `<select>` - Authentication Type Selection
**Location:** `src/components/tools-configuration.tsx:80`
```tsx
<select
  value={tool.authentication?.type || ''}
  onChange={e =>
    onToolChange(index, 'authentication', {
      type: e.target.value as 'bearer' | 'api_key',
      value: tool.authentication?.value || '',
    })
  }
  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
>
  <option value="">Select type...</option>
  {AUTH_TYPES.map(type => (
    <option key={type.value} value={type.value}>
      {type.label}
    </option>
  ))}
</select>
```

**Migration to HeroUI:**
```tsx
<Select
  value={tool.authentication?.type || ''}
  onChange={e =>
    onToolChange(index, 'authentication', {
      type: e.target.value as 'bearer' | 'api_key',
      value: tool.authentication?.value || '',
    })
  }
  placeholder="Select type..."
  className={cn(ds.form.fieldGroup)}
  isInvalid={!!errors.tools[index]?.authentication}
  errorMessage={errors.tools[index]?.authentication}
>
  {AUTH_TYPES.map(type => (
    <SelectItem key={type.value} value={type.value}>
      {type.label}
    </SelectItem>
  ))}
</Select>
```

**Priority:** 🟡 **MEDIUM** - MCP tools configuration, less frequently used

---

### 5. File Input Elements (Hidden)

#### A. `<input type="file">` - GPT Import
**Location:** `src/components/gpt-editor.tsx:592`
```tsx
<input type="file" ref={importGptRef} onChange={handleImportGPT} accept=".json" className="hidden" />
```

**Migration Strategy:**
- **Keep as-is** - Hidden file inputs for programmatic triggering are appropriate
- Apply design system styling to associated trigger buttons
- No HeroUI equivalent needed for hidden file inputs

**Priority:** 🟢 **LOW** - Hidden implementation detail, no UI impact

#### B. `<input type="file">` - File Upload (Knowledge Base)
**Location:** `src/components/knowledge-configuration.tsx:42`
```tsx
<input type="file" ref={fileInputRef} onChange={onFileUpload} multiple className="hidden" />
```

**Migration Strategy:**
- **Keep as-is** - Hidden file inputs are appropriate for drag-and-drop implementations
- Focus on improving the visible file upload UI components

**Priority:** 🟢 **LOW** - Hidden implementation detail

#### C. `<input type="file">` - File Upload Component
**Location:** `src/components/file-upload/file-upload.tsx:118`
```tsx
<input
  type="file"
  ref={fileInputRef}
  onChange={handleFileInputChange}
  className="hidden"
  accept={allowedTypes.join(',')}
/>
```

**Migration Strategy:**
- **Keep as-is** - Part of drag-and-drop interface
- Improve visible UI elements with design system utilities

**Priority:** 🟢 **LOW** - Hidden implementation detail

---

## Component Migration Priority Matrix

### 🔴 HIGH Priority (Phase 2)
1. **`gpt-editor.tsx`** - Core GPT creation form
   - Native text input → HeroUI Input
   - Native textarea (description) → HeroUI Textarea
   - Native textarea (system prompt) → HeroUI Textarea
   - Remove custom FormFieldError → Use HeroUI errorMessage

### 🟡 MEDIUM Priority (Phase 3)
2. **`capabilities-configuration.tsx`** - GPT capabilities settings
   - Native checkboxes → HeroUI Checkbox components
   - Add error handling integration

3. **`tools-configuration.tsx`** - MCP tools configuration
   - Native select → HeroUI Select component
   - Component already uses HeroUI Input components correctly

### 🟢 LOW Priority (Phase 4)
4. **Hidden file inputs** - Programmatic file handling
   - Keep native implementation
   - Focus on visible UI improvements

## HeroUI Components Required

### Import Requirements
```tsx
import {
  Input,
  Textarea,
  Checkbox,
  Select,
  SelectItem,
} from '@heroui/react'
```

### Design System Integration
```tsx
import {cn, ds, compose, theme} from '../lib/design-system'
```

## Migration Pattern Standards

### 1. Error Handling Pattern
```tsx
// ❌ Current Pattern
{errors.field && <FormFieldError error={errors.field} />}

// ✅ Target Pattern
<Input
  isInvalid={!!errors.field}
  errorMessage={errors.field}
/>
```

### 2. Styling Pattern
```tsx
// ❌ Current Pattern
className={`mt-1 block w-full ${errors.field ? 'border-red-300' : 'border-gray-300'}`}

// ✅ Target Pattern
className={cn(ds.form.fieldGroup, errors.field && ds.state.error)}
```

### 3. Required Field Pattern
```tsx
// ❌ Current Pattern
required

// ✅ Target Pattern
isRequired
```

## Breaking Changes Assessment

### Safe Migrations (No Breaking Changes)
- ✅ Text inputs → HeroUI Input components
- ✅ Textareas → HeroUI Textarea components
- ✅ Error display → HeroUI errorMessage prop

### Potentially Breaking Changes
- 🔄 **Checkbox behavior**: HeroUI Checkbox uses `isSelected`/`onValueChange` vs `checked`/`onChange`
- 🔄 **Select behavior**: HeroUI Select uses different event handling pattern
- 🔄 **Styling differences**: HeroUI components may have different default styling

### Migration Safety Measures
1. **Preserve validation logic** - Keep useGPTValidation hook unchanged
2. **Maintain form submission** - Ensure form data structure remains identical
3. **Test coverage** - Update tests for new component selectors without changing logic
4. **Staged rollout** - Migrate one component type at a time with validation

## Next Steps Summary

**TASK-004 Prerequisites:**
- Test file identification for components requiring migration
- Component-specific test update requirements
- Validation behavior verification needs

**TASK-005 Prerequisites:**
- Priority ranking established (HIGH → MEDIUM → LOW)
- Component complexity assessment
- User impact analysis for migration ordering

---

**Status:** TASK-003 Complete - Native HTML elements documented with HeroUI migration mapping and priority matrix
