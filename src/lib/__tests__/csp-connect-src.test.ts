import {describe, expect, it} from 'vitest'

import {parseConnectSrcExtra} from '../csp-connect-src'

describe('parseConnectSrcExtra', () => {
  it('returns an empty list when unset, empty, or blank', () => {
    expect(parseConnectSrcExtra(undefined)).toEqual([])
    expect(parseConnectSrcExtra('')).toEqual([])
    expect(parseConnectSrcExtra('  , \n ')).toEqual([])
  })

  it('accepts whitespace- and comma-separated origins', () => {
    expect(parseConnectSrcExtra('https://proxy.example.com http://localhost:8317')).toEqual([
      'https://proxy.example.com',
      'http://localhost:8317',
    ])
    expect(parseConnectSrcExtra('https://a.example.com,https://b.example.com, http://127.0.0.1:9000')).toEqual([
      'https://a.example.com',
      'https://b.example.com',
      'http://127.0.0.1:9000',
    ])
  })

  it('normalises case, default ports, and a trailing slash', () => {
    expect(parseConnectSrcExtra('HTTPS://Proxy.Example.com:443/ http://LocalHost:80')).toEqual([
      'https://proxy.example.com',
      'http://localhost',
    ])
  })

  it('accepts bracketed IPv6 origins', () => {
    expect(parseConnectSrcExtra('http://[::1]:8317')).toEqual(['http://[::1]:8317'])
  })

  it('deduplicates entries that normalise to the same origin', () => {
    expect(
      parseConnectSrcExtra('https://proxy.example.com https://PROXY.example.com/ https://proxy.example.com:443'),
    ).toEqual(['https://proxy.example.com'])
  })

  it.each([
    ['a non-URL', 'not a url'],
    ['a scheme-less host:port', 'localhost:8317'],
    ['a javascript: URL', 'javascript:alert(1)'],
    ['a data: URL', 'data:text/html,hi'],
    ['a ws: URL', 'ws://proxy.example.com'],
    ['a wildcard host', 'https://*.example.com'],
    ['a bare wildcard', '*'],
    ['a path', 'https://proxy.example.com/v1'],
    ['a query', 'https://proxy.example.com?x=1'],
    ['a fragment', 'https://proxy.example.com#x'],
    ['credentials', 'https://user:pass@proxy.example.com'],
    ['a username only', 'https://user@proxy.example.com'],
    ['a directive separator in the host', 'https://a;b.example.com'],
    ['a quote in the host', "https://a'b.example.com"],
  ])('throws on %s', (_label, value) => {
    expect(() => parseConnectSrcExtra(value)).toThrow(/Invalid VITE_CONNECT_SRC_EXTRA entry/)
  })

  it('throws when any one entry in the list is invalid, naming it', () => {
    expect(() => parseConnectSrcExtra('https://ok.example.com https://bad.example.com/path')).toThrow(
      /bad\.example\.com\/path/,
    )
  })
})
