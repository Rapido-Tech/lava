import { Hono } from "hono"
import { z } from "zod"
import { Customer } from "../models/customer"
import { User } from "../models/user"
import { requireAuth } from "../middleware/requireAuth"
import { requireLocation } from "../middleware/requireLocation"

const customers = new Hono()
customers.use("*", requireAuth, requireLocation)

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  vehiclePlates: z.array(z.string().min(1)).optional().default([]),
  notes: z.string().optional(),
})

customers.get("/", async (c) => {
  const q = c.req.query("q")
  const filter: Record<string, unknown> = { locationId: c.get("locationId") }
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { vehiclePlates: { $regex: q, $options: "i" } },
      { phone: { $regex: q, $options: "i" } },
    ]
  }
  const list = await Customer.find(filter).sort({ name: 1 })
  return c.json({ customers: list })
})

customers.post("/", async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: "Invalid JSON" }, 400)

  const parsed = customerSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: parsed.error.issues[0].message }, 400)

  const user = await User.findById(c.get("userId")).select("accountId")
  const customer = await Customer.create({
    ...parsed.data,
    locationId: c.get("locationId"),
    accountId: user?.accountId,
  })
  return c.json({ customer }, 201)
})

customers.patch("/:id", async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: "Invalid JSON" }, 400)

  const parsed = customerSchema.partial().safeParse(body)
  if (!parsed.success) return c.json({ error: parsed.error.issues[0].message }, 400)

  const customer = await Customer.findOneAndUpdate(
    { _id: c.req.param("id"), locationId: c.get("locationId") },
    parsed.data,
    { new: true }
  )
  if (!customer) return c.json({ error: "Customer not found" }, 404)
  return c.json({ customer })
})

customers.delete("/:id", async (c) => {
  await Customer.findOneAndDelete({ _id: c.req.param("id"), locationId: c.get("locationId") })
  return c.json({ ok: true })
})

export default customers
