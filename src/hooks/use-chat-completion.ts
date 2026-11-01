import type {Conversation, ConversationMessage, GPTConfiguration} from '@/types/gpt'
import type {CompletionMessage, CompletionRequest, ProviderErrorType, ProviderId, ReplayData} from '@/types/provider'
import {useAIProvider} from '@/hooks/use-ai-provider'
import {useStorage} from '@/hooks/use-storage'
import {ProviderError, ReplayDataSchema} from '@/types/provider'
import {useCallback, useEffect, useRef, useState} from 'react'

/** What the GPT's provider needs before a turn can be sent. `unsupported` is Azure, which has no implementation. */
export type ChatProviderStatus = 'loading' | 'unsupported' | 'not-configured' | 'ready'

/** A provider failure recorded against the user message of the turn that failed. */
export interface ChatTurnError {
  message: string
  type: ProviderErrorType
}

export interface UseChatCompletionOptions {
  /** The GPT being chatted with. While `undefined` the hook reports `loading` and sends nothing. */
  gpt: GPTConfiguration | undefined
  /** The conversation named by the route. `undefined` is a new chat. A change stops any reply in flight. */
  conversationId: string | undefined
  /** A prompt carried in by navigation. Sent once, as soon as the provider is ready. */
  initialPrompt?: string
  /** Called after the initial prompt's send starts, so the page can clear it from navigation state. */
  onInitialPromptSent?: () => void
  /**
   * Called after the conversation on screen is saved, with `isNew` true on its first save, so the page can update the
   * URL and its conversation list. Not called for saves of a conversation the user already left.
   */
  onConversationSaved?: (conversation: Conversation, info: {isNew: boolean}) => void
}

export interface UseChatCompletionResult {
  /** Messages of the conversation on screen, including the pending reply while it streams. */
  messages: ConversationMessage[]
  /** The conversation on screen. A new chat gets its id when the first message is sent. */
  conversationId: string | undefined
  conversationTitle: string
  status: ChatProviderStatus
  /** The provider this GPT chats through (OpenAI when the GPT has none saved). Never a fallback for a missing key. */
  provider: ProviderId
  providerName: string
  /** The model sent with each turn. Empty when the GPT has none and its provider has no default. */
  model: string
  /** True from send until the reply completes, fails or stops. */
  isStreaming: boolean
  /** The pending assistant message while streaming. It is empty until the first delta, so show typing dots then. */
  streamingMessageId: string | null
  /** True while a saved conversation loads. Sends are ignored until it finishes. */
  isLoadingConversation: boolean
  /** Errors by user message id. Held in memory only; failed turns are not saved. */
  turnErrors: Record<string, ChatTurnError>
  /** Sends a user message. Resolves when the turn settles; it never rejects (failures land in `turnErrors`). */
  send: (content: string) => Promise<void>
  /** Stops the reply in flight, keeps the text received so far, tags it stopped and saves it. No-op when idle. */
  stop: () => void
  /** Replaces the last assistant reply by resending the history up to the last user message. */
  regenerate: () => Promise<void>
  /** Resends a failed turn. Only the last turn can be retried. Success clears its error. */
  retry: (turnId: string) => Promise<void>
  /** Starts a new chat. Stops and saves any reply in flight into the conversation it started in. */
  reset: () => void
}

/** Mirrors the default `storage.ts` writes for a GPT without a model. It is valid on the Responses API. */
export const DEFAULT_MODEL_NAME = 'gpt-4'
const DEFAULT_PROVIDER_ID: ProviderId = 'openai'
const NEW_CHAT_TITLE = 'New Chat'
const MAX_TITLE_LENGTH = 50

/** A missing provider means OpenAI. A missing model gets the default only on OpenAI; other providers have none. */
export function resolveChatTarget(gpt: Pick<GPTConfiguration, 'modelProvider' | 'modelName'> | undefined): {
  provider: ProviderId
  model: string
} {
  const provider = gpt?.modelProvider ?? DEFAULT_PROVIDER_ID
  const model = gpt?.modelName?.trim() ?? ''
  if (model) return {provider, model}
  return {provider, model: provider === 'openai' ? DEFAULT_MODEL_NAME : ''}
}

/** Everything the screen shows, kept in one object so a conversation switch swaps it atomically. */
interface ChatView {
  conversationId: string | undefined
  title: string | undefined
  messages: ConversationMessage[]
  streamingId: string | null
  isLoading: boolean
  errors: Record<string, ChatTurnError>
}

interface ChatRun {
  conversationId: string
  gptId: string
  title: string
  provider: ProviderId
  model: string
  controller: AbortController
  /** The history the reply continues, ending with the user message. */
  history: ConversationMessage[]
  assistantId: string
  assistantTimestamp: Date
  reply: string
  /** Finished one way or another (completed, failed or stopped). Later chunks and errors are ignored. */
  settled: boolean
  /** The user left this conversation, so the run must not touch what is on screen. */
  detached: boolean
}

function createView(conversationId: string | undefined, isLoading: boolean): ChatView {
  return {conversationId, title: undefined, messages: [], streamingId: null, isLoading, errors: {}}
}

function deriveTitle(content: string): string {
  const singleLine = content.replaceAll(/\s+/g, ' ').trim()
  return singleLine.length > MAX_TITLE_LENGTH
    ? `${singleLine.slice(0, MAX_TITLE_LENGTH).trimEnd()}…`
    : singleLine || NEW_CHAT_TITLE
}

/**
 * Replay data is opaque JSON from storage, so validate it before it goes back to a provider. It is also tied to the
 * provider and model that produced it (and to the key that encrypted it), so it is attached only when the message was
 * made by `replayFor`. Pass `undefined` to send no replay at all.
 */
function toCompletionMessages(
  messages: ConversationMessage[],
  replayFor: {provider: ProviderId; model: string} | undefined,
): CompletionMessage[] {
  const result: CompletionMessage[] = []
  for (const message of messages) {
    // Tool messages are unsupported in text chat. An empty reply (stopped before its first delta) has nothing to replay.
    if (message.role === 'tool') continue
    if (message.role === 'assistant' && message.content === '') continue

    const madeByTarget =
      replayFor !== undefined &&
      message.metadata?.provider === replayFor.provider &&
      message.metadata.model === replayFor.model
    const parsed =
      message.role === 'assistant' && madeByTarget ? ReplayDataSchema.safeParse(message.metadata?.replay) : undefined
    result.push({
      role: message.role,
      content: message.content,
      ...(parsed?.success && parsed.data ? {replay: parsed.data} : {}),
    })
  }
  return result
}

function toTurnError(error: unknown): ChatTurnError {
  if (error instanceof ProviderError) return {message: error.message, type: error.type}
  return {message: error instanceof Error ? error.message : 'Something went wrong', type: 'unknown'}
}

function lastMessagePreview(messages: ConversationMessage[]): string | undefined {
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index]
    if (message?.content) return message.content.slice(0, 100)
  }
  return undefined
}

function snapshotRun(run: ChatRun, metadata?: ConversationMessage['metadata']): ConversationMessage[] {
  const reply: ConversationMessage = {
    id: run.assistantId,
    role: 'assistant',
    content: run.reply,
    timestamp: run.assistantTimestamp,
    ...(metadata ? {metadata} : {}),
  }
  return [...run.history, reply]
}

/**
 * Runs chat turns through the GPT's own provider: resolves provider and model, streams the reply into a pending
 * assistant message, and handles stop, regenerate, retry and autosave. Local history is the only state; each turn
 * sends all of it. Keys reach providers only through `AIProvider`.
 */
export function useChatCompletion(options: UseChatCompletionOptions): UseChatCompletionResult {
  const {gpt, conversationId, initialPrompt, onInitialPromptSent, onConversationSaved} = options
  const storage = useStorage()
  const {isLoading: providersLoading, providers, getProvider} = useAIProvider()

  const target = resolveChatTarget(gpt)
  const providerInstance = getProvider(target.provider)
  const providerConfig = providers.find(config => config.id === target.provider)

  let status: ChatProviderStatus
  if (providersLoading || !gpt) {
    status = 'loading'
  } else if (target.provider === 'azure') {
    status = 'unsupported'
  } else if (providerInstance && (!providerInstance.apiKeyRequired || providerConfig?.isConfigured === true)) {
    status = 'ready'
  } else {
    status = 'not-configured'
  }

  const [view, setView] = useState<ChatView>(() => createView(conversationId, conversationId !== undefined))
  const [seenRouteId, setSeenRouteId] = useState(conversationId)
  const runRef = useRef<ChatRun | null>(null)
  const initialPromptSentForRef = useRef<string | null>(null)

  // The newest values, for async work that outlives the render that started it.
  const latestRef = useRef({storage, getProvider, gpt, onConversationSaved})
  useEffect(() => {
    latestRef.current = {storage, getProvider, gpt, onConversationSaved}
  })

  // Follow the route. A new route id means a different conversation (or a new chat), unless it is the id this hook
  // just assigned to the chat on screen. Keyed on the id alone: the storage context changes identity on unrelated
  // state and must not wipe an in-progress chat. Adjusting state during render avoids a flash of the old messages.
  if (seenRouteId !== conversationId) {
    setSeenRouteId(conversationId)
    if (conversationId !== view.conversationId) {
      setView(createView(conversationId, conversationId !== undefined))
    }
  }

  const persistRun = useCallback(async (run: ChatRun, messages: ConversationMessage[]) => {
    try {
      const {storage: currentStorage, onConversationSaved: notify} = latestRef.current
      // Merge into the stored record so pins, tags and creation date set elsewhere survive the autosave.
      const existing = await currentStorage.getConversation(run.conversationId)
      const now = new Date()
      const conversation: Conversation = {
        id: run.conversationId,
        gptId: run.gptId,
        createdAt: now,
        tags: [],
        isPinned: false,
        isArchived: false,
        pinnedAt: null,
        archivedAt: null,
        ...existing,
        title: existing?.title || run.title,
        messages,
        updatedAt: now,
        messageCount: messages.length,
        lastMessagePreview: lastMessagePreview(messages),
      }
      await currentStorage.saveConversation(conversation)
      if (!run.detached) notify?.(conversation, {isNew: existing === undefined})
    } catch (error_) {
      console.error('Failed to save conversation', error_)
    }
  }, [])

  const commitRun = useCallback((run: ChatRun, update: Partial<ChatView>) => {
    if (run.detached) return
    setView(prev => (prev.conversationId === run.conversationId ? {...prev, ...update} : prev))
  }, [])

  const stopRun = useCallback(
    (run: ChatRun, {detach}: {detach: boolean}) => {
      if (run.settled) return
      run.settled = true
      run.detached = detach
      if (runRef.current === run) runRef.current = null
      run.controller.abort()

      const messages = snapshotRun(run, {provider: run.provider, model: run.model, stopped: true})
      commitRun(run, {messages, streamingId: null})
      persistRun(run, messages).catch(console.error)
    },
    [commitRun, persistRun],
  )

  const stopActiveRun = useCallback(
    (detach: boolean) => {
      if (runRef.current) stopRun(runRef.current, {detach})
    },
    [stopRun],
  )

  const executeRun = useCallback(
    async (run: ChatRun) => {
      let replay: ReplayData | undefined
      try {
        const {getProvider: lookup, gpt: currentGpt} = latestRef.current
        const provider = lookup(run.provider)
        if (!provider) throw new ProviderError(`Provider ${run.provider} is not available`, 'not_found', run.provider)
        if (!run.model) throw new ProviderError('This GPT has no model set', 'validation', run.provider)

        const request: CompletionRequest = {
          model: run.model,
          instructions: currentGpt?.systemPrompt || undefined,
          messages: toCompletionMessages(run.history, {provider: run.provider, model: run.model}),
          signal: run.controller.signal,
          stream: true,
        }
        const sentReplay = request.messages.some(message => message.replay !== undefined)

        const consume = async (): Promise<void> => {
          for await (const chunk of provider.createCompletion(request)) {
            if (run.settled) return
            if (chunk.replay) replay = chunk.replay
            if (chunk.content) {
              run.reply += chunk.content
              commitRun(run, {messages: snapshotRun(run)})
            }
          }
        }

        try {
          await consume()
        } catch (error_) {
          // Encrypted reasoning that the API can no longer verify (another key or organization, an expired item) is
          // rejected as a 400. ProviderError carries no error code, so a rejection about replay can't be told apart from
          // other 400s: retry once without replay on any validation error, but only before any text arrived.
          const rejected = error_ instanceof ProviderError && error_.type === 'validation'
          if (run.settled || !sentReplay || !rejected || run.reply !== '') throw error_
          request.messages = toCompletionMessages(run.history, undefined)
          await consume()
        }
        if (run.settled) return

        run.settled = true
        if (runRef.current === run) runRef.current = null
        const messages = snapshotRun(run, {provider: run.provider, model: run.model, ...(replay ? {replay} : {})})
        commitRun(run, {messages, streamingId: null})
        await persistRun(run, messages)
      } catch (error_) {
        // A stop already saved the partial reply; the abort error that follows is not a failure.
        if (run.settled) return
        run.settled = true
        if (runRef.current === run) runRef.current = null

        // The failed turn keeps its user message; any partial reply is dropped so a retry doesn't duplicate it.
        const turnId = run.history.at(-1)?.id
        commitRun(run, {
          messages: run.history,
          streamingId: null,
          ...(turnId ? {errors: {[turnId]: toTurnError(error_)}} : {}),
        })
      }
    },
    [commitRun, persistRun],
  )

  const startTurn = useCallback(
    async (history: ConversationMessage[], base: ChatView): Promise<void> => {
      const {gpt: currentGpt} = latestRef.current
      // Also guards two sends in the same tick, before the first has rendered as streaming.
      if (!currentGpt || runRef.current) return

      const {provider, model} = resolveChatTarget(currentGpt)
      const firstUserMessage = history.find(message => message.role === 'user')
      const title = base.title ?? deriveTitle(firstUserMessage?.content ?? '')
      const run: ChatRun = {
        conversationId: base.conversationId ?? crypto.randomUUID(),
        gptId: currentGpt.id,
        title,
        provider,
        model,
        controller: new AbortController(),
        history,
        assistantId: crypto.randomUUID(),
        assistantTimestamp: new Date(),
        reply: '',
        settled: false,
        detached: false,
      }

      runRef.current = run
      setView({
        conversationId: run.conversationId,
        title,
        messages: snapshotRun(run),
        streamingId: run.assistantId,
        isLoading: false,
        errors: {},
      })
      await executeRun(run)
    },
    [executeRun],
  )

  const canStartTurn = status === 'ready' && !view.isLoading && view.streamingId === null

  const send = useCallback(
    async (content: string): Promise<void> => {
      if (!content.trim() || !canStartTurn) return
      const userMessage: ConversationMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: new Date(),
      }
      await startTurn([...view.messages, userMessage], view)
    },
    [canStartTurn, startTurn, view],
  )

  const regenerate = useCallback(async (): Promise<void> => {
    if (!canStartTurn) return
    const last = view.messages.at(-1)
    const previous = view.messages.at(-2)
    if (last?.role !== 'assistant' || previous?.role !== 'user') return
    await startTurn(view.messages.slice(0, -1), view)
  }, [canStartTurn, startTurn, view])

  const retry = useCallback(
    async (turnId: string): Promise<void> => {
      if (!canStartTurn || !view.errors[turnId]) return
      // Only the trailing turn can be resent without rewriting later history.
      if (view.messages.at(-1)?.id !== turnId) return
      await startTurn(view.messages, view)
    },
    [canStartTurn, startTurn, view],
  )

  const stop = useCallback(() => {
    stopActiveRun(false)
  }, [stopActiveRun])

  const reset = useCallback(() => {
    stopActiveRun(true)
    setView(createView(undefined, false))
  }, [stopActiveRun])

  // Leaving the conversation (route change) stops the reply and saves it where it started.
  useEffect(() => {
    const run = runRef.current
    if (run && run.conversationId !== view.conversationId) stopRun(run, {detach: true})
  }, [view.conversationId, stopRun])

  // Leaving the page does the same.
  useEffect(
    () => () => {
      stopActiveRun(true)
    },
    [stopActiveRun],
  )

  // Load a saved conversation once the route points at it.
  const loadingId = view.isLoading ? view.conversationId : undefined
  useEffect(() => {
    if (!loadingId) return
    let cancelled = false

    const load = async () => {
      let loaded: Conversation | undefined
      try {
        loaded = await latestRef.current.storage.getConversation(loadingId)
      } catch (error_) {
        console.error('Failed to load conversation', error_)
      }
      if (cancelled) return
      setView(prev =>
        prev.conversationId === loadingId
          ? {...prev, isLoading: false, messages: loaded?.messages ?? [], title: loaded?.title}
          : prev,
      )
    }
    load().catch(console.error)

    return () => {
      cancelled = true
    }
  }, [loadingId])

  // Send the navigation prompt exactly once per GPT, after key validation finishes.
  const gptId = gpt?.id
  useEffect(() => {
    if (!initialPrompt || !gptId || status !== 'ready' || view.isLoading || view.streamingId !== null) return
    if (initialPromptSentForRef.current === gptId) return
    initialPromptSentForRef.current = gptId

    // Defer the send out of the effect body: it updates state synchronously.
    queueMicrotask(() => {
      onInitialPromptSent?.()
      send(initialPrompt).catch(console.error)
    })
  }, [initialPrompt, gptId, status, view.isLoading, view.streamingId, send, onInitialPromptSent])

  return {
    messages: view.messages,
    conversationId: view.conversationId,
    conversationTitle: view.title ?? NEW_CHAT_TITLE,
    status,
    provider: target.provider,
    providerName: providerInstance?.name ?? target.provider,
    model: target.model,
    isStreaming: view.streamingId !== null,
    streamingMessageId: view.streamingId,
    isLoadingConversation: view.isLoading,
    turnErrors: view.errors,
    send,
    stop,
    regenerate,
    retry,
    reset,
  }
}
