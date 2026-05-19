import { Hono } from "hono"
import { QueueEntry } from "../models/queue-entry"
import { requireAuth } from "../middleware/requireAuth"
import { requireLocation } from "../middleware/requireLocation"

const reports = new Hono()
reports.use("*", requireAuth, requireLocation)

function dateRange(period: string): { from: Date; to: Date } {
  const now = new Date()
  const to = new Date(now)
  to.setHours(23, 59, 59, 999)

  if (period === "week") {
    const from = new Date(now)
    from.setDate(now.getDate() - 6)
    from.setHours(0, 0, 0, 0)
    return { from, to }
  }
  if (period === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
    return { from, to }
  }
  // today (default)
  const from = new Date(now)
  from.setHours(0, 0, 0, 0)
  return { from, to }
}

// GET /api/reports?period=today|week|month
reports.get("/", async (c) => {
  const period = c.req.query("period") ?? "today"
  const { from, to } = dateRange(period)
  const locationId = c.get("locationId")

  const completed = await QueueEntry.find({
    locationId,
    status: "completed",
    completedAt: { $gte: from, $lte: to },
  }).populate("serviceId", "name price")

  const revenue = completed.reduce((sum, e) => {
    const paid = (e as any).payment?.amount
    return sum + (paid != null ? paid : ((e.serviceId as any)?.price ?? 0))
  }, 0)
  const avgPerVehicle = completed.length ? Math.round(revenue / completed.length) : 0

  const byService: Record<string, { name: string; count: number; revenue: number }> = {}
  const byMethod: Record<string, { method: string; count: number; revenue: number }> = {}

  for (const e of completed) {
    const svc = e.serviceId as any
    const pay = (e as any).payment
    const amount = pay?.amount != null ? pay.amount : (svc?.price ?? 0)

    if (svc) {
      const id = svc._id.toString()
      if (!byService[id]) byService[id] = { name: svc.name, count: 0, revenue: 0 }
      byService[id].count++
      byService[id].revenue += amount
    }

    if (pay?.method) {
      if (!byMethod[pay.method]) byMethod[pay.method] = { method: pay.method, count: 0, revenue: 0 }
      byMethod[pay.method].count++
      byMethod[pay.method].revenue += amount
    }
  }

  return c.json({
    period,
    from: from.toISOString(),
    to: to.toISOString(),
    vehicles: completed.length,
    revenue,
    avgPerVehicle,
    byService: Object.values(byService).sort((a, b) => b.revenue - a.revenue),
    byMethod: Object.values(byMethod).sort((a, b) => b.revenue - a.revenue),
  })
})

// GET /api/reports/daily?days=7|14|30
reports.get("/daily", async (c) => {
  const days = Math.min(parseInt(c.req.query("days") ?? "7"), 30)
  const locationId = c.get("locationId")

  const from = new Date()
  from.setDate(from.getDate() - (days - 1))
  from.setHours(0, 0, 0, 0)

  const entries = await QueueEntry.find({
    locationId,
    status: "completed",
    completedAt: { $gte: from },
  })
    .populate("serviceId", "price")
    .select("completedAt serviceId")

  const byDate: Record<string, { date: string; vehicles: number; revenue: number }> = {}
  for (let i = 0; i < days; i++) {
    const d = new Date(from)
    d.setDate(from.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    byDate[key] = { date: key, vehicles: 0, revenue: 0 }
  }

  for (const e of entries) {
    if (!e.completedAt) continue
    const key = e.completedAt.toISOString().slice(0, 10)
    if (byDate[key]) {
      byDate[key].vehicles++
      byDate[key].revenue += (e.serviceId as any)?.price ?? 0
    }
  }

  return c.json({ days: Object.values(byDate) })
})

export default reports
