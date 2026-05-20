import { Hono } from "hono"
import { z } from "zod"
import { QueueEntry } from "../models/queue-entry"
import { Customer } from "../models/customer"
import { CustomerMembership } from "../models/customer-membership"
import { LoyaltySettings } from "../models/loyalty-settings"
import { LoyaltyAccount } from "../models/loyalty-account"
import { LoyaltyTransaction } from "../models/loyalty-transaction"
import { requireAuth } from "../middleware/requireAuth"
import { requireLocation } from "../middleware/requireLocation"
import { sendSMS } from "../lib/sms"

const queue = new Hono()
queue.use("*", requireAuth, requireLocation)

const checkInSchema = z.object({
  serviceId: z.string().min(1, "Service is required"),
  vehiclePlate: z.string().min(1, "Vehicle plate is required"),
  vehicleDescription: z.string().optional(),
  customerName: z.string().optional(),
  notes: z.string().optional(),
})

const statusSchema = z.object({
  status: z.enum(["waiting", "in_progress", "ready", "completed"]),
  bayNumber: z.number().optional(),
  payment: z.object({
    amount: z.coerce.number().min(0),
    method: z.enum(["cash", "mpesa", "card"]),
    reference: z.string().optional(),
  }).optional(),
})

queue.get("/", async (c) => {
  const entries = await QueueEntry.find({
    locationId: c.get("locationId"),
    status: { $in: ["waiting", "in_progress", "ready"] },
  })
    .populate("serviceId", "name price durationMins")
    .sort({ checkedInAt: 1 })
  return c.json({ queue: entries })
})

queue.get("/stats", async (c) => {
  const locationId = c.get("locationId")
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const [completed, active] = await Promise.all([
    QueueEntry.find({ locationId, status: "completed", completedAt: { $gte: startOfDay } }).populate(
      "serviceId",
      "price"
    ),
    QueueEntry.countDocuments({
      locationId,
      status: { $in: ["waiting", "in_progress", "ready"] },
    }),
  ])

  const revenue = completed.reduce((sum, e) => {
    const svc = e.serviceId as any
    return sum + (svc?.price ?? 0)
  }, 0)

  return c.json({ vehiclesToday: completed.length, revenueToday: revenue, activeQueue: active })
})

function escapePlate(plate: string) {
  return plate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

queue.post("/", async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: "Invalid JSON" }, 400)

  const parsed = checkInSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: parsed.error.issues[0].message }, 400)

  const locationId = c.get("locationId")
  const plate = parsed.data.vehiclePlate.toUpperCase().trim()
  const safePlate = escapePlate(plate)

  // Detect customer by plate and check for active membership
  let membershipActive = false
  const customer = await Customer.findOne({
    locationId,
    vehiclePlates: { $regex: new RegExp(`^${safePlate}$`, "i") },
  })
  if (customer) {
    const activeMembership = await CustomerMembership.findOne({
      customerId: customer._id,
      locationId,
      status: "active",
    })
    membershipActive = !!activeMembership
  }

  const entry = await QueueEntry.create({
    ...parsed.data,
    vehiclePlate: plate,
    locationId,
    membershipActive,
    customerId: customer?._id,
  })
  const populated = await entry.populate("serviceId", "name price durationMins")
  return c.json({ entry: populated }, 201)
})

queue.patch("/:id/status", async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: "Invalid JSON" }, 400)

  const parsed = statusSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: parsed.error.issues[0].message }, 400)

  const update: Record<string, unknown> = { status: parsed.data.status }
  if (parsed.data.bayNumber) update.bayNumber = parsed.data.bayNumber
  if (parsed.data.status === "in_progress") update.startedAt = new Date()
  if (parsed.data.status === "completed") {
    update.completedAt = new Date()
    if (parsed.data.payment) update.payment = parsed.data.payment
  }

  const entry = await QueueEntry.findOneAndUpdate(
    { _id: c.req.param("id"), locationId: c.get("locationId") },
    update,
    { new: true }
  ).populate("serviceId", "name price durationMins")

  if (!entry) return c.json({ error: "Entry not found" }, 404)

  // On completion: award loyalty points + decrement membership pass
  if (parsed.data.status === "completed" && (entry as any).customerId) {
    const loyaltySettings = await LoyaltySettings.findOne({ locationId: c.get("locationId") })
    if (loyaltySettings?.enabled) {
      const account = await LoyaltyAccount.findOneAndUpdate(
        { customerId: (entry as any).customerId, locationId: c.get("locationId") },
        { $inc: { points: loyaltySettings.pointsPerWash, totalEarned: loyaltySettings.pointsPerWash } },
        { upsert: true, new: true }
      )
      await LoyaltyTransaction.create({
        loyaltyAccountId: account._id,
        customerId: (entry as any).customerId,
        locationId: c.get("locationId"),
        type: "earn",
        points: loyaltySettings.pointsPerWash,
        note: `Earned from ${(entry.serviceId as any)?.name ?? "wash"} — ${entry.vehiclePlate}`,
        queueEntryId: entry._id,
      })
    }
  }

  if (parsed.data.status === "completed" && (entry as any).customerId) {
    const membership = await CustomerMembership.findOne({
      customerId: (entry as any).customerId,
      locationId: c.get("locationId"),
      status: "active",
    })
    if (membership && membership.passesTotal != null) {
      membership.passesUsed = (membership.passesUsed ?? 0) + 1
      if (membership.passesUsed >= membership.passesTotal) {
        membership.status = "depleted"
      }
      await membership.save()
    }
  }

  // On ready: send SMS if customer has phone number
  if (parsed.data.status === "ready") {
    const plate = entry.vehiclePlate
    const customer = await Customer.findOne({
      locationId: c.get("locationId"),
      vehiclePlates: { $regex: new RegExp(`^${escapePlate(plate)}$`, "i") },
    }).select("phone name")
    if (customer?.phone) {
      const svc = (entry.serviceId as any)?.name ?? "your vehicle"
      await sendSMS(
        customer.phone,
        `Hi ${customer.name}, ${svc} is complete. Your car (${plate}) is ready for pickup!`
      )
    }
  }

  return c.json({ entry })
})

queue.delete("/:id", async (c) => {
  await QueueEntry.findOneAndDelete({ _id: c.req.param("id"), locationId: c.get("locationId") })
  return c.json({ ok: true })
})

export default queue
