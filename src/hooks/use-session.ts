import {SessionContext, type SessionContextValue} from '@/contexts/session-context'

import {use} from 'react'

export function useSession(): SessionContextValue {
  const context = use(SessionContext)
  if (!context) {
    throw new Error('useSession must be used within SessionProvider')
  }
  return context
}
