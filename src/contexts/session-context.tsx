import {isWebCryptoAvailable} from '@/lib/crypto'

import {getEncryptionService, type EncryptionService, type ProviderType} from '@/services/encryption'
import {
  getSessionManager,
  initializeSessionManager,
  type SessionConfig,
  type SessionManager,
  type SessionStatus,
} from '@/services/session'
import {createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode} from 'react'

export interface SessionContextValue {
  status: SessionStatus
  remainingSeconds?: number
  isUnlocked: boolean
  isPassphraseSet: boolean
  isInitialized: boolean
  webCryptoAvailable: boolean

  unlock: (passphrase: string) => Promise<boolean>
  lock: () => void
  extendSession: () => void

  setInitialPassphrase: (passphrase: string) => Promise<void>
  changePassphrase: (oldPassphrase: string, newPassphrase: string) => Promise<void>

  getSecret: (provider: ProviderType) => Promise<string | null>
  setSecret: (provider: ProviderType, apiKey: string) => Promise<void>
  deleteSecret: (provider: ProviderType) => Promise<void>

  sessionConfig: SessionConfig
  updateSessionConfig: (config: Partial<SessionConfig>) => Promise<void>

  resetAllData: () => Promise<void>
}

export const SessionContext = createContext<SessionContextValue | null>(null)

interface SessionProviderProps {
  children: ReactNode
}

export function SessionProvider({children}: SessionProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isPassphraseSet, setIsPassphraseSet] = useState(false)
  const [status, setStatus] = useState<SessionStatus>('locked')
  const [remainingSeconds, setRemainingSeconds] = useState<number | undefined>()
  const [sessionConfig, setSessionConfig] = useState<SessionConfig>({
    timeoutMinutes: 30,
    warningMinutes: 5,
  })

  const webCryptoAvailable = useMemo(() => isWebCryptoAvailable(), [])

  const servicesRef = useRef<{
    encryption: EncryptionService
    session: SessionManager
  } | null>(null)

  const [servicesReady, setServicesReady] = useState(false)

  useEffect(() => {
    if (!webCryptoAvailable) {
      queueMicrotask(() => setIsInitialized(true))
      return
    }

    let cancelled = false

    const init = async () => {
      try {
        await initializeSessionManager()

        const encryption = getEncryptionService()
        const session = getSessionManager()

        const hasSecrets = await encryption.hasSecrets()

        if (cancelled) return

        servicesRef.current = {encryption, session}

        queueMicrotask(() => {
          if (cancelled) return
          setIsPassphraseSet(hasSecrets)
          setSessionConfig(session.getConfig())
          setServicesReady(true)
          setIsInitialized(true)
        })
      } catch (error) {
        console.error('Failed to initialize security services:', error)
        if (!cancelled) {
          queueMicrotask(() => setIsInitialized(true))
        }
      }
    }

    init().catch(console.error)

    return () => {
      cancelled = true
    }
  }, [webCryptoAvailable])

  useEffect(() => {
    const services = servicesRef.current
    if (!servicesReady || !services) return

    const unsubscribe = services.session.subscribe(state => {
      setStatus(state.status)
      setRemainingSeconds(state.remainingSeconds)
    })

    const initialState = services.session.getState()
    queueMicrotask(() => {
      setStatus(initialState.status)
      setRemainingSeconds(initialState.remainingSeconds)
    })

    return unsubscribe
  }, [servicesReady])

  useEffect(() => {
    const services = servicesRef.current
    if (!servicesReady || !services || status !== 'unlocked') return

    services.session.startActivityTracking()
    return () => services.session.stopActivityTracking()
  }, [servicesReady, status])

  const unlock = useCallback(async (passphrase: string): Promise<boolean> => {
    const services = servicesRef.current
    if (!services) return false

    try {
      const success = await services.encryption.unlock(passphrase)
      if (success) {
        services.session.unlock()
      }
      return success
    } catch {
      return false
    }
  }, [])

  const lock = useCallback(() => {
    const services = servicesRef.current
    if (!services) return

    services.encryption.lock()
    services.session.lock()
  }, [])

  const extendSession = useCallback(() => {
    servicesRef.current?.session.extendSession()
  }, [])

  const setInitialPassphrase = useCallback(async (passphrase: string): Promise<void> => {
    const services = servicesRef.current
    if (!services) throw new Error('Services not initialized')

    await services.encryption.initializePassphrase(passphrase)
    services.session.unlock()
    setIsPassphraseSet(true)
  }, [])

  const changePassphrase = useCallback(async (oldPassphrase: string, newPassphrase: string): Promise<void> => {
    const services = servicesRef.current
    if (!services) throw new Error('Services not initialized')

    await services.encryption.changePassphrase(oldPassphrase, newPassphrase)
  }, [])

  const getSecret = useCallback(async (provider: ProviderType): Promise<string | null> => {
    const services = servicesRef.current
    if (!services) return null
    if (!services.encryption.isUnlocked()) return null

    try {
      return await services.encryption.decryptSecret(provider)
    } catch {
      return null
    }
  }, [])

  const setSecret = useCallback(async (provider: ProviderType, apiKey: string): Promise<void> => {
    const services = servicesRef.current
    if (!services) throw new Error('Services not initialized')
    if (!services.encryption.isUnlocked()) throw new Error('Session is locked')

    await services.encryption.encryptSecret(provider, apiKey)
  }, [])

  const deleteSecret = useCallback(async (provider: ProviderType): Promise<void> => {
    const services = servicesRef.current
    if (!services) throw new Error('Services not initialized')

    await services.encryption.deleteSecret(provider)
  }, [])

  const updateSessionConfig = useCallback(async (config: Partial<SessionConfig>): Promise<void> => {
    const services = servicesRef.current
    if (!services) throw new Error('Services not initialized')

    await services.session.setConfig(config)
    setSessionConfig(services.session.getConfig())
  }, [])

  const resetAllData = useCallback(async (): Promise<void> => {
    const services = servicesRef.current
    if (!services) throw new Error('Services not initialized')

    await services.encryption.resetAll()
    services.session.lock()
    setIsPassphraseSet(false)
  }, [])

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      remainingSeconds,
      isUnlocked: status === 'unlocked',
      isPassphraseSet,
      isInitialized,
      webCryptoAvailable,

      unlock,
      lock,
      extendSession,

      setInitialPassphrase,
      changePassphrase,

      getSecret,
      setSecret,
      deleteSecret,

      sessionConfig,
      updateSessionConfig,

      resetAllData,
    }),
    [
      status,
      remainingSeconds,
      isPassphraseSet,
      isInitialized,
      webCryptoAvailable,
      unlock,
      lock,
      extendSession,
      setInitialPassphrase,
      changePassphrase,
      getSecret,
      setSecret,
      deleteSecret,
      sessionConfig,
      updateSessionConfig,
      resetAllData,
    ],
  )

  return <SessionContext value={value}>{children}</SessionContext>
}
