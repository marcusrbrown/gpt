# Test Coverage Analysis for HeroUI Component Migration

**Date:** 2025-08-08
**Purpose:** Analyze existing test coverage and identify tests that need updates for HeroUI components migration

## Test Infrastructure Overview

### Testing Framework Stack
- **Test Runner:** Vitest
- **Testing Library:** React Testing Library (`@testing-library/react`)
- **User Interaction:** `@testing-library/user-event`
- **Mocking:** Vitest (`vi.fn()`, `vi.mock()`)

### Test File Structure
```
src/
├── components/__tests__/
│   ├── gpt-editor.test.tsx ⭐ (form components - HIGH impact)
│   ├── gpt-test-pane.test.tsx ⭐ (input components - MEDIUM impact)
│   ├── feature-card.test.tsx
│   ├── card.test.tsx
│   ├── user-gpt-card.test.tsx
│   └── card-group-integration.test.tsx
├── contexts/__tests__/
├── services/__tests__/
└── types/__tests__/
```

## Form Component Test Coverage Analysis

### 🔴 HIGH Impact: `gpt-editor.test.tsx`

**Current Test Coverage:**
```tsx
// ✅ Tests that will CONTINUE working with HeroUI:
- Form rendering: "renders the editor with the correct title"
- Context integration: "calls getGPT with the correct id when provided"
- Form submission: "saves GPT configuration when Save button is clicked"

// ⚠️ Tests that may need MINOR updates:
- Form inputs: "renders form inputs correctly"
  - Uses: getByLabelText('Name'), getByLabelText('Description'), getByLabelText('System Prompt')
  - Impact: Should continue working - HeroUI components preserve aria-label/id associations

- Input interactions: "allows updating input field values"
  - Uses: user.type(nameInput, 'New Test GPT'), expect(nameInput).toHaveValue('New Test GPT')
  - Impact: Should continue working - HeroUI Input has same value behavior

// 🔄 Tests that may need SIGNIFICANT updates:
- Checkbox interactions: "toggles capabilities when checkboxes are clicked"
  - Uses: getByLabelText(/code interpreter/i), expect(codeInterpreterCheckbox).not.toBeChecked()
  - Impact: HeroUI Checkbox uses 'checked' attribute differently than native HTML
```

**Migration Impact Assessment:**
- **Label-based queries**: ✅ **SAFE** - HeroUI preserves aria-label/htmlFor associations
- **Value interactions**: ✅ **SAFE** - HeroUI Input/Textarea maintain standard value behavior
- **Checkbox behavior**: ⚠️ **NEEDS VERIFICATION** - HeroUI Checkbox may use different checked attribute

### 🟡 MEDIUM Impact: `gpt-test-pane.test.tsx`

**Current Test Coverage:**
```tsx
// ✅ Tests that will CONTINUE working:
- Input elements: getByLabelText('Conversation Name'), getByLabelText('Message input')
- User interactions: user.type(input, 'test message'), expect(input).toHaveValue('test message')

// Impact: LOW - Already uses HeroUI Input components
```

**Migration Impact Assessment:**
- **Already HeroUI-compliant**: ✅ **NO CHANGES NEEDED**
- Component already uses HeroUI Input components for form interactions

### 🟢 LOW Impact: Missing Test Coverage

**Components WITHOUT Tests (need test creation):**
- `capabilities-configuration.tsx` - ❌ **NO TESTS**
- `tools-configuration.tsx` - ❌ **NO TESTS**
- `knowledge-configuration.tsx` - ❌ **NO TESTS**
- `file-upload.tsx` - ❌ **NO TESTS**

**Impact:** These components will need NEW test files created with HeroUI patterns from the start

## Test Selector Strategy Analysis

### Current Selector Patterns

#### ✅ SAFE Patterns (will continue working):
```tsx
// Label-based queries (recommended by Testing Library)
screen.getByLabelText('Name')
screen.getByLabelText('Description')
screen.getByLabelText('System Prompt')

// Text-based queries
screen.getByText('Save')
screen.getByText('GPT Configuration')

// Role-based queries
screen.getByRole('button', { name: /save/i })
```

#### ⚠️ POTENTIALLY UNSAFE Patterns:
```tsx
// Attribute-based queries (may change with HeroUI)
screen.getByDisplayValue('test value')
expect(element).toBeChecked() // For checkboxes
```

#### ❌ UNSAFE Patterns (avoid):
```tsx
// CSS selector queries (will break with HeroUI styling)
container.querySelector('.border-red-300')
screen.getByClassName('form-input')

// Data-testid not currently used (but recommended for complex cases)
```

## Migration Testing Strategy

### Phase 1: Pre-Migration Test Validation
1. **Run full test suite** to establish baseline
2. **Document any flaky tests** that might be related to form interactions
3. **Verify browser compatibility** for current test patterns

### Phase 2: Component-by-Component Migration Testing
1. **gpt-editor.tsx migration:**
   - Migrate Text Input → HeroUI Input
   - Validate: `getByLabelText('Name')` still works
   - Validate: `user.type()` and `toHaveValue()` still work
   - TEST IMMEDIATELY after each component type migration

2. **Checkbox migration special attention:**
   - HeroUI Checkbox component behavior verification
   - May need to update from `toBeChecked()` to HeroUI-specific assertions
   - Document any behavioral differences

3. **Error display migration:**
   - Remove FormFieldError component usage in tests
   - Verify error messages still appear in accessible ways
   - Ensure `getByText(error message)` patterns still work

### Phase 3: New Component Test Creation
1. **Create test files for untested components:**
   - `capabilities-configuration.test.tsx`
   - `tools-configuration.test.tsx`
   - `knowledge-configuration.test.tsx`
   - `file-upload.test.tsx`

2. **Use HeroUI patterns from the start:**
   ```tsx
   // Example for capabilities configuration
   it('toggles capability checkboxes', async () => {
     render(<CapabilitiesConfiguration {...props} />)
     const checkbox = screen.getByLabelText(/code interpreter/i)
     await user.click(checkbox)
     expect(checkbox).toBeChecked()
   })
   ```

## Testing Library Best Practices for HeroUI

### Recommended Query Priorities (in order):
1. **getByLabelText** - Best for form elements (works with HeroUI)
2. **getByRole** - Semantic elements (works with HeroUI)
3. **getByText** - Visible text content (works with HeroUI)
4. **getByDisplayValue** - Form element values (verify with HeroUI)
5. **getByTestId** - Last resort for complex components

### HeroUI-Specific Testing Patterns:
```tsx
// Input components
const input = screen.getByLabelText('Name')
await user.type(input, 'test value')
expect(input).toHaveValue('test value')

// Checkbox components (verify HeroUI behavior)
const checkbox = screen.getByLabelText('Enable feature')
await user.click(checkbox)
expect(checkbox).toBeChecked() // Verify this works with HeroUI

// Select components (when migrated)
const select = screen.getByLabelText('Authentication Type')
await user.selectOptions(select, 'bearer')
expect(select).toHaveValue('bearer')

// Error states
const input = screen.getByLabelText('Name')
expect(input).toHaveAttribute('aria-invalid', 'true')
expect(screen.getByText('Name is required')).toBeInTheDocument()
```

## Risk Mitigation Strategy

### Test Failure Prevention:
1. **Incremental migration**: Migrate one component type at a time
2. **Immediate testing**: Run tests after each component migration
3. **Rollback plan**: Keep git commits granular for easy rollback

### Breaking Change Detection:
1. **Automated testing**: CI/CD pipeline catches regressions immediately
2. **Visual testing**: Consider adding visual regression tests for form states
3. **Cross-browser testing**: Ensure HeroUI components work across browsers

## Test Update Requirements Summary

### 🔴 IMMEDIATE Updates Needed:
- **gpt-editor.test.tsx**: Verify checkbox behavior with HeroUI Checkbox migration
- **Baseline test run**: Establish current pass/fail status

### 🟡 MONITOR During Migration:
- **Form value assertions**: Ensure `toHaveValue()` works with HeroUI components
- **Error display**: Verify error messages still accessible after FormFieldError removal
- **Label associations**: Confirm `getByLabelText()` continues working

### 🟢 FUTURE Enhancements:
- **Create missing test files**: For components without current test coverage
- **Add integration tests**: Form submission flows end-to-end
- **Visual regression tests**: Form error states and validation feedback

## Dependencies for Testing

### Required Testing Library Versions:
- `@testing-library/react` - Current version supports HeroUI components
- `@testing-library/user-event` - Latest version for reliable form interactions
- `@testing-library/jest-dom` - Custom matchers for DOM assertions

### HeroUI Testing Considerations:
- HeroUI components should work with standard Testing Library patterns
- May need to verify specific component behaviors (especially Checkbox, Select)
- Error handling integration should maintain accessibility

---

**Status:** TASK-004 Complete - Test coverage analyzed with HeroUI migration requirements identified
