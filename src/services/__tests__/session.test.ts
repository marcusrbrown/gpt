import {db} from '@/lib/database'

import {
  getSessionManager,
  initializeSessionManager,
  resetSessionManagerForTesting,
  type SessionManager,
} from '@/services/session'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

describe('SessionManager', () => {
  let manager: SessionManager

  beforeEach(async () => {
    await db.delete()
    await db.open()
    resetSessionManagerForTesting()
    manager = getSessionManager()
  })

  afterEach(() => {
    resetSessionManagerForTesting()
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('starts in locked state', () => {
      const state = manager.getState()
      expect(state.status).toBe('locked')
    })

    it('has default config', () => {
      const config = manager.getConfig()
      expect(config.timeoutMinutes).toBe(30)
      expect(config.warningMinutes).toBe(5)
    })
  })

  describe('unlock/lock', () => {
    it('transitions to unlocked state on unlock', () => {
      manager.unlock()
      expect(manager.getState().status).toBe('unlocked')
    })

    it('transitions to locked state on lock', () => {
      manager.unlock()
      manager.lock()
      expect(manager.getState().status).toBe('locked')
    })

    it('updates lastActivity on unlock', () => {
      const before = Date.now()
      manager.unlock()
      const state = manager.getState()
      expect(state.lastActivity).toBeGreaterThanOrEqual(before)
    })
  })

  describe('subscription', () => {
    it('notifies subscribers on state change', () => {
      const callback = vi.fn()
      manager.subscribe(callback)

      manager.unlock()

      expect(callback).toHaveBeenCalledWith(expect.objectContaining({status: 'unlocked'}))
    })

    it('allows unsubscribing', () => {
      const callback = vi.fn()
      const unsubscribe = manager.subscribe(callback)

      unsubscribe()
      manager.unlock()

      expect(callback).not.toHaveBeenCalled()
    })

    it('handles subscriber errors gracefully', () => {
      const badCallback = vi.fn(() => {
        throw new Error('Subscriber error')
      })
      const goodCallback = vi.fn()

      manager.subscribe(badCallback)
      manager.subscribe(goodCallback)

      expect(() => manager.unlock()).not.toThrow()
      expect(goodCallback).toHaveBeenCalled()
    })
  })

  describe('configuration', () => {
    it('allows updating timeout config', async () => {
      await manager.setConfig({timeoutMinutes: 60})
      expect(manager.getConfig().timeoutMinutes).toBe(60)
    })

    it('validates config values', async () => {
      await expect(manager.setConfig({timeoutMinutes: 2})).rejects.toThrow()
      await expect(manager.setConfig({timeoutMinutes: 1000})).rejects.toThrow()
    })

    it('persists config to database', async () => {
      await manager.setConfig({timeoutMinutes: 45, warningMinutes: 10})

      resetSessionManagerForTesting()
      const newManager = await initializeSessionManager()

      expect(newManager.getConfig().timeoutMinutes).toBe(45)
      expect(newManager.getConfig().warningMinutes).toBe(10)
    })
  })

  describe('session timeout', () => {
    beforeEach(async () => {
      await manager.setConfig({timeoutMinutes: 5, warningMinutes: 1})
      vi.useFakeTimers()
    })

    it('transitions to timing_out before timeout', () => {
      manager.unlock()

      vi.advanceTimersByTime(4 * 60 * 1000 + 10_000)

      expect(manager.getState().status).toBe('timing_out')
    })

    it('transitions to locked after timeout', () => {
      manager.unlock()

      vi.advanceTimersByTime(5 * 60 * 1000 + 1000)

      expect(manager.getState().status).toBe('locked')
    })

    it('extends session and returns to unlocked', () => {
      manager.unlock()

      vi.advanceTimersByTime(4 * 60 * 1000 + 10_000)
      expect(manager.getState().status).toBe('timing_out')

      manager.extendSession()
      expect(manager.getState().status).toBe('unlocked')
    })
  })

  describe('activity tracking', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    it('starts and stops activity tracking', () => {
      const addSpy = vi.spyOn(window, 'addEventListener')
      const removeSpy = vi.spyOn(window, 'removeEventListener')

      manager.startActivityTracking()
      expect(addSpy).toHaveBeenCalledWith('mousemove', expect.any(Function), {passive: true})

      manager.stopActivityTracking()
      expect(removeSpy).toHaveBeenCalledWith('mousemove', expect.any(Function))

      addSpy.mockRestore()
      removeSpy.mockRestore()
    })
  })

  describe('singleton behavior', () => {
    it('returns same instance', () => {
      const manager1 = getSessionManager()
      const manager2 = getSessionManager()
      expect(manager1).toBe(manager2)
    })

    it('resets instance for testing', () => {
      const manager1 = getSessionManager()
      resetSessionManagerForTesting()
      const manager2 = getSessionManager()
      expect(manager1).not.toBe(manager2)
    })
  })

  describe('destroy', () => {
    it('cleans up resources', () => {
      manager.unlock()
      manager.startActivityTracking()

      const callback = vi.fn()
      manager.subscribe(callback)

      manager.destroy()

      expect(manager.getState().status).toBe('unlocked')
    })
  })
})
