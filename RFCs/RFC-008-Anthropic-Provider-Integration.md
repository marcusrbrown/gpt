# RFC-008: Anthropic Provider Integration

| Field            | Value                                              |
| ---------------- | -------------------------------------------------- |
| **Status**       | Pending                                            |
| **Priority**     | SHOULD                                             |
| **Complexity**   | Medium                                             |
| **Effort**       | 1.5 weeks                                          |
| **Dependencies** | RFC-002 (Security), RFC-003 (Provider Abstraction) |

## Summary

Implement full Anthropic Claude integration using the Messages API. This RFC extends the existing provider abstraction layer with Anthropic-specific features including streaming responses, tool use, and proper rate limit handling.

## Prerequisites

| Prerequisite               | RFC     | Status       |
| -------------------------- | ------- | ------------ |
| Security Infrastructure    | RFC-002 | ✅ Completed |
| Provider Abstraction Layer | RFC-003 | ✅ Completed |

## Features Addressed

| Feature ID | Feature Name                 | Coverage |
| ---------- | ---------------------------- | -------- |
| F-502      | Anthropic Claude Integration | Full     |

## Technical Specification

### Supported Models

| Model                      | Alias             | Context Window | Max Output | Features                         |
| -------------------------- | ----------------- | -------------- | ---------- | -------------------------------- |
| claude-opus-4-5-20251101   | claude-opus-4-5   | 200K           | 64,000     | Vision, Tools, Extended Thinking |
| claude-sonnet-4-5-20250929 | claude-sonnet-4-5 | 200K (1M beta) | 64,000     | Vision, Tools, Extended Thinking |
| claude-haiku-4-5-20251001  | claude-haiku-4-5  | 200K           | 64,000     | Vision, Tools, Extended Thinking |

### Zod Schemas

```typescript
import {z} from "zod"

// Anthropic model identifiers (dated versions)
export const AnthropicModelDatedSchema = z.enum([
  "claude-opus-4-5-20251101",
  "claude-sonnet-4-5-20250929",
  "claude-haiku-4-5-20251001",
])

// Anthropic model aliases (convenience)
export const AnthropicModelAliasSchema = z.enum(["claude-opus-4-5", "claude-sonnet-4-5", "claude-haiku-4-5"])

// Combined model schema (accepts both dated and alias forms)
export const AnthropicModelSchema = z.union([AnthropicModelDatedSchema, AnthropicModelAliasSchema])

// Model capabilities
export const AnthropicModelCapabilitiesSchema = z.object({
  model: AnthropicModelDatedSchema,
  alias: AnthropicModelAliasSchema,
  contextWindow: z.number(),
  maxContextWindow: z.number().optional(), // For 1M beta support (Sonnet 4.5)
  maxOutputTokens: z.number(),
  supportsVision: z.boolean(),
  supportsTools: z.boolean(),
  supportsExtendedThinking: z.boolean(),
  supports1MContext: z.boolean(), // Beta feature availability
  inputPricePerMillion: z.number(),
  outputPricePerMillion: z.number(),
})

// Message content types
export const AnthropicTextContentSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
})

export const AnthropicImageContentSchema = z.object({
  type: z.literal("image"),
  source: z.object({
    type: z.literal("base64"),
    media_type: z.enum(["image/jpeg", "image/png", "image/gif", "image/webp"]),
    data: z.string(),
  }),
})

export const AnthropicToolUseContentSchema = z.object({
  type: z.literal("tool_use"),
  id: z.string(),
  name: z.string(),
  input: z.record(z.unknown()),
})

export const AnthropicToolResultContentSchema = z.object({
  type: z.literal("tool_result"),
  tool_use_id: z.string(),
  content: z.string(),
})

// Thinking content block (extended thinking responses)
export const AnthropicThinkingContentSchema = z.object({
  type: z.literal("thinking"),
  thinking: z.string(),
})

export const AnthropicContentBlockSchema = z.discriminatedUnion("type", [
  AnthropicTextContentSchema,
  AnthropicImageContentSchema,
  AnthropicToolUseContentSchema,
  AnthropicToolResultContentSchema,
  AnthropicThinkingContentSchema,
])

// Message structure
export const AnthropicMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.union([z.string(), z.array(AnthropicContentBlockSchema)]),
})

// Tool definition
export const AnthropicToolSchema = z.object({
  name: z.string().max(64),
  description: z.string().optional(),
  input_schema: z.object({
    type: z.literal("object"),
    properties: z.record(z.unknown()),
    required: z.array(z.string()).optional(),
  }),
})

// Extended thinking configuration
export const ExtendedThinkingConfigSchema = z.object({
  type: z.literal("enabled"),
  budget_tokens: z.number().min(1024).max(128000),
})

// API request
export const AnthropicRequestSchema = z.object({
  model: AnthropicModelSchema,
  messages: z.array(AnthropicMessageSchema),
  system: z.string().optional(),
  max_tokens: z.number().min(1).max(64000),
  temperature: z.number().min(0).max(1).optional(),
  top_p: z.number().min(0).max(1).optional(),
  top_k: z.number().min(0).optional(),
  stop_sequences: z.array(z.string()).optional(),
  stream: z.boolean().optional(),
  tools: z.array(AnthropicToolSchema).optional(),
  tool_choice: z
    .union([
      z.object({type: z.literal("auto")}),
      z.object({type: z.literal("any")}),
      z.object({type: z.literal("tool"), name: z.string()}),
    ])
    .optional(),
  thinking: ExtendedThinkingConfigSchema.optional(),
})

// API response
export const AnthropicResponseSchema = z.object({
  id: z.string(),
  type: z.literal("message"),
  role: z.literal("assistant"),
  content: z.array(AnthropicContentBlockSchema),
  model: z.string(),
  stop_reason: z.enum(["end_turn", "max_tokens", "stop_sequence", "tool_use"]).nullable(),
  stop_sequence: z.string().nullable(),
  usage: z.object({
    input_tokens: z.number(),
    output_tokens: z.number(),
  }),
})

// Streaming events
export const AnthropicStreamEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("message_start"),
    message: AnthropicResponseSchema.partial(),
  }),
  z.object({
    type: z.literal("content_block_start"),
    index: z.number(),
    content_block: AnthropicContentBlockSchema,
  }),
  z.object({
    type: z.literal("content_block_delta"),
    index: z.number(),
    delta: z.union([
      z.object({
        type: z.literal("text_delta"),
        text: z.string(),
      }),
      z.object({
        type: z.literal("thinking_delta"),
        thinking: z.string(),
      }),
    ]),
  }),
  z.object({
    type: z.literal("content_block_stop"),
    index: z.number(),
  }),
  z.object({
    type: z.literal("message_delta"),
    delta: z.object({
      stop_reason: z.string().nullable(),
      stop_sequence: z.string().nullable(),
    }),
    usage: z.object({output_tokens: z.number()}),
  }),
  z.object({
    type: z.literal("message_stop"),
  }),
  z.object({
    type: z.literal("error"),
    error: z.object({
      type: z.string(),
      message: z.string(),
    }),
  }),
])

// Type exports
export type AnthropicModel = z.infer<typeof AnthropicModelSchema>
export type AnthropicModelDated = z.infer<typeof AnthropicModelDatedSchema>
export type AnthropicModelAlias = z.infer<typeof AnthropicModelAliasSchema>
export type AnthropicRequest = z.infer<typeof AnthropicRequestSchema>
export type AnthropicResponse = z.infer<typeof AnthropicResponseSchema>
export type AnthropicStreamEvent = z.infer<typeof AnthropicStreamEventSchema>
export type AnthropicTool = z.infer<typeof AnthropicToolSchema>
export type ExtendedThinkingConfig = z.infer<typeof ExtendedThinkingConfigSchema>
```

### Provider Implementation

```typescript
import {BaseLLMProvider, ProviderError, type CompletionRequest, type CompletionResponse} from "./base-provider"

export class AnthropicProvider extends BaseLLMProvider {
  readonly id = "anthropic"
  readonly name = "Anthropic"
  readonly apiKeyRequired = true
  readonly enabled = true

  private readonly BASE_URL = "https://api.anthropic.com/v1"
  private readonly API_VERSION = "2023-06-01"

  private readonly MODEL_CAPABILITIES: Record<string, AnthropicModelCapabilities> = {
    // Claude Opus 4.5
    "claude-opus-4-5-20251101": {
      model: "claude-opus-4-5-20251101",
      contextWindow: 200_000,
      maxOutputTokens: 64_000,
      supportsVision: true,
      supportsTools: true,
      supportsExtendedThinking: true,
      inputPricePerMillion: 5.0,
      outputPricePerMillion: 25.0,
    },
    // Claude Sonnet 4.5
    "claude-sonnet-4-5-20250929": {
      model: "claude-sonnet-4-5-20250929",
      contextWindow: 200_000,
      maxContextWindow: 1_000_000, // Beta: requires anthropic-beta header
      maxOutputTokens: 64_000,
      supportsVision: true,
      supportsTools: true,
      supportsExtendedThinking: true,
      inputPricePerMillion: 3.0,
      outputPricePerMillion: 15.0,
    },
    // Claude Haiku 4.5
    "claude-haiku-4-5-20251001": {
      model: "claude-haiku-4-5-20251001",
      contextWindow: 200_000,
      maxOutputTokens: 64_000,
      supportsVision: true,
      supportsTools: true,
      supportsExtendedThinking: true,
      inputPricePerMillion: 1.0,
      outputPricePerMillion: 5.0,
    },
  }

  // Model aliases for convenience
  private readonly MODEL_ALIASES: Record<string, string> = {
    "claude-opus-4-5": "claude-opus-4-5-20251101",
    "claude-sonnet-4-5": "claude-sonnet-4-5-20250929",
    "claude-haiku-4-5": "claude-haiku-4-5-20251001",
  }

  private resolveModel(model: string): string {
    return this.MODEL_ALIASES[model] || model
  }

  async validateCredentials(apiKey: string): Promise<boolean> {
    try {
      // Use a minimal request to validate the key (cheapest model)
      const response = await fetch(`${this.BASE_URL}/messages`, {
        method: "POST",
        headers: this.getHeaders(apiKey),
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1,
          messages: [{role: "user", content: "hi"}],
        }),
      })

      if (response.status === 401) {
        return false
      }

      // Any other response (including 400 for invalid request) means key is valid
      return response.status !== 401
    } catch {
      throw new ProviderError("network_error", "Failed to connect to Anthropic API")
    }
  }

  async listModels(): Promise<string[]> {
    // Anthropic doesn't have a models endpoint, return static list
    // Returns both dated identifiers and aliases
    return [...Object.keys(this.MODEL_CAPABILITIES), ...Object.keys(this.MODEL_ALIASES)]
  }

  async createCompletion(request: CompletionRequest, apiKey: string): Promise<CompletionResponse> {
    const anthropicRequest = this.mapToAnthropicRequest(request)

    const response = await fetch(`${this.BASE_URL}/messages`, {
      method: "POST",
      headers: this.getHeaders(apiKey),
      body: JSON.stringify(anthropicRequest),
    })

    if (!response.ok) {
      await this.handleError(response)
    }

    const data = AnthropicResponseSchema.parse(await response.json())
    return this.mapToCompletionResponse(data)
  }

  async *createCompletionStream(request: CompletionRequest, apiKey: string): AsyncGenerator<string, void, unknown> {
    const anthropicRequest = this.mapToAnthropicRequest(request)
    anthropicRequest.stream = true

    const response = await fetch(`${this.BASE_URL}/messages`, {
      method: "POST",
      headers: this.getHeaders(apiKey),
      body: JSON.stringify(anthropicRequest),
    })

    if (!response.ok) {
      await this.handleError(response)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new ProviderError("stream_error", "No response body")
    }

    const decoder = new TextDecoder()
    let buffer = ""

    try {
      while (true) {
        const {done, value} = await reader.read()
        if (done) break

        buffer += decoder.decode(value, {stream: true})
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6)
            if (data === "[DONE]") return

            try {
              const event = JSON.parse(data) as AnthropicStreamEvent

              if (event.type === "content_block_delta") {
                if (event.delta.type === "text_delta") {
                  yield event.delta.text
                } else if (event.delta.type === "thinking_delta") {
                  // Emit thinking content with a prefix for UI differentiation
                  yield {type: "thinking", content: event.delta.thinking}
                }
              } else if (event.type === "error") {
                throw new ProviderError("stream_error", event.error.message)
              }
            } catch (e) {
              if (e instanceof ProviderError) throw e
              // Ignore parse errors for non-JSON lines
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  private getHeaders(apiKey: string, options?: {use1MContext?: boolean}): HeadersInit {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": this.API_VERSION,
    }

    // 1M context window beta (Sonnet 4.5 only, requires tier 4+ org)
    if (options?.use1MContext) {
      headers["anthropic-beta"] = "context-1m-2025-08-07"
    }

    return headers
  }

  private mapToAnthropicRequest(
    request: CompletionRequest,
    options?: {extendedThinking?: ExtendedThinkingConfig},
  ): AnthropicRequest {
    const resolvedModel = this.resolveModel(request.model)
    const messages: AnthropicMessage[] = request.messages
      .filter(m => m.role !== "system")
      .map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }))

    const systemMessage = request.messages.find(m => m.role === "system")

    const anthropicRequest: AnthropicRequest = {
      model: resolvedModel as AnthropicModel,
      messages,
      system: systemMessage?.content,
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature,
      stop_sequences: request.stop,
    }

    // Add extended thinking if configured
    if (options?.extendedThinking?.enabled) {
      anthropicRequest.thinking = {
        enabled: true,
        budget_tokens: options.extendedThinking.budget_tokens,
      }
      // Note: temperature must be 1 when using extended thinking
      delete anthropicRequest.temperature
    }

    return anthropicRequest
  }

  private mapToCompletionResponse(data: AnthropicResponse): CompletionResponse {
    const textContent = data.content.find(c => c.type === "text")

    return {
      id: data.id,
      content: textContent?.text || "",
      model: data.model,
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      },
      finishReason: this.mapStopReason(data.stop_reason),
    }
  }

  private mapStopReason(reason: string | null): "stop" | "length" | "tool_calls" {
    switch (reason) {
      case "end_turn":
      case "stop_sequence":
        return "stop"
      case "max_tokens":
        return "length"
      case "tool_use":
        return "tool_calls"
      default:
        return "stop"
    }
  }

  private async handleError(response: Response): Promise<never> {
    const body = await response.json().catch(() => ({}))

    switch (response.status) {
      case 400:
        throw new ProviderError("invalid_request", body.error?.message || "Bad request")
      case 401:
        throw new ProviderError("authentication", "Invalid API key")
      case 403:
        throw new ProviderError("permission", "Access denied")
      case 429:
        throw new ProviderError("rate_limit", "Rate limit exceeded", {
          retryAfter: parseInt(response.headers.get("retry-after") || "60"),
        })
      case 500:
      case 529:
        throw new ProviderError("server", "Anthropic API error")
      default:
        throw new ProviderError("unknown", `HTTP ${response.status}`)
    }
  }

  getModelCapabilities(model: string): AnthropicModelCapabilities | undefined {
    return this.MODEL_CAPABILITIES[model]
  }
}
```

### Rate Limiting

```typescript
class RateLimiter {
  private requestCounts: Map<string, {count: number; resetAt: number}> = new Map()

  private readonly LIMITS = {
    "claude-opus-4-5-20251101": {requestsPerMinute: 50, tokensPerMinute: 80_000},
    "claude-sonnet-4-5-20250929": {requestsPerMinute: 100, tokensPerMinute: 160_000},
    "claude-haiku-4-5-20251001": {requestsPerMinute: 200, tokensPerMinute: 200_000},
  }

  async checkLimit(model: string): Promise<boolean> {
    const limit = this.LIMITS[model as keyof typeof this.LIMITS]
    if (!limit) return true

    const now = Date.now()
    const entry = this.requestCounts.get(model)

    if (!entry || now > entry.resetAt) {
      this.requestCounts.set(model, {count: 1, resetAt: now + 60000})
      return true
    }

    if (entry.count >= limit.requestsPerMinute) {
      return false
    }

    entry.count++
    return true
  }

  getWaitTime(model: string): number {
    const entry = this.requestCounts.get(model)
    if (!entry) return 0
    return Math.max(0, entry.resetAt - Date.now())
  }
}
```

## UI Components

### AnthropicSettings

```typescript
interface AnthropicSettingsProps {
  onSave: (apiKey: string) => void
}

// API key input with validation
// Model selector with capabilities display
// Link to Anthropic console for key management
```

### ModelSelector (Enhanced)

```typescript
interface ModelSelectorProps {
  provider: "openai" | "anthropic" | "ollama"
  value: string
  onChange: (model: string) => void
}

// Shows model name, context window, pricing
// Groups by capability (vision, tools)
// Indicates recommended models
```

## Acceptance Criteria

```gherkin
Feature: Anthropic Provider Integration

Scenario: Configure Anthropic API key
  Given I am on the settings page
  When I enter a valid Anthropic API key
  And I click "Validate"
  Then the key should be validated against the Anthropic API
  And the key should be encrypted and stored
  And Anthropic models should become available

Scenario: Chat with Claude
  Given I have configured a valid Anthropic API key
  And I have a GPT using claude-sonnet-4-5
  When I send a message
  Then the message should be sent to Anthropic's Messages API
  And the response should stream in real-time
  And token usage should be tracked

Scenario: Handle rate limiting
  Given I have exceeded the rate limit
  When I send another message
  Then I should see a rate limit error
  And the error should include retry timing
  And the UI should show when I can retry

Scenario: Use Claude with tools
  Given I have a GPT with MCP tools configured
  And the GPT uses an Anthropic model
  When I ask Claude to use a tool
  Then the tool should be called via Anthropic's tool_use format
  And the result should be returned to Claude

Scenario: Use extended thinking
  Given I have a GPT using claude-sonnet-4-5
  And extended thinking is enabled with 20000 budget tokens
  When I send a complex reasoning question
  Then the request should include thinking configuration
  And the response should contain thinking blocks
  And thinking tokens should be tracked in usage

Scenario: Use 1M context window
  Given I have a tier 4+ organization
  And I have a GPT using claude-sonnet-4-5
  And 1M context is enabled
  When I send a request with a large context
  Then the beta header should be included
  And the model should accept up to 1M input tokens
```

## Testing Requirements

| Test Type         | Coverage Target | Focus Areas                       |
| ----------------- | --------------- | --------------------------------- |
| Unit Tests        | 90%             | Request mapping, response parsing |
| Integration Tests | 80%             | API calls (mocked), streaming     |
| E2E Tests         | Key flows       | Full conversation flow            |

### Key Test Cases

1. **Credential validation**: Valid/invalid API keys handled correctly
2. **Streaming**: All SSE event types parsed correctly (including thinking_delta)
3. **Error mapping**: All HTTP errors mapped to ProviderError
4. **Rate limiting**: Backoff and retry work correctly
5. **Tool use**: Tool calls formatted and parsed correctly
6. **Extended thinking**: Thinking config serialized correctly, thinking blocks parsed
7. **1M context beta**: Beta header included when configured, large context accepted
8. **Model aliases**: Both full identifiers and short aliases resolve correctly

## Security Considerations

- API keys encrypted at rest (RFC-002)
- Keys never logged or exposed in errors
- HTTPS only for API communication
- Rate limiting prevents accidental cost overruns

## Dependencies

### npm Packages

No additional packages required - uses native fetch API.

## Future Enhancements

| Enhancement        | Description                               | Target RFC |
| ------------------ | ----------------------------------------- | ---------- |
| Vision support     | Image input handling                      | RFC-013    |
| Prompt caching     | Use Anthropic's prompt caching            | RFC-013    |
| Batching           | Batch API for bulk processing             | RFC-013    |
| Effort parameter   | Opus 4.5 exclusive effort/quality control | RFC-013    |
| Regional endpoints | AWS/GCP regional API endpoints            | RFC-013    |
