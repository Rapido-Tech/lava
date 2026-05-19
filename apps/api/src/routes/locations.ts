import { Hono } from "hono"
import { z } from "zod"
import { Location } from "../models/location"
import { User } from "../models/user"
import { requireAuth } from "../middleware/requireAuth"
import { requireRole } from "../middleware/requireRole"

const locations = new Hono()
locations.use("*", requireAuth)

const TIMEZONES = [
  "UTC","America/New_York","America/Chicago","America/Denver","America/Los_Angeles",
  "Europe/London","Europe/Paris","Asia/Dubai","Africa/Nairobi","Africa/Lagos",
  "Africa/Johannesburg","Asia/Kolkata","Asia/Singapore","Australia/Sydney",
]

const locationSchema = z.object({
  name:     z.string().min(2, "Name must be at least 2 characters"),
  address:  z.string().min(5, "Please enter a full address"),
  timezone: z.string().refine((v) => TIMEZONES.includes(v), "Invalid timezone"),
})

locations.get("/", async (c) => {
  const user = await User.findById(c.get("userId")).select("locationIds")
  const locs = await Location.find({
    _id: { $in: user?.locationIds ?? [] },
    active: true,
  }).sort({ createdAt: 1 })
  return c.json({ locations: locs })
})

locations.post("/", requireRole("owner"), async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: "Invalid JSON" }, 400)

  const parsed = locationSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: parsed.error.issues[0].message }, 400)

  const user = await User.findById(c.get("userId")).select("accountId")
  if (!user?.accountId) return c.json({ error: "No account found" }, 400)

  const location = await Location.create({ ...parsed.data, accountId: user.accountId })

  // Add location to owner's locationIds
  await User.updateOne({ _id: c.get("userId") }, { $addToSet: { locationIds: location._id } })

  return c.json({ location }, 201)
})

locations.patch("/:id", requireRole("owner"), async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: "Invalid JSON" }, 400)

  const parsed = locationSchema.partial().safeParse(body)
  if (!parsed.success) return c.json({ error: parsed.error.issues[0].message }, 400)

  const user = await User.findById(c.get("userId")).select("locationIds")
  const ids = user?.locationIds?.map((id) => id.toString()) ?? []

  if (!ids.includes(c.req.param("id"))) return c.json({ error: "Location not found" }, 404)

  const location = await Location.findByIdAndUpdate(c.req.param("id"), parsed.data, { new: true })
  return c.json({ location })
})

export default locations
