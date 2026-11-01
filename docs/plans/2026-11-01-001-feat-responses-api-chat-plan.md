---
title: "feat: Move chat off the retired Assistants API onto the provider layer"
type: feat
status: active
date: 2026-11-01
---

## Overview

Chat sends each turn through the existing provider abstraction instead of the OpenAI-only Assistants service. OpenAI is implemented on the Responses API with `store: false` and the full local history each turn, the same stateless approach Anthropic and Ollama already use. Chat is text-only; tool calling and hosted tools are deferred.

## Problem Frame

OpenAI sunset the Assistants API on 2026-08-26 (#2841, risk 2). The chat page builds an assistant, a thread and polled runs on that API, so chatting with a GPT no longer works. The provider layer added for multi-provider support already streams completions for OpenAI, Anthropic and Ollama, but chat never uses it. Chat also ignores each GPT's saved provider and model and always sends `gpt-4o`.

The current chat also carries broken behavior that should not be ported:

- Tool calling was never reliable. MCP tools are never sent to the model; only calls whose name happens to match a GPT tool run, and the rest get a fake "executed successfully" result.
- Knowledge files are passed as `code_interpreter` file IDs, but the values are file text, so that never worked.
- Regenerate reuses a thread that still contains the reply being replaced.
- Resuming a saved conversation starts a fresh thread with no context.

## Requirements Trace

- R1. Chatting with an OpenAI GPT works again on the Responses API, with streamed text.
- R2. Chat uses the GPT's saved `modelProvider` and `modelName`. GPTs missing either default to OpenAI and the existing default model. Anthropic and Ollama GPTs chat through the same path.
- R3. A GPT whose provider has no key shows its own prompt to add a key in Settings. Azure GPTs show an "Azure isn't supported yet" notice. Neither sends anything, and chat never falls back to another provider.
- R4. Every turn sends the full local history. Nothing is stored at OpenAI (`store: false`). IndexedDB is the only record.
- R5. Regenerate is available on the last assistant reply only. It replaces that reply by resending the history up to the last user message.
- R6. The user can stop a reply mid-stream. Switching conversations, starting a new chat or leaving the page also stops it. Received text is saved and tagged "Stopped".
- R7. A failed turn shows an inline error with Retry under the user's message.
- R8. Existing saved conversations display and continue without migration.
- R9. No code calls the Assistants API. No fake tool results remain.

## Scope Boundaries

- Text chat only. No tool calling, no hosted tools (`file_search`, vector stores, `code_interpreter`), no attachments.
- No server-side conversation state for any provider.
- No change to how API keys are stored or unlocked.
- No backend or proxy. Requests stay browser-direct with the user's own key, as the provider layer already does.
- Azure stays unimplemented; this plan only stops it from failing silently.

### Deferred to Separate Tasks

- Tool calling across providers, including MCP tools and GPT-defined tools: separate plan, building on RFC-009.
- Knowledge retrieval in chat (local knowledge files or OpenAI file search): separate plan.
- Capability flags (`codeInterpreter`, `fileSearch`, `webBrowsing`, `imageGeneration`) stay in schemas, export and import, but now do nothing in chat. Hide or label them in the editor: separate issue.
- The hardcoded OpenAI model list (includes `gpt-3.5-turbo`, never queries the API): separate issue.
- Anthropic and Ollama emitting `[thinking]` text as reply content: separate issue.
- Long chats grow input size every turn; trimming or compaction: separate issue if it becomes a problem.
- Removing the unused LangChain and LangGraph dependencies: separate PR. It touches the lockfile and needs approval.
- RFC-003's status line disagrees with the `RFCS.md` index: separate docs change.

## Context & Research

### Relevant Code and Patterns

- `src/services/providers/base-provider.ts`: `BaseLLMProvider.createCompletion` returns `AsyncIterable<CompletionChunk>`. It is stateless and has no abort signal.
- `src/types/provider.ts`: Zod-first `CompletionRequest`, `CompletionChunk` and `ProviderError`. Messages are `{role, content: string}`.
- `src/services/providers/openai-provider.ts`: raw `openai` SDK on Chat Completions (streaming and non-streaming branches), browser-direct.
- `src/services/providers/anthropic-provider.ts`, `ollama-provider.ts`: stateless fetch streaming. Reused as-is apart from abort.
- `src/services/providers/azure-provider.ts`: every method throws `not_implemented`.
- `src/contexts/ai-provider-context.tsx`: registers providers, loads and validates keys asynchronously (`isLoading` until done), and exposes `getProvider(id)`.
- `src/pages/gpt-test-page.tsx`: the chat page. It loads its own OpenAI key and holds Assistants-specific run handling, autosave, regenerate, new-chat reset and initial-prompt auto-send.
- `src/components/chat/chat-interface.tsx`: hardcoded "GPT-4o" label; regenerate offered on every assistant message; the conversation list stays clickable while loading; one page-level error alert.
- `src/components/empty-states/no-providers-prompt.tsx`: renders only when no provider is configured at all, so it can't serve a single unconfigured GPT.
- `src/services/openai-service.ts`, `src/hooks/use-openai-service.ts`: the Assistants service and its hook. The chat page is their only runtime consumer.
- `src/services/storage.ts` (`conversationToDB`, `dbToConversation`), `src/lib/database.ts` (`MessageMetadata`), `src/types/gpt.ts` (`ConversationMessageMetadataSchema`): message metadata exists but is dropped on save and load.
- Test patterns: `src/services/providers/__tests__/anthropic-provider.test.ts` (SSE `ReadableStream` in a mocked `fetch`, `collectChunks` helper); `src/pages/__tests__/gpt-test-page.test.tsx` (new-chat reset regression, which must survive); e2e network mocks via `page.route` in `tests/e2e/anthropic-provider.spec.ts`.

### Institutional Learnings

- There are no `docs/solutions/` entries. RFC-003 (provider abstraction) and RFC-005 (conversation management) describe chat going through providers with local history as the source of truth.

### External References

- Assistants to Responses migration: https://developers.openai.com/api/docs/assistants/migration
- Conversation state, including stateless replay and the billing note that chained context is billed every turn: https://developers.openai.com/api/docs/guides/conversation-state
- Data retention and `store: false`: https://developers.openai.com/api/docs/guides/your-data
- Streaming events (`response.output_text.delta`, `response.completed`, `response.failed`, `error`): https://developers.openai.com/api/docs/guides/streaming-responses
- Reasoning items in stateless requests (`include: ["reasoning.encrypted_content"]`): https://developers.openai.com/api/docs/guides/reasoning
- The installed `openai` 6.49.0 exposes `client.responses.stream`, `store`, `instructions`, `include` and a per-request `signal`.

## Prior-Art Survey

```json
{
  "schema_version": 2,
  "verdict": "extend",
  "scope": "src/ (single pnpm package: services/providers, contexts, hooks, pages, types, lib, storage)",
  "freshness": {
    "vcs_reference": "86b3de26eb716eca1f1a5692f5f5b52ead3e9ffc"
  },
  "budget": {
    "max_search_passes": 3,
    "max_candidate_inspections": 10,
    "exhausted": false
  },
  "candidates": [
    {
      "path_or_symbol": "src/services/providers/base-provider.ts#BaseLLMProvider.createCompletion",
      "description": "Provider-agnostic streaming completion; stateless, no abort signal",
      "disposition": "extend"
    },
    {
      "path_or_symbol": "src/types/provider.ts#CompletionRequest/CompletionChunk/ProviderError",
      "description": "Zod-first request, chunk and error contract",
      "disposition": "extend"
    },
    {
      "path_or_symbol": "src/services/providers/openai-provider.ts#OpenAIProvider",
      "description": "OpenAI provider class; its completion internals move from Chat Completions to Responses",
      "disposition": "extend"
    },
    {
      "path_or_symbol": "src/services/providers/anthropic-provider.ts, ollama-provider.ts",
      "description": "Stateless streaming providers fed full history",
      "disposition": "reuse"
    },
    {
      "path_or_symbol": "src/services/providers/provider-registry.ts#ProviderRegistryImpl",
      "description": "Registry of providers, configured flags and cached models",
      "disposition": "reuse"
    },
    {
      "path_or_symbol": "src/contexts/ai-provider-context.tsx#AIProvider/useAIProvider",
      "description": "Provider registration, key loading and lookup",
      "disposition": "reuse"
    },
    {
      "path_or_symbol": "src/services/storage.ts#conversationToDB/dbToConversation",
      "description": "Conversation persistence; drops message metadata",
      "disposition": "extend"
    },
    {
      "path_or_symbol": "src/services/openai-service.ts#createOpenAIService",
      "description": "Assistants thread, run and poll service",
      "disposition": "insufficient",
      "insufficiency_reason": "Built on the retired Assistants API; OpenAI-only and polling rather than streaming."
    },
    {
      "path_or_symbol": "src/pages/gpt-test-page.tsx#GPTTestPage",
      "description": "Chat orchestration coupled to Assistants run semantics",
      "disposition": "insufficient",
      "insufficiency_reason": "Control flow depends on threads and runs; rewritten around provider streaming, keeping new-chat reset and initial-prompt behavior."
    }
  ]
}
```

## Key Technical Decisions

- **Stateless for every provider, `store: false` for OpenAI.** OpenAI bills the whole earlier chain again on every chained turn, so server-side state saves no input cost. Going stateless keeps nothing on OpenAI, needs no remote deletion, no chain fallback and no response-ID bookkeeping, and gives every provider the same calling convention.
- **Reasoning continuity through encrypted reasoning items.** For OpenAI reasoning models, request `include: ["reasoning.encrypted_content"]`. The final chunk returns the encrypted reasoning items as opaque per-message replay data; the hook stores them in that assistant message's metadata, and the provider sends them back with the history. Other providers ignore the field. If this doesn't work browser-direct or with the installed SDK, drop it: reasoning models still work, just without carried reasoning.
- **Instructions are a top-level request field.** OpenAI maps them to Responses `instructions` on every request; other providers map them to their system message.
- **A chat hook owns orchestration, including autosave.** It resolves the provider and model, streams into the pending assistant message, and handles stop, regenerate, retry, abort and autosave. The page keeps only UI state and calls the hook for the new-chat reset and initial-prompt send. Providers stay one request per call.
- **The page stops loading its own key.** Keys reach providers only through `AIProvider`. The hook reports "loading" while `isLoading` is true, so the initial prompt waits for key validation instead of seeing a false "not configured".
- **Message metadata starts being persisted.** Assistant messages keep `{provider, model, stopped?, replay data?}`. No Dexie version bump: the fields are optional and unindexed.
- **No fallback between providers.** Sending a GPT's chat to a provider other than the one saved on it would send its data somewhere the user didn't choose.
- **Remove the Assistants service and its hook outright,** together with the provider's Chat Completions code, both streaming and non-streaming. No caller uses `stream: false`.

## Open Questions

### Resolved During Planning

- Are OpenAI assistant or thread IDs stored anywhere? No. They live only in React state, so there is nothing to migrate.
- Server-side state or stateless? Stateless with `store: false` (see Key Technical Decisions).
- What happens to tool calls? Removed. Chat is text-only until the tool-calling plan lands.
- Unconfigured or Azure GPTs? Their own prompt or notice; no fallback.

### Deferred to Implementation

- CORS for `/v1/responses` from the deployed origin. The existing provider already calls OpenAI browser-direct; confirm on the deployed site before merge.
- Whether encrypted reasoning items round-trip correctly browser-direct with `openai` 6.49.0. If not, drop that part (see Key Technical Decisions).
- Which default model applies when a GPT has none: use the existing storage default unless it isn't valid on the Responses API, then use the OpenAI provider's first listed model.

## Implementation Units

- [ ] **Unit 1: Extend the provider contract with instructions, abort and replay data**

**Goal:** `createCompletion` accepts top-level instructions and an abort signal, and messages can carry opaque per-provider replay data.

**Requirements:** R4, R6

**Dependencies:** None

**Files:**

- Modify: `src/types/provider.ts`
- Modify: `src/services/providers/base-provider.ts`
- Modify: `src/services/providers/anthropic-provider.ts`, `src/services/providers/ollama-provider.ts` (map instructions to the system message; pass `signal` to `fetch`)
- Test: `src/types/__tests__/provider.test.ts`, `src/services/providers/__tests__/anthropic-provider.test.ts`, `src/services/providers/__tests__/ollama-provider.test.ts`

**Approach:**

- Add optional `instructions` and `signal` to the request. Add optional opaque replay data to request messages and to the final chunk.
- Anthropic and Ollama ignore replay data.

**Patterns to follow:** Zod schema first, then the inferred type, as in `src/types/provider.ts`.

**Test scenarios:**

- Happy path: a request with instructions, a signal and a message carrying replay data parses. A request without them still parses.
- Happy path: Anthropic and Ollama send `instructions` as their system message.
- Integration: aborting the signal mid-stream ends the Anthropic and Ollama generators with an abort error, using the existing SSE and NDJSON test helpers.

**Verification:** Existing provider tests pass; the new cases pass.

- [ ] **Unit 2: Reimplement OpenAI completions on the Responses API**

**Goal:** OpenAI streaming uses `responses.stream` with `store: false`, full history, instructions, abort and optional encrypted reasoning.

**Requirements:** R1, R4, R6

**Dependencies:** Unit 1

**Files:**

- Modify: `src/services/providers/openai-provider.ts`
- Create: `src/services/providers/__tests__/openai-provider.test.ts`

**Approach:**

- Send the full history as input items, `instructions` on every request, and `store: false`. For reasoning models, also request encrypted reasoning and replay any stored reasoning items with their messages.
- Emit text deltas as content chunks. On `response.completed`, emit a final chunk with any replay data. On `response.failed` or `error`, emit a `ProviderError`.
- Forward `signal` to the SDK request options. Map SDK errors (401, 403, 404, 429, 5xx) onto the existing `ProviderError` types.
- Remove the Chat Completions code, both branches, and its tool-call handling.

**Execution note:** Write the provider tests first, against a mocked `fetch` returning Responses SSE frames.

**Patterns to follow:** `src/services/providers/__tests__/anthropic-provider.test.ts` for SSE stream mocking and chunk collection.

**Test scenarios:**

- Happy path: the request contains the full history, `instructions` and `store: false`. Deltas arrive as content chunks in order.
- Happy path: for a reasoning model, the request includes encrypted reasoning, replay data from earlier messages is sent back, and the final chunk carries new replay data.
- Error path: 401 maps to an auth `ProviderError`; 429 maps to a rate-limit error.
- Error path: a `response.failed` event produces a `ProviderError`.
- Edge case: aborting mid-stream stops the iteration and emits no final chunk.

**Verification:** The new provider tests pass. No Chat Completions call remains in the file.

- [ ] **Unit 3: Persist message metadata**

**Goal:** Saved assistant messages keep `{provider, model, stopped?, replay data?}` across save, load, export and import.

**Requirements:** R4, R6, R8

**Dependencies:** Unit 1

**Files:**

- Modify: `src/types/gpt.ts` (`ConversationMessageMetadataSchema`)
- Modify: `src/lib/database.ts` (`MessageMetadata`; keep it in sync with the schema)
- Modify: `src/services/storage.ts` (`conversationToDB`, `dbToConversation`)
- Test: `src/services/__tests__/storage.test.ts`

**Approach:**

- Add optional fields only; old records load unchanged. No Dexie version bump, since nothing new is indexed.
- Round-trip `metadata` through the storage mappers instead of dropping it.

**Patterns to follow:** existing mappers in `src/services/storage.ts`; `fake-indexeddb` usage in `src/lib/__tests__/database.test.ts`.

**Test scenarios:**

- Happy path: save a conversation whose assistant message has metadata, load it, and the metadata matches.
- Edge case: a record saved before this change loads with no metadata and no error.
- Edge case: export and import of a conversation with metadata stays valid.

**Verification:** Storage and database tests pass; old fixture data still loads.

- [ ] **Unit 4: Chat orchestration hook**

**Goal:** One hook runs chat turns through the provider layer: provider resolution, send, stream, stop, regenerate, retry and autosave.

**Requirements:** R2, R3, R4, R5, R6, R7, R8

**Dependencies:** Units 1–3

**Files:**

- Create: `src/hooks/use-chat-completion.ts`
- Test: `src/hooks/__tests__/use-chat-completion.test.ts`

**Approach:**

- **Provider status:** "loading" while `useAIProvider().isLoading`; "unsupported" for Azure; "not configured" when the GPT's provider has no validated key; otherwise "ready". Missing `modelProvider` or `modelName` resolves to the defaults in R2.
- **Send:** append the user message and a pending assistant message, then call `createCompletion` with the full history, instructions and an `AbortController` signal. Append deltas to the pending message. On completion, store the metadata and autosave.
- **Stop:** abort the request, keep the received text, mark the message stopped and autosave. Switching conversations, starting a new chat and unmount stop the same way.
- **Regenerate:** last reply only. Drop it and resend the history up to the last user message.
- **Failure:** keep the user message, record the error against that turn, and offer retry, which resends that turn.

**Execution note:** Test-first for the stop, regenerate and retry transitions; they are the easiest to get subtly wrong.

**Patterns to follow:** existing hooks in `src/hooks/` (consume context through hooks only, never storage APIs directly); `.catch(console.error)` for UI-triggered async calls.

**Test scenarios:**

- Happy path: sending streams deltas into one pending message; completion saves the message with its metadata.
- Happy path: the second turn's request contains the first turn's user message and reply.
- Happy path: regenerate replaces the last reply, not duplicating it, and its request ends at the last user message.
- Edge case: stop mid-stream keeps the partial text, marks it stopped and saves it. The next send includes it in the history.
- Edge case: switching conversations mid-stream stops and saves the reply in the original conversation, not the newly selected one.
- Edge case: while providers are loading, status is "loading" and nothing is sent. The initial prompt sends once after it turns "ready".
- Error path: a provider error leaves the user message in place with an error on that turn. Retry sends that turn again, and success clears the error.
- Error path: an unconfigured provider reports "not configured", and Azure reports "unsupported". Neither sends a request.
- Edge case: a GPT with no saved provider or model uses the defaults.
- Integration: an Anthropic GPT's request goes to the Anthropic provider with the instructions and full history.

**Verification:** The hook tests pass, with a fake provider standing in for the real ones.

- [ ] **Unit 5: Rewrite the chat page and UI; remove the Assistants service**

**Goal:** The chat page uses the hook and shows the provider status, stop control, stopped and failed turns, and the real model. The Assistants code is gone.

**Requirements:** R1, R2, R3, R5, R6, R7, R8, R9

**Dependencies:** Unit 4

**Files:**

- Modify: `src/pages/gpt-test-page.tsx`
- Modify: `src/components/chat/chat-interface.tsx`, `src/components/chat/chat-input.tsx`, and the message bubble component (whichever file owns regenerate and message actions)
- Create: a per-GPT provider prompt component under `src/components/empty-states/` (`NoProvidersPrompt` can't be reused: it renders only when no provider is configured)
- Delete: `src/services/openai-service.ts`, `src/hooks/use-openai-service.ts`
- Modify: `src/pages/__tests__/gpt-test-page.test.tsx`, plus component tests next to the changed chat components
- Modify: `tests/e2e/chat-interface.spec.ts` (the hardcoded "GPT-4o" assertions), `tests/e2e/page-objects/gpt-test-page.ts` (stop control locator)

**Approach:**

- Replace the Assistants state, the page's own key loading, the tool-call loop and its fake result with the hook.
- Keep the new-chat reset behavior from #2878 and the initial-prompt send, both calling the hook.
- **Header:** `{provider} · {model}`, or "No model set" when the model is empty. The status dot animates only while streaming.
- **Input:** while streaming, the send button becomes a "Stop generating" button, reachable by keyboard.
- **Messages:** show the existing typing dots until the first delta. Stopped replies get a "Stopped" tag. A failed turn shows its error and a Retry action inline under the user's message; the page-level alert stays only for errors with no turn. Regenerate appears only on the last reply and is disabled while streaming. Autoscroll during streaming only when the user is already near the bottom.
- **Provider status:** "loading" renders nothing new. "Not configured" shows the per-GPT prompt with a Settings link. "Unsupported" shows the Azure notice with a link to edit the GPT. History stays visible in both; only the input is replaced.

**Patterns to follow:** HeroUI patterns in `AGENTS.md` (buttons with icons get explicit flex classes); semantic design tokens only; `handle`-prefixed handlers.

**Test scenarios:**

- Happy path: sending a message renders the streamed reply (hook mocked).
- Regression: "keeps an in-progress new chat when the storage context identity changes" still passes.
- Happy path: the header shows the GPT's provider and model; an empty model shows "No model set".
- Edge case: the stop button replaces send only while streaming and calls stop; a stopped reply shows the tag.
- Edge case: regenerate shows on the last reply only.
- Error path: a failed turn shows its inline error and Retry; Retry calls the hook.
- Error path: "not configured" shows the per-GPT prompt and "unsupported" shows the Azure notice, with history still visible.
- Edge case: the initial prompt from navigation state is sent exactly once, after the provider is ready.

**Verification:** Unit tests and lint pass. A search for `beta.assistants`, `beta.threads`, `openai-service` and `use-openai-service` under `src/` finds nothing.

- [ ] **Unit 6: Mocked end-to-end chat and docs**

**Goal:** One e2e test proves a full chat round-trip, and docs no longer describe the Assistants path.

**Requirements:** R1, R4, R5, R6, R9

**Dependencies:** Unit 5

**Files:**

- Create: `tests/e2e/openai-chat.spec.ts`
- Modify: `src/services/AGENTS.md`, `src/hooks/AGENTS.md`, `docs/RULES.md`, `.github/copilot-instructions.md` (remove Assistants service references)
- Modify: `readme.md` (privacy note: chats live only in the browser; each turn sends the conversation to the GPT's provider; for OpenAI the app asks it not to store responses)

**Approach:**

- Mock `**/api.openai.com/v1/responses` with `page.route`, returning Responses SSE frames. Configure an OpenAI key through the existing settings flow or test fixtures.

**Patterns to follow:** `tests/e2e/anthropic-provider.spec.ts` for `page.route` mocking and provider setup; page objects in `tests/e2e/page-objects/`.

**Test scenarios:**

- Integration: send, then see the streamed reply. The request body has `store: false`, the instructions and the message.
- Integration: a second send's request contains the full history, including the first reply.
- Integration: regenerate's request ends at the last user message, and the reply is replaced.
- Integration: stopping mid-stream leaves the partial reply with the "Stopped" tag.

**Verification:** The new e2e spec passes in CI alongside the existing suites. The docs no longer describe the Assistants API as current behavior.

## System-Wide Impact

- **Interaction graph:** the chat page, the chat components, the AI provider context, the conversation store, and export and import (optional metadata fields only). Settings and the editor are untouched.
- **Error propagation:** provider errors surface as typed `ProviderError`s to the hook, which attaches them to the failed turn.
- **State lifecycle risks:** a stream must never write into a conversation other than the one it started in.
- **API surface parity:** every provider accepts the new optional request fields.
- **Integration coverage:** the e2e spec covers real request bodies for send, history, regenerate and stop, which unit mocks cannot prove.
- **Unchanged invariants:** key storage and unlock, the provider registry, the Anthropic and Ollama wire formats, and the Dexie schema version.

## Risks & Dependencies

| Risk | Mitigation |
| --- | --- |
| CORS blocks `/v1/responses` from the deployed origin | The provider already calls OpenAI browser-direct; verify on the deployed site before merge |
| Encrypted reasoning items don't round-trip browser-direct | Contained in Unit 2; drop it and keep plain stateless replay |
| Azure GPTs that chatted before now show a notice | It's explicit rather than a silent failure; implementing Azure is separate work |
| Capability toggles in the editor now mislead | Tracked as a deferred issue; call it out in the PR |
| Long chats send more input every turn | Same cost as server-side chaining; trimming is deferred |

## Documentation / Operational Notes

- The readme privacy note describes the stateless flow and `store: false`.
- Before merge, verify on the deployed site with a real key: send, regenerate, stop, retry after a forced failure (for example a wrong model name), and switching conversations mid-stream.

## Sources & References

- Related issue: #2841 (project state, risk 2)
- Related RFCs: `RFCs/RFC-003-Provider-Abstraction-Layer.md`, `RFCs/RFC-005-Conversation-Management.md`, `RFCs/RFC-009-MCP-Tool-Integration.md` (the deferred tool-calling work builds on it)
- Related code: `src/services/openai-service.ts`, `src/pages/gpt-test-page.tsx`, `src/services/providers/`
- External docs: listed under External References
