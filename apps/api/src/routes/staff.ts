import { Hono } from "hono"
import type { Env } from "../hono"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { User } from "../models/user"
import { requireAuth } from "../middleware/requireAuth"
import { requireRole } from "../middleware/requireRole"

const staff = new Hono<Env>()
staff.use("*", requireAuth)

const createSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[0-9]/, "Must contain a number")
    .regex(/[A-Z]/, "Must contain an uppercase letter"),
  jobTitle: z.string().min(1, "Job title is required"),
  role: z.enum(["manager", "cashier"]),
})

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  jobTitle: z.string().min(1).optional(),
  role: z.enum(["manager", "cashier"]).optional(),
})

async function ownerAccount(userId: string) {
  const user = await User.findById(userId).select("accountId locationIds")
  return user
}

staff.get("/", async (c) => {
  const owner = await ownerAccount(c.get("userId"))
  if (!owner?.accountId) return c.json({ error: "No account found" }, 400)

  const members = await User.find({
    accountId: owner.accountId,
    role: { $in: ["manager", "cashier"] },
  })
    .select("-password")
    .sort({ createdAt: 1 })

  return c.json({ staff: members })
})

staff.post("/", requireRole("owner"), async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: "Invalid JSON" }, 400)

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: parsed.error.issues[0].message }, 400)

  const owner = await ownerAccount(c.get("userId"))
  if (!owner?.accountId) return c.json({ error: "No account found" }, 400)

  const existing = await User.findOne({ email: parsed.data.email.toLowerCase() })
  if (existing) return c.json({ error: "Email already in use" }, 400)

  const hashed = await bcrypt.hash(parsed.data.password, 10)
  const member = await User.create({
    name: parsed.data.name,
    email: parsed.data.email,
    password: hashed,
    role: parsed.data.role,
    jobTitle: parsed.data.jobTitle,
    accountId: owner.accountId,
    locationIds: owner.locationIds,
  })

  return c.json(
    { member: { id: member._id, name: member.name, email: member.email, role: member.role, jobTitle: member.jobTitle } },
    201
  )
})

staff.patch("/:id", requireRole("owner"), async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: "Invalid JSON" }, 400)

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: parsed.error.issues[0].message }, 400)

  const owner = await ownerAccount(c.get("userId"))
  if (!owner?.accountId) return c.json({ error: "No account found" }, 400)

  const member = await User.findOneAndUpdate(
    { _id: c.req.param("id"), accountId: owner.accountId, role: { $in: ["manager", "cashier"] } },
    parsed.data,
    { new: true }
  ).select("-password")

  if (!member) return c.json({ error: "Staff member not found" }, 404)
  return c.json({ member })
})

staff.delete("/:id", requireRole("owner"), async (c) => {
  const owner = await ownerAccount(c.get("userId"))
  if (!owner?.accountId) return c.json({ error: "No account found" }, 400)

  const result = await User.findOneAndDelete({
    _id: c.req.param("id"),
    accountId: owner.accountId,
    role: { $in: ["manager", "cashier"] },
  })
  if (!result) return c.json({ error: "Staff member not found" }, 404)
  return c.json({ ok: true })
})

export default staff
