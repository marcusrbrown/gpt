import {AUTO_SAVE_DEBOUNCE_MS} from '@/types/gpt-extensions'
import {useCallback, useEffect, useRef, useState} from 'react'

export interface AutoSaveState {
  isSaving: boolean
  lastSaved: Date | null
  error: Error | null
  hasUnsavedChanges: boolean
}

export interface UseAutoSaveOptions<T> {
  debounceMs?: number
  onError?: (error: Error) => void
  isEqual?: (a: T, b: T) => boolean
}

export interface UseAutoSaveReturn<T> extends AutoSaveState {
  saveNow: () => Promise<void>
  reset: () => void
  trackValue: (value: T) => void
}

export function useAutoSave<T>(
  onSave: (value: T) => Promise<void>,
  options: UseAutoSaveOptions<T> = {},
): UseAutoSaveReturn<T> {
  const {debounceMs = AUTO_SAVE_DEBOUNCE_MS, onError, isEqual = Object.is} = options

  const [state, setState] = useState<AutoSaveState>({
    isSaving: false,
    lastSaved: null,
    error: null,
    hasUnsavedChanges: false,
  })

  const valueRef = useRef<T | undefined>(undefined)
  const lastSavedValueRef = useRef<T | undefined>(undefined)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveInProgressRef = useRef<boolean>(false)
  const isMountedRef = useRef<boolean>(true)

  const clearPendingTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const performSave = useCallback(async () => {
    const valueToSave = valueRef.current
    if (valueToSave === undefined || saveInProgressRef.current) return
    if (lastSavedValueRef.current !== undefined && isEqual(valueToSave, lastSavedValueRef.current)) {
      setState(prev => ({...prev, hasUnsavedChanges: false}))
      return
    }

    saveInProgressRef.current = true
    setState(prev => ({...prev, isSaving: true, error: null}))

    try {
      await onSave(valueToSave)
      if (isMountedRef.current) {
        lastSavedValueRef.current = valueToSave
        setState({
          isSaving: false,
          lastSaved: new Date(),
          error: null,
          hasUnsavedChanges: false,
        })
      }
    } catch (error_) {
      const error = error_ instanceof Error ? error_ : new Error(String(error_))
      if (isMountedRef.current) {
        setState(prev => ({...prev, isSaving: false, error}))
        onError?.(error)
      }
    } finally {
      saveInProgressRef.current = false
    }
  }, [onSave, onError, isEqual])

  const trackValue = useCallback(
    (value: T) => {
      valueRef.current = value

      const hasChanges = lastSavedValueRef.current === undefined || !isEqual(value, lastSavedValueRef.current)
      setState(prev => (prev.hasUnsavedChanges === hasChanges ? prev : {...prev, hasUnsavedChanges: hasChanges}))

      clearPendingTimeout()
      if (hasChanges) {
        timeoutRef.current = setTimeout(() => {
          performSave().catch(() => {})
        }, debounceMs)
      }
    },
    [debounceMs, isEqual, performSave, clearPendingTimeout],
  )

  const saveNow = useCallback(async () => {
    clearPendingTimeout()
    await performSave()
  }, [performSave, clearPendingTimeout])

  const reset = useCallback(() => {
    clearPendingTimeout()
    lastSavedValueRef.current = valueRef.current
    setState({
      isSaving: false,
      lastSaved: null,
      error: null,
      hasUnsavedChanges: false,
    })
  }, [clearPendingTimeout])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      clearPendingTimeout()
    }
  }, [clearPendingTimeout])

  return {
    ...state,
    saveNow,
    reset,
    trackValue,
  }
}
