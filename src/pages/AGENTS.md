# src/pages/AGENTS.md

Route-level page components.

## Routes

| Route              | Component           | Purpose                  |
| ------------------ | ------------------- | ------------------------ |
| `/`                | `HomePage`          | GPT list, search, create |
| `/gpt/:gptId`      | `GPTShowcasePage`   | Public GPT showcase      |
| `/gpt/new`         | `GPTEditorPage`     | Create new GPT           |
| `/gpt/edit/:gptId` | `GPTEditorPage`     | Edit existing GPT        |
| `/gpt/test/:gptId` | `GPTTestPage`       | Test GPT in conversation |
| `/backup`          | `BackupRestorePage` | Export/import data       |
| `/settings`        | `SettingsPage`      | Provider & app settings  |
| `/oauth/callback`  | `OAuthCallbackPage` | MCP OAuth flow return    |
| `/docs/*`          | Lazy-loaded docs    | Documentation            |

## Conventions

- Compose components and hooks; avoid SDK logic in pages
- Keep routing concerns here, reusable UI in `components/`
- Ensure accessibility: proper headings, landmarks, focus management
