---
goal: 'Migrate form components to use HeroUI patterns and design system tokens'
version: 1.0
date_created: 2025-08-02
last_updated: 2025-08-02
owner: 'Marcus R. Brown'
status: 'In Progress'
tags: ['refactor', 'design-system', 'forms', 'heroui', 'validation', 'accessibility']
---

# Form Components HeroUI Migration and Design System Integration

![Status: In Progress](https://img.shields.io/badge/status-In%20Progress-yellow)

Comprehensive migration of form components to implement HeroUI patterns and unified GPT design system, replacing native HTML form elements with HeroUI components, standardizing error states and validation patterns, and improving accessibility and visual consistency across all form interactions.

## 1. Requirements & Constraints

- **REQ-001**: Replace native HTML input, select, textarea, checkbox, and radio elements with HeroUI equivalents
- **REQ-002**: Standardize error states using HeroUI `isInvalid` prop and `errorMessage` for consistent error display
- **REQ-003**: Apply design system form utilities (`ds.form.*`) for consistent spacing and layout
- **REQ-004**: Implement proper focus management using design system focus utilities (`ds.focus.*`)
- **REQ-005**: Use semantic tokens for colors and spacing instead of hardcoded values
- **REQ-006**: Add loading states for form submissions using HeroUI and design system patterns
- **REQ-007**: Import and utilize design system utilities from `@/lib/design-system`
- **REQ-008**: Maintain all existing form functionality including validation, submission, and error handling
- **SEC-001**: Preserve form security patterns including input sanitization and validation
- **A11Y-001**: Implement proper ARIA labels, descriptions, and semantic markup for all form elements
- **A11Y-002**: Ensure keyboard navigation works correctly with proper tab order and focus indicators
- **A11Y-003**: Maintain screen reader compatibility with proper labeling and error announcements
- **CON-001**: Must not break existing form validation logic or error handling patterns
- **CON-002**: Existing tests must continue to pass without modification to test logic
- **CON-003**: Form submission behavior must remain identical for all dependent components
- **CON-004**: Performance must not degrade (no bundle size increase beyond reasonable limits)
- **GUD-001**: Follow self-explanatory code commenting guidelines for form validation logic
- **GUD-002**: Use TypeScript strict typing for all form props, handlers, and validation functions
- **PAT-001**: Use HeroUI component variants consistently (solid, bordered, flat, etc.)
- **PAT-002**: Apply design system composition utilities for common form patterns

## 2. Implementation Steps

### Implementation Phase 1: Infrastructure and Analysis

- GOAL-001: Prepare components for HeroUI migration and analyze current form patterns

| Task | Description | Completed | Date |
| --- | --- | --- | --- |
| TASK-001 | Import design system utilities: `import { ds, cn, compose, theme } from '@/lib/design-system'` in all form components | ✅ | 2025-08-08 |
| TASK-002 | Audit current form validation patterns and create mapping to HeroUI error handling | ✅ | 2025-08-08 |
| TASK-003 | Document current native HTML form elements and their HeroUI equivalents | ✅ | 2025-08-08 |
| TASK-004 | Analyze existing test coverage and identify tests that need updates for HeroUI components | ✅ | 2025-08-08 |
| TASK-005 | Create comprehensive list of all form components requiring migration with priority levels | ✅ | 2025-08-08 |

### Implementation Phase 2: GPT Editor Core Form Migration

- GOAL-002: Migrate main GPT editor form from native HTML inputs to HeroUI components

| Task | Description | Completed | Date |
| --- | --- | --- | --- |
| TASK-006 | Replace native input[type="text"] for GPT name with HeroUI Input component in gpt-editor.tsx |  |  |
| TASK-007 | Replace native textarea for GPT description with HeroUI Textarea component |  |  |
| TASK-008 | Replace native textarea for system prompt with HeroUI Textarea component |  |  |
| TASK-009 | Convert manual error styling (`border-red-300`) to HeroUI `isInvalid` and `errorMessage` props |  |  |
| TASK-010 | Replace custom FormFieldError component with HeroUI built-in error display |  |  |
| TASK-011 | Apply ds.form.fieldGroup utility for consistent spacing between form fields |  |  |
| TASK-012 | Update form labels to use ds.form.label utility for consistent label styling |  |  |

### Implementation Phase 3: Specialized Form Components Migration

- GOAL-003: Migrate specialized form components including tools, capabilities, and knowledge configuration

| Task | Description | Completed | Date |
| --- | --- | --- | --- |
| TASK-013 | Replace native select in tools-configuration.tsx with HeroUI Select component for authentication types |  |  |
| TASK-014 | Replace native checkboxes in capabilities-configuration.tsx with HeroUI Checkbox components |  |  |
| TASK-015 | Update checkbox styling to use semantic tokens instead of hardcoded colors (text-indigo-600, border-gray-300) |  |  |
| TASK-016 | Convert file input in knowledge-configuration.tsx to use HeroUI styling patterns |  |  |
| TASK-017 | Standardize URL input fields in knowledge-configuration.tsx with consistent HeroUI Input usage |  |  |
| TASK-018 | Apply ds.form.fieldRow utility for consistent multi-field layouts in tools configuration |  |  |

### Implementation Phase 4: Interactive Form Components Enhancement

- GOAL-004: Enhance interactive form components including test pane and API settings

| Task | Description | Completed | Date |
| --- | --- | --- | --- |
| TASK-019 | Standardize Input components in gpt-test-pane.tsx for conversation name and message input |  |  |
| TASK-020 | Apply consistent focus states using ds.focus.ring for all interactive form elements |  |  |
| TASK-021 | Update api-settings.tsx to use design system form utilities and semantic tokens |  |  |
| TASK-022 | Implement consistent loading states for form submissions using ds.state.loading |  |  |
| TASK-023 | Add proper placeholder text and helper text using HeroUI description prop where appropriate |  |  |
| TASK-024 | Ensure all form inputs have proper `aria-label` attributes for accessibility |  |  |

### Implementation Phase 5: File Upload and Advanced Components

- GOAL-005: Migrate file upload components and implement advanced form patterns

| Task | Description | Completed | Date |
| --- | --- | --- | --- |
| TASK-025 | Update file-upload.tsx error display to use design system error utilities instead of `text-red-500` |  |  |
| TASK-026 | Apply semantic tokens for file upload styling (borders, backgrounds, text colors) |  |  |
| TASK-027 | Implement drag-and-drop visual feedback using design system state utilities |  |  |
| TASK-028 | Standardize file upload button styling with HeroUI Button patterns |  |  |
| TASK-029 | Add proper loading states for file upload operations using HeroUI Spinner |  |  |
| TASK-030 | Create reusable form field wrapper component using design system composition utilities |  |  |

### Implementation Phase 6: Validation and Error Handling Standardization

- GOAL-006: Standardize validation patterns and error handling across all form components

| Task | Description | Completed | Date |
| --- | --- | --- | --- |
| TASK-031 | Update useGPTValidation hook to work seamlessly with HeroUI error display patterns |  |  |
| TASK-032 | Implement consistent error message styling using ds.form.errorText utility |  |  |
| TASK-033 | Add success states for form fields using ds.state.success utility when validation passes |  |  |
| TASK-034 | Standardize field validation timing (on blur, on change, on submit) for consistent UX |  |  |
| TASK-035 | Implement proper form field grouping and spacing using ds.form.fieldGroup |  |  |
| TASK-036 | Add form-level loading states for multi-step operations (GPT creation, file uploads) |  |  |

### Implementation Phase 7: Testing and Validation

- GOAL-007: Ensure comprehensive test coverage and validate design system integration

| Task | Description | Completed | Date |
| --- | --- | --- | --- |
| TASK-037 | Update existing gpt-editor.test.tsx to work with HeroUI components (query by labels, roles) |  |  |
| TASK-038 | Update gpt-test-pane.test.tsx to handle HeroUI Input components properly |  |  |
| TASK-039 | Create form accessibility tests using axe-core to validate ARIA compliance |  |  |
| TASK-040 | Add visual regression tests for form error states and validation feedback |  |  |
| TASK-041 | Test form submission flows end-to-end to ensure no functionality regression |  |  |
| TASK-042 | Validate keyboard navigation through all form fields and controls |  |  |
| TASK-043 | Test form behavior with screen readers and assistive technologies |  |  |

## 3. Alternatives

- **ALT-001**: Gradual component-by-component migration (rejected: creates inconsistent UX during transition)
- **ALT-002**: Keep native HTML inputs and only apply design system styling (rejected: doesn't achieve HeroUI consistency goals)
- **ALT-003**: Create custom form component library instead of using HeroUI (rejected: unnecessary duplication of effort)
- **ALT-004**: Use React Hook Form or similar for form management (rejected: major architectural change outside scope)
- **ALT-005**: Implement form components using headless UI libraries (rejected: inconsistent with project's HeroUI approach)

## 4. Dependencies

- **DEP-001**: HeroUI React form components must be available (@heroui/react with Input, Select, Textarea, Checkbox, Radio)
- **DEP-002**: Design system utilities library (`src/lib/design-system.ts`) must include form-specific utilities
- **DEP-003**: Tailwind configuration must include all semantic tokens for forms (danger, success, focus states)
- **DEP-004**: TypeScript configuration must support HeroUI component types and form handler types
- **DEP-005**: Existing validation hooks (useGPTValidation) must remain functional during migration
- **DEP-006**: Test infrastructure must support HeroUI component testing patterns

## 5. Files

- **FILE-001**: `src/components/gpt-editor.tsx` - Main GPT configuration form with native inputs, textareas, and validation
- **FILE-002**: `src/components/tools-configuration.tsx` - MCP tools configuration form with mixed HeroUI and native elements
- **FILE-003**: `src/components/capabilities-configuration.tsx` - GPT capabilities form with native checkboxes
- **FILE-004**: `src/components/knowledge-configuration.tsx` - File and URL management form with mixed components
- **FILE-005**: `src/components/gpt-test-pane.tsx` - Chat interface form with HeroUI Input components
- **FILE-006**: `src/components/settings/api-settings.tsx` - API configuration form using HeroUI components
- **FILE-007**: `src/components/file-upload/file-upload.tsx` - File upload component with custom error handling
- **FILE-008**: `src/hooks/use-gpt-validation.ts` - Form validation hook requiring updates for HeroUI integration
- **FILE-009**: `src/components/__tests__/gpt-editor.test.tsx` - Existing tests requiring updates for HeroUI
- **FILE-010**: `src/components/__tests__/gpt-test-pane.test.tsx` - Existing tests requiring updates for HeroUI

## 6. Testing

- **TEST-001**: Unit tests for all migrated form components covering prop handling and user interactions
- **TEST-002**: Integration tests for form validation flows with HeroUI error display patterns
- **TEST-003**: Accessibility tests using @testing-library/jest-dom and axe-core for ARIA compliance
- **TEST-004**: Visual regression tests for form states: default, focused, error, success, loading, disabled
- **TEST-005**: Keyboard navigation tests ensuring proper tab order and focus management
- **TEST-006**: Form submission tests covering success, error, and loading states
- **TEST-007**: Cross-browser compatibility tests for HeroUI form components
- **TEST-008**: Screen reader compatibility tests using screen reader simulators
- **TEST-009**: Performance tests ensuring no significant bundle size increase
- **TEST-010**: End-to-end form workflows: GPT creation, editing, validation, and submission

## 7. Risks & Assumptions

- **RISK-001**: HeroUI component behavior might differ from native HTML inputs affecting existing interactions
- **RISK-002**: Test selectors might break when migrating from native inputs to HeroUI components
- **RISK-003**: Form validation timing might change with HeroUI components affecting user experience
- **RISK-004**: Bundle size might increase significantly with additional HeroUI form components
- **RISK-005**: Existing CSS overrides might conflict with HeroUI component styling
- **ASSUMPTION-001**: HeroUI form components provide equivalent functionality to native HTML elements
- **ASSUMPTION-002**: Design system utilities are sufficient for all current form styling needs
- **ASSUMPTION-003**: Existing validation logic will work seamlessly with HeroUI error display patterns
- **ASSUMPTION-004**: TypeScript types for HeroUI components are compatible with existing form handlers
- **ASSUMPTION-005**: Performance impact of HeroUI components is acceptable for form-heavy interactions

## 8. Related Specifications / Further Reading

- [Design System Migration Assessment](../notes/design-system-migration-assessment.md)
- [Navbar Component Migration Plan](./refactor-navbar-component-1.md)
- [Card Components Standardization Plan](./refactor-card-components-1.md)
- [GPT AI Coding Instructions](../../.github/copilot-instructions.md)
- [HeroUI Form Components Documentation](https://heroui.com/docs/components/input)
- [React Hook Form Integration with HeroUI](https://heroui.com/docs/guide/form-libraries)
- [WCAG 2.1 Form Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions.html)
- [Design System Form Utilities Reference](../../src/lib/design-system.ts)
