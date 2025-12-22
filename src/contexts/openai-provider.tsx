import createOpenAIService from '@/services/openai-service'
import React, {createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode} from 'react'

interface OpenAIContextValue {
  apiKey: string | null
  setApiKey: (key: string) => void
  clearApiKey: () => void
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

  // Create the OpenAI service instance
  const service = useMemo(() => createOpenAIService(), [])

  // Initialize API key from local storage
  useEffect(() => {
    try {
      const storedKey = localStorage.getItem('openai_api_key')
      // Check explicitly for null and empty string to avoid treating falsy values like '' as valid keys
      if (storedKey !== null && storedKey !== '') {
        setApiKeyState(storedKey)
        service.setApiKey(storedKey)
      }
    } catch (error) {
      console.error('Error retrieving API key from storage:', error)
    } finally {
      setIsInitialized(true)
    }
  }, [service])

  const setApiKey = useCallback(
    (key: string) => {
      try {
        setApiKeyState(key)
        service.setApiKey(key)
        localStorage.setItem('openai_api_key', key)
      } catch (error) {
        console.error('Error storing API key:', error)
      }
    },
    [service],
  )

  const clearApiKey = useCallback(() => {
    try {
      setApiKeyState(null)
      service.setApiKey('')
      localStorage.removeItem('openai_api_key')
    } catch (error) {
      console.error('Error clearing API key:', error)
    }
  }, [service])

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
