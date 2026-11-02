/**
 * Build-time parser for `VITE_CONNECT_SRC_EXTRA`, the deployer-supplied list of
 * extra origins appended to the production CSP `connect-src` (for example a
 * self-hosted OpenAI- or Anthropic-compatible gateway).
 *
 * Imported by `vite.config.ts`, so keep it free of browser and React code.
 *
 * Every entry is parsed with `new URL()` and re-emitted as `url.origin`; raw
 * input is never interpolated into the policy. Anything that is not a bare
 * http(s) origin throws, so a bad value fails the build instead of silently
 * weakening or breaking the policy.
 */

/**
 * `url.origin` for special schemes can still carry CSP-significant characters
 * (`;`, `'`, `,`, quotes). Allow only DNS-style hosts, IPv4, and bracketed IPv6.
 */
const SAFE_ORIGIN = /^https?:\/\/(?:\[[\da-f:.]+\]|[\da-z](?:[\da-z.-]*[\da-z])?)(?::\d{1,5})?$/

const SEPARATORS = /[\s,]+/

function invalid(entry: string, reason: string): Error {
  return new Error(
    `Invalid VITE_CONNECT_SRC_EXTRA entry ${JSON.stringify(entry)}: ${reason}. ` +
      'Expected space- or comma-separated origins such as "https://proxy.example.com http://localhost:8317".',
  )
}

function parseOrigin(entry: string): string {
  if (entry.includes('*')) throw invalid(entry, 'wildcards are not allowed')

  let url: URL
  try {
    url = new URL(entry)
  } catch {
    throw invalid(entry, 'not a valid URL')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw invalid(entry, `unsupported scheme "${url.protocol}" (only http: and https: are allowed)`)
  }
  if (url.username !== '' || url.password !== '') throw invalid(entry, 'credentials are not allowed')
  if (url.pathname !== '/' || entry.includes('?') || entry.includes('#') || entry.includes('\\')) {
    throw invalid(entry, 'must be an origin only, without a path, query, or fragment')
  }
  if (!SAFE_ORIGIN.test(url.origin)) throw invalid(entry, 'host contains characters that are not safe in a CSP')

  return url.origin
}

/**
 * Parse a whitespace- or comma-separated origin list. Returns normalised,
 * deduplicated origins in first-seen order; unset or blank input returns `[]`.
 *
 * @throws Error naming the offending entry when any entry is not a bare http(s) origin.
 */
export function parseConnectSrcExtra(raw: string | undefined): string[] {
  if (raw === undefined) return []

  const entries = raw.split(SEPARATORS).filter(entry => entry !== '')
  return [...new Set(entries.map(entry => parseOrigin(entry)))]
}
