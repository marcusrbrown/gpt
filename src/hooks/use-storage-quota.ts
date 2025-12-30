import {useCallback, useEffect, useRef, useState} from 'react'

export interface StorageQuotaResult {
  used: number
  total: number
  percentage: number
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

/**
 * Hook to retrieve browser storage quota information.
 * Uses the Storage API's `navigator.storage.estimate()` method.
 *
 * @returns StorageQuotaResult with usage stats, loading state, and refresh function
 *
 * @example
 * ```tsx
 * function StorageIndicator() {
 *   const { used, total, percentage, isLoading } = useStorageQuota()
 *   if (isLoading) return <Spinner />
 *   return <Progress value={percentage} />
 * }
 * ```
 */
export function useStorageQuota(): StorageQuotaResult {
  const [state, setState] = useState<{
    used: number
    total: number
    isLoading: boolean
    error: Error | null
  }>({
    used: 0,
    total: 0,
    isLoading: true,
    error: null,
  })
  const isMountedRef = useRef(true)

  const fetchQuota = useCallback(async () => {
    if (!navigator.storage?.estimate) {
      setState(prev => ({
        ...prev,
        error: new Error('Storage API not supported'),
        isLoading: false,
      }))
      return
    }

    try {
      setState(prev => ({...prev, isLoading: true, error: null}))
      const estimate = await navigator.storage.estimate()

      if (isMountedRef.current) {
        setState({
          used: estimate.usage ?? 0,
          total: estimate.quota ?? 0,
          isLoading: false,
          error: null,
        })
      }
    } catch (error_) {
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          error: error_ instanceof Error ? error_ : new Error('Failed to estimate storage'),
          isLoading: false,
        }))
      }
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true

    // Fetch quota on mount
    fetchQuota().catch(console.error)

    return () => {
      isMountedRef.current = false
    }
  }, [fetchQuota])

  const percentage = state.total > 0 ? Math.round((state.used / state.total) * 100) : 0

  return {
    used: state.used,
    total: state.total,
    percentage,
    isLoading: state.isLoading,
    error: state.error,
    refresh: fetchQuota,
  }
}
