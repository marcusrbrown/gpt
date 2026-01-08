# src/components/chat/AGENTS.md

Modern chat interface for GPT testing.

## Components

| Component        | Purpose                                  |
| ---------------- | ---------------------------------------- |
| `ChatInterface`  | Main chat UI with sidebar + message area |
| `MessageBubble`  | Individual message with copy/regenerate  |
| `ChatInput`      | Input area with file upload, send button |
| `SidebarContent` | Conversation list with date grouping     |

## Patterns

- Streaming responses via `openAIService.streamRun()`
- Mobile: `Drawer` for sidebar, desktop: fixed panel
- Date grouping: Today / Yesterday / Older
- Message actions: copy, regenerate, export

## Conventions

- Use `ScrollShadow` for message container
- Auto-scroll on new messages (respect user scroll position)
- Loading states: skeleton for pending, spinner for streaming
