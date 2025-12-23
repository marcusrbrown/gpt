import {db} from '@/lib/database'
import {
  EncryptionError,
  getEncryptionService,
  resetEncryptionServiceForTesting,
  type EncryptionService,
} from '@/services/encryption'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'

describe('EncryptionService', () => {
  let service: EncryptionService

  beforeEach(async () => {
    await db.secrets.clear()
    await db.settings.clear()
    resetEncryptionServiceForTesting()
    service = getEncryptionService()
  })

  afterEach(async () => {
    service.lock()
    await db.secrets.clear()
    await db.settings.clear()
  })

  describe('passphrase management', () => {
    it('initializes with passphrase and becomes unlocked', async () => {
      expect(service.isUnlocked()).toBe(false)

      await service.initializePassphrase('securepass123')

      expect(service.isUnlocked()).toBe(true)
    })

    it('rejects passphrase shorter than 8 characters', async () => {
      await expect(service.initializePassphrase('short')).rejects.toThrow('at least 8 characters')
    })

    it('prevents re-initialization when already initialized', async () => {
      await service.initializePassphrase('securepass123')

      await expect(service.initializePassphrase('anotherpass')).rejects.toThrow('already set')
    })

    it('unlocks with correct passphrase', async () => {
      await service.initializePassphrase('securepass123')
      service.lock()

      const result = await service.unlock('securepass123')

      expect(result).toBe(true)
      expect(service.isUnlocked()).toBe(true)
    })

    it('rejects incorrect passphrase', async () => {
      await service.initializePassphrase('securepass123')
      service.lock()

      const result = await service.unlock('wrongpassword')

      expect(result).toBe(false)
      expect(service.isUnlocked()).toBe(false)
    })

    it('checks if passphrase is set', async () => {
      expect(await service.isPassphraseSet()).toBe(false)

      await service.initializePassphrase('securepass123')

      expect(await service.isPassphraseSet()).toBe(true)
    })
  })

  describe('lock/unlock', () => {
    it('locks the service and clears derived key', async () => {
      await service.initializePassphrase('securepass123')
      expect(service.isUnlocked()).toBe(true)

      service.lock()

      expect(service.isUnlocked()).toBe(false)
    })

    it('prevents operations when locked', async () => {
      await service.initializePassphrase('securepass123')
      await service.encryptSecret('openai', 'sk-test-key')
      service.lock()

      await expect(service.decryptSecret('openai')).rejects.toThrow('locked')
    })

    it('allows operations after unlock', async () => {
      await service.initializePassphrase('securepass123')
      await service.encryptSecret('openai', 'sk-test-key')
      service.lock()

      await service.unlock('securepass123')
      const decrypted = await service.decryptSecret('openai')

      expect(decrypted).toBe('sk-test-key')
    })
  })

  describe('secret encryption/decryption', () => {
    beforeEach(async () => {
      await service.initializePassphrase('securepass123')
    })

    it('encrypts and stores a secret', async () => {
      await service.encryptSecret('openai', 'sk-live-abc123')

      const record = await db.secrets.where('provider').equals('openai').first()
      expect(record).toBeDefined()
      expect(record!.encryptedKey.byteLength).toBeGreaterThan(0)
      expect(record!.iv.length).toBe(12)
    })

    it('decrypts a stored secret', async () => {
      const originalKey = 'sk-live-abc123-secret-key'
      await service.encryptSecret('openai', originalKey)

      const decrypted = await service.decryptSecret('openai')

      expect(decrypted).toBe(originalKey)
    })

    it('returns null for provider without secret', async () => {
      const result = await service.decryptSecret('anthropic')

      expect(result).toBeNull()
    })

    it('handles multiple providers independently', async () => {
      await service.encryptSecret('openai', 'sk-openai-key')
      await service.encryptSecret('anthropic', 'sk-anthropic-key')
      await service.encryptSecret('azure', 'azure-key-123')

      expect(await service.decryptSecret('openai')).toBe('sk-openai-key')
      expect(await service.decryptSecret('anthropic')).toBe('sk-anthropic-key')
      expect(await service.decryptSecret('azure')).toBe('azure-key-123')
    })

    it('overwrites existing secret for same provider', async () => {
      await service.encryptSecret('openai', 'old-key')
      await service.encryptSecret('openai', 'new-key')

      const decrypted = await service.decryptSecret('openai')
      expect(decrypted).toBe('new-key')

      const count = await db.secrets.where('provider').equals('openai').count()
      expect(count).toBe(1)
    })

    it('deletes a secret', async () => {
      await service.encryptSecret('openai', 'sk-test-key')
      expect(await service.decryptSecret('openai')).toBe('sk-test-key')

      await service.deleteSecret('openai')

      expect(await service.decryptSecret('openai')).toBeNull()
    })

    it('lists all provider IDs with secrets', async () => {
      await service.encryptSecret('openai', 'key1')
      await service.encryptSecret('anthropic', 'key2')
      await service.encryptSecret('ollama', 'key3')

      const providers = await service.listProviders()

      expect(providers).toHaveLength(3)
      expect(providers).toContain('openai')
      expect(providers).toContain('anthropic')
      expect(providers).toContain('ollama')
    })
  })

  describe('passphrase change', () => {
    beforeEach(async () => {
      await service.initializePassphrase('oldpassphrase')
    })

    it('re-encrypts all secrets with new passphrase', async () => {
      await service.encryptSecret('openai', 'sk-openai-key')
      await service.encryptSecret('anthropic', 'sk-anthropic-key')

      await service.changePassphrase('oldpassphrase', 'newpassphrase')

      expect(await service.decryptSecret('openai')).toBe('sk-openai-key')
      expect(await service.decryptSecret('anthropic')).toBe('sk-anthropic-key')
    })

    it('allows unlock with new passphrase after change', async () => {
      await service.encryptSecret('openai', 'sk-test-key')
      await service.changePassphrase('oldpassphrase', 'newpassphrase')
      service.lock()

      const unlocked = await service.unlock('newpassphrase')

      expect(unlocked).toBe(true)
      expect(await service.decryptSecret('openai')).toBe('sk-test-key')
    })

    it('rejects unlock with old passphrase after change', async () => {
      await service.changePassphrase('oldpassphrase', 'newpassphrase')
      service.lock()

      const unlocked = await service.unlock('oldpassphrase')

      expect(unlocked).toBe(false)
    })

    it('rejects incorrect old passphrase during change', async () => {
      await expect(service.changePassphrase('wrongpassword', 'newpassphrase')).rejects.toThrow('Incorrect passphrase')
    })

    it('validates new passphrase requirements', async () => {
      await expect(service.changePassphrase('oldpassphrase', 'short')).rejects.toThrow('at least 8 characters')
    })
  })

  describe('resetAll', () => {
    it('clears all secrets and passphrase data', async () => {
      await service.initializePassphrase('securepass123')
      await service.encryptSecret('openai', 'sk-test-key')
      await service.encryptSecret('anthropic', 'sk-another-key')

      await service.resetAll()

      expect(service.isUnlocked()).toBe(false)
      expect(await service.isPassphraseSet()).toBe(false)
      expect(await db.secrets.count()).toBe(0)
    })

    it('allows re-initialization after reset', async () => {
      await service.initializePassphrase('firstpass123')
      await service.resetAll()

      await service.initializePassphrase('secondpass12')

      expect(service.isUnlocked()).toBe(true)
      expect(await service.isPassphraseSet()).toBe(true)
    })
  })

  describe('security properties', () => {
    it('never stores plaintext API key in IndexedDB', async () => {
      await service.initializePassphrase('securepass123')
      const sensitiveKey = 'sk-super-secret-api-key-12345'

      await service.encryptSecret('openai', sensitiveKey)

      const record = await db.secrets.where('provider').equals('openai').first()
      const ciphertextAsString = new TextDecoder().decode(record!.encryptedKey)
      expect(ciphertextAsString).not.toContain(sensitiveKey)
      expect(ciphertextAsString).not.toContain('sk-')
    })

    it('uses unique IV for each encryption', async () => {
      await service.initializePassphrase('securepass123')

      await service.encryptSecret('openai', 'same-key')
      await service.encryptSecret('anthropic', 'same-key')

      const record1 = await db.secrets.where('provider').equals('openai').first()
      const record2 = await db.secrets.where('provider').equals('anthropic').first()

      const iv1 = Array.from(record1!.iv)
      const iv2 = Array.from(record2!.iv)
      expect(iv1).not.toEqual(iv2)
    })

    it('produces different ciphertext for same plaintext', async () => {
      await service.initializePassphrase('securepass123')

      await service.encryptSecret('openai', 'identical-key')
      await service.encryptSecret('anthropic', 'identical-key')

      const record1 = await db.secrets.where('provider').equals('openai').first()
      const record2 = await db.secrets.where('provider').equals('anthropic').first()

      const ct1 = new Uint8Array(record1!.encryptedKey)
      const ct2 = new Uint8Array(record2!.encryptedKey)
      expect(Array.from(ct1)).not.toEqual(Array.from(ct2))
    })
  })

  describe('error handling', () => {
    it('throws EncryptionError with correct code for locked state', async () => {
      await service.initializePassphrase('securepass123')
      service.lock()

      // eslint-disable-next-line @typescript-eslint/naming-convention
      const error = await service.encryptSecret('openai', 'key').catch(error_ => error_ as EncryptionError)

      expect(error).toBeInstanceOf(EncryptionError)
      expect((error as EncryptionError).code).toBe('LOCKED')
    })

    it('returns false for wrong passphrase on unlock', async () => {
      await service.initializePassphrase('securepass123')
      service.lock()

      const result = await service.unlock('wrongpass123')
      expect(result).toBe(false)
    })
  })
})
