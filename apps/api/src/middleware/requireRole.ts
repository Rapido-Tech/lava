import type { Context, Next } from "hono"

export function requireRole(...roles: string[]) {
  return async (c: Context, next: Next) => {
    const role = c.get("role") as string
    if (!roles.includes(role)) {
      return c.json({ error: "Forbidden" }, 403)
    }
    await next()
  }
}
