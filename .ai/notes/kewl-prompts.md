# AI Coding Agent Prompts for GPT Project

This document provides a set of prompts designed to guide AI coding agents in enhancing and extending the GPT project. The prompts are based on the architectural patterns, service layer design, and development practices established in the project. They can be used as inputs to the `/create-implementation-plan` prompt to generate actionable tasks for agents.

## **Multi-Platform AI Integration**
```markdown
Following the service layer pattern in src/services/openai-service.ts, create a new AnthropicService that implements the same interface for chat completions and assistant management. Add it to the OpenAIProvider context (renaming to AIProvider) with a platform selector, and update the GPT configuration schema to support multiple AI backends. Ensure the existing GPT test interface works seamlessly with both providers.
```

### Multi-Provider AI Service
```markdown
Extend the current OpenAI-focused architecture to support multiple AI providers (Ollama, Anthropic, Azure). Create a provider abstraction layer in `src/services/ai-providers/` with a unified interface, then update the existing OpenAI context and components to work with any provider. Maintain backward compatibility with existing GPT configurations while adding provider selection UI.
```

### Multi-Provider AI Integration Enhancement (2025-08-03)
```markdown
Using the existing service layer pattern, implement a unified multi-provider AI service that supports OpenAI, Anthropic Claude, and Ollama with automatic fallback mechanisms. Follow the platform-agnostic agent patterns from agent-development.md, use the existing error handling strategy from the context providers, and create comprehensive Vitest tests. The service should integrate with the current GPTConfiguration schema and maintain the local-first architecture principle.
```

## **Advanced Agent Template System**
```markdown
Extend the GPT configuration system to support agent templates with pre-configured capabilities, tools, and conversation flows. Create a new AgentTemplateProvider context, add CRUD operations to the storage service, and build a template gallery component that integrates with the existing GPT editor. Follow the Zod schema pattern for validation and use the lazy loading approach for the template components.
```

## **Notebook-Web Interface Bridge**
```markdown
Create a bidirectional sync system between Jupyter notebooks in notebooks/agents/ and the web interface GPT configurations. Build a NotebookSyncService that can export GPT configs to executable notebook templates and import agent definitions from notebook metadata. Add a sync status indicator to the GPT cards and integrate with the existing storage provider pattern.
```

## Agent Testing Framework
```markdown
Create a comprehensive testing framework for AI agents developed in Jupyter notebooks. Build a new service in `src/services/agent-testing.ts` that can execute notebook cells, validate agent responses, and generate test reports. Include a React component for visualizing test results in the web interface, following the existing HeroUI patterns and context provider architecture.
```

### Advanced GPT Testing Framework (2025-08-03)
```markdown
Extend the current GPT test pane (src/components/gpt-test-pane.tsx) to include an automated testing framework that can run conversation scenarios, validate GPT responses, and generate performance metrics. Use the existing ConversationProvider pattern, implement proper error boundaries, and create a new testing context provider following the hierarchical context pattern. Include visual regression testing using the Playwright framework already configured in tests/e2e/.
```

## Real-time Collaboration System
```markdown
Implement real-time collaboration for GPT configurations using the existing conversation context pattern. Add WebSocket support to the service layer, create collaborative editing components that extend the current `gpt-editor.tsx`, and implement conflict resolution for simultaneous edits. Follow the project's Zod validation patterns for synchronizing changes and maintain the local-first data sovereignty principle.
```

### Real-time Collaborative GPT Editor (2025-08-03)
```markdown
Implement a real-time collaborative editing feature for GPT configurations using WebRTC or WebSockets while maintaining the local-first architecture. Create a new collaboration context provider that integrates with the existing StorageProvider, implement conflict resolution using the Zod schema validation patterns, and add proper error handling following the established error handling strategy. Include comprehensive tests for offline/online scenarios and data synchronization.
```
