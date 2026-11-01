import type {Page} from '@playwright/test'
import type {GPTShowcasePage, GPTTestPage, HomePage, SettingsPage} from './page-objects'
import {expect, test} from './fixtures'
import {heldOpenAIRequests, holdOpenAIResponseStream, mockOpenAIModels, mockOpenAIResponses} from './utils/openai-mock'
import {GPTDataFactory} from './utils/test-data-factory'

const PASSPHRASE = 'e2e-passphrase-123'
const API_KEY = 'sk-e2e-test-key'
const MODEL = 'gpt-4o'

const gpt = GPTDataFactory.createBasicGPT({
  name: 'OpenAI Chat GPT',
  description: 'A GPT for the mocked OpenAI chat round trip',
  systemPrompt: 'You are a terse assistant used by the e2e suite.',
})

/** Puts the GPT in IndexedDB the way the app stores it, with OpenAI as its provider. */
async function seedOpenAIGPT(page: Page): Promise<void> {
  const record = {
    id: gpt.id,
    name: gpt.name,
    description: gpt.description,
    systemPrompt: gpt.systemPrompt,
    modelProvider: 'openai',
    modelName: MODEL,
    tools: [],
    knowledge: {files: [], urls: [], extractionMode: 'manual'},
    capabilities: gpt.capabilities,
    createdAtISO: gpt.createdAt.toISOString(),
    updatedAtISO: gpt.updatedAt.toISOString(),
    version: gpt.version,
    tags: [],
    isArchived: false,
    folderId: null,
    archivedAtISO: null,
  }
  // Loaded from the Vite dev server so it is the app's own Dexie instance
  await page.evaluate(`(async () => {
    const {db} = await import('/src/lib/database.ts')
    await db.gpts.put(${JSON.stringify(record)})
  })()`)
}

/**
 * Configures OpenAI the way a user would, then opens the GPT's chat: saves the key in Settings and creates the
 * passphrase in the modal that appears. Everything after that is client-side navigation, since a reload would lock
 * the session and drop the in-memory key.
 */
async function openOpenAIChat(pages: {
  page: Page
  settingsPage: SettingsPage
  homePage: HomePage
  gptShowcasePage: GPTShowcasePage
  gptTestPage: GPTTestPage
}): Promise<void> {
  const {page, settingsPage, homePage, gptShowcasePage, gptTestPage} = pages

  await mockOpenAIModels(page)
  await settingsPage.navigate()
  await expect(settingsPage.pageTitle).toBeVisible()

  // Reload so the app's GPT list starts from the seeded record, before a key is saved
  await seedOpenAIGPT(page)
  await settingsPage.reload()
  await expect(settingsPage.pageTitle).toBeVisible()

  await settingsPage.saveOpenAIKey(API_KEY)
  await expect(settingsPage.createPassphraseDialog).toBeVisible()
  await settingsPage.createPassphrase(PASSPHRASE)
  await expect(settingsPage.createPassphraseDialog).toBeHidden()
  await expect(settingsPage.openAIConfiguredStatus).toBeVisible()

  await homePage.goHomeFromNavbar()
  await homePage.selectGPT(gpt.name)
  await gptShowcasePage.clickStartChatting()
  await expect(gptTestPage.messageInput).toBeVisible()
  expect(await gptTestPage.getModelIndicator()).toContain(`OpenAI · ${MODEL}`)
}

test.describe('OpenAI chat (mocked Responses API)', () => {
  test('streams a reply and sends instructions, the message and store: false', async ({
    page,
    settingsPage,
    homePage,
    gptShowcasePage,
    gptTestPage,
  }) => {
    const requests = await mockOpenAIResponses(page, [['Hello from ', 'the mock.']])
    await openOpenAIChat({page, settingsPage, homePage, gptShowcasePage, gptTestPage})

    await gptTestPage.sendMessage('Say hello')

    await expect(gptTestPage.assistantMessages.last()).toContainText('Hello from the mock.')
    await expect(gptTestPage.sendButton).toBeVisible()

    expect(requests).toHaveLength(1)
    expect(requests[0]).toMatchObject({
      model: MODEL,
      store: false,
      stream: true,
      instructions: gpt.systemPrompt,
      input: [{role: 'user', content: 'Say hello'}],
    })
  })

  test('sends the full history, including the first reply, on the second turn', async ({
    page,
    settingsPage,
    homePage,
    gptShowcasePage,
    gptTestPage,
  }) => {
    const requests = await mockOpenAIResponses(page, [['First answer.'], ['Second answer.']])
    await openOpenAIChat({page, settingsPage, homePage, gptShowcasePage, gptTestPage})

    await gptTestPage.sendMessage('First question')
    await expect(gptTestPage.assistantMessages.last()).toContainText('First answer.')

    await gptTestPage.sendMessage('Second question')
    await expect(gptTestPage.assistantMessages.last()).toContainText('Second answer.')

    expect(requests).toHaveLength(2)
    expect(requests[1]).toMatchObject({
      store: false,
      instructions: gpt.systemPrompt,
      input: [
        {role: 'user', content: 'First question'},
        {role: 'assistant', content: 'First answer.'},
        {role: 'user', content: 'Second question'},
      ],
    })
  })

  test('regenerate resends up to the last user message and replaces the reply', async ({
    page,
    settingsPage,
    homePage,
    gptShowcasePage,
    gptTestPage,
  }) => {
    const requests = await mockOpenAIResponses(page, [['Original answer.'], ['Regenerated answer.']])
    await openOpenAIChat({page, settingsPage, homePage, gptShowcasePage, gptTestPage})

    await gptTestPage.sendMessage('Answer me')
    await expect(gptTestPage.assistantMessages.last()).toContainText('Original answer.')

    await gptTestPage.regenerateLastReply()

    await expect(gptTestPage.assistantMessages.last()).toContainText('Regenerated answer.')
    await expect(gptTestPage.assistantMessages).toHaveCount(1)
    await expect(page.getByText('Original answer.')).toHaveCount(0)

    expect(requests).toHaveLength(2)
    expect(requests[1]).toMatchObject({store: false, input: [{role: 'user', content: 'Answer me'}]})
    expect((requests[1] as {input: unknown[]}).input).toHaveLength(1)
  })

  test('stopping mid-stream keeps the partial reply tagged Stopped', async ({
    page,
    settingsPage,
    homePage,
    gptShowcasePage,
    gptTestPage,
  }) => {
    await holdOpenAIResponseStream(page, ['Partial reply'])
    await openOpenAIChat({page, settingsPage, homePage, gptShowcasePage, gptTestPage})

    await gptTestPage.sendMessage('Start a long answer')

    // The stream has delivered a delta and is still open, so the stop control replaces send
    await expect(gptTestPage.assistantMessages.last()).toContainText('Partial reply')
    await expect(gptTestPage.stopButton).toBeVisible()
    await expect.poll(async () => (await heldOpenAIRequests(page)).length).toBe(1)

    await gptTestPage.stopButton.click()

    await expect(gptTestPage.stoppedTag).toBeVisible()
    await expect(gptTestPage.assistantMessages.last()).toContainText('Partial reply')
    await expect(gptTestPage.stopButton).toHaveCount(0)
    await expect(gptTestPage.messageInput).toBeEnabled()
  })
})
