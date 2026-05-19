import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Pencil, Trash2, AlertTriangle, X, Minus, History } from "lucide-react"
import Layout from "../components/Layout"
import { fetchWithAuth } from "../lib/fetch-with-auth"
import { useToast } from "../context/toast"
import { TableSkeleton } from "../components/Skeleton"
import { capWords, capFirst } from "../lib/text-utils"

interface InventoryItem {
  _id: string
  name: string
  unit: string
  category?: string
  currentStock: number
  lowStockThreshold: number
}

interface InventoryLog {
  _id: string
  type: "restock" | "use"
  quantity: number
  note?: string
  createdAt: string
  userId?: { name: string }
}

const itemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  unit: z.string().min(1, "Unit is required"),
  category: z.string().optional(),
  currentStock: z.coerce.number().min(0),
  lowStockThreshold: z.coerce.number().min(0),
})
type ItemForm = z.infer<typeof itemSchema>

const logSchema = z.object({
  type: z.enum(["restock", "use"]),
  quantity: z.coerce.number().min(0.01, "Enter a quantity"),
  note: z.string().optional(),
})
type LogForm = z.infer<typeof logSchema>

export default function Inventory() {
  const { add: toast } = useToast()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [logging, setLogging] = useState<InventoryItem | null>(null)
  const [logs, setLogs] = useState<InventoryLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [showLogs, setShowLogs] = useState<InventoryItem | null>(null)

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<ItemForm>({
    resolver: zodResolver(itemSchema),
    defaultValues: { currentStock: 0, lowStockThreshold: 0 },
  })

  const logForm = useForm<LogForm>({
    resolver: zodResolver(logSchema),
    defaultValues: { type: "use", quantity: 1 },
  })

  async function load() {
    setLoading(true)
    const res = await fetchWithAuth("/api/inventory")
    const data = await res.json()
    setItems(data.items ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openAdd() {
    reset({ name: "", unit: "", category: "", currentStock: 0, lowStockThreshold: 0 })
    setEditing(null)
    setShowForm(true)
  }

  function openEdit(item: InventoryItem) {
    reset({ name: item.name, unit: item.unit, category: item.category ?? "", currentStock: item.currentStock, lowStockThreshold: item.lowStockThreshold })
    setEditing(item)
    setShowForm(true)
  }

  async function onSubmit(values: ItemForm) {
    const url = editing ? `/api/inventory/${editing._id}` : "/api/inventory"
    const method = editing ? "PATCH" : "POST"
    const res = await fetchWithAuth(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })
    const data = await res.json()
    if (!res.ok) { toast("error", data.error ?? "Failed to save"); return }
    toast("success", editing ? "Item updated" : "Item added")
    setShowForm(false)
    load()
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this item?")) return
    await fetchWithAuth(`/api/inventory/${id}`, { method: "DELETE" })
    toast("success", "Item removed")
    load()
  }

  async function openLog(item: InventoryItem) {
    logForm.reset({ type: "use", quantity: 1, note: "" })
    setLogging(item)
  }

  async function submitLog(values: LogForm) {
    if (!logging) return
    const res = await fetchWithAuth(`/api/inventory/${logging._id}/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })
    const data = await res.json()
    if (!res.ok) { toast("error", data.error ?? "Failed to log"); return }
    toast("success", `Stock ${values.type === "restock" ? "added" : "used"}: ${values.quantity} ${logging.unit}`)
    setLogging(null)
    load()
  }

  async function openHistory(item: InventoryItem) {
    setShowLogs(item)
    setLogsLoading(true)
    const res = await fetchWithAuth(`/api/inventory/${item._id}/logs`)
    const data = await res.json()
    setLogs(data.logs ?? [])
    setLogsLoading(false)
  }

  const lowStock = items.filter((i) => i.currentStock <= i.lowStockThreshold)

  const grouped = items.reduce<Record<string, InventoryItem[]>>((acc, item) => {
    const key = item.category || "Uncategorised"
    ;(acc[key] ??= []).push(item)
    return acc
  }, {})

  const canSubmit = (() => !isSubmitting)()

  return (
    <Layout>
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Inventory</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Track supplies and stock levels</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Item
        </button>
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold">Low stock: </span>
            {lowStock.map((i) => `${i.name} (${i.currentStock} ${i.unit})`).join(", ")}
          </div>
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={6} />
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-zinc-400 dark:text-zinc-500 text-sm">
          No inventory items yet. Add your first item.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, catItems]) => (
            <div key={category}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-2 px-1">{category}</h2>
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60">
                      <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Item</th>
                      <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Stock</th>
                      <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Threshold</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {catItems.map((item) => {
                      const isLow = item.currentStock <= item.lowStockThreshold
                      return (
                        <tr key={item._id} className="border-b last:border-0 border-zinc-100 dark:border-zinc-700 bg-white dark:bg-zinc-800">
                          <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-100">{item.name}</td>
                          <td className="px-4 py-3">
                            <span className={`font-semibold ${isLow ? "text-red-500" : "text-zinc-700 dark:text-zinc-200"}`}>
                              {item.currentStock}
                            </span>
                            <span className="text-zinc-400 dark:text-zinc-500 text-xs ml-1">{item.unit}</span>
                          </td>
                          <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{item.lowStockThreshold} {item.unit}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openLog(item)}
                                title="Log usage or restock"
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => openHistory(item)}
                                title="History"
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                              >
                                <History className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => openEdit(item)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => deleteItem(item._id)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-zinc-800 dark:text-zinc-100">{editing ? "Edit Item" : "Add Item"}</h2>
              <button onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <div>
                <input
                  {...register("name")}
                  onChange={(e) => setValue("name", capWords(e.target.value))}
                  placeholder="Item name"
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white placeholder:text-zinc-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input {...register("unit")} placeholder="Unit (e.g. litres)" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white placeholder:text-zinc-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  {errors.unit && <p className="text-xs text-red-500 mt-1">{errors.unit.message}</p>}
                </div>
                <div>
                  <input
                    {...register("category")}
                    onChange={(e) => setValue("category", capWords(e.target.value))}
                    placeholder="Category (optional)"
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white placeholder:text-zinc-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 block">Current Stock</label>
                  <input type="number" step="0.01" {...register("currentStock")} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 block">Low Stock Alert</label>
                  <input type="number" step="0.01" {...register("lowStockThreshold")} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">Cancel</button>
                <button type="submit" disabled={!canSubmit} className="rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-4 py-2 text-sm font-medium transition-colors">
                  {isSubmitting ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log modal */}
      {logging && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-zinc-800 dark:text-zinc-100">Log Stock — {logging.name}</h2>
              <button onClick={() => setLogging(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={logForm.handleSubmit(submitLog)} className="space-y-3">
              <div className="flex gap-2">
                {(["use", "restock"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => logForm.setValue("type", t)}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium transition-colors ${
                      logForm.watch("type") === t
                        ? t === "use"
                          ? "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                          : "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                        : "border-zinc-200 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
                    {t === "use" ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    {t === "use" ? "Use" : "Restock"}
                  </button>
                ))}
              </div>
              <div>
                <label className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 block">Quantity ({logging.unit})</label>
                <input type="number" step="0.01" {...logForm.register("quantity")} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                {logForm.formState.errors.quantity && <p className="text-xs text-red-500 mt-1">{logForm.formState.errors.quantity.message}</p>}
              </div>
              <div>
                <input
                  {...logForm.register("note")}
                  onChange={(e) => logForm.setValue("note", capFirst(e.target.value))}
                  placeholder="Note (optional)"
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white placeholder:text-zinc-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setLogging(null)} className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">Cancel</button>
                <button type="submit" disabled={logForm.formState.isSubmitting} className="rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-4 py-2 text-sm font-medium transition-colors">
                  {logForm.formState.isSubmitting ? "Saving…" : "Log"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History modal */}
      {showLogs && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-zinc-800 dark:text-zinc-100">History — {showLogs.name}</h2>
              <button onClick={() => setShowLogs(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 space-y-2 text-sm">
              {logsLoading ? (
                <TableSkeleton rows={4} />
              ) : logs.length === 0 ? (
                <p className="text-zinc-400 dark:text-zinc-500 text-center py-6">No logs yet.</p>
              ) : (
                logs.map((l) => (
                  <div key={l._id} className="flex items-center gap-3 py-2 border-b border-zinc-100 dark:border-zinc-700 last:border-0">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${l.type === "restock" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"}`}>
                      {l.type === "restock" ? `+${l.quantity}` : `-${l.quantity}`} {showLogs.unit}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-700 dark:text-zinc-300 truncate">{l.note || (l.type === "restock" ? "Restocked" : "Used")}</p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500">{l.userId?.name} · {new Date(l.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </Layout>
  )
}
