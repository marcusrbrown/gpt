# src/components/layouts/AGENTS.md

Page layout shells. Wrap route-level content with consistent structure.

## Components

| Component          | Purpose                                    |
| ------------------ | ------------------------------------------ |
| `DefaultLayout`    | Standard page with constrained max-width   |
| `FullHeightLayout` | Full viewport height (editor, test pages)  |
| `SidebarLayout`    | Two-column layout with collapsible sidebar |

## Conventions

- Layouts handle structural concerns only (no business logic)
- Use design system spacing tokens for padding/margins
- Export via `index.ts` barrel
