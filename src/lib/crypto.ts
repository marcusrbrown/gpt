// Security: PBKDF2 iterations intentionally slow (100k) to resist brute force
export const PBKDF2_ITERATIONS = 100_000
export const KEY_LENGTH = 256
export const SALT_LENGTH = 16
// Security: IV length 12 bytes (96 bits) is GCM standard - MUST be unique per encryption
export const IV_LENGTH = 12
export const PASSPHRASE_CHECK_VALUE = 'passphrase_verified'

export interface EncryptedData {
  ciphertext: ArrayBuffer
  iv: Uint8Array<ArrayBuffer>
}

export function isWebCryptoAvailable(): boolean {
  try {
    return typeof crypto !== 'undefined' && crypto.subtle !== undefined && typeof crypto.getRandomValues === 'function'
  } catch {
    return false
  }
}

export function generateSalt(): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
}

export function generateIV(): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH))
}

// Security: Returns non-extractable key - cannot be exported to raw bytes
export async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey'])

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    {name: 'AES-GCM', length: KEY_LENGTH},
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encrypt(data: string, key: CryptoKey): Promise<EncryptedData> {
  const iv = generateIV()
  const encoder = new TextEncoder()
  const ciphertext = await crypto.subtle.encrypt({name: 'AES-GCM', iv}, key, encoder.encode(data))
  return {ciphertext, iv}
}

// Security: Throws DOMException if key is wrong or data corrupted - do not catch silently
export async function decrypt(ciphertext: ArrayBuffer, iv: Uint8Array<ArrayBuffer>, key: CryptoKey): Promise<string> {
  const decrypted = await crypto.subtle.decrypt({name: 'AES-GCM', iv}, key, ciphertext)
  return new TextDecoder().decode(decrypted)
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    const byte = bytes[i]
    if (byte !== undefined) {
      binary += String.fromCharCode(byte)
    }
  }
  return btoa(binary)
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

export function uint8ArrayToBase64(array: Uint8Array<ArrayBuffer>): string {
  return arrayBufferToBase64(array.buffer)
}

export function base64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(base64ToArrayBuffer(base64))
}
