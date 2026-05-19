import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, X, Clock, Car, BadgeCheck, Printer } from "lucide-react"
import Layout from "../components/Layout"
import PlateScanner from "../components/PlateScanner"
import { fetchWithAuth } from "../lib/fetch-with-auth"
import { formatKES } from "../lib/format"
import { useLocation } from "../context/location"

interface ServiceRef { _id: string; name: string; price: number; durationMins: number }
interface QueueEntry {
  _id: string
  vehiclePlate: string
  vehicleDescription?: string
  customerName?: string
  serviceId: ServiceRef
  status: "waiting" | "in_progress" | "ready"
  checkedInAt: string
  startedAt?: string
  notes?: string
  membershipActive?: boolean
}

interface Receipt {
  vehiclePlate: string
  customerName?: string
  serviceName: string
  servicePrice: number
  amount: number
  method: string
  reference?: string
  locationName: string
  completedAt: string
}

type PayMethod = "cash" | "mpesa" | "card"

const STATUSES = {
  waiting:     { label: "Waiting",     color: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300" },
  in_progress: { label: "In Progress", color: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400" },
  ready:       { label: "Ready",       color: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400" },
}

const METHOD_LABELS: Record<PayMethod, string> = { cash: "Cash", mpesa: "M-Pesa", card: "Card" }

const checkInSchema = z.object({
  serviceId:          z.string().min(1, "Select a service"),
  vehiclePlate:       z.string().min(1, "Plate is required"),
  vehicleDescription: z.string().optional(),
  customerName:       z.string().optional(),
  notes:              z.string().optional(),
})
type CheckInForm = z.infer<typeof checkInSchema>

function elapsed(entry: QueueEntry) {
  const from = entry.status !== "waiting" && entry.startedAt ? entry.startedAt : entry.checkedInAt
  const mins = Math.floor((Date.now() - new Date(from).getTime()) / 60000)
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function printReceipt(r: Receipt) {
  const win = window.open("", "_blank", "width=360,height=500")
  if (!win) return
  win.document.write(`<!DOCTYPE html><html><head><title>Receipt</title>
  <style>
    body{font-family:monospace;font-size:13px;padding:20px;color:#000;max-width:300px;margin:0 auto}
    h2{text-align:center;font-size:16px;margin:0 0 4px}
    .sub{text-align:center;font-size:11px;color:#555;margin:0 0 16px}
    hr{border:none;border-top:1px dashed #999;margin:10px 0}
    .row{display:flex;justify-content:space-between;margin:4px 0}
    .total{font-weight:bold;font-size:15px}
    .footer{text-align:center;font-size:11px;color:#555;margin-top:16px}
    @media print{body{padding:0}}
  </style></head><body>
  <h2>${r.locationName}</h2>
  <div class="sub">${new Date(r.completedAt).toLocaleString("en-KE")}</div>
  <hr>
  <div class="row"><span>Vehicle</span><span>${r.vehiclePlate}</span></div>
  ${r.customerName ? `<div class="row"><span>Customer</span><span>${r.customerName}</span></div>` : ""}
  <div class="row"><span>Service</span><span>${r.serviceName}</span></div>
  <hr>
  <div class="row total"><span>Amount</span><span>KSh ${r.amount.toLocaleString("en-KE")}</span></div>
  <div class="row"><span>Method</span><span>${r.method}</span></div>
  ${r.reference ? `<div class="row"><span>Ref</span><span>${r.reference}</span></div>` : ""}
  <hr>
  <div class="footer">Thank you for choosing ${r.locationName}!</div>
  </body></html>`)
  win.document.close()
  win.focus()
  win.print()
}

export default function Queue() {
  const { activeLocation } = useLocation()
  const [entries, setEntries]   = useState<QueueEntry[]>([])
  const [services, setServices] = useState<ServiceRef[]>([])
  const [showForm, setShowForm] = useState(false)
  const [completing, setCompleting] = useState<{ entry: QueueEntry; amount: number; method: PayMethod; reference: string } | null>(null)
  const [lastReceipt, setLastReceipt] = useState<Receipt | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CheckInForm>({ resolver: zodResolver(checkInSchema) })

  const input =
    "w-full px-3 py-3 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00C2D1] focus:border-transparent"

  async function loadQueue() {
    const res = await fetchWithAuth("/api/queue")
    const json = await res.json()
    setEntries(json.queue ?? [])
  }

  async function loadServices() {
    const res = await fetchWithAuth("/api/services")
    const json = await res.json()
    setServices(json.services ?? [])
  }

  useEffect(() => {
    loadQueue()
    loadServices()
    const interval = setInterval(loadQueue, 30000)
    return () => clearInterval(interval)
  }, [])

  async function onCheckIn(data: CheckInForm) {
    await fetchWithAuth("/api/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    reset()
    setShowForm(false)
    loadQueue()
  }

  async function advance(entry: QueueEntry, next: string) {
    if (next === "completed") {
      setCompleting({ entry, amount: entry.serviceId.price, method: "cash", reference: "" })
      return
    }
    await fetchWithAuth(`/api/queue/${entry._id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    })
    loadQueue()
  }

  async function submitPayment() {
    if (!completing) return
    const { entry, amount, method, reference } = completing
    await fetchWithAuth(`/api/queue/${entry._id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "completed",
        payment: { amount, method, reference: reference || undefined },
      }),
    })
    setLastReceipt({
      vehiclePlate: entry.vehiclePlate,
      customerName: entry.customerName,
      serviceName: entry.serviceId.name,
      servicePrice: entry.serviceId.price,
      amount,
      method: METHOD_LABELS[method],
      reference: reference || undefined,
      locationName: activeLocation?.name ?? "Lava",
      completedAt: new Date().toISOString(),
    })
    setCompleting(null)
    loadQueue()
  }

  async function remove(id: string) {
    if (!confirm("Remove this entry from the queue?")) return
    await fetchWithAuth(`/api/queue/${id}`, { method: "DELETE" })
    loadQueue()
  }

  const NEXT: Record<string, { label: string; status: string }> = {
    waiting:     { label: "Start",       status: "in_progress" },
    in_progress: { label: "Mark Ready",  status: "ready" },
    ready:       { label: "Complete",    status: "completed" },
  }

  const columns = (["waiting", "in_progress", "ready"] as const).map((s) => ({
    status: s,
    ...STATUSES[s],
    entries: entries.filter((e) => e.status === s),
  }))

  return (
    <Layout>
      <div className="px-4 sm:px-6 py-6 sm:py-10">
        {/* Receipt toast */}
        {lastReceipt && (
          <div className="fixed bottom-6 right-6 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-4 flex items-center gap-4 max-w-xs">
            <BadgeCheck size={20} className="text-green-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{lastReceipt.vehiclePlate} done</p>
              <p className="text-xs text-slate-400">{formatKES(lastReceipt.amount)} · {lastReceipt.method}</p>
            </div>
            <button
              onClick={() => printReceipt(lastReceipt)}
              className="p-1.5 text-slate-400 hover:text-[#00C2D1] transition-colors"
              title="Print receipt"
            >
              <Printer size={16} />
            </button>
            <button onClick={() => setLastReceipt(null)} className="p-1 text-slate-300 hover:text-slate-500">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-800 dark:text-slate-100">Queue</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
              {entries.length} vehicle{entries.length !== 1 ? "s" : ""} active
            </p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-[#1E3A5F] text-white text-sm font-medium rounded-lg hover:bg-[#162d4a] transition-colors"
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            <span>{showForm ? "Cancel" : "Check in"}</span>
          </button>
        </div>

        {/* Check-in form */}
        {showForm && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 mb-5">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">New check-in</h3>
            <form onSubmit={handleSubmit(onCheckIn)} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Service</label>
                <select {...register("serviceId")} className={input}>
                  <option value="">Select a service…</option>
                  {services.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} — {formatKES(s.price)} ({s.durationMins}m)
                    </option>
                  ))}
                </select>
                {errors.serviceId && <p className="text-red-500 text-xs mt-1">{errors.serviceId.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Vehicle plate</label>
                <div className="flex gap-2">
                  <input {...register("vehiclePlate")} placeholder="KAA 123A" className={input + " uppercase flex-1"} />
                  <PlateScanner onResult={(plate) => setValue("vehiclePlate", plate, { shouldValidate: true })} />
                </div>
                {errors.vehiclePlate && <p className="text-red-500 text-xs mt-1">{errors.vehiclePlate.message}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Customer name <span className="text-slate-400">(optional)</span>
                  </label>
                  <input {...register("customerName")} placeholder="Jane Smith" className={input} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Vehicle description <span className="text-slate-400">(optional)</span>
                  </label>
                  <input {...register("vehicleDescription")} placeholder="Red Toyota Camry" className={input} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Notes <span className="text-slate-400">(optional)</span>
                </label>
                <input {...register("notes")} placeholder="Any notes…" className={input} />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-[#1E3A5F] text-white text-sm font-medium rounded-lg hover:bg-[#162d4a] disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? "Adding…" : "Add to queue"}
              </button>
            </form>
          </div>
        )}

        {/* Board */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {columns.map((col) => (
            <div key={col.status}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${col.color}`}>{col.label}</span>
                <span className="text-slate-400 dark:text-slate-500 text-xs">{col.entries.length}</span>
              </div>

              <div className="space-y-3">
                {col.entries.length === 0 && (
                  <div className="bg-white dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center text-slate-400 dark:text-slate-600 text-sm">
                    No vehicles
                  </div>
                )}

                {col.entries.map((entry) => {
                  const isCompleting = completing?.entry._id === entry._id

                  return (
                    <div key={entry._id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                      {/* Card header */}
                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <Car size={14} className="text-slate-400" />
                              <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm tracking-wider">
                                {entry.vehiclePlate}
                              </span>
                              {entry.membershipActive && (
                                <BadgeCheck size={13} className="text-[#00C2D1]" title="Active membership" />
                              )}
                            </div>
                            {entry.vehicleDescription && (
                              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 ml-5">{entry.vehicleDescription}</p>
                            )}
                          </div>
                          <button onClick={() => remove(entry._id)} className="text-slate-300 dark:text-slate-600 hover:text-red-400 p-1 transition-colors">
                            <X size={14} />
                          </button>
                        </div>

                        <div>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{entry.serviceId.name}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">{formatKES(entry.serviceId.price)}</p>
                        </div>

                        {entry.customerName && <p className="text-xs text-slate-500 dark:text-slate-400">{entry.customerName}</p>}
                        {entry.notes && <p className="text-xs text-slate-400 dark:text-slate-500 italic">{entry.notes}</p>}

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
                          <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 text-xs">
                            <Clock size={11} />
                            {elapsed(entry)}
                          </div>
                          {!isCompleting && (
                            <button
                              onClick={() => advance(entry, NEXT[entry.status].status)}
                              className="px-3 py-1.5 bg-[#00C2D1] text-white text-xs font-medium rounded-lg hover:bg-[#00afc0] transition-colors"
                            >
                              {NEXT[entry.status].label}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Inline payment form */}
                      {isCompleting && completing && (
                        <div className="border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 p-4 space-y-3">
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Record payment</p>

                          {/* Method tabs */}
                          <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                            {(["cash", "mpesa", "card"] as PayMethod[]).map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setCompleting({ ...completing, method: m })}
                                className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                                  completing.method === m
                                    ? "bg-[#1E3A5F] text-white"
                                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                                }`}
                              >
                                {METHOD_LABELS[m]}
                              </button>
                            ))}
                          </div>

                          {/* Amount */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">KSh</span>
                            <input
                              type="number"
                              value={completing.amount}
                              onChange={(e) => setCompleting({ ...completing, amount: Number(e.target.value) })}
                              className="flex-1 px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00C2D1]"
                            />
                          </div>

                          {/* Reference (M-Pesa / Card) */}
                          {completing.method !== "cash" && (
                            <input
                              type="text"
                              value={completing.reference}
                              onChange={(e) => setCompleting({ ...completing, reference: e.target.value })}
                              placeholder={completing.method === "mpesa" ? "M-Pesa code e.g. QBC123XYZ" : "Last 4 digits"}
                              className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#00C2D1]"
                            />
                          )}

                          <div className="flex gap-2">
                            <button
                              onClick={submitPayment}
                              className="flex-1 py-2 bg-[#1E3A5F] text-white text-xs font-medium rounded-lg hover:bg-[#162d4a] transition-colors"
                            >
                              Confirm & complete
                            </button>
                            <button
                              onClick={() => setCompleting(null)}
                              className="px-3 py-2 border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}
