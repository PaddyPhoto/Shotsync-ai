/**
 * Simple in-memory sliding window rate limiter.
 * Works per serverless instance — sufficient for early access.
 * Upgrade to Upstash Redis for multi-instance production scale.
 */

const store = new Map<string, number[]>()

export function rateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const windowStart = now - windowMs
  const timestamps = (store.get(key) ?? []).filter((t) => t > windowStart)
  if (timestamps.length >= maxRequests) return false
  timestamps.push(now)
  store.set(key, timestamps)
  return true
}

export function getClientIp(req: Request): string {
  const forwarded = (req.headers as Headers).get('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() ?? 'unknown'
}

export function rateLimitResponse() {
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please slow down and try again shortly.' }),
    { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } }
  )
}
