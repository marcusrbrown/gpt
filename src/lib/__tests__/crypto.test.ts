import {describe, expect, it} from 'vitest'
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  base64ToUint8Array,
  decrypt,
  deriveKey,
  encrypt,
  generateIV,
  generateSalt,
  isWebCryptoAvailable,
  IV_LENGTH,
  PBKDF2_ITERATIONS,
  SALT_LENGTH,
  uint8ArrayToBase64,
} from '../crypto'

describe('crypto utilities', () => {
  describe('isWebCryptoAvailable', () => {
    it('returns true in test environment', () => {
      expect(isWebCryptoAvailable()).toBe(true)
    })
  })

  describe('generateSalt', () => {
    it('generates salt of correct length', () => {
      const salt = generateSalt()
      expect(salt.byteLength).toBe(SALT_LENGTH)
    })

    it('generates unique salts', () => {
      const salt1 = generateSalt()
      const salt2 = generateSalt()
      expect(uint8ArrayToBase64(salt1)).not.toBe(uint8ArrayToBase64(salt2))
    })
  })

  describe('generateIV', () => {
    it('generates IV of correct length', () => {
      const iv = generateIV()
      expect(iv.byteLength).toBe(IV_LENGTH)
    })

    it('generates unique IVs', () => {
      const iv1 = generateIV()
      const iv2 = generateIV()
      expect(uint8ArrayToBase64(iv1)).not.toBe(uint8ArrayToBase64(iv2))
    })
  })

  describe('deriveKey', () => {
    it('derives a CryptoKey from passphrase and salt', async () => {
      const salt = generateSalt()
      const key = await deriveKey('test-passphrase', salt)

      expect(key).toBeInstanceOf(CryptoKey)
      expect(key.algorithm.name).toBe('AES-GCM')
      expect(key.extractable).toBe(false)
      expect(key.usages).toContain('encrypt')
      expect(key.usages).toContain('decrypt')
    })

    it('derives same key from same passphrase and salt', async () => {
      const salt = generateSalt()
      const key1 = await deriveKey('same-passphrase', salt)
      const key2 = await deriveKey('same-passphrase', salt)

      const testData = 'test data for verification'
      const encrypted = await encrypt(testData, key1)
      const decrypted = await decrypt(encrypted.ciphertext, encrypted.iv, key2)

      expect(decrypted).toBe(testData)
    })

    it('derives different keys from different passphrases', async () => {
      const salt = generateSalt()
      const key1 = await deriveKey('passphrase-one', salt)
      const key2 = await deriveKey('passphrase-two', salt)

      const testData = 'test data'
      const encrypted = await encrypt(testData, key1)

      await expect(decrypt(encrypted.ciphertext, encrypted.iv, key2)).rejects.toThrow()
    })

    it('derives different keys from different salts', async () => {
      const salt1 = generateSalt()
      const salt2 = generateSalt()
      const key1 = await deriveKey('same-passphrase', salt1)
      const key2 = await deriveKey('same-passphrase', salt2)

      const testData = 'test data'
      const encrypted = await encrypt(testData, key1)

      await expect(decrypt(encrypted.ciphertext, encrypted.iv, key2)).rejects.toThrow()
    })

    it('uses correct PBKDF2 iterations', async () => {
      expect(PBKDF2_ITERATIONS).toBe(100_000)
    })
  })

  describe('encrypt and decrypt', () => {
    it('round-trips encryption/decryption', async () => {
      const salt = generateSalt()
      const key = await deriveKey('test-passphrase', salt)
      const original = 'sk-abc123-secret-api-key'

      const encrypted = await encrypt(original, key)
      const decrypted = await decrypt(encrypted.ciphertext, encrypted.iv, key)

      expect(decrypted).toBe(original)
    })

    it('generates unique IV per encryption', async () => {
      const salt = generateSalt()
      const key = await deriveKey('test-passphrase', salt)

      const e1 = await encrypt('same data', key)
      const e2 = await encrypt('same data', key)

      expect(uint8ArrayToBase64(e1.iv)).not.toBe(uint8ArrayToBase64(e2.iv))
    })

    it('produces different ciphertext for same plaintext due to unique IV', async () => {
      const salt = generateSalt()
      const key = await deriveKey('test-passphrase', salt)

      const e1 = await encrypt('same data', key)
      const e2 = await encrypt('same data', key)

      expect(arrayBufferToBase64(e1.ciphertext)).not.toBe(arrayBufferToBase64(e2.ciphertext))
    })

    it('handles empty string', async () => {
      const salt = generateSalt()
      const key = await deriveKey('test-passphrase', salt)

      const encrypted = await encrypt('', key)
      const decrypted = await decrypt(encrypted.ciphertext, encrypted.iv, key)

      expect(decrypted).toBe('')
    })

    it('handles unicode characters', async () => {
      const salt = generateSalt()
      const key = await deriveKey('test-passphrase', salt)
      const original = '🔐 Emoji and 日本語 and العربية'

      const encrypted = await encrypt(original, key)
      const decrypted = await decrypt(encrypted.ciphertext, encrypted.iv, key)

      expect(decrypted).toBe(original)
    })

    it('handles long strings', async () => {
      const salt = generateSalt()
      const key = await deriveKey('test-passphrase', salt)
      const original = 'x'.repeat(10000)

      const encrypted = await encrypt(original, key)
      const decrypted = await decrypt(encrypted.ciphertext, encrypted.iv, key)

      expect(decrypted).toBe(original)
    })

    it('throws on tampered ciphertext', async () => {
      const salt = generateSalt()
      const key = await deriveKey('test-passphrase', salt)
      const encrypted = await encrypt('secret data', key)

      const tamperedCiphertext = new Uint8Array(encrypted.ciphertext)
      tamperedCiphertext[0] = (tamperedCiphertext[0]! + 1) % 256

      await expect(decrypt(tamperedCiphertext.buffer, encrypted.iv, key)).rejects.toThrow()
    })

    it('throws on wrong IV', async () => {
      const salt = generateSalt()
      const key = await deriveKey('test-passphrase', salt)
      const encrypted = await encrypt('secret data', key)
      const wrongIV = generateIV()

      await expect(decrypt(encrypted.ciphertext, wrongIV, key)).rejects.toThrow()
    })
  })

  describe('base64 conversion utilities', () => {
    it('round-trips ArrayBuffer through base64', () => {
      const original = new Uint8Array([0, 127, 255, 1, 254])
      const base64 = arrayBufferToBase64(original.buffer)
      const restored = new Uint8Array(base64ToArrayBuffer(base64))

      expect(Array.from(restored)).toEqual(Array.from(original))
    })

    it('round-trips Uint8Array through base64', () => {
      const original = new Uint8Array([10, 20, 30, 40, 50])
      const base64 = uint8ArrayToBase64(original)
      const restored = base64ToUint8Array(base64)

      expect(Array.from(restored)).toEqual(Array.from(original))
    })

    it('handles empty buffer', () => {
      const empty = new Uint8Array(0)
      const base64 = arrayBufferToBase64(empty.buffer)
      const restored = base64ToArrayBuffer(base64)

      expect(restored.byteLength).toBe(0)
    })
  })
})
