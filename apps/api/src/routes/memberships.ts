import { Hono } from "hono"
import { z } from "zod"
import { MembershipPlan } from "../models/membership-plan"
import { CustomerMembership } from "../models/customer-membership"
import { Customer } from "../models/customer"
import { requireAuth } from "../middleware/requireAuth"
import { requireLocation } from "../middleware/requireLocation"

const memberships = new Hono()
memberships.use("*", requireAuth, requireLocation)

// ── Plans ──────────────────────────────────────────────────────────────────

const planSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  type: z.enum(["monthly", "passes"]),
  passCount: z.coerce.number().min(1).optional(),
  price: z.coerce.number().min(0, "Price must be 0 or more"),
}).refine((d) => d.type !== "passes" || (d.passCount && d.passCount > 0), {
  message: "Pass count is required for pass plans",
  path: ["passCount"],
})

memberships.get("/plans", async (c) => {
  const plans = await MembershipPlan.find({
    locationId: c.get("locationId"),
    active: true,
  }).sort({ createdAt: 1 })
  return c.json({ plans })
})

memberships.post("/plans", async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: "Invalid JSON" }, 400)

  const parsed = planSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: parsed.error.issues[0].message }, 400)

  const plan = await MembershipPlan.create({ ...parsed.data, locationId: c.get("locationId") })
  return c.json({ plan }, 201)
})

memberships.patch("/plans/:id", async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: "Invalid JSON" }, 400)

  const parsed = planSchema.partial().safeParse(body)
  if (!parsed.success) return c.json({ error: parsed.error.issues[0].message }, 400)

  const plan = await MembershipPlan.findOneAndUpdate(
    { _id: c.req.param("id"), locationId: c.get("locationId") },
    parsed.data,
    { new: true }
  )
  if (!plan) return c.json({ error: "Plan not found" }, 404)
  return c.json({ plan })
})

memberships.delete("/plans/:id", async (c) => {
  await MembershipPlan.findOneAndUpdate(
    { _id: c.req.param("id"), locationId: c.get("locationId") },
    { active: false }
  )
  return c.json({ ok: true })
})

// ── Customer memberships ───────────────────────────────────────────────────

const assignSchema = z.object({
  customerId: z.string().min(1),
  planId: z.string().min(1),
})

memberships.get("/", async (c) => {
  const locationId = c.get("locationId")

  // Auto-expire monthly memberships past endDate
  await CustomerMembership.updateMany(
    { locationId, status: "active", endDate: { $lt: new Date() } },
    { status: "expired" }
  )

  const active = await CustomerMembership.find({ locationId, status: "active" })
    .populate("customerId", "name vehiclePlates phone")
    .populate("planId", "name type passCount price")
    .sort({ createdAt: -1 })

  return c.json({ memberships: active })
})

memberships.post("/", async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: "Invalid JSON" }, 400)

  const parsed = assignSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: parsed.error.issues[0].message }, 400)

  const locationId = c.get("locationId")

  const [customer, plan] = await Promise.all([
    Customer.findOne({ _id: parsed.data.customerId, locationId }),
    MembershipPlan.findOne({ _id: parsed.data.planId, locationId, active: true }),
  ])
  if (!customer) return c.json({ error: "Customer not found" }, 404)
  if (!plan) return c.json({ error: "Plan not found" }, 404)

  // Expire any existing active membership for this customer
  await CustomerMembership.updateMany(
    { customerId: customer._id, locationId, status: "active" },
    { status: "expired" }
  )

  const now = new Date()
  const endDate = plan.type === "monthly"
    ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    : undefined

  const membership = await CustomerMembership.create({
    customerId: customer._id,
    planId: plan._id,
    locationId,
    startDate: now,
    endDate,
    passesTotal: plan.passCount,
    passesUsed: 0,
    status: "active",
  })

  const populated = await membership.populate([
    { path: "customerId", select: "name vehiclePlates phone" },
    { path: "planId", select: "name type passCount price" },
  ])

  return c.json({ membership: populated }, 201)
})

memberships.delete("/:id", async (c) => {
  await CustomerMembership.findOneAndUpdate(
    { _id: c.req.param("id"), locationId: c.get("locationId") },
    { status: "expired" }
  )
  return c.json({ ok: true })
})

export default memberships
