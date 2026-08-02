import type { Context, Next } from "hono"
import { getCookie } from "hono/cookie"
import { verifyToken } from "../lib/jwt"
import type { Env } from "../hono"

export async function requireAuth(c: Context<Env>, next: Next) {
  const token = getCookie(c, "accessToken")
  if (!token) return c.json({ error: "Unauthorized" }, 401)

  const payload = await verifyToken(token).catch(() => null)
  if (!payload) return c.json({ error: "Invalid or expired token" }, 401)

  c.set("userId", payload.userId)
  c.set("role", payload.role)
  await next()
}
