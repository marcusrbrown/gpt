# RFC-003: Provider Abstraction Layer

**Status:** Draft **Priority:** MUST HAVE (Phase 1) **Complexity:** Medium **Estimated Effort:** 1-2 weeks

---

## Summary

Create a unified provider abstraction layer that allows the application to work with multiple LLM providers (OpenAI, Anthropic, Ollama, Azure) through a common interface. This RFC refactors the existing OpenAI-specific implementation into a pluggable architecture.

---

## Prerequisites

| RFC     | Requirement                                   |
| ------- | --------------------------------------------- |
| RFC-001 | IndexedDB storage for provider configurations |
| RFC-002 | Encrypted storage for API keys                |

---

## Features Addressed

| Feature ID | Description                    | Priority |
| ---------- | ------------------------------ | -------- |
| FR-16      | Provider Configuration         | MUST     |
| FR-17      | Model Selection                | MUST     |
| F-301      | Provider Abstraction Interface | MUST     |

---

## Technical Specification

### 1. Provider Interface

```typescript
// src/types/provider.ts
import {z} from "zod"

export const ProviderIdSchema = z.enum(["openai", "anthropic", "ollama", "azure"])
export type ProviderId = z.infer<typeof ProviderIdSchema>

export const ModelCapabilitiesSchema = z.object({
  supportsVision: z.boolean(),
  supportsTools: z.boolean(),
  supportsStreaming: z.boolean(),
  contextWindow: z.number().positive(),
  maxOutputTokens: z.number().positive().optional(),
})

export const ModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: ProviderIdSchema,
  capabilities: ModelCapabilitiesSchema,
  pricingTier: z.enum(["free", "standard", "premium"]).optional(),
})

export type Model = z.infer<typeof ModelSchema>

export const ProviderConfigSchema = z.object({
  id: ProviderIdSchema,
  name: z.string(),
  apiKeyRequired: z.boolean(),
  baseUrl: z.string().url().optional(),
  isConfigured: z.boolean(),
  isEnabled: z.boolean(),
})

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>

export const CompletionRequestSchema = z.object({
  model: z.string(),
  messages: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant", "tool"]),
      content: z.string(),
      toolCallId: z.string().optional(),
    }),
  ),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  tools: z.array(z.any()).optional(),
  stream: z.boolean().default(true),
})

export type CompletionRequest = z.infer<typeof CompletionRequestSchema>

export const CompletionChunkSchema = z.object({
  id: z.string(),
  content: z.string().optional(),
  toolCalls: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        arguments: z.string(),
      }),
    )
    .optional(),
  finishReason: z.enum(["stop", "length", "tool_calls", "error"]).optional(),
  usage: z
    .object({
      promptTokens: z.number(),
      completionTokens: z.number(),
    })
    .optional(),
})

export type CompletionChunk = z.infer<typeof CompletionChunkSchema>

export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  error: z.string().optional(),
  models: z.array(ModelSchema).optional(),
})

export type ValidationResult = z.infer<typeof ValidationResultSchema>
```

### 2. Abstract Provider Class

```typescript
// src/services/providers/base-provider.ts
export abstract class BaseLLMProvider {
  abstract readonly id: ProviderId
  abstract readonly name: string
  abstract readonly supportsVision: boolean
  abstract readonly supportsTools: boolean
  abstract readonly supportsStreaming: boolean

  abstract validateCredentials(apiKey: string, baseUrl?: string): Promise<ValidationResult>
  abstract listModels(): Promise<Model[]>
  abstract createCompletion(request: CompletionRequest): AsyncIterable<CompletionChunk>

  // Optional capabilities
  createEmbedding?(text: string): Promise<number[]>
}
```

### 3. Provider Registry

```typescript
// src/services/providers/provider-registry.ts
export class ProviderRegistry {
  private providers: Map<ProviderId, BaseLLMProvider> = new Map()

  register(provider: BaseLLMProvider): void
  get(id: ProviderId): BaseLLMProvider | undefined
  list(): ProviderConfig[]
  getConfigured(): ProviderConfig[]
}
```

### 4. File Structure

```
src/services/providers/
├── base-provider.ts        # Abstract base class
├── provider-registry.ts    # Registry singleton
├── openai-provider.ts      # OpenAI implementation (refactored)
├── anthropic-provider.ts   # Stub for RFC-008
├── ollama-provider.ts      # Stub for RFC-010
├── azure-provider.ts       # Stub for future
└── index.ts                # Exports

src/types/
└── provider.ts             # Provider type definitions
```

### 5. OpenAI Provider Refactoring

Refactor existing `src/services/openai-service.ts` to:

1. Extract provider-specific logic into `openai-provider.ts`
2. Implement `BaseLLMProvider` interface
3. Keep backward compatibility with existing chat functionality
4. Use encrypted API key retrieval from RFC-002

### 6. Provider Context

```typescript
// src/contexts/provider-context.tsx
interface ProviderContextValue {
  providers: ProviderConfig[]
  activeProvider: ProviderId | null
  setActiveProvider: (id: ProviderId) => void
  getProvider: (id: ProviderId) => BaseLLMProvider | undefined
  validateProvider: (id: ProviderId, apiKey: string) => Promise<ValidationResult>
  listModels: (providerId: ProviderId) => Promise<Model[]>
}
```

---

## Data Flow

```
User selects provider
        │
        ▼
┌─────────────────┐
│ ProviderContext │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ ProviderRegistry│────▶│ BaseLLMProvider │
└─────────────────┘     └────────┬────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ OpenAIProvider  │   │AnthropicProvider│   │ OllamaProvider  │
└─────────────────┘   └─────────────────┘   └─────────────────┘
```

---

## Acceptance Criteria

```gherkin
Given the provider abstraction layer is implemented
When a user configures an OpenAI API key
Then the key is validated via the OpenAI provider
And available models are fetched and displayed
And the provider is marked as configured in the registry

Given multiple providers are configured
When a user creates a GPT
Then they can select any configured provider
And the model list updates based on selected provider

Given the chat interface sends a message
When using any configured provider
Then the response streams correctly
And tool calls are handled uniformly
```

---

## Migration Strategy

1. Create new provider infrastructure alongside existing code
2. Refactor OpenAI service to implement provider interface
3. Update GPT editor to use provider context
4. Update chat interface to use abstracted provider
5. Remove direct OpenAI dependencies from components

---

## Testing Requirements

| Test Type   | Coverage                                          |
| ----------- | ------------------------------------------------- |
| Unit        | Provider interface compliance for each provider   |
| Unit        | Registry operations (register, get, list)         |
| Integration | Provider switching in GPT editor                  |
| Integration | Chat with different providers                     |
| E2E         | Full flow: configure provider → create GPT → chat |

---

## Future RFCs Building on This

- RFC-008: Anthropic Provider Integration
- RFC-010: Ollama Local Models
