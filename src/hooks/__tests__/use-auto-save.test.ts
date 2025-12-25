import {act, renderHook} from '@testing-library/react'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {useAutoSave} from '../use-auto-save'

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should return initial state', () => {
      const onSave = vi.fn()
      const {result} = renderHook(() => useAutoSave(onSave))

      expect(result.current.isSaving).toBe(false)
      expect(result.current.lastSaved).toBeNull()
      expect(result.current.error).toBeNull()
      expect(result.current.hasUnsavedChanges).toBe(false)
      expect(typeof result.current.saveNow).toBe('function')
      expect(typeof result.current.reset).toBe('function')
      expect(typeof result.current.trackValue).toBe('function')
    })
  })

  describe('trackValue', () => {
    it('should set hasUnsavedChanges when value is tracked', () => {
      const onSave = vi.fn()
      const {result} = renderHook(() => useAutoSave(onSave, {debounceMs: 1000}))

      act(() => {
        result.current.trackValue({name: 'test'})
      })

      expect(result.current.hasUnsavedChanges).toBe(true)
    })

    it('should not trigger save immediately', () => {
      const onSave = vi.fn()
      const {result} = renderHook(() => useAutoSave(onSave, {debounceMs: 1000}))

      act(() => {
        result.current.trackValue({name: 'test'})
      })

      expect(onSave).not.toHaveBeenCalled()
    })

    it('should trigger save after debounce delay', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)
      const {result} = renderHook(() => useAutoSave(onSave, {debounceMs: 1000}))

      act(() => {
        result.current.trackValue({name: 'test'})
      })

      await act(async () => {
        vi.advanceTimersByTime(1000)
      })

      expect(onSave).toHaveBeenCalledWith({name: 'test'})
    })

    it('should debounce multiple rapid changes', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)
      const {result} = renderHook(() => useAutoSave(onSave, {debounceMs: 1000}))

      act(() => {
        result.current.trackValue({name: 'a'})
      })

      act(() => {
        vi.advanceTimersByTime(500)
      })

      act(() => {
        result.current.trackValue({name: 'ab'})
      })

      act(() => {
        vi.advanceTimersByTime(500)
      })

      act(() => {
        result.current.trackValue({name: 'abc'})
      })

      await act(async () => {
        vi.advanceTimersByTime(1000)
      })

      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave).toHaveBeenCalledWith({name: 'abc'})
    })

    it('should not save if value is equal (using custom isEqual)', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)
      const isEqual = (a: {id: number}, b: {id: number}) => a.id === b.id
      const {result} = renderHook(() => useAutoSave(onSave, {debounceMs: 1000, isEqual}))

      act(() => {
        result.current.trackValue({id: 1})
      })

      await act(async () => {
        vi.advanceTimersByTime(1000)
      })

      act(() => {
        result.current.trackValue({id: 1})
      })

      await act(async () => {
        vi.advanceTimersByTime(1000)
      })

      expect(onSave).toHaveBeenCalledTimes(1)
    })
  })

  describe('saveNow', () => {
    it('should immediately trigger save', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)
      const {result} = renderHook(() => useAutoSave(onSave, {debounceMs: 1000}))

      act(() => {
        result.current.trackValue({name: 'test'})
      })

      await act(async () => {
        await result.current.saveNow()
      })

      expect(onSave).toHaveBeenCalledWith({name: 'test'})
    })

    it('should cancel pending debounced save', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)
      const {result} = renderHook(() => useAutoSave(onSave, {debounceMs: 1000}))

      act(() => {
        result.current.trackValue({name: 'test'})
      })

      await act(async () => {
        await result.current.saveNow()
      })

      await act(async () => {
        vi.advanceTimersByTime(1000)
      })

      expect(onSave).toHaveBeenCalledTimes(1)
    })
  })

  describe('reset', () => {
    it('should clear hasUnsavedChanges', () => {
      const onSave = vi.fn()
      const {result} = renderHook(() => useAutoSave(onSave, {debounceMs: 1000}))

      act(() => {
        result.current.trackValue({name: 'test'})
      })

      expect(result.current.hasUnsavedChanges).toBe(true)

      act(() => {
        result.current.reset()
      })

      expect(result.current.hasUnsavedChanges).toBe(false)
    })

    it('should cancel pending save', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)
      const {result} = renderHook(() => useAutoSave(onSave, {debounceMs: 1000}))

      act(() => {
        result.current.trackValue({name: 'test'})
      })

      act(() => {
        result.current.reset()
      })

      await act(async () => {
        vi.advanceTimersByTime(1000)
      })

      expect(onSave).not.toHaveBeenCalled()
    })
  })

  describe('options', () => {
    it('should use default debounce of 2000ms', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined)
      const {result} = renderHook(() => useAutoSave(onSave))

      act(() => {
        result.current.trackValue({name: 'test'})
      })

      await act(async () => {
        vi.advanceTimersByTime(1999)
      })

      expect(onSave).not.toHaveBeenCalled()

      await act(async () => {
        vi.advanceTimersByTime(1)
      })

      expect(onSave).toHaveBeenCalled()
    })
  })
})
