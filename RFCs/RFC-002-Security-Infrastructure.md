# RFC-002: Security Infrastructure

**Status:** Pending **Priority:** MUST HAVE **Complexity:** High **Phase:** 1 **Created:** December 20, 2025

---

## Summary

Implement comprehensive security infrastructure including API key encryption using Web Crypto API, Content Security Policy headers, Subresource Integrity, and session management with configurable timeouts.

## Features Addressed

| Feature ID | Feature Name            | Priority  |
| ---------- | ----------------------- | --------- |
| F-702      | API Key Encryption      | MUST HAVE |
| F-703      | Content Security Policy | MUST HAVE |
| F-705      | Subresource Integrity   | MUST HAVE |
| F-706      | Session Management      | MUST HAVE |

## Dependencies

- **Builds Upon:** RFC-001 (IndexedDB Storage Foundation)
- **Required By:** RFC-003 (Provider Abstraction), RFC-009 (MCP Tools)

---

## Technical Architecture

### Encryption Flow

```
User Passphrase
       │
       ▼
┌──────────────┐
│   PBKDF2     │ ── 100,000 iterations
│ Key Derivation│ ── SHA-256
└──────────────┘
       │
       ▼
┌──────────────┐
│  Derived Key │ ── 256-bit AES key
│  (in memory) │ ── Never persisted
└──────────────┘
       │
       ▼
┌──────────────┐    ┌──────────────┐
│   AES-GCM    │───►│  IndexedDB   │
│  Encryption  │    │ (encrypted)  │
└──────────────┘    └──────────────┘
       │
       ▼
  Unique IV per secret (stored with ciphertext)
```

### Session Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Session Manager                              │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │ Derived Key   │  │ Activity      │  │ Timeout       │       │
│  │ (memory only) │  │ Tracker       │  │ Monitor       │       │
│  └───────────────┘  └───────────────┘  └───────────────┘       │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Session State Machine                       │   │
│  │  LOCKED ──► UNLOCKING ──► UNLOCKED ──► TIMING_OUT ──►   │   │
│  │     ▲                                                 │   │   │
│  │     └─────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Acceptance Criteria

### AC-1: API Key Encryption

```gherkin
Given a user stores an API key
When the key is saved
Then it is encrypted using AES-GCM
And encryption key is derived via PBKDF2 (100k iterations)
And encrypted data is stored in IndexedDB
And plaintext never appears in localStorage or console

Given a user retrieves an API key
When they have a valid session
Then the key is decrypted in memory
And decrypted key is never logged or persisted
```

### AC-2: Passphrase Setup

```gherkin
Given a new user without a passphrase
When they first add an API key
Then they are prompted to create a passphrase
And passphrase requirements are displayed (min 8 chars)
And passphrase is never stored (only for key derivation)

Given a user enters their passphrase
When deriving the encryption key
Then PBKDF2 uses 100,000 iterations
And SHA-256 hash algorithm is used
And a 256-bit key is derived
```

### AC-3: Session Management

```gherkin
Given a user has unlocked the app
When session timeout is reached (30 min default)
Then sensitive operations require re-authentication
And derived key is cleared from memory
And user can configure timeout duration

Given a user is actively using the app
When they perform actions
Then session timeout resets
And activity is tracked via mouse/keyboard events
```

### AC-4: Session Timeout Warning

```gherkin
Given session timeout is approaching (5 min remaining)
When warning threshold is reached
Then user sees non-intrusive notification
And can extend session with one click
And countdown shows remaining time
```

### AC-5: Content Security Policy

```gherkin
Given the application loads
When CSP headers are checked
Then script-src is restricted to 'self' and trusted CDNs
And style-src uses nonces for inline styles
And connect-src allows only configured API endpoints
And default-src is 'self'
```

### AC-6: Subresource Integrity

```gherkin
Given external resources are loaded
When scripts or styles are from CDN
Then integrity attribute is present with SHA-384 hash
And crossorigin is set to 'anonymous'
And loading fails if integrity check fails
```

### AC-7: Re-encryption on Passphrase Change

```gherkin
Given a user changes their passphrase
When the change is confirmed
Then all existing secrets are re-encrypted
And old encryption key is cleared
And new key is derived from new passphrase
```

---

## Implementation Details

### File Structure

```
src/
├── lib/
│   └── crypto.ts            # Web Crypto API utilities
├── services/
│   ├── encryption.ts        # Encryption/decryption service
│   └── session.ts           # Session management service
├── contexts/
│   └── session-context.tsx  # Session state provider
├── hooks/
│   └── use-session.ts       # Session hook
└── components/
    ├── passphrase-modal.tsx # Passphrase entry/setup
    └── session-warning.tsx  # Timeout warning component
```

### Crypto Utilities

```typescript
// src/lib/crypto.ts
const PBKDF2_ITERATIONS = 100_000
const KEY_LENGTH = 256
const SALT_LENGTH = 16
const IV_LENGTH = 12

export async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(passphrase), "PBKDF2", false, ["deriveKey"])

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    {name: "AES-GCM", length: KEY_LENGTH},
    false,
    ["encrypt", "decrypt"],
  )
}

export async function encrypt(data: string, key: CryptoKey): Promise<{ciphertext: ArrayBuffer; iv: Uint8Array}> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const encoder = new TextEncoder()

  const ciphertext = await crypto.subtle.encrypt({name: "AES-GCM", iv}, key, encoder.encode(data))

  return {ciphertext, iv}
}

export async function decrypt(ciphertext: ArrayBuffer, iv: Uint8Array, key: CryptoKey): Promise<string> {
  const decrypted = await crypto.subtle.decrypt({name: "AES-GCM", iv}, key, ciphertext)

  return new TextDecoder().decode(decrypted)
}
```

### Encryption Service

```typescript
// src/services/encryption.ts
import {db} from "@/lib/database"
import {deriveKey, encrypt, decrypt} from "@/lib/crypto"

interface EncryptionService {
  setPassphrase: (passphrase: string) => Promise<void>
  encryptSecret: (provider: string, apiKey: string) => Promise<void>
  decryptSecret: (provider: string) => Promise<string | null>
  isUnlocked: () => boolean
  lock: () => void
  changePassphrase: (oldPass: string, newPass: string) => Promise<void>
}

// Implementation with in-memory key storage
// Key is NEVER persisted, only kept in closure
```

### Session Management

```typescript
// src/services/session.ts
interface SessionConfig {
  timeoutMinutes: number // Default: 30
  warningMinutes: number // Default: 5
  activityEvents: string[] // ['mousemove', 'keydown', 'click']
}

interface SessionState {
  status: "locked" | "unlocked" | "timing_out"
  lastActivity: number
  remainingSeconds?: number
}

// Activity tracking with throttling
// Timeout monitoring with warning callbacks
// Automatic lock on timeout
```

### CSP Configuration

```typescript
// vite.config.ts (for development)
// index.html meta tag (for production)

const cspDirectives = {
  "default-src": ["'self'"],
  "script-src": ["'self'"],
  "style-src": ["'self'", "'unsafe-inline'"], // HeroUI requires this
  "connect-src": [
    "'self'",
    "https://api.openai.com",
    "https://api.anthropic.com",
    "http://localhost:11434", // Ollama
  ],
  "img-src": ["'self'", "data:", "blob:"],
  "font-src": ["'self'"],
  "object-src": ["'none'"],
  "frame-ancestors": ["'none'"],
  "form-action": ["'self'"],
  "base-uri": ["'self'"],
}
```

---

## Testing Strategy

### Unit Tests

- PBKDF2 key derivation with known test vectors
- AES-GCM encryption/decryption round-trip
- Session timeout calculations
- Activity tracking throttling

### Integration Tests

- Full passphrase → encrypt → persist → decrypt flow
- Session lock/unlock cycle
- Re-encryption on passphrase change
- Cross-tab session state

### Security Tests

- Verify no plaintext in IndexedDB
- Verify no plaintext in console logs
- CSP header validation
- SRI hash verification

---

## Security Considerations

### Threat Model

| Threat                          | Mitigation                         |
| ------------------------------- | ---------------------------------- |
| XSS stealing API keys           | CSP, encryption at rest            |
| Extension snooping localStorage | Never use localStorage for secrets |
| Memory dump                     | Keys cleared on lock/timeout       |
| Brute force passphrase          | PBKDF2 with 100k iterations        |
| Network interception            | HTTPS only for API calls           |

### Security Boundaries

- Passphrase never stored (only used for derivation)
- Derived key only in memory, never persisted
- Each secret has unique IV (no IV reuse)
- Session key cleared on tab close
- No plaintext secrets in error messages or logs

---

## Performance Considerations

| Operation      | Target | Notes                        |
| -------------- | ------ | ---------------------------- |
| Key derivation | <500ms | PBKDF2 is intentionally slow |
| Encryption     | <10ms  | AES-GCM is fast              |
| Decryption     | <10ms  | AES-GCM is fast              |
| Activity check | <1ms   | Throttled, minimal overhead  |

---

## Error Handling

| Error                 | User Experience                             |
| --------------------- | ------------------------------------------- |
| Wrong passphrase      | "Incorrect passphrase. Please try again."   |
| Decryption failed     | "Unable to decrypt. Data may be corrupted." |
| WebCrypto unavailable | "Secure storage requires a modern browser." |
| Session expired       | Modal to re-enter passphrase                |

---

## Migration Notes

If users have existing API keys in localStorage (pre-encryption):

1. Detect unencrypted keys on first unlock
2. Prompt to set passphrase
3. Encrypt and migrate to IndexedDB
4. Clear localStorage after successful migration

---

## Related Documents

- [PRD Section 4.2](../docs/prd.md#42-security) - Security Requirements
- [PRD Section 5.2](../docs/prd.md#52-security-architecture) - Security Architecture
- [Features F-702](../docs/features.md#f-702-api-key-encryption) - Encryption Details
