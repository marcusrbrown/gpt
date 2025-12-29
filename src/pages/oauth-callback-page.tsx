import {cn, ds} from '@/lib/design-system'
import {getMCPClientService} from '@/services/mcp-client-service'
import {Spinner} from '@heroui/react'
import {useEffect, useRef, useState} from 'react'
import {useNavigate, useSearchParams} from 'react-router-dom'

/**
 * OAuth callback page for MCP server authentication.
 * Handles the redirect from OAuth providers and completes the authentication flow.
 */
export function OAuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [error, setError] = useState<string | null>(null)
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code')
        const state = searchParams.get('state')
        const oauthError = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        // Handle OAuth error response
        if (oauthError) {
          setStatus('error')
          setError(errorDescription || oauthError)
          return
        }

        // Validate required parameters
        if (!code || !state) {
          setStatus('error')
          setError('Missing required OAuth parameters (code or state)')
          return
        }

        // Parse the state to get serverId
        let serverId: string
        try {
          const stateData = JSON.parse(atob(state))
          serverId = stateData.serverId
          if (!serverId) {
            throw new Error('Missing serverId in state')
          }
        } catch {
          setStatus('error')
          setError('Invalid OAuth state parameter')
          return
        }

        // Complete the OAuth flow
        const mcpService = getMCPClientService()
        await mcpService.handleOAuthCallback(serverId, code)

        setStatus('success')

        // Redirect back to settings after a brief delay
        redirectTimeoutRef.current = setTimeout(() => {
          const result = navigate('/settings?tab=mcp', {replace: true})
          if (result instanceof Promise) {
            result.catch(console.error)
          }
        }, 1500)
      } catch (error_: unknown) {
        setStatus('error')
        setError(error_ instanceof Error ? error_.message : 'Failed to complete OAuth authentication')
        console.error('OAuth callback error:', error_)
      }
    }

    handleCallback().catch(console.error)

    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current)
      }
    }
  }, [searchParams, navigate])

  return (
    <main className={cn(ds.layout.container, 'py-16 text-center')}>
      {status === 'processing' && (
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" color="primary" />
          <h1 className={cn(ds.text.heading.h2)}>Completing Authentication</h1>
          <p className={cn(ds.text.body.base, 'text-default-500')}>
            Please wait while we complete the authentication process...
          </p>
        </div>
      )}

      {status === 'success' && (
        <div className="flex flex-col items-center gap-4">
          <div className="text-success text-5xl">✓</div>
          <h1 className={cn(ds.text.heading.h2)}>Authentication Successful</h1>
          <p className={cn(ds.text.body.base, 'text-default-500')}>Redirecting you back to settings...</p>
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col items-center gap-4">
          <div className="text-danger text-5xl">✕</div>
          <h1 className={cn(ds.text.heading.h2)}>Authentication Failed</h1>
          <p className={cn(ds.text.body.base, 'text-danger-600')}>{error || 'An unknown error occurred'}</p>
          <button
            type="button"
            onClick={() => {
              const result = navigate('/settings?tab=mcp', {replace: true})
              if (result instanceof Promise) {
                result.catch(console.error)
              }
            }}
            className={cn(
              'mt-4 px-4 py-2 rounded-lg',
              'bg-primary text-white',
              'hover:bg-primary-600',
              ds.animation.transition,
            )}
          >
            Return to Settings
          </button>
        </div>
      )}
    </main>
  )
}
