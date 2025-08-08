---
goal: 'Standardize card components to use unified GPT design system'
version: 1.0
date_created: 2025-08-02
last_updated: 2025-08-02
owner: 'Marcus R. Brown'
status: 'In Progress'
tags: ['refactor', 'design-system', 'components', 'cards', 'heroui', 'accessibility']
---

# Card Components Design System Standardization

![Status: In Progress](https://img.shields.io/badge/status-In%20Progress-yellow)

Comprehensive standardization of card components (`user-gpt-card.tsx`, `feature-card.tsx`, `card.tsx`) to implement unified GPT design system patterns, replacing CSS custom properties with semantic tokens, standardizing HeroUI component usage, and improving visual consistency and accessibility.

## 1. Requirements & Constraints

- **REQ-001**: Use HeroUI Card, CardHeader, CardBody, CardFooter components consistently across all card implementations
- **REQ-002**: Apply standard spacing patterns (p-6 for card padding, pb-4 for header spacing)
- **REQ-003**: Replace custom hover effects with design system transition utilities
- **REQ-004**: Use semantic color tokens for text hierarchy (content-primary, content-secondary, content-tertiary)
- **REQ-005**: Implement standard loading and error states using design system utilities
- **REQ-006**: Ensure responsive behavior with proper breakpoints and mobile-first design
- **REQ-007**: Import and utilize design system utilities from `@/lib/design-system`
- **REQ-008**: Maintain all existing functionality including click handlers, navigation, and external links
- **SEC-001**: Preserve security attributes (rel="noopener noreferrer" for external links)
- **A11Y-001**: Implement proper focus indicators using design system focus utilities
- **A11Y-002**: Ensure proper semantic markup and ARIA attributes for card interactions
- **A11Y-003**: Maintain keyboard navigation compatibility
- **CON-001**: Must not break existing integration points (card-group.tsx usage)
- **CON-002**: Visual appearance should remain consistent while using new design tokens
- **CON-003**: Performance must not degrade (no bundle size increase)
- **GUD-001**: Follow self-explanatory code commenting guidelines
- **GUD-002**: Use TypeScript strict typing for all props and interfaces
- **PAT-001**: Use design system composition utilities for common card patterns
- **PAT-002**: Apply consistent animation and transition patterns across all cards

## 2. Implementation Steps

### Implementation Phase 1: Analysis and Infrastructure Setup

- GOAL-001: Prepare components for design system integration and analyze current implementations

| Task | Description | Completed | Date |
| --- | --- | --- | --- |
| TASK-001 | Import design system utilities: `import { ds, cn, compose, theme } from '@/lib/design-system'` in all three card components | ✅ | 2025-08-07 |
| TASK-002 | Analyze current CSS custom property usage in feature-card.tsx and create semantic token mapping | ✅ | 2025-08-07 |
| TASK-003 | Document current spacing patterns and map to 4px-based scale equivalents | ✅ | 2025-08-07 |
| TASK-004 | Audit current HeroUI component usage in user-gpt-card.tsx and card.tsx for consistency | ✅ | 2025-08-07 |
| TASK-005 | Identify integration points and ensure refactoring won't break dependent components | ✅ | 2025-08-07 |

### Implementation Phase 2: Feature Card Complete Redesign

- GOAL-002: Rewrite feature-card.tsx to use HeroUI Card components and design system patterns

| Task | Description | Completed | Date |
| --- | --- | --- | --- |
| TASK-006 | Replace div-based structure with HeroUI Card, CardHeader, CardBody, CardFooter components | ✅ | 2025-08-07 |
| TASK-007 | Convert CSS custom properties to semantic tokens: `--background-tertiary` → `bg-surface-tertiary`, `--text-primary` → `text-content-primary` | ✅ | 2025-08-07 |
| TASK-008 | Replace manual border and background styling with theme.surface() and theme.border() utilities | ✅ | 2025-08-07 |
| TASK-009 | Implement standard card padding using p-6 and header spacing using pb-4 pattern | ✅ | 2025-08-07 |
| TASK-010 | Replace custom hover effects with ds.animation.transition and ds.card.interactive utilities | ✅ | 2025-08-07 |
| TASK-011 | Update icon styling to use semantic color tokens and consistent sizing | ✅ | 2025-08-07 |
| TASK-012 | Convert external/internal link logic to work with HeroUI Card isPressable prop | ✅ | 2025-08-07 |

### Implementation Phase 3: User GPT Card Enhancement

- GOAL-003: Standardize user-gpt-card.tsx with design system patterns while maintaining functionality

| Task | Description | Completed | Date |
| --- | --- | --- | --- |
| TASK-013 | Replace `text-small` and `text-default-500` classes with semantic design system equivalents | ✅ | 2025-08-07 |
| TASK-014 | Apply standard spacing patterns using design system utilities (gap-3 → gap-4 for consistency) | ✅ | 2025-08-07 |
| TASK-015 | Implement ds.text.heading and ds.text.body utilities for typography hierarchy | ✅ | 2025-08-07 |
| TASK-016 | Add transition animations using ds.animation.transition for hover states | ✅ | 2025-08-07 |
| TASK-017 | Update Button components to use consistent color and variant patterns | ✅ | 2025-08-07 |
| TASK-018 | Apply compose.card() utility for standard card styling patterns | ✅ | 2025-08-07 |

### Implementation Phase 4: Generic Card Component Standardization

- GOAL-004: Enhance card.tsx component with design system integration

| Task     | Description                                                                           | Completed | Date |
| -------- | ------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-019 | Replace `text-small` and `text-default-500` classes with design system text utilities | ✅ | 2025-08-07 |
| TASK-020 | Standardize Avatar component sizing and apply consistent spacing | ✅ | 2025-08-07 |
| TASK-021 | Update Link components to use semantic color tokens | ✅ | 2025-08-07 |
| TASK-022 | Apply standard card padding and header spacing patterns | ✅ | 2025-08-07 |
| TASK-023 | Implement consistent hover and focus states using design system utilities | ✅ | 2025-08-07 |
| TASK-024 | Add loading and error state handling using ds.state utilities | ✅ | 2025-08-07 |

### Implementation Phase 5: Design System Integration and Polish

- GOAL-005: Complete design system integration and implement advanced features

| Task     | Description                                                                           | Completed | Date |
| -------- | ------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-025 | Implement responsive behavior using responsive.cardGrid utilities where applicable    | ✅ | 2025-08-07 |
| TASK-026 | Add consistent focus indicators using ds.focus.ring for accessibility                 | ✅ | 2025-08-07 |
| TASK-027 | Implement loading states using ds.state.loading and HeroUI Skeleton components        | ✅ | 2025-08-07 |
| TASK-028 | Add error states using ds.state.error utilities for failed data loading               | ✅ | 2025-08-07 |
| TASK-029 | Apply consistent micro-interactions and animation timings                             | ✅ | 2025-08-07 |
| TASK-030 | Validate all semantic tokens are properly applied and no CSS custom properties remain | ✅ | 2025-08-07 |

### Implementation Phase 6: Testing and Validation

- GOAL-006: Create comprehensive test coverage and validate design system integration

| Task     | Description                                                                           | Completed | Date |
| -------- | ------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-031 | Create test files: `user-gpt-card.test.tsx`, `feature-card.test.tsx`, `card.test.tsx` | ✅ | 2025-08-07 |
| TASK-032 | Implement unit tests for component rendering and prop handling                        | ✅ | 2025-08-07 |
| TASK-033 | Add accessibility tests for keyboard navigation and screen reader compatibility       | ✅ | 2025-08-08 |
| TASK-034 | Create visual regression tests for hover states and animations                        |           |      |
| TASK-035 | Test responsive behavior at all breakpoints (sm, md, lg, xl)                          | ✅ | 2025-08-08 |
| TASK-036 | Validate integration with dependent components (card-group.tsx)                       |           |      |
| TASK-037 | Perform accessibility audit using axe-core or similar testing tools                   |           |      |

## 3. Alternatives

- **ALT-001**: Gradual migration per card component (rejected: creates inconsistency during transition period)
- **ALT-002**: Keep existing feature-card.tsx structure and just update CSS (rejected: doesn't achieve HeroUI consistency goal)
- **ALT-003**: Create new card components and deprecate old ones (rejected: unnecessary complexity for internal components)
- **ALT-004**: Use CSS-in-JS instead of design system utilities (rejected: inconsistent with project's Tailwind/design system approach)
- **ALT-005**: Implement custom card base class instead of using HeroUI Cards (rejected: defeats purpose of standardization)

## 4. Dependencies

- **DEP-001**: Design system utilities library (`src/lib/design-system.ts`) must be available with card-specific utilities
- **DEP-002**: HeroUI React Card components must be properly installed and available (@heroui/react)
- **DEP-003**: Tailwind configuration must include all semantic tokens (surface-_, content-_, border-\*)
- **DEP-004**: TypeScript configuration must support design system utility types and HeroUI component types
- **DEP-005**: Existing integration points (card-group.tsx) must remain functional during migration
- **DEP-006**: CSS custom properties system must remain functional for gradual migration of other components

## 5. Files

- **FILE-001**: `src/components/user-gpt-card.tsx` - User-created GPT configuration card component
- **FILE-002**: `src/components/feature-card.tsx` - Feature showcase card component (requires complete rewrite)
- **FILE-003**: `src/components/card.tsx` - Generic card component for external GPT showcases
- **FILE-004**: `src/lib/design-system.ts` - Design system utilities and helper functions (dependency)
- **FILE-005**: `src/components/card-group.tsx` - Container component using UserGPTCard (integration point)
- **FILE-006**: `src/components/__tests__/user-gpt-card.test.tsx` - Test file (to be created)
- **FILE-007**: `src/components/__tests__/feature-card.test.tsx` - Test file (to be created)
- **FILE-008**: `src/components/__tests__/card.test.tsx` - Test file (to be created)

## 6. Testing

- **TEST-001**: Unit tests for all three card components covering prop handling and rendering
- **TEST-002**: Integration tests for UserGPTCard usage in card-group.tsx
- **TEST-003**: Accessibility tests for keyboard navigation, focus management, and screen reader compatibility
- **TEST-004**: Visual regression tests for card appearances, hover states, and animations
- **TEST-005**: Responsive design tests at breakpoints: 320px (mobile), 768px (tablet), 1024px (desktop), 1440px (large)
- **TEST-006**: Link functionality tests for external links (security attributes) and internal navigation
- **TEST-007**: Loading state tests using HeroUI Skeleton components and ds.state.loading utilities
- **TEST-008**: Error state handling tests for failed data loading scenarios
- **TEST-009**: Typography hierarchy tests ensuring proper semantic token application
- **TEST-010**: Performance tests to ensure no bundle size regression

## 7. Risks & Assumptions

- **RISK-001**: FeatureCard complete rewrite might introduce functional regressions if not properly tested
- **RISK-002**: Changing card structure might affect existing CSS overrides in parent components
- **RISK-003**: HeroUI Card component behavior might differ from current custom implementations
- **RISK-004**: Design system utilities might not cover all current styling edge cases
- **RISK-005**: TypeScript type conflicts between HeroUI components and existing interfaces
- **ASSUMPTION-001**: All semantic tokens (surface-_, content-_, border-\*) are properly defined and accessible
- **ASSUMPTION-002**: HeroUI Card components provide equivalent functionality to current implementations
- **ASSUMPTION-003**: Design system utilities offer sufficient customization for current use cases
- **ASSUMPTION-004**: FeatureCard is not actively used (no usages found) so rewrite is safe
- **ASSUMPTION-005**: Current card integrations only depend on public props, not internal structure

## 8. Related Specifications / Further Reading

- [Design System Migration Assessment](../notes/design-system-migration-assessment.md)
- [Navbar Component Migration Plan](./refactor-navbar-component-1.md)
- [GPT AI Coding Instructions](../../.github/copilot-instructions.md)
- [HeroUI Card Component Documentation](https://heroui.com/docs/components/card)
- [Design System Utilities Reference](../../src/lib/design-system.ts)
- [WCAG 2.1 Card Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html)
