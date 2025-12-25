import type {SyncEvent, SyncEventType} from '@/types/gpt-extensions'

type SyncEventHandler = (event: SyncEvent) => void

const CHANNEL_NAME = 'gpt-platform-sync'

export class CrossTabSyncService {
  private channel: BroadcastChannel | null = null
  private readonly handlers: Set<SyncEventHandler> = new Set()
  private isDestroyed = false

  constructor() {
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(CHANNEL_NAME)
      this.channel.addEventListener('message', this.handleMessage.bind(this))
    }
  }

  private handleMessage(event: MessageEvent<SyncEvent>): void {
    if (this.isDestroyed) return
    for (const handler of this.handlers) {
      try {
        handler(event.data)
      } catch {}
    }
  }

  broadcast(type: SyncEventType, entityId: string, entityType: 'gpt' | 'folder' | 'version'): void {
    if (!this.channel || this.isDestroyed) return

    const event: SyncEvent = {
      type,
      entityId,
      entityType,
      timestamp: Date.now(),
    }

    this.channel.postMessage(event)
  }

  subscribe(handler: SyncEventHandler): () => void {
    this.handlers.add(handler)
    return () => {
      this.handlers.delete(handler)
    }
  }

  destroy(): void {
    this.isDestroyed = true
    this.handlers.clear()
    if (this.channel) {
      this.channel.close()
      this.channel = null
    }
  }
}

let instance: CrossTabSyncService | null = null

export function getCrossTabSyncService(): CrossTabSyncService {
  if (!instance) {
    instance = new CrossTabSyncService()
  }
  return instance
}

export function destroyCrossTabSyncService(): void {
  if (instance) {
    instance.destroy()
    instance = null
  }
}
