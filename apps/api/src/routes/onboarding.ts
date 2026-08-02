import { Hono } from "hono"
import type { Env } from "../hono"
import { z } from "zod"
import { Account } from "../models/account"
import { Location } from "../models/location"
import { User } from "../models/user"
import { requireAuth } from "../middleware/requireAuth"

const onboarding = new Hono<Env>()

const schema = z.object({
  businessName: z.string().min(2, "Business name must be at least 2 characters"),
  locationName: z.string().min(2, "Location name must be at least 2 characters"),
  address: z.string().min(5, "Please enter a full address"),
  timezone: z.string().min(1, "Timezone is required"),
})

onboarding.post("/", requireAuth, async (c) => {
  const userId = c.get("userId")

  const user = await User.findById(userId)
  if (!user) return c.json({ error: "User not found" }, 404)
  if (user.accountId) return c.json({ error: "Already onboarded" }, 400)

  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: "Invalid JSON" }, 400)

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0].message }, 400)
  }

  const { businessName, locationName, address, timezone } = parsed.data

  const account = await Account.create({ name: businessName })
  const location = await Location.create({
    accountId: account._id,
    name: locationName,
    address,
    timezone,
  })

  user.accountId = account._id
  user.locationIds = [location._id as any]
  await user.save()

  return c.json({
    account: { id: account._id, name: account.name },
    location: { id: location._id, name: location.name },
  })
})

export default onboarding
