import {
  base64ToUint8Array,
  decrypt,
  deriveKey,
  encrypt,
  generateSalt,
  isWebCryptoAvailable,
  PASSPHRASE_CHECK_VALUE,
  uint8ArrayToBase64,
} from '@/lib/crypto'
import {db, nowISO, type EncryptedSecretDB} from '@/lib/database'
import {z} from 'zod'

export const PassphraseSchema = z.string().min(8, 'Passphrase must be at least 8 characters')

export type ProviderType = 'openai' | 'anthropic' | 'azure' | 'ollama'

const SETTINGS_KEYS = {
  SALT: 'encryption_salt',
  PASSPHRASE_CHECK: 'passphrase_check',
  PASSPHRASE_CHECK_IV: 'passphrase_check_iv',
} as const

export class EncryptionError extends Error {
  constructor(
    message: string,
    readonly code: 'LOCKED' | 'WRONG_PASSPHRASE' | 'CORRUPTED' | 'NO_CRYPTO' | 'NOT_FOUND',
  ) {
    super(message)
    this.name = 'EncryptionError'
  }
}

export interface EncryptionService {
  isUnlocked: () => boolean
  isPassphraseSet: () => Promise<boolean>
  initializePassphrase: (passphrase: string) => Promise<void>
  unlock: (passphrase: string) => Promise<boolean>
  lock: () => void
  changePassphrase: (oldPassphrase: string, newPassphrase: string) => Promise<void>
  encryptSecret: (provider: ProviderType, apiKey: string) => Promise<void>
  decryptSecret: (provider: ProviderType) => Promise<string | null>
  deleteSecret: (provider: ProviderType) => Promise<void>
  hasSecrets: () => Promise<boolean>
  listProviders: () => Promise<ProviderType[]>
  resetAll: () => Promise<void>
}

class EncryptionServiceImpl implements EncryptionService {
  private derivedKey: CryptoKey | null = null

  isUnlocked(): boolean {
    return this.derivedKey !== null
  }

  async isPassphraseSet(): Promise<boolean> {
    const salt = await db.settings.get(SETTINGS_KEYS.SALT)
    return salt !== undefined
  }

  async initializePassphrase(passphrase: string): Promise<void> {
    if (!isWebCryptoAvailable()) {
      throw new EncryptionError('Web Crypto API not available', 'NO_CRYPTO')
    }

    const validation = PassphraseSchema.safeParse(passphrase)
    if (!validation.success) {
      throw new Error(validation.error.issues[0]?.message ?? 'Invalid passphrase')
    }

    const existingSalt = await db.settings.get(SETTINGS_KEYS.SALT)
    if (existingSalt) {
      throw new Error('Passphrase already set. Use changePassphrase() instead.')
    }

    const salt = generateSalt()
    const key = await deriveKey(passphrase, salt)

    const checkEncrypted = await encrypt(PASSPHRASE_CHECK_VALUE, key)

    await db.transaction('rw', db.settings, async () => {
      await db.settings.put({key: SETTINGS_KEYS.SALT, value: uint8ArrayToBase64(salt)})
      await db.settings.put({
        key: SETTINGS_KEYS.PASSPHRASE_CHECK,
        value: Array.from(new Uint8Array(checkEncrypted.ciphertext)),
      })
      await db.settings.put({
        key: SETTINGS_KEYS.PASSPHRASE_CHECK_IV,
        value: uint8ArrayToBase64(checkEncrypted.iv),
      })
    })

    this.derivedKey = key
  }

  async unlock(passphrase: string): Promise<boolean> {
    if (!isWebCryptoAvailable()) {
      throw new EncryptionError('Web Crypto API not available', 'NO_CRYPTO')
    }

    const saltRecord = await db.settings.get(SETTINGS_KEYS.SALT)
    if (!saltRecord) {
      throw new EncryptionError('No passphrase set. Call initializePassphrase() first.', 'NOT_FOUND')
    }

    const salt = base64ToUint8Array(saltRecord.value as string)
    const key = await deriveKey(passphrase, salt)

    const checkRecord = await db.settings.get(SETTINGS_KEYS.PASSPHRASE_CHECK)
    const checkIvRecord = await db.settings.get(SETTINGS_KEYS.PASSPHRASE_CHECK_IV)

    if (!checkRecord || !checkIvRecord) {
      throw new EncryptionError('Passphrase verification data corrupted', 'CORRUPTED')
    }

    const ciphertext = new Uint8Array(checkRecord.value as number[]).buffer
    const iv = base64ToUint8Array(checkIvRecord.value as string)

    try {
      const decrypted = await decrypt(ciphertext, iv, key)
      if (decrypted === PASSPHRASE_CHECK_VALUE) {
        this.derivedKey = key
        return true
      }
      return false
    } catch {
      return false
    }
  }

  lock(): void {
    this.derivedKey = null
  }

  async changePassphrase(oldPassphrase: string, newPassphrase: string): Promise<void> {
    const validation = PassphraseSchema.safeParse(newPassphrase)
    if (!validation.success) {
      throw new Error(validation.error.issues[0]?.message ?? 'Invalid new passphrase')
    }

    const unlocked = await this.unlock(oldPassphrase)
    if (!unlocked) {
      throw new EncryptionError('Incorrect passphrase', 'WRONG_PASSPHRASE')
    }

    const allSecrets = await db.secrets.toArray()
    const decryptedSecrets: {provider: string; apiKey: string}[] = []

    for (const secret of allSecrets) {
      try {
        if (!this.derivedKey) {
          throw new EncryptionError('Session locked during passphrase change', 'LOCKED')
        }
        const iv = new Uint8Array(secret.iv)
        const apiKey = await decrypt(secret.encryptedKey, iv, this.derivedKey)
        decryptedSecrets.push({provider: secret.provider, apiKey})
      } catch (error_) {
        if (error_ instanceof EncryptionError) throw error_
        throw new EncryptionError('Failed to decrypt existing secrets', 'CORRUPTED')
      }
    }

    const newSalt = generateSalt()
    const newKey = await deriveKey(newPassphrase, newSalt)
    const newCheckEncrypted = await encrypt(PASSPHRASE_CHECK_VALUE, newKey)

    const reEncryptedSecrets: {
      provider: string
      encryptedKey: ArrayBuffer
      iv: Uint8Array<ArrayBuffer>
    }[] = []
    for (const {provider, apiKey} of decryptedSecrets) {
      const reEncrypted = await encrypt(apiKey, newKey)
      reEncryptedSecrets.push({
        provider,
        encryptedKey: reEncrypted.ciphertext,
        iv: reEncrypted.iv,
      })
    }

    await db.transaction('rw', [db.settings, db.secrets], async () => {
      await db.settings.put({key: SETTINGS_KEYS.SALT, value: uint8ArrayToBase64(newSalt)})
      await db.settings.put({
        key: SETTINGS_KEYS.PASSPHRASE_CHECK,
        value: Array.from(new Uint8Array(newCheckEncrypted.ciphertext)),
      })
      await db.settings.put({
        key: SETTINGS_KEYS.PASSPHRASE_CHECK_IV,
        value: uint8ArrayToBase64(newCheckEncrypted.iv),
      })

      for (const {provider, encryptedKey, iv} of reEncryptedSecrets) {
        await db.secrets.put({
          id: provider,
          provider,
          encryptedKey,
          iv,
          createdAtISO: nowISO(),
        })
      }
    })

    this.derivedKey = newKey
  }

  async encryptSecret(provider: ProviderType, apiKey: string): Promise<void> {
    if (!this.derivedKey) {
      throw new EncryptionError('Session is locked', 'LOCKED')
    }

    const encrypted = await encrypt(apiKey, this.derivedKey)

    const record: EncryptedSecretDB = {
      id: provider,
      provider,
      encryptedKey: encrypted.ciphertext,
      iv: encrypted.iv,
      createdAtISO: nowISO(),
    }

    await db.secrets.put(record)
  }

  async decryptSecret(provider: ProviderType): Promise<string | null> {
    if (!this.derivedKey) {
      throw new EncryptionError('Session is locked', 'LOCKED')
    }

    const record = await db.secrets.where('provider').equals(provider).first()
    if (!record) {
      return null
    }

    try {
      const iv = new Uint8Array(record.iv)
      return await decrypt(record.encryptedKey, iv, this.derivedKey)
    } catch {
      throw new EncryptionError('Failed to decrypt secret', 'CORRUPTED')
    }
  }

  async deleteSecret(provider: ProviderType): Promise<void> {
    await db.secrets.where('provider').equals(provider).delete()
  }

  async hasSecrets(): Promise<boolean> {
    const count = await db.secrets.count()
    return count > 0
  }

  async listProviders(): Promise<ProviderType[]> {
    const secrets = await db.secrets.toArray()
    return secrets.map(s => s.provider as ProviderType)
  }

  async resetAll(): Promise<void> {
    this.lock()
    await db.transaction('rw', [db.settings, db.secrets], async () => {
      await db.secrets.clear()
      await db.settings.where('key').anyOf(Object.values(SETTINGS_KEYS)).delete()
    })
  }
}

let encryptionServiceInstance: EncryptionService | null = null

export function getEncryptionService(): EncryptionService {
  if (!encryptionServiceInstance) {
    encryptionServiceInstance = new EncryptionServiceImpl()
  }
  return encryptionServiceInstance
}

export function resetEncryptionServiceForTesting(): void {
  encryptionServiceInstance = null
}
