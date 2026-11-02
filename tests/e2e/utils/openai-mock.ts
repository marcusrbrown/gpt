import type {Page, Route} from '@playwright/test'

/**
 * Network mocks for OpenAI in the browser, in the shapes the `openai` SDK parses:
 * `GET /v1/models` (key validation) and `POST /v1/responses` (streamed Responses API events).
 * The frame shapes follow src/services/providers/__tests__/openai-provider.test.ts.
 */

export type ResponsesRequestBody = Record<string, unknown>

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
}

const MODEL_ID = 'gpt-4o'
const MESSAGE_ID = 'msg_e2e'

function sse(type: string, data: Record<string, unknown>, sequence: number): string {
  return `event: ${type}\ndata: ${JSON.stringify({type, sequence_number: sequence, ...data})}\n\n`
}

function responseObject(id: string, overrides: Record<string, unknown> = {}, output: unknown[] = []) {
  return {
    id,
    object: 'response',
    created_at: 0,
    status: 'in_progress',
    model: MODEL_ID,
    output,
    output_text: '',
    error: null,
    incomplete_details: null,
    instructions: null,
    metadata: null,
    parallel_tool_calls: false,
    temperature: null,
    tool_choice: 'auto',
    tools: [],
    top_p: null,
    ...overrides,
  }
}

function messageItem(text: string, status: 'in_progress' | 'completed') {
  return {
    type: 'message',
    id: MESSAGE_ID,
    role: 'assistant',
    status,
    content: status === 'completed' ? [{type: 'output_text', text, annotations: []}] : [],
  }
}

/**
 * SSE frames for one assistant message streamed as the given deltas. With `complete: false` the frames stop after the
 * last delta, as a reply that is still being generated would.
 */
export function responsesStreamFrames(deltas: string[], options: {id?: string; complete?: boolean} = {}): string[] {
  const {id = 'resp_e2e', complete = true} = options
  const text = deltas.join('')
  let sequence = 0
  const next = () => sequence++

  const frames = [
    sse('response.created', {response: responseObject(id)}, next()),
    sse('response.output_item.added', {output_index: 0, item: messageItem('', 'in_progress')}, next()),
    sse(
      'response.content_part.added',
      {item_id: MESSAGE_ID, output_index: 0, content_index: 0, part: {type: 'output_text', text: '', annotations: []}},
      next(),
    ),
    ...deltas.map(delta =>
      sse(
        'response.output_text.delta',
        {item_id: MESSAGE_ID, output_index: 0, content_index: 0, delta, logprobs: []},
        next(),
      ),
    ),
  ]

  if (complete) {
    frames.push(
      sse(
        'response.output_text.done',
        {item_id: MESSAGE_ID, output_index: 0, content_index: 0, text, logprobs: []},
        next(),
      ),
      sse('response.output_item.done', {output_index: 0, item: messageItem(text, 'completed')}, next()),
      sse(
        'response.completed',
        {
          response: responseObject(id, {status: 'completed', output_text: text}, [messageItem(text, 'completed')]),
        },
        next(),
      ),
    )
  }

  return frames
}

async function fulfillPreflight(route: Route): Promise<boolean> {
  if (route.request().method() !== 'OPTIONS') return false
  await route.fulfill({status: 204, headers: CORS_HEADERS})
  return true
}

/** Answers the key-validation call (`GET /v1/models`) so saving an OpenAI key in Settings succeeds. */
export async function mockOpenAIModels(page: Page): Promise<void> {
  await page.route('**/api.openai.com/v1/models', async route => {
    if (await fulfillPreflight(route)) return
    await route.fulfill({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'application/json',
      body: JSON.stringify({object: 'list', data: [{id: MODEL_ID, object: 'model', created: 0, owned_by: 'openai'}]}),
    })
  })
}

/**
 * Answers each `POST /v1/responses` with the next reply in `replies` (the last one repeats), where a reply is the list
 * of text deltas to stream. The returned array fills with every request body the app sends, in order.
 */
export async function mockOpenAIResponses(page: Page, replies: string[][]): Promise<ResponsesRequestBody[]> {
  const requests: ResponsesRequestBody[] = []

  await page.route('**/api.openai.com/v1/responses', async route => {
    if (await fulfillPreflight(route)) return

    const index = requests.length
    requests.push(route.request().postDataJSON() as ResponsesRequestBody)
    const deltas = replies[Math.min(index, replies.length - 1)] ?? []
    await route.fulfill({
      status: 200,
      headers: CORS_HEADERS,
      contentType: 'text/event-stream',
      body: responsesStreamFrames(deltas, {id: `resp_e2e_${index}`}).join(''),
    })
  })

  return requests
}

interface HeldOpenAIWindow {
  __heldOpenAIRequests?: ResponsesRequestBody[]
}

/**
 * Makes `POST /v1/responses` stream the given deltas and then stay open until the app aborts the request.
 * `page.route` can only fulfill a whole body, so a reply that stalls mid-stream needs a fetch stand-in. Call before
 * the first navigation. Read the captured request bodies with `heldOpenAIRequests`.
 */
export async function holdOpenAIResponseStream(page: Page, deltas: string[]): Promise<void> {
  await page.addInitScript(
    ({frames}) => {
      const originalFetch = window.fetch.bind(window)
      const held: ResponsesRequestBody[] = []
      Object.defineProperty(window, '__heldOpenAIRequests', {value: held})

      window.fetch = async (input, init) => {
        const url = input instanceof Request ? input.url : String(input)
        const isResponsesCall = url.includes('api.openai.com/v1/responses') && init?.method?.toUpperCase() === 'POST'
        if (!isResponsesCall) return originalFetch(input, init)

        held.push(JSON.parse(String(init?.body)) as ResponsesRequestBody)
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
          start(controller) {
            for (const frame of frames) controller.enqueue(encoder.encode(frame))
            // Like a real fetch body, a stalled stream errors once the request is aborted.
            init?.signal?.addEventListener(
              'abort',
              () => controller.error(new DOMException('The operation was aborted.', 'AbortError')),
              {once: true},
            )
          },
        })
        return new Response(stream, {status: 200, headers: {'Content-Type': 'text/event-stream'}})
      }
    },
    {frames: responsesStreamFrames(deltas, {complete: false})},
  )
}

/** The request bodies captured by `holdOpenAIResponseStream`. */
export async function heldOpenAIRequests(page: Page): Promise<ResponsesRequestBody[]> {
  return page.evaluate(() => (window as unknown as HeldOpenAIWindow).__heldOpenAIRequests ?? [])
}
