import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Pencil, Trash2, X, Check, BadgeCheck, Car, UserCircle } from "lucide-react"
import Layout from "../components/Layout"
import { fetchWithAuth } from "../lib/fetch-with-auth"
import { formatKES } from "../lib/format"
import { useToast } from "../context/toast"

interface Plan {
  _id: string
  name: string
  description?: string
  type: "monthly" | "passes"
  passCount?: number
  price: number
}

interface ActiveMembership {
  _id: string
  customerId: { _id: string; name: string; vehiclePlates: string[]; phone?: string }
  planId: { _id: string; name: string; type: string; passCount?: number; price: number }
  startDate: string
  endDate?: string
  passesTotal?: number
  passesUsed: number
  status: "active" | "expired" | "depleted"
}

interface Customer {
  _id: string
  name: string
  vehiclePlates: string[]
}

const planSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  type: z.enum(["monthly", "passes"]),
  passCount: z.coerce.number().min(1).optional(),
  price: z.coerce.number().min(0, "Price must be 0 or more"),
})
type PlanForm = z.infer<typeof planSchema>

const assignSchema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  planId: z.string().min(1, "Select a plan"),
})
type AssignForm = z.infer<typeof assignSchema>

const capWords = (v: string) => v.replace(/(^|\s)\S/g, (c) => c.toUpperCase())

const inputCls =
  "w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00C2D1] focus:border-transparent"

function daysLeft(endDate?: string) {
  if (!endDate) return null
  const days = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  return days
}

export default function Memberships() {
  const { add: toast } = useToast()
  const [plans, setPlans] = useState<Plan[]>([])
  const [memberships, setMemberships] = useState<ActiveMembership[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [addingPlan, setAddingPlan] = useState(false)
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [assigning, setAssigning] = useState(false)

  const planForm = useForm<PlanForm>({
    resolver: zodResolver(planSchema),
    defaultValues: { type: "monthly" },
  })
  const watchType = planForm.watch("type")

  const assignForm = useForm<AssignForm>({ resolver: zodResolver(assignSchema) })

  async function loadPlans() {
    const res = await fetchWithAuth("/api/memberships/plans")
    const json = await res.json()
    setPlans(json.plans ?? [])
  }

  async function loadMemberships() {
    const res = await fetchWithAuth("/api/memberships")
    const json = await res.json()
    setMemberships(json.memberships ?? [])
  }

  async function loadCustomers() {
    const res = await fetchWithAuth("/api/customers")
    const json = await res.json()
    setCustomers(json.customers ?? [])
  }

  useEffect(() => {
    loadPlans()
    loadMemberships()
    loadCustomers()
  }, [])

  async function onSavePlan(data: PlanForm) {
    if (editingPlanId) {
      await fetchWithAuth(`/api/memberships/plans/${editingPlanId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      setEditingPlanId(null)
    } else {
      await fetchWithAuth("/api/memberships/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      setAddingPlan(false)
    }
    planForm.reset()
    loadPlans()
  }

  function startEditPlan(plan: Plan) {
    setEditingPlanId(plan._id)
    setAddingPlan(false)
    planForm.reset({
      name: plan.name,
      description: plan.description ?? "",
      type: plan.type,
      passCount: plan.passCount,
      price: plan.price,
    })
  }

  async function deletePlan(id: string) {
    if (!confirm("Delete this plan?")) return
    await fetchWithAuth(`/api/memberships/plans/${id}`, { method: "DELETE" })
    loadPlans()
  }

  async function onAssign(data: AssignForm) {
    const res = await fetchWithAuth("/api/memberships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json()
      toast("error", err.error ?? "Failed to assign membership")
      return
    }
    toast("success", "Membership assigned")
    assignForm.reset()
    setAssigning(false)
    loadMemberships()
  }

  async function revoke(id: string) {
    if (!confirm("Revoke this membership?")) return
    await fetchWithAuth(`/api/memberships/${id}`, { method: "DELETE" })
    loadMemberships()
  }

  return (
    <Layout>
      <div className="px-4 sm:px-6 py-6 sm:py-10 max-w-4xl mx-auto space-y-8">

        {/* ── Plans section ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-800 dark:text-slate-100">Memberships</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Define plans and manage customer subscriptions.</p>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Plans</h3>
            {!addingPlan && !editingPlanId && (
              <button
                onClick={() => { setAddingPlan(true); planForm.reset({ type: "monthly" }) }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1E3A5F] text-white text-xs font-medium rounded-lg hover:bg-[#162d4a] transition-colors"
              >
                <Plus size={13} /> New plan
              </button>
            )}
          </div>

          {(addingPlan || editingPlanId) && (
            <div className="bg-white dark:bg-slate-800 border border-[#00C2D1]/30 rounded-xl p-5 mb-3">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">
                {editingPlanId ? "Edit plan" : "New plan"}
              </p>
              <form onSubmit={planForm.handleSubmit(onSavePlan)} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <input
                      {...planForm.register("name")}
                      onChange={(e) => planForm.setValue("name", capWords(e.target.value))}
                      placeholder="Plan name e.g. Monthly Unlimited"
                      className={inputCls}
                    />
                    {planForm.formState.errors.name && (
                      <p className="text-red-500 text-xs mt-1">{planForm.formState.errors.name.message}</p>
                    )}
                  </div>
                  <div>
                    <select {...planForm.register("type")} className={inputCls}>
                      <option value="monthly">Monthly — unlimited washes</option>
                      <option value="passes">Passes — fixed number of washes</option>
                    </select>
                  </div>
                  <div>
                    <input
                      {...planForm.register("price")}
                      type="number"
                      step="1"
                      placeholder="Price (KSh)"
                      className={inputCls}
                    />
                    {planForm.formState.errors.price && (
                      <p className="text-red-500 text-xs mt-1">{planForm.formState.errors.price.message}</p>
                    )}
                  </div>
                  {watchType === "passes" && (
                    <div>
                      <input
                        {...planForm.register("passCount")}
                        type="number"
                        placeholder="Number of washes"
                        className={inputCls}
                      />
                      {planForm.formState.errors.passCount && (
                        <p className="text-red-500 text-xs mt-1">{planForm.formState.errors.passCount.message}</p>
                      )}
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <input
                      {...planForm.register("description")}
                      placeholder="Description (optional)"
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={planForm.formState.isSubmitting}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#1E3A5F] text-white text-sm rounded-lg hover:bg-[#162d4a] disabled:opacity-50 transition-colors"
                  >
                    <Check size={14} /> Save
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAddingPlan(false); setEditingPlanId(null); planForm.reset() }}
                    className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <X size={14} /> Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="space-y-2">
            {plans.length === 0 && !addingPlan && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                No plans yet. Create one to start selling memberships.
              </div>
            )}
            {plans.map((p) => (
              <div
                key={p._id}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-4 px-5 py-4"
              >
                <BadgeCheck size={18} className="text-[#00C2D1] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{p.name}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {p.type === "monthly" ? "Monthly unlimited" : `${p.passCount} washes`}
                    {p.description ? ` · ${p.description}` : ""}
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 shrink-0">
                  {formatKES(p.price)}
                </p>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => startEditPlan(p)}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => deletePlan(p._id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Active memberships ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Active memberships</h3>
            {!assigning && plans.length > 0 && customers.length > 0 && (
              <button
                onClick={() => setAssigning(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1E3A5F] text-white text-xs font-medium rounded-lg hover:bg-[#162d4a] transition-colors"
              >
                <Plus size={13} /> Assign
              </button>
            )}
          </div>

          {assigning && (
            <div className="bg-white dark:bg-slate-800 border border-[#00C2D1]/30 rounded-xl p-5 mb-3">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">Assign membership</p>
              <form onSubmit={assignForm.handleSubmit(onAssign)} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <select {...assignForm.register("customerId")} className={inputCls}>
                      <option value="">Select customer…</option>
                      {customers.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}{c.vehiclePlates.length ? ` — ${c.vehiclePlates[0]}` : ""}
                        </option>
                      ))}
                    </select>
                    {assignForm.formState.errors.customerId && (
                      <p className="text-red-500 text-xs mt-1">{assignForm.formState.errors.customerId.message}</p>
                    )}
                  </div>
                  <div>
                    <select {...assignForm.register("planId")} className={inputCls}>
                      <option value="">Select plan…</option>
                      {plans.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name} — {formatKES(p.price)}
                        </option>
                      ))}
                    </select>
                    {assignForm.formState.errors.planId && (
                      <p className="text-red-500 text-xs mt-1">{assignForm.formState.errors.planId.message}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={assignForm.formState.isSubmitting}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#1E3A5F] text-white text-sm rounded-lg hover:bg-[#162d4a] disabled:opacity-50 transition-colors"
                  >
                    <Check size={14} /> Assign
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAssigning(false); assignForm.reset() }}
                    className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <X size={14} /> Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="space-y-2">
            {memberships.length === 0 && !assigning && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                No active memberships.
              </div>
            )}
            {memberships.map((m) => {
              const days = daysLeft(m.endDate)
              const passesLeft = m.passesTotal != null ? m.passesTotal - m.passesUsed : null
              return (
                <div
                  key={m._id}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-4 px-5 py-4"
                >
                  <div className="w-9 h-9 rounded-full bg-[#00C2D1]/10 flex items-center justify-center shrink-0">
                    <UserCircle size={18} className="text-[#00C2D1]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      {m.customerId.name}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                      <span className="text-xs text-[#00C2D1] font-medium">{m.planId.name}</span>
                      {m.customerId.vehiclePlates.length > 0 && (
                        <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <Car size={10} /> {m.customerId.vehiclePlates[0]}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {passesLeft != null ? (
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {passesLeft} wash{passesLeft !== 1 ? "es" : ""} left
                      </p>
                    ) : days != null ? (
                      <p className={`text-sm font-semibold ${days <= 5 ? "text-amber-600 dark:text-amber-400" : "text-slate-800 dark:text-slate-100"}`}>
                        {days}d left
                      </p>
                    ) : null}
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {new Date(m.startDate).toLocaleDateString("en-KE")}
                    </p>
                  </div>
                  <button
                    onClick={() => revoke(m._id)}
                    className="p-2 text-slate-300 dark:text-slate-600 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors shrink-0"
                    title="Revoke membership"
                  >
                    <X size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </Layout>
  )
}
