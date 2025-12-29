# <div align="center">GPT</div>

<div align="center">

![GPT Project Banner](https://placehold.co/1200x300/0d1117/ffffff?text=Local-First+GPT+Platform)

**Local-first, privacy-focused GPT creation and management platform.**

[Overview](#overview) • [Architecture](#architecture) • [Tech Stack](#tech-stack) • [Development](#development) • [Testing](#testing)

</div>

---

## Overview

GPT is a local-first platform for creating, customizing, and interacting with AI assistants. It mirrors the core functionality of OpenAI's GPTs while providing complete data sovereignty. All configurations, conversation histories, and API keys stay on your machine, with sensitive data protected by client-side encryption.

### Key Capabilities

- **Create & Manage**: Build custom GPTs with specific instructions, prompts, and toolsets.
- **Local-First**: Persistent storage via IndexedDB (Dexie) with cross-tab synchronization.
- **Privacy-Centric**: AES-GCM encryption for API keys; data never leaves your browser.
- **Multi-Provider**: Unified interface for OpenAI, Anthropic, and local Ollama models.
- **Advanced UI**: Responsive, accessible interface built with React 19 and HeroUI.

## Architecture

The project follows a modular, provider-abstracted architecture:

- **Data Layer**: IndexedDB (Dexie.js) for structured data and Web Crypto for security.
- **Service Layer**: Decoupled services for storage, encryption, and provider management.
- **Provider Layer**: Pluggable LLM backends (OpenAI, Anthropic, Ollama) via `BaseLLMProvider`.
- **UI Layer**: Component-driven architecture using HeroUI and TailwindCSS 4 tokens.

For detailed design decisions, see [docs/overview.md](docs/overview.md) and the [RFCs](RFCs/RFCS.md).

## Tech Stack

- **Framework**: React 19, TypeScript 5.9, Vite 7
- **Styling**: TailwindCSS 4, HeroUI
- **Storage**: IndexedDB (Dexie.js), LRU Cache
- **Security**: Web Crypto API (AES-GCM, PBKDF2)
- **AI Integration**: LangChain abstraction, Multi-Call Protocol (MCP)
- **Development**: Deno (Jupyter Notebooks), pnpm monorepo

## Development

### Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Run the development server:
   ```bash
   pnpm dev
   ```

For production builds:

```bash
pnpm build
```

## Testing

Comprehensive quality gates covering multiple dimensions:

| Type       | Command                   | Description                           |
| ---------- | ------------------------- | ------------------------------------- |
| **Unit**   | `pnpm test`               | Logic & component testing with Vitest |
| **E2E**    | `pnpm test:e2e`           | Full user flows with Playwright       |
| **A11y**   | `pnpm test:accessibility` | WCAG 2.1 AA audit via axe-core        |
| **Visual** | `pnpm test:visual`        | Regression testing for UI components  |
| **Perf**   | `pnpm test:performance`   | Core Web Vitals via Lighthouse        |

## Notebooks

Interactive agent development and research using Deno Jupyter kernel:

- `01-repo-ranger.ipynb`: Code analysis and security checking agent.
- `01-gpt-architect.ipynb`: Assistant development and optimization tool.
- `01-baroque-bitch.ipynb`: Art generation and style transfer assistant.

## License

[MIT](license.md)
