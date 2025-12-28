---
goal: Implement full Anthropic Claude integration with streaming, tools, and extended thinking
version: 1.0
date_created: 2025-12-28
last_updated: 2025-12-28
status: "Planned"
tags: [feature, provider, anthropic, phase-2]
---

# Implementation Plan for RFC-008: Anthropic Provider Integration

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Implement full Anthropic Claude integration using the Messages API, extending the existing provider abstraction layer with Anthropic-specific features including streaming responses, tool use, extended thinking, and proper rate limit handling.

## 1. Requirements & Constraints

### Requirements

- **REQ-001**: Implement Anthropic provider extending `BaseLLMProvider` abstract class
- **REQ-002**: Support Claude 4.5 models (Opus, Sonnet, Haiku) with dated identifiers and aliases
- **REQ-003**: Implement credential validation against Anthropic API
- **REQ-004**: Implement streaming responses using Server-Sent Events (SSE)
- **REQ-005**: Support tool use via Anthropic's `tool_use`/`tool_result` content types
- **REQ-006**: Support extended thinking with configurable budget tokens
- **REQ-007**: Handle all HTTP error codes (400, 401, 403, 429, 500, 529) with proper `ProviderError` mapping
- **REQ-008**: Implement client-side rate limiting to prevent cost overruns

### Security Requirements

- **SEC-001**: API keys must be encrypted at rest using existing RFC-002 infrastructure
- **SEC-002**: API keys must never be logged or exposed in error messages
- **SEC-003**: All API communication must use HTTPS only

### Constraints

- **CON-001**: Must use native fetch API (no additional npm packages per RFC spec)
- **CON-002**: Must follow existing provider abstraction patterns from `base-provider.ts`
- **CON-003**: Must use Zod schemas for all API request/response validation
- **CON-004**: Must match existing code style (HeroUI, TailwindCSS 4, semantic tokens)

### Guidelines

- **GUD-001**: Follow OpenAI provider implementation patterns for consistency
- **GUD-002**: Use `@/` import alias for all src/ imports
- **GUD-003**: Prefix all event handlers with `handle`
- **GUD-004**: Use `error_` variable naming for caught errors

### Patterns to Follow

- **PAT-001**: Singleton pattern for provider instance (`getAnthropicProvider()`)
- **PAT-002**: Static model capabilities array matching `Model` type from `provider.ts`
- **PAT-003**: `AsyncIterable<CompletionChunk>` for streaming responses
- **PAT-004**: `withRetry()` helper from base provider for retryable errors

## 2. Implementation Sequence

### Segment 1: Anthropic Type Definitions

- GOAL-001: Define all Zod schemas and TypeScript types for Anthropic API

| Task     | Description                                                              | Completed | Date |
| -------- | ------------------------------------------------------------------------ | --------- | ---- |
| TASK-001 | Create `src/types/anthropic.ts` with model schemas (dated + alias)       |           |      |
| TASK-002 | Add content block schemas (text, image, tool_use, tool_result, thinking) |           |      |
| TASK-003 | Add message and tool definition schemas                                  |           |      |
| TASK-004 | Add extended thinking configuration schema                               |           |      |
| TASK-005 | Add API request schema (`AnthropicRequestSchema`)                        |           |      |
| TASK-006 | Add API response schema (`AnthropicResponseSchema`)                      |           |      |
| TASK-007 | Add streaming event schemas (all SSE event types)                        |           |      |
| TASK-008 | Add model capabilities type with pricing info                            |           |      |
| TASK-009 | Export all inferred TypeScript types                                     |           |      |

### Segment 2: Anthropic Provider Core Implementation

- GOAL-002: Implement the full `AnthropicProvider` class with all required methods

| Task     | Description                                                         | Completed | Date |
| -------- | ------------------------------------------------------------------- | --------- | ---- |
| TASK-010 | Define `ANTHROPIC_MODELS` static array with Model objects           |           |      |
| TASK-011 | Define `MODEL_CAPABILITIES` map with pricing and features           |           |      |
| TASK-012 | Define `MODEL_ALIASES` map for short names                          |           |      |
| TASK-013 | Implement `resolveModel()` helper for alias resolution              |           |      |
| TASK-014 | Implement `getHeaders()` with API version and optional beta headers |           |      |
| TASK-015 | Implement `validateCredentials()` with minimal API call             |           |      |
| TASK-016 | Implement `listModels()` returning static model list                |           |      |
| TASK-017 | Implement `mapToAnthropicRequest()` for request transformation      |           |      |
| TASK-018 | Implement `mapToCompletionChunk()` for response transformation      |           |      |
| TASK-019 | Implement `mapFinishReason()` for stop reason mapping               |           |      |
| TASK-020 | Implement `handleError()` for HTTP error mapping to ProviderError   |           |      |
| TASK-021 | Implement non-streaming `createCompletion()` path                   |           |      |
| TASK-022 | Implement streaming `createCompletion()` with SSE parsing           |           |      |
| TASK-023 | Handle `thinking_delta` events in streaming                         |           |      |
| TASK-024 | Add `getModelCapabilities()` public method                          |           |      |
| TASK-025 | Enable provider (set `enabled = true`)                              |           |      |
| TASK-026 | Export singleton via `getAnthropicProvider()`                       |           |      |

### Segment 3: Rate Limiting

- GOAL-003: Implement client-side rate limiting to prevent API overuse

| Task     | Description                                         | Completed | Date |
| -------- | --------------------------------------------------- | --------- | ---- |
| TASK-027 | Create `RateLimiter` class with per-model limits    |           |      |
| TASK-028 | Implement `checkLimit()` method with sliding window |           |      |
| TASK-029 | Implement `getWaitTime()` for UI feedback           |           |      |
| TASK-030 | Integrate rate limiter into `createCompletion()`    |           |      |
| TASK-031 | Add rate limit exceeded handling with retry timing  |           |      |

### Segment 4: Extended Thinking Support

- GOAL-004: Add extended thinking configuration and response handling

| Task     | Description                                             | Completed | Date |
| -------- | ------------------------------------------------------- | --------- | ---- |
| TASK-032 | Add extended thinking option to request mapping         |           |      |
| TASK-033 | Handle temperature=1 constraint when thinking enabled   |           |      |
| TASK-034 | Parse thinking content blocks in non-streaming response |           |      |
| TASK-035 | Yield thinking content in streaming with type indicator |           |      |

### Segment 5: Tool Use Support

- GOAL-005: Implement tool calling via Anthropic's tool_use format

| Task     | Description                                            | Completed | Date |
| -------- | ------------------------------------------------------ | --------- | ---- |
| TASK-036 | Map `CompletionRequest.tools` to Anthropic tool format |           |      |
| TASK-037 | Parse `tool_use` content blocks in responses           |           |      |
| TASK-038 | Map to `CompletionChunk.toolCalls` format              |           |      |
| TASK-039 | Support `tool_choice` parameter (auto, any, specific)  |           |      |

### Segment 6: Unit Tests

- GOAL-006: Comprehensive unit test coverage for Anthropic provider

| Task     | Description                                                                  | Completed | Date |
| -------- | ---------------------------------------------------------------------------- | --------- | ---- |
| TASK-040 | Create `src/types/__tests__/anthropic.test.ts` for schema validation         |           |      |
| TASK-041 | Test model schema validation (valid dated + alias, invalid rejected)         |           |      |
| TASK-042 | Test request schema validation (required fields, optional fields)            |           |      |
| TASK-043 | Test response schema parsing                                                 |           |      |
| TASK-044 | Test streaming event schema parsing (all event types)                        |           |      |
| TASK-045 | Create `src/services/providers/__tests__/anthropic-provider.test.ts`         |           |      |
| TASK-046 | Test provider metadata (id, name, apiKeyRequired, enabled)                   |           |      |
| TASK-047 | Test `validateCredentials()` with mocked fetch (valid/invalid/network error) |           |      |
| TASK-048 | Test `listModels()` returns all models and aliases                           |           |      |
| TASK-049 | Test `createCompletion()` non-streaming path                                 |           |      |
| TASK-050 | Test `createCompletion()` streaming path with SSE parsing                    |           |      |
| TASK-051 | Test error mapping for all HTTP status codes                                 |           |      |
| TASK-052 | Test rate limiter behavior                                                   |           |      |
| TASK-053 | Test extended thinking request/response handling                             |           |      |
| TASK-054 | Test tool use request/response handling                                      |           |      |
| TASK-055 | Test model alias resolution                                                  |           |      |

### Segment 7: Settings UI Component

- GOAL-007: Create Anthropic-specific settings UI for API key configuration

| Task     | Description                                             | Completed | Date |
| -------- | ------------------------------------------------------- | --------- | ---- |
| TASK-056 | Create `src/components/settings/anthropic-settings.tsx` |           |      |
| TASK-057 | Implement API key input with validation button          |           |      |
| TASK-058 | Show available models after successful validation       |           |      |
| TASK-059 | Add link to Anthropic console for key management        |           |      |
| TASK-060 | Integrate into existing settings page/flow              |           |      |

### Segment 8: Integration & E2E Tests

- GOAL-008: End-to-end test coverage for full conversation flow

| Task     | Description                                        | Completed | Date |
| -------- | -------------------------------------------------- | --------- | ---- |
| TASK-061 | Create `tests/e2e/anthropic-provider.spec.ts`      |           |      |
| TASK-062 | Test API key configuration flow                    |           |      |
| TASK-063 | Test model selection with Anthropic models         |           |      |
| TASK-064 | Test chat conversation with streaming (mocked API) |           |      |
| TASK-065 | Test error handling UI (rate limit, auth error)    |           |      |

### Segment 9: Update Provider Registry & Exports

- GOAL-009: Ensure Anthropic provider is properly registered and exported

| Task     | Description                                                | Completed | Date |
| -------- | ---------------------------------------------------------- | --------- | ---- |
| TASK-066 | Update `src/services/providers/index.ts` exports           |           |      |
| TASK-067 | Update provider registry initialization if needed          |           |      |
| TASK-068 | Update existing provider tests to expect enabled Anthropic |           |      |

### Segment 10: Validation & Documentation

- GOAL-010: Run all quality gates and update RFC status

| Task     | Description                                  | Completed | Date |
| -------- | -------------------------------------------- | --------- | ---- |
| TASK-069 | Run `pnpm lint` - fix any errors             |           |      |
| TASK-070 | Run `pnpm test` - all tests pass             |           |      |
| TASK-071 | Run `pnpm build` - successful build          |           |      |
| TASK-072 | Run `pnpm test:accessibility` on settings UI |           |      |
| TASK-073 | Update RFCS.md status to Completed           |           |      |

## 3. Alternatives

- **ALT-001**: Use official Anthropic SDK (`@anthropic-ai/sdk`) instead of native fetch
  - Rejected: RFC specifies no additional packages; native fetch provides full control and smaller bundle
- **ALT-002**: Implement server-side proxy for API calls
  - Rejected: This is a local-first application; direct browser API calls are acceptable with proper CORS

- **ALT-003**: Share rate limiter across all providers
  - Rejected: Each provider has different rate limits; per-provider limiting is more accurate

## 4. Dependencies

- **DEP-001**: RFC-002 Security Infrastructure (Completed) - for API key encryption
- **DEP-002**: RFC-003 Provider Abstraction Layer (Completed) - provides `BaseLLMProvider`, `ProviderError`, types
- **DEP-003**: Existing `useSession()` hook for secret storage
- **DEP-004**: Existing `useAIProvider()` hook for provider validation
- **DEP-005**: HeroUI components (`@heroui/react`) for settings UI

## 5. Files

### New Files

- **FILE-001**: `src/types/anthropic.ts` - Zod schemas and TypeScript types for Anthropic API
- **FILE-002**: `src/types/__tests__/anthropic.test.ts` - Schema validation tests
- **FILE-003**: `src/services/providers/__tests__/anthropic-provider.test.ts` - Provider unit tests
- **FILE-004**: `src/components/settings/anthropic-settings.tsx` - API key settings UI
- **FILE-005**: `tests/e2e/anthropic-provider.spec.ts` - E2E tests

### Modified Files

- **FILE-006**: `src/services/providers/anthropic-provider.ts` - Replace stub with full implementation
- **FILE-007**: `src/services/providers/index.ts` - Update exports if needed
- **FILE-008**: `src/services/providers/__tests__/provider-registry.test.ts` - Update expectations
- **FILE-009**: `RFCs/RFCS.md` - Update RFC-008 status to Completed

## 6. Testing

### Unit Tests

- **TEST-001**: Anthropic Zod schema validation (models, requests, responses, streaming events)
- **TEST-002**: Provider metadata and configuration
- **TEST-003**: Credential validation (valid key, invalid key, network error)
- **TEST-004**: Model listing and alias resolution
- **TEST-005**: Non-streaming completion request/response mapping
- **TEST-006**: Streaming completion with all SSE event types
- **TEST-007**: Error mapping for all HTTP status codes (400, 401, 403, 429, 500, 529)
- **TEST-008**: Rate limiter (check limit, wait time, reset after window)
- **TEST-009**: Extended thinking configuration and response parsing
- **TEST-010**: Tool use request formatting and response parsing

### Integration Tests

- **TEST-011**: Provider registration and retrieval from registry
- **TEST-012**: Full request/response cycle with mocked fetch

### E2E Tests

- **TEST-013**: API key configuration flow in settings
- **TEST-014**: Model selection with Anthropic models visible
- **TEST-015**: Chat message send/receive with streaming display
- **TEST-016**: Error handling UI for authentication and rate limiting

## 7. Risks & Assumptions

### Risks

- **RISK-001**: Anthropic API version changes could break implementation
  - Mitigation: Use specific API version header (`2023-06-01`), monitor Anthropic changelog
- **RISK-002**: Model identifiers in RFC may not match current production API
  - Mitigation: Validate against actual API during testing, update if needed
- **RISK-003**: Extended thinking and 1M context are beta features
  - Mitigation: Make these opt-in features, handle gracefully if unavailable

### Assumptions

- **ASSUMPTION-001**: Browser supports native fetch with streaming (ReadableStream)
- **ASSUMPTION-002**: Anthropic API CORS allows browser-direct requests (may need verification)
- **ASSUMPTION-003**: Existing encryption infrastructure handles API key storage correctly
- **ASSUMPTION-004**: Model pricing in RFC reflects current Anthropic pricing

## 8. Related Specifications / Further Reading

- [RFC-008: Anthropic Provider Integration](../RFCs/RFC-008-Anthropic-Provider-Integration.md)
- [RFC-002: Security Infrastructure](../RFCs/RFC-002-Security-Infrastructure.md)
- [RFC-003: Provider Abstraction Layer](../RFCs/RFC-003-Provider-Abstraction-Layer.md)
- [Anthropic Messages API Documentation](https://docs.anthropic.com/en/api/messages)
- [Anthropic Extended Thinking](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking)
- [Anthropic Tool Use](https://docs.anthropic.com/en/docs/build-with-claude/tool-use)
