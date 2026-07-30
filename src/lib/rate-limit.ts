interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

let lastCleanup = Date.now()
const CLEANUP_INTERVAL = 60_000

function cleanupExpiredEntries() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) {
      store.delete(key)
    }
  }
}

export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanupExpiredEntries()

  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs }
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }
  return 'unknown'
}

export function apiRateLimit(request: Request) {
  const ip = getClientIp(request)
  return rateLimit(`api:${ip}`, 100, 60_000)
}

export function authRateLimit(request: Request) {
  const ip = getClientIp(request)
  return rateLimit(`auth:${ip}`, 10, 60_000)
}
