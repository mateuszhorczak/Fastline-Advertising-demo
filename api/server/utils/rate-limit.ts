import type { H3Event } from 'h3'

interface RateLimiterBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>
}

interface CloudflareContext {
  cloudflare?: { env?: { RATE_LIMITER?: RateLimiterBinding } }
}

const WINDOW_MS = 60_000
const LOCAL_LIMIT = 20
const localCounters = new Map<string, { count: number; resetAt: number }>()

/**
 * Na Cloudflare używa wbudowanego Rate Limiting API (binding RATE_LIMITER z wrangler.jsonc).
 * Lokalnie (nitro dev) bindingu nie ma, więc liczymy w pamięci procesu.
 */
export async function checkRateLimit(event: H3Event, key: string): Promise<boolean> {
  const binding = (event.context as CloudflareContext).cloudflare?.env?.RATE_LIMITER
  if (binding) return (await binding.limit({ key })).success

  const now = Date.now()
  const entry = localCounters.get(key)
  if (!entry || entry.resetAt < now) {
    localCounters.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  entry.count++
  return entry.count <= LOCAL_LIMIT
}
