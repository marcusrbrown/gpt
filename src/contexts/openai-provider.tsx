import {useSession} from '@/hooks/use-session'
import createOpenAIService from '@/services/openai-service'
import {createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode} from 'react'

interface OpenAIContextValue {
  apiKey: string | null
  setApiKey: (key: string) => Promise<void>
  clearApiKey: () => Promise<void>
  isInitialized: boolean
  service: ReturnType<typeof createOpenAIService>
}

export const OpenAIContext = createContext<OpenAIContextValue | undefined>(undefined)

interface OpenAIProviderProps {
  children: ReactNode
}

export function OpenAIProvider({children}: OpenAIProviderProps) {
  const [apiKey, setApiKeyState] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const {isUnlocked, getSecret, setSecret, deleteSecret} = useSession()

  const service = useMemo(() => createOpenAIService(), [])

  useEffect(() => {
    if (!isUnlocked) {
      queueMicrotask(() => {
        setApiKeyState(null)
        service.setApiKey('')
      })
      return
    }

    let cancelled = false

    const loadKey = async () => {
      try {
        const storedKey = await getSecret('openai')
        if (cancelled) return
        if (storedKey) {
          queueMicrotask(() => {
            setApiKeyState(storedKey)
            service.setApiKey(storedKey)
          })
        }
      } catch {
        if (!cancelled) queueMicrotask(() => setApiKeyState(null))
      } finally {
        if (!cancelled) queueMicrotask(() => setIsInitialized(true))
      }
    }

    loadKey().catch(console.error)

    return () => {
      cancelled = true
    }
  }, [isUnlocked, getSecret, service])

  const setApiKey = useCallback(
    async (key: string) => {
      await setSecret('openai', key)
      setApiKeyState(key)
      service.setApiKey(key)
    },
    [service, setSecret],
  )

  const clearApiKey = useCallback(async () => {
    await deleteSecret('openai')
    setApiKeyState(null)
    service.setApiKey('')
  }, [service, deleteSecret])

  const contextValue = useMemo(
    () => ({
      apiKey,
      setApiKey,
      clearApiKey,
      isInitialized,
      service,
    }),
    [apiKey, isInitialized, service, setApiKey, clearApiKey],
  )

  return <OpenAIContext value={contextValue}>{children}</OpenAIContext>
}

export function useOpenAI() {
  const context = use(OpenAIContext)
  if (context === undefined) {
    throw new Error('useOpenAI must be used within an OpenAIProvider')
  }
  return context
}
