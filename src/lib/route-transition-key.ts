const CHAT_CONVERSATION_ROUTE = /^(\/gpt\/test\/[^/]+)\/c\/[^/]+$/

/**
 * The key `<Routes>` is remounted by, so a route change replays the page transition animation.
 *
 * A new chat's first save moves `/gpt/test/:gptId` to `/gpt/test/:gptId/c/:conversationId` (a replace navigation). That
 * is the same chat getting its id, not a new page: remounting would drop a draft typed while the save was pending. The
 * conversation segment is left out of the key so that move keeps the page mounted. Every other route keys by pathname.
 */
export function routeTransitionKey(pathname: string): string {
  return pathname.replace(CHAT_CONVERSATION_ROUTE, '$1')
}
