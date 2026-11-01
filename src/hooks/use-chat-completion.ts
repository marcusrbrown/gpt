import type {Conversation, ConversationMessage, GPTConfiguration} from '@/types/gpt'
import type {CompletionMessage, CompletionRequest, ProviderErrorType, ProviderId, ReplayData} from '@/types/provider'
import {useAIProvider} from '@/hooks/use-ai-provider'
import {useStorage} from '@/hooks/use-storage'
import {ProviderError, ReplayDataSchema} from '@/types/provider'
import {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react'

/** What the GPT's provider needs before a turn can be sent. `unsupported` is Azure, which has no implementation. */
export type ChatProviderStatus = 'loading' | 'unsupported' | 'not-configured' | 'ready'

/**
 * Why the conversation named by the route can't be used. `read-failed` may pass on a retry; `foreign-gpt` never will,
 * because the conversation belongs to another GPT.
 */
export type ChatLoadError = {kind: 'read-failed'; message: string} | {kind: 'foreign-gpt'; message: string}

/** A provider failure recorded against the user message of the turn that failed. */
export interface ChatTurnError {
  message: string
  type: ProviderErrorType
}

export interface ConversationSavedInfo {
  isNew: boolean
  isCurrent: boolean
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
   * Called after every successful save, so the page can keep its conversation list current. `isNew` is true on a
   * conversation's first save. `isCurrent` is false when the user has left the view the save belonged to (new chat,
   * another conversation, or the page): the list still wants the conversation, but navigating to it would pull the user
   * back, so only the first save of a current view should navigate.
   */
  onConversationSaved?: (conversation: Conversation, info: ConversationSavedInfo) => void
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
  /**
   * Why the saved conversation could not be loaded, or `null`. While set, `messages` is empty only because the load
   * failed, so send, regenerate and retry are blocked: saving a new turn would overwrite the stored history.
   */
  loadError: ChatLoadError | null
  /**
   * Why the conversation on screen could not be saved, or `null`. The messages stay in memory; `retrySave` writes them
   * again. Cleared by any later save that succeeds.
   */
  saveError: string | null
  /** Errors by user message id. Held in memory only; failed turns are not saved. */
  turnErrors: Record<string, ChatTurnError>
  /** Sends a user message. Resolves when the turn settles; it never rejects (failures land in `turnErrors`). */
  send: (content: string) => Promise<void>
  /** Stops the reply in flight, keeps the text received so far, tags it stopped and saves it. No-op when idle. */
  stop: () => void
  /** Replaces the last assistant reply by resending the history up to the last user message. */
  regenerate: () => Promise<void>
  /** Tries loading the saved conversation again after a load failure. No-op when there is no `loadError`. */
  reloadConversation: () => void
  /** Saves the conversation again after a save failure. No-op when there is no `saveError`. */
  retrySave: () => void
  /** Resends a failed turn. Only the last turn can be retried. Success clears its error. */
  retry: (turnId: string) => Promise<void>
  /** Starts a new chat. Stops and saves any reply in flight into the conversation it started in. */
  reset: () => void
}

/** Mirrors the default `storage.ts` writes for a GPT without a model. It is valid on the Responses API. */
export const DEFAULT_MODEL_NAME = 'gpt-4'
const DEFAULT_PROVIDER_ID: ProviderId = 'openai'
const NO_MESSAGES: ConversationMessage[] = []
const NEW_CHAT_TITLE = 'New Chat'
const FOREIGN_GPT_ERROR: ChatLoadError = {kind: 'foreign-gpt', message: 'This conversation belongs to a different GPT.'}
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
  loadError: string | null
  /**
   * The GPT that owns the conversation on screen: the stored owner of a loaded one, or the GPT that started a new chat.
   * Kept for the life of the view and compared with the current GPT on every render, so a turn can't launder it and the
   * order of arrival doesn't matter.
   */
  ownerGptId: string | undefined
  saveError: string | null
  /**
   * True while no stored record is known to exist for this view: a new chat, or a route id that held nothing when it was
   * opened. Only then may a save create the record. For a conversation that was loaded (or already saved), a missing
   * record means it was deleted since, and a save must not bring it back.
   */
  mayCreate: boolean
  /**
   * Counts the views shown by this hook: it steps when the screen moves to another conversation or a new chat, never
   * when a new chat is assigned its id. Async work remembers the generation it started in; once the hook is on another
   * one (or unmounted) that work must not report to the page.
   */
  generation: number
  errors: Record<string, ChatTurnError>
}

/** What one write of a conversation needs. A failed write keeps its job so `retrySave` knows what failed. */
interface SaveJob {
  conversationId: string
  gptId: string
  title: string
  messages: ConversationMessage[]
  generation: number
  /** See `ChatView.mayCreate`. */
  mayCreate: boolean
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
  /** The view generation the run started in. */
  generation: number
  /** See `ChatView.mayCreate`, as of when the run started. */
  mayCreate: boolean
}

function createView(conversationId: string | undefined, isLoading: boolean, generation: number): ChatView {
  return {
    conversationId,
    title: undefined,
    messages: [],
    streamingId: null,
    isLoading,
    loadError: null,
    ownerGptId: undefined,
    saveError: null,
    mayCreate: conversationId === undefined,
    generation,
    errors: {},
  }
}

/**
 * Saves still being written, by conversation id. Module-level on purpose: a save outlives the hook that started it
 * (leave the page, come back), and the next hook must still wait for it. Each save reads the stored record and writes
 * a snapshot over it, so two at once would let an older snapshot overwrite a newer one.
 */
const pendingSaves = new Map<string, Promise<void>>()

/** Runs `write` after every earlier save of the same conversation has finished, whether or not they succeeded. */
async function enqueueSave(conversationId: string, write: () => Promise<void>): Promise<void> {
  const previous = (pendingSaves.get(conversationId) ?? Promise.resolve()).catch(() => undefined)
  const next = previous.then(write)
  pendingSaves.set(conversationId, next)
  const forget = () => {
    if (pendingSaves.get(conversationId) === next) pendingSaves.delete(conversationId)
  }
  next.then(forget, forget)
  return next
}

/**
 * Storage orders a conversation's messages by timestamp alone, so two messages made in the same millisecond (or after a
 * clock step backwards) would swap on reload. A new message is therefore always at least 1 ms after the one before it.
 */
function timestampAfter(previous: ConversationMessage | undefined): Date {
  const now = new Date()
  const floor = previous?.timestamp.getTime()
  return floor !== undefined && now.getTime() <= floor ? new Date(floor + 1) : now
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

  const [view, setView] = useState<ChatView>(() => createView(conversationId, conversationId !== undefined, 0))
  const [seenRouteId, setSeenRouteId] = useState(conversationId)
  const runRef = useRef<ChatRun | null>(null)
  const initialPromptSentForRef = useRef<string | null>(null)
  // The generation on screen, readable from async work. -1 once the hook has unmounted.
  const generationRef = useRef(view.generation)
  const failedSaveRef = useRef<SaveJob | null>(null)

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
      setView(createView(conversationId, conversationId !== undefined, view.generation + 1))
    }
  }

  // Layout effect, so the ref is current before any async work can run after this commit.
  useLayoutEffect(() => {
    generationRef.current = view.generation
    if (failedSaveRef.current?.generation !== view.generation) failedSaveRef.current = null
  }, [view.generation])

  const saveJob = useCallback(async (job: SaveJob): Promise<void> => {
    // A newer snapshot is queued, so the failed one is stale: retrying it would write over this one.
    if (failedSaveRef.current?.conversationId === job.conversationId) failedSaveRef.current = null
    return enqueueSave(job.conversationId, async () => {
      const {storage: currentStorage, onConversationSaved: notify} = latestRef.current
      let conversation: Conversation
      let isNew: boolean
      try {
        // Merge into the stored record so pins, tags and creation date set elsewhere survive the autosave. A read
        // that fails rejects instead of looking like a new conversation, so unreadable history is never overwritten.
        const existing = await currentStorage.getConversation(job.conversationId)
        // Deleted since this chat was opened (or last saved): leave it deleted.
        if (existing === undefined && !job.mayCreate) return
        isNew = existing === undefined
        const now = new Date()
        conversation = {
          id: job.conversationId,
          gptId: job.gptId,
          createdAt: now,
          tags: [],
          isPinned: false,
          isArchived: false,
          pinnedAt: null,
          archivedAt: null,
          ...existing,
          title: existing?.title || job.title,
          messages: job.messages,
          updatedAt: now,
          messageCount: job.messages.length,
          lastMessagePreview: lastMessagePreview(job.messages),
        }
        await currentStorage.saveConversation(conversation)
      } catch (error_) {
        console.error('Failed to save conversation', error_)
        // The view is gone, so there is nowhere to show it. The messages were already on screen when it was left.
        if (generationRef.current !== job.generation) return
        failedSaveRef.current = job
        const message = error_ instanceof Error && error_.message ? error_.message : 'Could not save this conversation'
        setView(prev => (prev.conversationId === job.conversationId ? {...prev, saveError: message} : prev))
        return
      }

      // The write succeeded, so the page's list wants it either way. Only a view still on screen has state to update.
      const isCurrent = generationRef.current === job.generation
      if (isCurrent) {
        if (failedSaveRef.current?.conversationId === job.conversationId) failedSaveRef.current = null
        setView(prev =>
          prev.conversationId === job.conversationId && (prev.saveError !== null || prev.mayCreate)
            ? {...prev, saveError: null, mayCreate: false}
            : prev,
        )
      }
      // The page's callback is not part of persisting: if it throws, the conversation is still saved.
      try {
        notify?.(conversation, {isNew, isCurrent})
      } catch (error_) {
        console.error('onConversationSaved failed', error_)
      }
    })
  }, [])

  const persistRun = useCallback(
    async (run: ChatRun, messages: ConversationMessage[]): Promise<void> =>
      saveJob({
        conversationId: run.conversationId,
        gptId: run.gptId,
        title: run.title,
        messages,
        generation: run.generation,
        mayCreate: run.mayCreate,
      }),
    [saveJob],
  )

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
      let truncated = false
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
            if (chunk.finishReason === 'length' || chunk.finishReason === 'error') truncated = true
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
        const messages = snapshotRun(run, {
          provider: run.provider,
          model: run.model,
          ...(replay ? {replay} : {}),
          ...(truncated ? {truncated} : {}),
        })
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
        assistantTimestamp: timestampAfter(history.at(-1)),
        reply: '',
        settled: false,
        detached: false,
        generation: base.generation,
        mayCreate: base.mayCreate,
      }

      runRef.current = run
      setView({
        conversationId: run.conversationId,
        title,
        messages: snapshotRun(run),
        streamingId: run.assistantId,
        isLoading: false,
        loadError: null,
        ownerGptId: base.ownerGptId ?? currentGpt.id,
        saveError: base.saveError,
        mayCreate: base.mayCreate,
        generation: base.generation,
        errors: {},
      })
      await executeRun(run)
    },
    [executeRun],
  )

  // The route can name any conversation. One that belongs to another GPT must never reach this GPT's provider, so it
  // is a load error: its history is hidden, and sends (and with them saves) are blocked.
  const gptMismatch = view.ownerGptId !== undefined && gpt !== undefined && view.ownerGptId !== gpt.id
  const readError = view.loadError
  const loadError = useMemo<ChatLoadError | null>(() => {
    if (gptMismatch) return FOREIGN_GPT_ERROR
    return readError === null ? null : {kind: 'read-failed', message: readError}
  }, [gptMismatch, readError])
  const messages = gptMismatch ? NO_MESSAGES : view.messages

  const canStartTurn = status === 'ready' && !view.isLoading && loadError === null && view.streamingId === null

  const send = useCallback(
    async (content: string): Promise<void> => {
      if (!content.trim() || !canStartTurn) return
      const userMessage: ConversationMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: timestampAfter(view.messages.at(-1)),
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
    setView(prev => createView(undefined, false, prev.generation + 1))
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
      generationRef.current = -1
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
      let loadError: string | null = null
      try {
        // A save of this conversation may still be writing (the user left mid-stream and came back); reading first
        // would show the history from before it.
        await pendingSaves.get(loadingId)
        loaded = await latestRef.current.storage.getConversation(loadingId)
      } catch (error_) {
        console.error('Failed to load conversation', error_)
        loadError = error_ instanceof Error && error_.message ? error_.message : 'Could not load this conversation'
      }
      if (cancelled) return
      setView(prev =>
        prev.conversationId === loadingId
          ? {
              ...prev,
              isLoading: false,
              loadError,
              ownerGptId: loaded?.gptId,
              mayCreate: loaded === undefined,
              messages: loaded?.messages ?? [],
              title: loaded?.title,
            }
          : prev,
      )
    }
    load().catch(console.error)

    return () => {
      cancelled = true
    }
  }, [loadingId])

  // Settling the failed load as not loading is what lets this flip `loadingId` back to the id and rerun the effect.
  const reloadConversation = useCallback(() => {
    if (loadError?.kind !== 'read-failed') return
    setView(prev => ({...prev, isLoading: true, loadError: null, ownerGptId: undefined}))
  }, [loadError?.kind])

  // Saves what is on screen now, not the failed snapshot: anything newer would otherwise be written over by it. A reply
  // still streaming is skipped; its own save follows and carries every message.
  const retrySave = useCallback(() => {
    const failed = failedSaveRef.current
    if (!failed || failed.generation !== generationRef.current) return
    if (view.conversationId !== failed.conversationId || view.streamingId !== null) return
    saveJob({...failed, title: view.title ?? failed.title, messages: view.messages, mayCreate: view.mayCreate}).catch(
      console.error,
    )
  }, [saveJob, view.conversationId, view.mayCreate, view.messages, view.streamingId, view.title])

  // Send the navigation prompt exactly once per GPT, after key validation finishes.
  const gptId = gpt?.id
  useEffect(() => {
    if (!initialPrompt || !gptId || status !== 'ready' || view.isLoading || loadError !== null) return
    if (view.streamingId !== null) return
    if (initialPromptSentForRef.current === gptId) return
    initialPromptSentForRef.current = gptId

    // Defer the send out of the effect body: it updates state synchronously.
    queueMicrotask(() => {
      onInitialPromptSent?.()
      send(initialPrompt).catch(console.error)
    })
  }, [initialPrompt, gptId, status, view.isLoading, loadError, view.streamingId, send, onInitialPromptSent])

  return {
    messages,
    conversationId: view.conversationId,
    conversationTitle: (gptMismatch ? undefined : view.title) ?? NEW_CHAT_TITLE,
    status,
    provider: target.provider,
    providerName: providerInstance?.name ?? target.provider,
    model: target.model,
    isStreaming: view.streamingId !== null,
    streamingMessageId: view.streamingId,
    isLoadingConversation: view.isLoading,
    loadError,
    saveError: view.saveError,
    turnErrors: view.errors,
    send,
    stop,
    regenerate,
    reloadConversation,
    retrySave,
    retry,
    reset,
  }
}
