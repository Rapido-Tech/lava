import { Hono } from "hono"
import type { Env } from "../hono"
import { z } from "zod"
import { InventoryItem } from "../models/inventory-item"
import { InventoryLog } from "../models/inventory-log"
import { requireAuth } from "../middleware/requireAuth"
import { requireLocation } from "../middleware/requireLocation"

const inventory = new Hono<Env>()
inventory.use("*", requireAuth, requireLocation)

const itemSchema = z.object({
  name:              z.string().min(1, "Name is required"),
  unit:              z.string().min(1, "Unit is required"),
  category:          z.string().optional(),
  currentStock:      z.coerce.number().min(0),
  lowStockThreshold: z.coerce.number().min(0),
})

const logSchema = z.object({
  type:     z.enum(["restock", "use"]),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
  note:     z.string().optional(),
})

inventory.get("/", async (c) => {
  const items = await InventoryItem.find({ locationId: c.get("locationId"), active: true })
    .sort({ category: 1, name: 1 })
  return c.json({ items })
})

inventory.post("/", async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: "Invalid JSON" }, 400)

  const parsed = itemSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: parsed.error.issues[0].message }, 400)

  const item = await InventoryItem.create({ ...parsed.data, locationId: c.get("locationId") })
  return c.json({ item }, 201)
})

inventory.patch("/:id", async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: "Invalid JSON" }, 400)

  const parsed = itemSchema.partial().safeParse(body)
  if (!parsed.success) return c.json({ error: parsed.error.issues[0].message }, 400)

  const item = await InventoryItem.findOneAndUpdate(
    { _id: c.req.param("id"), locationId: c.get("locationId") },
    parsed.data,
    { new: true }
  )
  if (!item) return c.json({ error: "Item not found" }, 404)
  return c.json({ item })
})

inventory.delete("/:id", async (c) => {
  await InventoryItem.findOneAndUpdate(
    { _id: c.req.param("id"), locationId: c.get("locationId") },
    { active: false }
  )
  return c.json({ ok: true })
})

// POST /api/inventory/:id/log — log a use or restock
inventory.post("/:id/log", async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: "Invalid JSON" }, 400)

  const parsed = logSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: parsed.error.issues[0].message }, 400)

  const item = await InventoryItem.findOne({ _id: c.req.param("id"), locationId: c.get("locationId") })
  if (!item) return c.json({ error: "Item not found" }, 404)

  const delta = parsed.data.type === "restock" ? parsed.data.quantity : -parsed.data.quantity
  item.currentStock = Math.max(0, item.currentStock + delta)
  await item.save()

  await InventoryLog.create({
    locationId: c.get("locationId"),
    itemId: item._id,
    userId: c.get("userId"),
    ...parsed.data,
  })

  return c.json({ item })
})

// GET /api/inventory/:id/logs
inventory.get("/:id/logs", async (c) => {
  const logs = await InventoryLog.find({ itemId: c.req.param("id"), locationId: c.get("locationId") })
    .populate("userId", "name")
    .sort({ createdAt: -1 })
    .limit(50)
  return c.json({ logs })
})

export default inventory
