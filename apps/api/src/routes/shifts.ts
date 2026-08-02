import { Hono } from "hono"
import type { Env } from "../hono"
import { z } from "zod"
import { Shift } from "../models/shift"
import { User } from "../models/user"
import { requireAuth } from "../middleware/requireAuth"
import { requireLocation } from "../middleware/requireLocation"

const shifts = new Hono<Env>()
shifts.use("*", requireAuth, requireLocation)

// GET /api/shifts?date=YYYY-MM-DD — list shifts for a date (defaults to today)
shifts.get("/", async (c) => {
  const dateParam = c.req.query("date")
  const base = dateParam ? new Date(dateParam) : new Date()
  const from = new Date(base)
  from.setHours(0, 0, 0, 0)
  const to = new Date(base)
  to.setHours(23, 59, 59, 999)

  const list = await Shift.find({
    locationId: c.get("locationId"),
    clockIn: { $gte: from, $lte: to },
  })
    .populate("userId", "name jobTitle role")
    .sort({ clockIn: 1 })

  return c.json({ shifts: list })
})

// GET /api/shifts/me — my current open shift (if any)
shifts.get("/me", async (c) => {
  const shift = await Shift.findOne({
    locationId: c.get("locationId"),
    userId: c.get("userId"),
    status: "open",
  })
  return c.json({ shift })
})

// POST /api/shifts/clock-in
shifts.post("/clock-in", async (c) => {
  const existing = await Shift.findOne({
    locationId: c.get("locationId"),
    userId: c.get("userId"),
    status: "open",
  })
  if (existing) return c.json({ error: "You already have an open shift" }, 400)

  const shift = await Shift.create({
    locationId: c.get("locationId"),
    userId: c.get("userId"),
  })
  return c.json({ shift }, 201)
})

// POST /api/shifts/clock-out
shifts.post("/clock-out", async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const notes = z.string().optional().parse(body?.notes)

  const shift = await Shift.findOne({
    locationId: c.get("locationId"),
    userId: c.get("userId"),
    status: "open",
  })
  if (!shift) return c.json({ error: "No open shift found" }, 400)

  const now = new Date()
  shift.clockOut = now
  shift.durationMins = Math.round((now.getTime() - shift.clockIn.getTime()) / 60000)
  shift.status = "closed"
  if (notes) shift.notes = notes
  await shift.save()

  return c.json({ shift })
})

export default shifts
