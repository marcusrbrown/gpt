import type {BaseUrlProviderId, ProviderBaseUrls} from '@/types/provider'
import {db} from '@/lib/database'
import {BaseUrlProviderIdSchema, ProviderBaseUrlSchema} from '@/types/provider'

/**
 * Per-provider endpoint overrides live in the plain `settings` table, not in the encrypted `secrets` store: a base URL
 * is not secret, so saving one never needs the passphrase and it is available before the session unlocks.
 */
const SETTINGS_KEY = 'provider_base_urls'

/** A backup restore stores settings as JSON text, so accept either shape. */
function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    try {
      return asRecord(JSON.parse(value))
    } catch {
      return {}
    }
  }
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

/** Reads the stored overrides, dropping any entry that is not a valid base URL. */
export async function loadProviderBaseUrls(): Promise<ProviderBaseUrls> {
  const record = await db.settings.get(SETTINGS_KEY)
  const stored = asRecord(record?.value)
  const baseUrls: ProviderBaseUrls = {}

  for (const id of BaseUrlProviderIdSchema.options) {
    const parsed = ProviderBaseUrlSchema.safeParse(stored[id])
    if (parsed.success) baseUrls[id] = parsed.data
  }

  return baseUrls
}

/**
 * Saves one provider's override, or removes it when `baseUrl` is empty. Throws if the URL is invalid.
 * Returns the full set that is now stored.
 */
export async function saveProviderBaseUrl(
  id: BaseUrlProviderId,
  baseUrl: string | undefined,
): Promise<ProviderBaseUrls> {
  const normalized = baseUrl?.trim() ? ProviderBaseUrlSchema.parse(baseUrl) : undefined
  const baseUrls = await loadProviderBaseUrls()

  if (normalized) {
    baseUrls[id] = normalized
  } else {
    delete baseUrls[id]
  }

  await db.settings.put({key: SETTINGS_KEY, value: baseUrls})
  return baseUrls
}
