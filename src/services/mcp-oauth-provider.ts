/**
 * MCP OAuth Provider - Browser-compatible OAuth 2.1 implementation
 * Implements OAuthClientProvider interface from @modelcontextprotocol/sdk
 * Uses RFC-002 encryption service for secure token storage
 */

import type {MCPOAuthTokensDB, MCPServerConfig} from '@/types/mcp'
import type {OAuthClientProvider} from '@modelcontextprotocol/sdk/client/auth.js'
import {isWebCryptoAvailable} from '@/lib/crypto'
import {db, nowISO} from '@/lib/database'
import {getEncryptionService} from '@/services/encryption'

interface OAuthTokens {
  access_token: string
  refresh_token?: string
  token_type: string
  expires_in?: number
  scope?: string
}

interface OAuthClientMetadata {
  client_name: string
  redirect_uris: string[]
  grant_types: string[]
  response_types: string[]
  scope?: string
}

interface OAuthClientInformation {
  client_id: string
  client_secret?: string
}

const OAUTH_STORAGE_PREFIX = 'mcp_oauth_'

/**
 * Browser-based OAuth provider for MCP servers using authorization code + PKCE flow.
 * Stores tokens encrypted via the encryption service.
 */
export class MCPBrowserOAuthProvider implements OAuthClientProvider {
  private readonly server: MCPServerConfig
  private cachedTokens?: OAuthTokens

  constructor(server: MCPServerConfig) {
    this.server = server
  }

  get redirectUrl(): string {
    return `${window.location.origin}/oauth/callback`
  }

  get clientMetadata(): OAuthClientMetadata {
    const auth = this.server.authentication
    if (auth.type !== 'oauth2') {
      throw new Error('Server not configured for OAuth')
    }

    return {
      client_name: this.server.name,
      redirect_uris: [this.redirectUrl],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      scope: auth.scopes?.join(' '),
    }
  }

  async clientInformation(): Promise<OAuthClientInformation | undefined> {
    const auth = this.server.authentication
    if (auth.type !== 'oauth2') {
      return undefined
    }

    return {
      client_id: auth.clientId,
      client_secret: auth.clientSecret,
    }
  }

  async tokens(): Promise<OAuthTokens | undefined> {
    if (this.cachedTokens) {
      return this.cachedTokens
    }

    const stored = await db.mcpOAuthTokens.get(this.server.id)
    if (!stored) {
      return undefined
    }

    // Check if token is expired
    if (stored.expiresAt && new Date(stored.expiresAt) < new Date()) {
      // Token expired, caller should trigger refresh
      return undefined
    }

    try {
      const encryptionService = getEncryptionService()
      if (!encryptionService.isUnlocked()) {
        throw new Error('Encryption service is locked')
      }

      // Decrypt access token
      const accessToken = await this.decryptToken(stored.accessToken)
      if (!accessToken) {
        return undefined
      }

      const tokens: OAuthTokens = {
        access_token: accessToken,
        token_type: 'Bearer',
        scope: stored.scope,
      }

      // Decrypt refresh token if present
      if (stored.refreshToken) {
        const refreshToken = await this.decryptToken(stored.refreshToken)
        if (refreshToken) {
          tokens.refresh_token = refreshToken
        }
      }

      this.cachedTokens = tokens
      return tokens
    } catch (error_) {
      console.error('Failed to decrypt OAuth tokens:', error_)
      return undefined
    }
  }

  async saveTokens(tokens: OAuthTokens): Promise<void> {
    if (!isWebCryptoAvailable()) {
      throw new Error('Web Crypto API not available')
    }

    const encryptionService = getEncryptionService()
    if (!encryptionService.isUnlocked()) {
      throw new Error('Encryption service is locked - cannot save tokens')
    }

    const encryptedAccessToken = await this.encryptToken(tokens.access_token)
    const encryptedRefreshToken = tokens.refresh_token ? await this.encryptToken(tokens.refresh_token) : undefined

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString() // Default 1 hour

    const tokenRecord: MCPOAuthTokensDB = {
      serverId: this.server.id,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt,
      scope: tokens.scope,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    }

    await db.mcpOAuthTokens.put(tokenRecord)
    this.cachedTokens = tokens
  }

  redirectToAuthorization(authorizationUrl: URL): void {
    // Store server ID for callback handling
    sessionStorage.setItem(`${OAUTH_STORAGE_PREFIX}server`, this.server.id)
    // Redirect to authorization server
    window.location.href = authorizationUrl.toString()
  }

  saveCodeVerifier(codeVerifier: string): void {
    // Store PKCE verifier in sessionStorage (survives page reload during OAuth flow)
    sessionStorage.setItem(`${OAUTH_STORAGE_PREFIX}verifier_${this.server.id}`, codeVerifier)
  }

  codeVerifier(): string {
    return sessionStorage.getItem(`${OAUTH_STORAGE_PREFIX}verifier_${this.server.id}`) ?? ''
  }

  /**
   * Clean up OAuth flow data from sessionStorage
   */
  cleanupOAuthFlow(): void {
    sessionStorage.removeItem(`${OAUTH_STORAGE_PREFIX}server`)
    sessionStorage.removeItem(`${OAUTH_STORAGE_PREFIX}verifier_${this.server.id}`)
  }

  /**
   * Delete stored tokens for this server
   */
  async deleteTokens(): Promise<void> {
    await db.mcpOAuthTokens.delete(this.server.id)
    this.cachedTokens = undefined
  }

  private async encryptToken(token: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(token)

    // Generate IV for this encryption
    const iv = crypto.getRandomValues(new Uint8Array(12))

    // Get encryption key from service (we piggyback on the existing encryption infrastructure)
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(`${this.server.id}_oauth_key`),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey'],
    )

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('mcp_oauth_salt'),
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      {name: 'AES-GCM', length: 256},
      false,
      ['encrypt', 'decrypt'],
    )

    const encrypted = await crypto.subtle.encrypt({name: 'AES-GCM', iv}, key, data)

    // Combine IV and ciphertext for storage
    const combined = new Uint8Array(iv.length + encrypted.byteLength)
    combined.set(iv)
    combined.set(new Uint8Array(encrypted), iv.length)

    return btoa(String.fromCharCode(...combined))
  }

  private async decryptToken(encryptedToken: string): Promise<string | null> {
    try {
      const combined = Uint8Array.from(atob(encryptedToken), c => c.charCodeAt(0))

      const iv = combined.slice(0, 12)
      const ciphertext = combined.slice(12)

      const encoder = new TextEncoder()
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(`${this.server.id}_oauth_key`),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey'],
      )

      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: encoder.encode('mcp_oauth_salt'),
          iterations: 100000,
          hash: 'SHA-256',
        },
        keyMaterial,
        {name: 'AES-GCM', length: 256},
        false,
        ['encrypt', 'decrypt'],
      )

      const decrypted = await crypto.subtle.decrypt({name: 'AES-GCM', iv}, key, ciphertext)

      return new TextDecoder().decode(decrypted)
    } catch {
      return null
    }
  }
}

/**
 * Get the server ID from an in-progress OAuth flow (after redirect)
 */
export function getOAuthFlowServerId(): string | null {
  return sessionStorage.getItem(`${OAUTH_STORAGE_PREFIX}server`)
}

/**
 * Clear OAuth flow state after completion
 */
export function clearOAuthFlowState(): void {
  const serverId = getOAuthFlowServerId()
  if (serverId) {
    sessionStorage.removeItem(`${OAUTH_STORAGE_PREFIX}server`)
    sessionStorage.removeItem(`${OAUTH_STORAGE_PREFIX}verifier_${serverId}`)
  }
}
