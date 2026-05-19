import type { Context, Next } from "hono"
import { User } from "../models/user"

export async function requireLocation(c: Context, next: Next) {
  const user = await User.findById(c.get("userId")).select("locationIds")
  const ids = user?.locationIds?.map((id) => id.toString()) ?? []
  if (!ids.length) return c.json({ error: "No location assigned" }, 400)

  // Honour X-Location-Id header if it belongs to this user's locations
  const requested = c.req.header("X-Location-Id")
  const locationId = requested && ids.includes(requested) ? requested : ids[0]

  c.set("locationId", locationId)
  await next()
}
