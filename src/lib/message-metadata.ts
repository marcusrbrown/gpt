/**
 * Replay data (encrypted reasoning) only works with the key that created it, so it never travels in export files.
 * Everything else in the metadata, including which provider and model made the reply, is kept.
 */
export function withoutReplay<T extends {replay?: unknown}>(metadata: T | undefined): Omit<T, 'replay'> | undefined {
  if (!metadata) return undefined
  const {replay: discarded, ...rest} = metadata
  return rest
}
