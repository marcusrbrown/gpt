import {db} from '@/lib/database'

import {z} from 'zod'

export type SessionStatus = 'locked' | 'unlocking' | 'unlocked' | 'timing_out'

export interface SessionState {
  status: SessionStatus
  lastActivity: number
  remainingSeconds?: number
}

export const SessionConfigSchema = z.object({
  timeoutMinutes: z.number().min(5).max(480).default(30),
  warningMinutes: z.number().min(1).max(30).default(5),
})

export type SessionConfig = z.infer<typeof SessionConfigSchema>

const DEFAULT_CONFIG: SessionConfig = {
  timeoutMinutes: 30,
  warningMinutes: 5,
}

const SETTINGS_KEYS = {
  SESSION_CONFIG: 'session_config',
} as const

const ACTIVITY_THROTTLE_MS = 30_000
const CHECK_INTERVAL_MS = 10_000
const CHANNEL_NAME = 'gpt-session-sync'

type SessionMessage = {type: 'UNLOCK'} | {type: 'LOCK'} | {type: 'ACTIVITY'; timestamp: number} | {type: 'EXTEND'}

type Subscriber = (state: SessionState) => void

export interface SessionManager {
  getState: () => SessionState
  subscribe: (callback: Subscriber) => () => void
  unlock: () => void
  lock: () => void
  extendSession: () => void
  getConfig: () => SessionConfig
  setConfig: (config: Partial<SessionConfig>) => Promise<void>
  startActivityTracking: () => void
  stopActivityTracking: () => void
  destroy: () => void
}

class SessionManagerImpl implements SessionManager {
  private state: SessionState = {
    status: 'locked',
    lastActivity: Date.now(),
  }

  private config: SessionConfig = DEFAULT_CONFIG
  private readonly subscribers = new Set<Subscriber>()
  private channel: BroadcastChannel | null = null
  private checkIntervalId: ReturnType<typeof setInterval> | null = null
  private lastActivityUpdate = 0
  private activityHandler: (() => void) | null = null
  private isDestroyed = false

  constructor() {
    this.initBroadcastChannel()
  }

  private initBroadcastChannel(): void {
    if (typeof BroadcastChannel === 'undefined') return

    this.channel = new BroadcastChannel(CHANNEL_NAME)
    this.channel.addEventListener('message', (event: MessageEvent<SessionMessage>) => {
      if (this.isDestroyed) return

      const message = event.data
      switch (message.type) {
        case 'UNLOCK':
          if (this.state.status === 'locked') {
            this.setState({status: 'unlocked', lastActivity: Date.now()})
          }
          break
        case 'LOCK':
          if (this.state.status !== 'locked') {
            this.setState({status: 'locked', lastActivity: this.state.lastActivity})
          }
          break
        case 'ACTIVITY':
          if (this.state.status === 'unlocked' || this.state.status === 'timing_out') {
            this.state.lastActivity = message.timestamp
            if (this.state.status === 'timing_out') {
              this.setState({status: 'unlocked', lastActivity: message.timestamp})
            }
          }
          break
        case 'EXTEND':
          if (this.state.status === 'timing_out') {
            this.setState({status: 'unlocked', lastActivity: Date.now()})
          }
          break
      }
    })
  }

  private broadcast(message: SessionMessage): void {
    this.channel?.postMessage(message)
  }

  private setState(newState: SessionState): void {
    this.state = newState
    this.notifySubscribers()
  }

  private notifySubscribers(): void {
    for (const subscriber of this.subscribers) {
      try {
        subscriber(this.state)
      } catch {
        // Subscriber error shouldn't break session management
      }
    }
  }

  getState(): SessionState {
    return {...this.state}
  }

  subscribe(callback: Subscriber): () => void {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }

  unlock(): void {
    const now = Date.now()
    this.setState({status: 'unlocked', lastActivity: now})
    this.broadcast({type: 'UNLOCK'})
    this.startTimeoutCheck()
  }

  lock(): void {
    this.setState({status: 'locked', lastActivity: this.state.lastActivity})
    this.broadcast({type: 'LOCK'})
    this.stopTimeoutCheck()
  }

  extendSession(): void {
    const now = Date.now()
    this.setState({status: 'unlocked', lastActivity: now})
    this.broadcast({type: 'EXTEND'})
  }

  getConfig(): SessionConfig {
    return {...this.config}
  }

  async setConfig(updates: Partial<SessionConfig>): Promise<void> {
    const newConfig = {...this.config, ...updates}
    const validated = SessionConfigSchema.parse(newConfig)
    this.config = validated

    await db.settings.put({
      key: SETTINGS_KEYS.SESSION_CONFIG,
      value: validated,
    })
  }

  async loadConfig(): Promise<void> {
    const record = await db.settings.get(SETTINGS_KEYS.SESSION_CONFIG)
    if (record?.value) {
      const parsed = SessionConfigSchema.safeParse(record.value)
      if (parsed.success) {
        this.config = parsed.data
      }
    }
  }

  startActivityTracking(): void {
    if (this.activityHandler) return

    this.activityHandler = () => {
      const now = Date.now()
      if (now - this.lastActivityUpdate < ACTIVITY_THROTTLE_MS) return

      this.lastActivityUpdate = now
      this.state.lastActivity = now

      if (this.state.status === 'timing_out') {
        this.setState({status: 'unlocked', lastActivity: now})
      }

      this.broadcast({type: 'ACTIVITY', timestamp: now})
    }

    const events = ['mousemove', 'keydown', 'click', 'touchstart'] as const
    for (const event of events) {
      window.addEventListener(event, this.activityHandler, {passive: true})
    }
  }

  stopActivityTracking(): void {
    if (!this.activityHandler) return

    const events = ['mousemove', 'keydown', 'click', 'touchstart'] as const
    for (const event of events) {
      window.removeEventListener(event, this.activityHandler)
    }
    this.activityHandler = null
  }

  private startTimeoutCheck(): void {
    if (this.checkIntervalId) return

    this.checkIntervalId = setInterval(() => {
      if (this.state.status === 'locked') return

      const now = Date.now()
      const elapsedMs = now - this.state.lastActivity
      const timeoutMs = this.config.timeoutMinutes * 60 * 1000
      const warningMs = this.config.warningMinutes * 60 * 1000
      const remainingMs = timeoutMs - elapsedMs

      if (remainingMs <= 0) {
        this.lock()
      } else if (remainingMs <= warningMs && this.state.status === 'unlocked') {
        this.setState({
          status: 'timing_out',
          lastActivity: this.state.lastActivity,
          remainingSeconds: Math.ceil(remainingMs / 1000),
        })
      } else if (this.state.status === 'timing_out') {
        this.setState({
          ...this.state,
          remainingSeconds: Math.ceil(remainingMs / 1000),
        })
      }
    }, CHECK_INTERVAL_MS)
  }

  private stopTimeoutCheck(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId)
      this.checkIntervalId = null
    }
  }

  destroy(): void {
    this.isDestroyed = true
    this.stopActivityTracking()
    this.stopTimeoutCheck()
    this.channel?.close()
    this.channel = null
    this.subscribers.clear()
  }
}

let sessionManagerInstance: SessionManagerImpl | null = null

export function getSessionManager(): SessionManager {
  if (!sessionManagerInstance) {
    sessionManagerInstance = new SessionManagerImpl()
  }
  return sessionManagerInstance
}

export function resetSessionManagerForTesting(): void {
  sessionManagerInstance?.destroy()
  sessionManagerInstance = null
}

export async function initializeSessionManager(): Promise<SessionManager> {
  const manager = getSessionManager() as SessionManagerImpl
  await manager.loadConfig()
  return manager
}
