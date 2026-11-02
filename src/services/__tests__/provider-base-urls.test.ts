import {db} from '@/lib/database'
import {loadProviderBaseUrls, saveProviderBaseUrl} from '@/services/provider-base-urls'
import {beforeEach, describe, expect, it} from 'vitest'

const KEY = 'provider_base_urls'

describe('provider base URLs', () => {
  beforeEach(async () => {
    await db.settings.clear()
  })

  it('is empty until one is saved', async () => {
    expect(await loadProviderBaseUrls()).toEqual({})
  })

  it('saves each provider on its own and keeps the other', async () => {
    await saveProviderBaseUrl('openai', 'http://localhost:8317/v1')
    const saved = await saveProviderBaseUrl('anthropic', 'https://gateway.example.com/v1/')

    expect(saved).toEqual({openai: 'http://localhost:8317/v1', anthropic: 'https://gateway.example.com/v1'})
    expect(await loadProviderBaseUrls()).toEqual(saved)
  })

  it('removes a provider when saved empty, leaving the other', async () => {
    await saveProviderBaseUrl('openai', 'http://localhost:8317/v1')
    await saveProviderBaseUrl('anthropic', 'http://localhost:9000/v1')

    expect(await saveProviderBaseUrl('openai', undefined)).toEqual({anthropic: 'http://localhost:9000/v1'})
    expect(await saveProviderBaseUrl('anthropic', '   ')).toEqual({})
  })

  it('rejects an invalid URL without changing what is stored', async () => {
    await saveProviderBaseUrl('openai', 'http://localhost:8317/v1')

    await expect(saveProviderBaseUrl('openai', 'ftp://example.com')).rejects.toThrow()

    expect(await loadProviderBaseUrls()).toEqual({openai: 'http://localhost:8317/v1'})
  })

  it('stores the URL in plain settings, not the encrypted secrets', async () => {
    await saveProviderBaseUrl('openai', 'http://localhost:8317/v1')

    expect((await db.settings.get(KEY))?.value).toEqual({openai: 'http://localhost:8317/v1'})
    expect(await db.secrets.count()).toBe(0)
  })

  it('drops stored entries that are no longer valid URLs', async () => {
    await db.settings.put({key: KEY, value: {openai: 'javascript:alert(1)', anthropic: 'http://localhost:9000/v1/'}})

    expect(await loadProviderBaseUrls()).toEqual({anthropic: 'http://localhost:9000/v1'})
  })

  it.each([null, 'not json', 42, ['http://localhost:8317/v1']])('ignores a malformed stored value %j', async value => {
    await db.settings.put({key: KEY, value})

    expect(await loadProviderBaseUrls()).toEqual({})
  })

  it('reads the JSON text a backup restore leaves behind', async () => {
    await db.settings.put({key: KEY, value: JSON.stringify({openai: 'http://localhost:8317/v1'})})

    expect(await loadProviderBaseUrls()).toEqual({openai: 'http://localhost:8317/v1'})
  })
})
