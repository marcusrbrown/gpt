import {describe, expect, it} from 'vitest'
import {routeTransitionKey} from '../route-transition-key'

describe('routeTransitionKey', () => {
  it('is the same for a new chat and the conversation it becomes, so the first save does not remount', () => {
    expect(routeTransitionKey('/gpt/test/gpt-1/c/conv-1')).toBe(routeTransitionKey('/gpt/test/gpt-1'))
  })

  it('still changes when the GPT changes', () => {
    expect(routeTransitionKey('/gpt/test/gpt-1/c/conv-1')).not.toBe(routeTransitionKey('/gpt/test/gpt-2/c/conv-1'))
  })

  it('leaves every other route keyed by its pathname', () => {
    for (const pathname of ['/', '/settings', '/gpt/new', '/gpt/gpt-1', '/gpt/edit/gpt-1', '/docs/getting-started']) {
      expect(routeTransitionKey(pathname)).toBe(pathname)
    }
  })

  it('does not treat a lookalike path outside the chat route as a conversation', () => {
    expect(routeTransitionKey('/gpt/edit/gpt-1/c/conv-1')).toBe('/gpt/edit/gpt-1/c/conv-1')
    expect(routeTransitionKey('/gpt/test/gpt-1/c/conv-1/extra')).toBe('/gpt/test/gpt-1/c/conv-1/extra')
  })
})
