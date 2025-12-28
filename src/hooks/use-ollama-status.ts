import type {OllamaConnectionStatus, OllamaModelInfo} from '@/types/ollama'

import {getOllamaProvider} from '@/services/providers/ollama-provider'
import {useCallback, useEffect, useRef, useState} from 'react'

/**
 * Connection status result from the hook
 */
export interface OllamaStatusResult {
  /** Current connection status */
  status: OllamaConnectionStatus
  /** Whether the hook is currently checking connection */
  isChecking: boolean
  /** List of available models (empty if not connected) */
  models: OllamaModelInfo[]
  /** Error message if connection failed */
  error: string | null
  /** Manually trigger a status check */
  checkNow: () => Promise<void>
  /** Last successful check timestamp */
  lastChecked: Date | null
}

/**
 * Options for the useOllamaStatus hook
 */
export interface UseOllamaStatusOptions {
  /** Polling interval in milliseconds (default: 30000 = 30s) */
  pollInterval?: number
  /** Whether to start polling immediately (default: true) */
  autoStart?: boolean
  /** Whether to fetch models on successful connection (default: true) */
  fetchModels?: boolean
}

const DEFAULT_POLL_INTERVAL = 30_000 // 30 seconds

/**
 * Hook to monitor Ollama connection status with automatic polling
 *
 * Provides real-time connection status monitoring for the local Ollama instance.
 * Automatically polls at configurable intervals and fetches available models.
 *
 * @example
 * ```tsx
 * function OllamaStatus() {
 *   const { status, models, error, checkNow, isChecking } = useOllamaStatus();
 *
 *   return (
 *     <div>
 *       <span>Status: {status}</span>
 *       {status === 'connected' && <span>{models.length} models available</span>}
 *       {error && <span className="text-danger">{error}</span>}
 *       <button onClick={checkNow} disabled={isChecking}>
 *         {isChecking ? 'Checking...' : 'Check Now'}
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @param options - Configuration options for polling behavior
 * @returns Status result with connection state, models, and control functions
 */
export function useOllamaStatus(options: UseOllamaStatusOptions = {}): OllamaStatusResult {
  const {pollInterval = DEFAULT_POLL_INTERVAL, autoStart = true, fetchModels = true} = options

  const [status, setStatus] = useState<OllamaConnectionStatus>('unknown')
  const [isChecking, setIsChecking] = useState(false)
  const [models, setModels] = useState<OllamaModelInfo[]>([])
  const [error, setError] = useState<string | null>(null)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isMountedRef = useRef(true)

  const checkStatus = useCallback(async () => {
    if (isChecking) return

    setIsChecking(true)
    setError(null)

    try {
      const provider = getOllamaProvider()

      // Check connection by validating credentials (which checks /api/tags)
      // Pass empty string since Ollama doesn't need an API key
      const result = await provider.validateCredentials('')

      if (!isMountedRef.current) return

      if (result.valid) {
        setStatus('connected')

        // Fetch models if requested
        if (fetchModels) {
          try {
            const modelList = await provider.listModels()
            if (isMountedRef.current) {
              // Convert provider models to OllamaModelInfo format
              setModels(
                modelList.map(m => ({
                  name: m.id,
                  model: m.id,
                  modified_at: new Date().toISOString(),
                  size: 0,
                  digest: '',
                  details: {
                    format: '',
                    family: 'general',
                    parameter_size: '',
                    quantization_level: '',
                  },
                })),
              )
            }
          } catch {
            // Models fetch failed but connection is still good
            if (isMountedRef.current) {
              setModels([])
            }
          }
        }
      } else {
        setStatus('disconnected')
        setModels([])
      }

      if (isMountedRef.current) {
        setLastChecked(new Date())
      }
    } catch (error_) {
      if (!isMountedRef.current) return

      const errorMessage = error_ instanceof Error ? error_.message : 'Failed to connect to Ollama'

      // Determine if this is a CORS issue
      if (errorMessage.toLowerCase().includes('cors') || errorMessage.toLowerCase().includes('network')) {
        setStatus('cors_error')
        setError('CORS error: Set OLLAMA_ORIGINS=* and restart Ollama')
      } else {
        setStatus('disconnected')
        setError(errorMessage)
      }
      setModels([])
      setLastChecked(new Date())
    } finally {
      if (isMountedRef.current) {
        setIsChecking(false)
      }
    }
  }, [isChecking, fetchModels])

  // Start/stop polling
  useEffect(() => {
    isMountedRef.current = true

    if (autoStart) {
      // Initial check
      checkStatus().catch(console.error)

      // Set up polling interval
      intervalRef.current = setInterval(() => {
        checkStatus().catch(console.error)
      }, pollInterval)
    }

    return () => {
      isMountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [autoStart, pollInterval, checkStatus])

  return {
    status,
    isChecking,
    models,
    error,
    checkNow: checkStatus,
    lastChecked,
  }
}

/**
 * Get current Ollama base URL from configuration
 *
 * @returns The configured base URL for Ollama
 */
export function getOllamaBaseUrl(): string {
  const provider = getOllamaProvider()
  return provider.baseUrl
}
