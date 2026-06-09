// src/lib/anti-spam.ts
// Lightweight bot protection for the public API routes — no external service.
// 1. Honeypot: a hidden "website" field humans never fill in.
// 2. Per-IP rate limit, in-memory. On serverless this is per-instance, so it's
//    a best-effort throttle, not a hard guarantee — enough to stop naive bots
//    from flooding the inbox or the GitHub repo.

const hits = new Map<string, number[]>()

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  return fwd?.split(',')[0]?.trim() || 'unknown'
}

/** True when `ip` already made `max` calls within the last `windowMs`. */
export function isRateLimited(ip: string, max = 5, windowMs = 60 * 60 * 1000): boolean {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs)
  if (recent.length >= max) {
    hits.set(ip, recent)
    return true
  }
  recent.push(now)
  hits.set(ip, recent)
  // Opportunistic cleanup so the map doesn't grow unbounded.
  if (hits.size > 1000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= windowMs)) hits.delete(key)
    }
  }
  return false
}

/** Honeypot check: the payload must leave the decoy field empty. */
export function isHoneypotTriggered(body: unknown): boolean {
  return (
    typeof body === 'object' &&
    body !== null &&
    'website' in body &&
    Boolean((body as Record<string, unknown>).website)
  )
}
