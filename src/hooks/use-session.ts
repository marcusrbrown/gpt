import {SessionContext, type SessionContextValue} from '@/contexts/session-context'

import {use} from 'react'

export function useSession(): SessionContextValue {
  const context = use(SessionContext)
  if (!context) {
    throw new Error('useSession must be used within SessionProvider')
  }
  return context
}

export function useSessionStatus() {
  const {status, isUnlocked, remainingSeconds} = useSession()
  return {status, isUnlocked, remainingSeconds}
}

export function useSecretAccess() {
  const {getSecret, setSecret, deleteSecret, isUnlocked} = useSession()
  return {getSecret, setSecret, deleteSecret, isUnlocked}
}

export function usePassphraseManagement() {
  const {isPassphraseSet, setInitialPassphrase, changePassphrase, resetAllData} = useSession()
  return {isPassphraseSet, setInitialPassphrase, changePassphrase, resetAllData}
}
