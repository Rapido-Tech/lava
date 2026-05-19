import { Hono } from "hono"
import { z } from "zod"
import { Service } from "../models/service"
import { requireAuth } from "../middleware/requireAuth"
import { requireLocation } from "../middleware/requireLocation"

const services = new Hono()
services.use("*", requireAuth, requireLocation)

const serviceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be 0 or more"),
  durationMins: z.number().min(1, "Duration must be at least 1 minute"),
  category: z.string().default("General"),
})

services.get("/", async (c) => {
  const list = await Service.find({ locationId: c.get("locationId"), active: true }).sort({
    category: 1,
    name: 1,
  })
  return c.json({ services: list })
})

services.post("/", async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: "Invalid JSON" }, 400)

  const parsed = serviceSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: parsed.error.issues[0].message }, 400)

  const service = await Service.create({ ...parsed.data, locationId: c.get("locationId") })
  return c.json({ service }, 201)
})

services.patch("/:id", async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: "Invalid JSON" }, 400)

  const parsed = serviceSchema.partial().safeParse(body)
  if (!parsed.success) return c.json({ error: parsed.error.issues[0].message }, 400)

  const service = await Service.findOneAndUpdate(
    { _id: c.req.param("id"), locationId: c.get("locationId") },
    parsed.data,
    { new: true }
  )
  if (!service) return c.json({ error: "Service not found" }, 404)
  return c.json({ service })
})

services.delete("/:id", async (c) => {
  const service = await Service.findOneAndUpdate(
    { _id: c.req.param("id"), locationId: c.get("locationId") },
    { active: false }
  )
  if (!service) return c.json({ error: "Service not found" }, 404)
  return c.json({ ok: true })
})

export default services
