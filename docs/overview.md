# Project Overview: Local-First GPT Creation Platform

## Core Mission

GPT is a privacy-first, local-first platform for creating, managing, and interacting with custom AI assistants (GPTs). It provides a seamless experience mirroring OpenAI's GPT functionality while ensuring complete data sovereignty through local storage and client-side encryption.

## Architecture & Design Principles

### 1. Local-First Data Sovereignty

- **Storage**: All data (configurations, conversations, knowledge) is stored in **IndexedDB** via **Dexie.js**, providing robust structured storage that scales beyond `localStorage` limits.
- **Performance**: Integrated **LRU caching** layer for fast access to frequently used GPTs and conversations.
- **Synchronization**: Real-time **cross-tab synchronization** using the `BroadcastChannel` API.
- **Privacy**: No user data or conversation history ever leaves the client except for LLM provider requests.

### 2. Security Infrastructure

- **Encryption**: Sensitive data (API keys) is encrypted using the **Web Crypto API** (AES-GCM 256-bit).
- **Key Derivation**: Secure key derivation using **PBKDF2** with unique salts.
- **Zero-Knowledge**: The platform does not store or see raw API keys; they are only decrypted in-memory for provider requests.

### 3. Multi-Provider Abstraction

- **BaseLLMProvider**: A unified abstraction layer for different LLM providers (OpenAI, Anthropic, Ollama).
- **Provider Registry**: Dynamic registration system allowing easy expansion to new models and providers.
- **Streaming**: Full support for streaming responses with consistent message formatting across providers.

### 4. Accessibility & UI

- **WCAG 2.1 AA**: Built with accessibility as a first-class citizen using **HeroUI** and **axe-core** audit gates.
- **Semantic Design**: Utilizes **TailwindCSS 4** design tokens for consistent theming and micro-interactions.

## Technical Implementation

### Core Interfaces (Zod Schemas)

The project uses **Zod** for runtime validation and type inference, ensuring data integrity across the platform.

```typescript
// GPT Configuration Schema
export const GPTConfigurationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  systemPrompt: z.string(),
  instructions: z.string().optional(),
  modelProvider: ProviderIdSchema.optional(),
  modelName: z.string().optional(),
  tools: z.array(MCPToolSchema),
  knowledge: GPTKnowledgeSchema,
  capabilities: GPTCapabilitiesSchema,
  isArchived: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
})
```

### Key Services

- **IndexedDBStorageService**: Manages the persistence layer with Dexie.js.
- **EncryptionService**: Handles client-side crypto operations.
- **ProviderRegistry**: Orchestrates multiple LLM backends.
- **ConversationSearchService**: Provides full-text search across local conversation history.

## Architecture Decisions (RFCs)

The platform's evolution is documented through Request for Comments (RFCs):

- **RFC-001**: IndexedDB Storage Foundation (Dexie integration)
- **RFC-002**: Security Infrastructure (Web Crypto, AES-GCM)
- **RFC-003**: Provider Abstraction Layer (BaseLLMProvider)
- **RFC-004**: GPT Configuration Management
- **RFC-005**: Conversation Management
- **RFC-007**: Export/Import System
- **RFC-008**: Anthropic Provider Integration
- **RFC-009**: MCP Tool Integration (Multi-Call Protocol)
- **RFC-010**: Ollama Local Models

## Project State & Roadmap

### Completed Features

- [x] **GPT CRUD**: Full lifecycle management for custom assistants.
- [x] **Multi-Provider Support**: OpenAI, Anthropic, and local Ollama models.
- [x] **Secure Storage**: Encrypted API key management and IndexedDB persistence.
- [x] **Conversation Management**: Threaded history, pinning, and archiving.
- [x] **Full-Text Search**: Client-side search for conversations and GPTs.
- [x] **Export/Import**: JSON-based backup and portability for configurations.
- [x] **Accessibility**: WCAG 2.1 AA compliance audit integration.

### Active Development

- [ ] **MCP Tool Integration**: Enhanced tool calling via Multi-Call Protocol.
- [ ] **Knowledge Base RAG**: Vector store integration for local file search.
- [ ] **Advanced Tool Sandbox**: Secure execution environment for custom tools.
- [ ] **Tauri Desktop App**: Native desktop wrapper for enhanced local capabilities.
