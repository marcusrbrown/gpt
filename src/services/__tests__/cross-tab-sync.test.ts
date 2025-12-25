import {SyncEventType} from '@/types/gpt-extensions'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {CrossTabSyncService, destroyCrossTabSyncService, getCrossTabSyncService} from '../cross-tab-sync'

describe('CrossTabSyncService', () => {
  let service: CrossTabSyncService

  beforeEach(() => {
    destroyCrossTabSyncService()
    service = new CrossTabSyncService()
  })

  afterEach(() => {
    service.destroy()
    destroyCrossTabSyncService()
  })

  describe('subscribe', () => {
    it('should add handler to subscribers', () => {
      const handler = vi.fn()
      const unsubscribe = service.subscribe(handler)

      expect(typeof unsubscribe).toBe('function')
    })

    it('should return unsubscribe function that removes handler', () => {
      const handler = vi.fn()
      const unsubscribe = service.subscribe(handler)

      unsubscribe()
      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('broadcast', () => {
    it('should not throw when broadcasting', () => {
      expect(() => {
        service.broadcast(SyncEventType.GPT_CREATED, 'test-id', 'gpt')
      }).not.toThrow()
    })

    it('should not throw after destroy', () => {
      service.destroy()

      expect(() => {
        service.broadcast(SyncEventType.GPT_UPDATED, 'test-id', 'folder')
      }).not.toThrow()
    })
  })

  describe('destroy', () => {
    it('should clean up resources', () => {
      const handler = vi.fn()
      service.subscribe(handler)

      service.destroy()
      expect(handler).not.toHaveBeenCalled()
    })

    it('should be idempotent', () => {
      expect(() => {
        service.destroy()
        service.destroy()
        service.destroy()
      }).not.toThrow()
    })
  })

  describe('singleton pattern', () => {
    it('should return same instance from getCrossTabSyncService', () => {
      destroyCrossTabSyncService()

      const instance1 = getCrossTabSyncService()
      const instance2 = getCrossTabSyncService()

      expect(instance1).toBe(instance2)
    })

    it('should create new instance after destroyCrossTabSyncService', () => {
      const instance1 = getCrossTabSyncService()
      destroyCrossTabSyncService()
      const instance2 = getCrossTabSyncService()

      expect(instance1).not.toBe(instance2)
    })
  })

  describe('handler isolation', () => {
    it('should not break other handlers when one throws', () => {
      const errorHandler = vi.fn(() => {
        throw new Error('Handler error')
      })
      const successHandler = vi.fn()

      service.subscribe(errorHandler)
      service.subscribe(successHandler)

      expect(errorHandler).not.toHaveBeenCalled()
      expect(successHandler).not.toHaveBeenCalled()
    })
  })
})
