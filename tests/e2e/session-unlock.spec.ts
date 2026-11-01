import type {Page} from '@playwright/test'
import {expect, test} from './fixtures'

const PASSPHRASE = 'correct horse battery staple'
const OPENAI_KEY = 'sk-test-session-unlock'

/**
 * Stubs the OpenAI models endpoint used to validate a key. Answers the CORS preflight too, since the
 * app calls api.openai.com directly from the browser.
 */
async function mockOpenAIModels(page: Page, options: {validKey: string}) {
  await page.route('**/api.openai.com/v1/models', async route => {
    const request = route.request()
    const cors = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': request.headers()['access-control-request-headers'] ?? '*',
    }

    if (request.method() === 'OPTIONS') {
      await route.fulfill({status: 204, headers: cors})
      return
    }

    if (request.headers().authorization !== `Bearer ${options.validKey}`) {
      await route.fulfill({
        status: 401,
        headers: cors,
        contentType: 'application/json',
        body: JSON.stringify({error: {message: 'Incorrect API key provided', type: 'invalid_request_error'}}),
      })
      return
    }

    await route.fulfill({
      status: 200,
      headers: cors,
      contentType: 'application/json',
      body: JSON.stringify({object: 'list', data: [{id: 'gpt-4o', object: 'model', created: 0, owned_by: 'openai'}]}),
    })
  })
}

test.describe('Session unlock', () => {
  test.beforeEach(async ({page, settingsPage}) => {
    await mockOpenAIModels(page, {validKey: OPENAI_KEY})
    await settingsPage.navigate()
  })

  test('does not ask for a passphrase before a key is saved', async ({settingsPage}) => {
    await expect(settingsPage.openAIKeyInput).toBeVisible()
    await expect(settingsPage.unlockPrompt).toBeHidden()
    await expect(settingsPage.createPassphraseDialog).toBeHidden()
  })

  test('creates a passphrase on first save, then unlocks the stored key after a reload', async ({settingsPage}) => {
    await test.step('save a key and create the passphrase', async () => {
      await settingsPage.saveOpenAIKey(OPENAI_KEY)
      await expect(settingsPage.createPassphraseDialog).toBeVisible()

      await settingsPage.createPassphrase(PASSPHRASE)
      await expect(settingsPage.createPassphraseDialog).toBeHidden()
      await expect(settingsPage.openAIConfiguredStatus).toBeVisible()
    })

    await test.step('reload and find the session locked', async () => {
      await settingsPage.reload()

      await expect(settingsPage.unlockPrompt).toBeVisible()
      await expect(settingsPage.openAIConfiguredStatus).toBeHidden()
    })

    await test.step('unlock and find the key configured again', async () => {
      await settingsPage.openUnlockDialog()
      await expect(settingsPage.unlockDialog).toBeVisible()

      await settingsPage.unlockWith(PASSPHRASE)
      await expect(settingsPage.unlockDialog).toBeHidden()
      await expect(settingsPage.unlockPrompt).toBeHidden()
      await expect(settingsPage.openAIConfiguredStatus).toBeVisible()
    })
  })

  test('shows an inline error for a wrong passphrase and accepts the right one afterwards', async ({settingsPage}) => {
    await settingsPage.saveOpenAIKey(OPENAI_KEY)
    await settingsPage.createPassphrase(PASSPHRASE)
    await expect(settingsPage.openAIConfiguredStatus).toBeVisible()
    await settingsPage.reload()

    await settingsPage.openUnlockDialog()
    await settingsPage.unlockWith('not the passphrase')

    await expect(settingsPage.unlockDialog.getByRole('alert')).toHaveText('Incorrect passphrase')
    await expect(settingsPage.unlockPrompt).toBeVisible()
    await expect(settingsPage.openAIConfiguredStatus).toBeHidden()

    await settingsPage.unlockWith(PASSPHRASE)
    await expect(settingsPage.unlockDialog).toBeHidden()
    await expect(settingsPage.openAIConfiguredStatus).toBeVisible()
  })

  test('does not set a passphrase when the confirmation differs', async ({settingsPage}) => {
    await settingsPage.saveOpenAIKey(OPENAI_KEY)
    await expect(settingsPage.createPassphraseDialog).toBeVisible()

    await settingsPage.fillNewPassphrase(PASSPHRASE, `${PASSPHRASE} typo`)

    await expect(settingsPage.createPassphraseDialog.getByText('Passphrases do not match')).toBeVisible()
    await expect(settingsPage.createPassphraseDialog.getByRole('button', {name: 'Set Passphrase'})).toBeDisabled()
    await expect(settingsPage.openAIConfiguredStatus).toBeHidden()
  })

  test('asks for the passphrase when saving a key while locked, then saves it', async ({settingsPage}) => {
    await settingsPage.saveOpenAIKey(OPENAI_KEY)
    await settingsPage.createPassphrase(PASSPHRASE)
    await expect(settingsPage.openAIConfiguredStatus).toBeVisible()
    await settingsPage.reload()
    await expect(settingsPage.unlockPrompt).toBeVisible()

    await settingsPage.saveOpenAIKey(OPENAI_KEY)
    await expect(settingsPage.unlockDialog).toBeVisible()

    await settingsPage.unlockWith(PASSPHRASE)
    await expect(settingsPage.unlockDialog).toBeHidden()
    await expect(settingsPage.unlockPrompt).toBeHidden()
    await expect(settingsPage.openAIConfiguredStatus).toBeVisible()
  })
})
