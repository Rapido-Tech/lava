import type { Context, Next } from "hono"

const store = new Map<string, number[]>()

// Purge stale entries when the store gets large to prevent unbounded memory growth
function maybePurge(now: number, windowMs: number) {
  if (store.size < 5000) return
  for (const [ip, ts] of store) {
    if (ts.every((t) => now - t >= windowMs)) store.delete(ip)
  }
}

export function rateLimit(maxRequests: number, windowMs: number) {
  return async (c: Context, next: Next) => {
    const ip = c.req.header("x-forwarded-for")?.split(",")[0].trim() ?? "unknown"
    const now = Date.now()
    const timestamps = (store.get(ip) ?? []).filter((t) => now - t < windowMs)

    if (timestamps.length >= maxRequests) {
      return c.json({ error: "Too many requests, please try again later" }, 429)
    }

    timestamps.push(now)
    store.set(ip, timestamps)
    maybePurge(now, windowMs)
    await next()
  }
}
