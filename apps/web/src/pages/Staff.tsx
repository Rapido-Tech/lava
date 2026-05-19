import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Trash2, X, Check, ShieldCheck, User } from "lucide-react"
import Layout from "../components/Layout"
import { fetchWithAuth } from "../lib/fetch-with-auth"
import { useAuth } from "../context/auth"
import { useToast } from "../context/toast"
import { CardSkeleton } from "../components/Skeleton"

interface StaffMember {
  _id: string
  name: string
  email: string
  role: "manager" | "cashier"
  jobTitle?: string
}

const schema = z.object({
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
type FormValues = z.infer<typeof schema>

const capWords = (v: string) => v.replace(/(^|\s)\S/g, (c) => c.toUpperCase())

const inputCls =
  "w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00C2D1] focus:border-transparent"

const PERMISSION_LABELS: Record<string, string> = {
  manager: "Manager access",
  cashier: "Cashier access",
}

export default function Staff() {
  const { user } = useAuth()
  const { add: toast } = useToast()
  const isOwner = user?.role === "owner"

  const [members, setMembers] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: "cashier" },
  })

  async function load() {
    setLoading(true)
    const res = await fetchWithAuth("/api/staff")
    const json = await res.json()
    setMembers(json.staff ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function onAdd(data: FormValues) {
    const res = await fetchWithAuth("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json()
      toast("error", err.error ?? "Failed to add staff member")
      return
    }
    toast("success", "Staff member added")
    reset()
    setAdding(false)
    load()
  }

  async function changeRole(id: string, role: "manager" | "cashier") {
    await fetchWithAuth(`/api/staff/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    })
    load()
  }

  async function remove(id: string) {
    if (!confirm("Remove this staff member?")) return
    await fetchWithAuth(`/api/staff/${id}`, { method: "DELETE" })
    toast("success", "Staff member removed")
    load()
  }

  return (
    <Layout>
      <div className="px-4 sm:px-6 py-6 sm:py-10 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-800 dark:text-slate-100">Staff</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Manage your team members and roles.</p>
          </div>
          {isOwner && !adding && (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-[#1E3A5F] text-white text-sm font-medium rounded-lg hover:bg-[#162d4a] transition-colors"
            >
              <Plus size={16} />
              <span>Add staff</span>
            </button>
          )}
        </div>

        {adding && (
          <div className="bg-white dark:bg-slate-800 border border-[#00C2D1]/30 rounded-xl p-5 mb-4">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">New staff member</p>
            <form onSubmit={handleSubmit(onAdd)} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <input
                    {...register("name")}
                    onChange={(e) => setValue("name", capWords(e.target.value))}
                    placeholder="Full name"
                    className={inputCls}
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <input
                    {...register("jobTitle")}
                    onChange={(e) => setValue("jobTitle", capWords(e.target.value))}
                    placeholder="Job title e.g. Washer, Detailer"
                    className={inputCls}
                  />
                  {errors.jobTitle && <p className="text-red-500 text-xs mt-1">{errors.jobTitle.message}</p>}
                </div>
                <div>
                  <input
                    {...register("email")}
                    type="email"
                    placeholder="Email address"
                    className={inputCls}
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <input
                    {...register("password")}
                    type="password"
                    placeholder="Temporary password"
                    className={inputCls}
                  />
                  {errors.password && (
                    <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Permission level
                  </label>
                  <select {...register("role")} className={inputCls}>
                    <option value="cashier">Cashier — can check in vehicles and advance queue</option>
                    <option value="manager">Manager — can also manage services and staff</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#1E3A5F] text-white text-sm rounded-lg hover:bg-[#162d4a] disabled:opacity-50 transition-colors"
                >
                  <Check size={14} /> Save
                </button>
                <button
                  type="button"
                  onClick={() => { setAdding(false); reset() }}
                  className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <X size={14} /> Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-2">
          {loading ? (
            <div className="space-y-2">{[1,2,3].map((i) => <CardSkeleton key={i} />)}</div>
          ) : members.length === 0 && !adding ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-10 text-center text-slate-400 dark:text-slate-500 text-sm">
              No staff added yet.
            </div>
          ) : null}

          {!loading && members.map((m) => (
            <div
              key={m._id}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-4 px-5 py-4"
            >
              <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                <User size={16} className="text-slate-400 dark:text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{m.name}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {m.jobTitle && (
                    <span className="text-xs text-[#00C2D1] font-medium">{m.jobTitle}</span>
                  )}
                  <span className="text-xs text-slate-400 dark:text-slate-500 truncate">{m.email}</span>
                </div>
              </div>
              {isOwner ? (
                <select
                  value={m.role}
                  onChange={(e) => changeRole(m._id, e.target.value as "manager" | "cashier")}
                  className="text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00C2D1]"
                >
                  <option value="cashier">Cashier</option>
                  <option value="manager">Manager</option>
                </select>
              ) : (
                <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-full">
                  <ShieldCheck size={11} />
                  {PERMISSION_LABELS[m.role]}
                </span>
              )}
              {isOwner && (
                <button
                  onClick={() => remove(m._id)}
                  className="p-2 text-slate-300 dark:text-slate-600 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}
