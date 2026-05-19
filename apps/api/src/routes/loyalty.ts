import { Hono } from "hono"
import { z } from "zod"
import { LoyaltySettings } from "../models/loyalty-settings"
import { LoyaltyAccount } from "../models/loyalty-account"
import { LoyaltyTransaction } from "../models/loyalty-transaction"
import { requireAuth } from "../middleware/requireAuth"
import { requireLocation } from "../middleware/requireLocation"

const loyalty = new Hono()
loyalty.use("*", requireAuth, requireLocation)

async function getOrCreateSettings(locationId: string) {
  return LoyaltySettings.findOneAndUpdate(
    { locationId },
    { $setOnInsert: { locationId, enabled: true, pointsPerWash: 10, kshPerPoint: 1 } },
    { upsert: true, new: true }
  )
}

// GET /api/loyalty/settings
loyalty.get("/settings", async (c) => {
  const settings = await getOrCreateSettings(c.get("locationId"))
  return c.json({ settings })
})

// PATCH /api/loyalty/settings
loyalty.patch("/settings", async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: "Invalid JSON" }, 400)

  const schema = z.object({
    enabled:       z.boolean().optional(),
    pointsPerWash: z.coerce.number().min(1).optional(),
    kshPerPoint:   z.coerce.number().min(0.01).optional(),
  })
  const parsed = schema.safeParse(body)
  if (!parsed.success) return c.json({ error: parsed.error.issues[0].message }, 400)

  const settings = await LoyaltySettings.findOneAndUpdate(
    { locationId: c.get("locationId") },
    parsed.data,
    { upsert: true, new: true }
  )
  return c.json({ settings })
})

// GET /api/loyalty — list loyalty accounts for location
loyalty.get("/", async (c) => {
  const accounts = await LoyaltyAccount.find({ locationId: c.get("locationId") })
    .populate("customerId", "name vehiclePlates phone")
    .sort({ points: -1 })
  return c.json({ accounts })
})

// GET /api/loyalty/:customerId
loyalty.get("/:customerId", async (c) => {
  const account = await LoyaltyAccount.findOne({
    customerId: c.req.param("customerId"),
    locationId: c.get("locationId"),
  }).populate("customerId", "name vehiclePlates")

  const transactions = await LoyaltyTransaction.find({
    customerId: c.req.param("customerId"),
    locationId: c.get("locationId"),
  }).sort({ createdAt: -1 }).limit(20)

  return c.json({ account, transactions })
})

// POST /api/loyalty/:customerId/redeem
loyalty.post("/:customerId/redeem", async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: "Invalid JSON" }, 400)

  const schema = z.object({ points: z.coerce.number().min(1, "Enter points to redeem"), note: z.string().optional() })
  const parsed = schema.safeParse(body)
  if (!parsed.success) return c.json({ error: parsed.error.issues[0].message }, 400)

  const account = await LoyaltyAccount.findOne({
    customerId: c.req.param("customerId"),
    locationId: c.get("locationId"),
  })
  if (!account) return c.json({ error: "Loyalty account not found" }, 404)
  if (account.points < parsed.data.points) return c.json({ error: "Insufficient points" }, 400)

  const settings = await getOrCreateSettings(c.get("locationId"))
  const kshValue = parsed.data.points * settings.kshPerPoint

  account.points -= parsed.data.points
  account.totalRedeemed += parsed.data.points
  await account.save()

  await LoyaltyTransaction.create({
    loyaltyAccountId: account._id,
    customerId: c.req.param("customerId"),
    locationId: c.get("locationId"),
    type: "redeem",
    points: parsed.data.points,
    note: parsed.data.note ?? `Redeemed ${parsed.data.points} pts (KSh ${kshValue})`,
  })

  return c.json({ account, kshValue })
})

export default loyalty
