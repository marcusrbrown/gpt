# src/pages/AGENTS.md

Route-level page components.

## Routes

| Route           | Component           | Purpose                  |
| --------------- | ------------------- | ------------------------ |
| `/`             | `HomePage`          | GPT list, search, create |
| `/gpt/new`      | `GPTEditorPage`     | Create new GPT           |
| `/gpt/edit/:id` | `GPTEditorPage`     | Edit existing GPT        |
| `/gpt/test/:id` | `GPTTestPage`       | Test GPT in conversation |
| `/backup`       | `BackupRestorePage` | Export/import data       |
| `/docs/*`       | Lazy-loaded docs    | Documentation            |

## Conventions

- Compose components and hooks; avoid SDK logic in pages
- Keep routing concerns here, reusable UI in `components/`
- Ensure accessibility: proper headings, landmarks, focus management
