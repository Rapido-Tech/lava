import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Pencil, Trash2, X, Check } from "lucide-react"
import Layout from "../components/Layout"
import { fetchWithAuth } from "../lib/fetch-with-auth"
import { formatKES } from "../lib/format"
import { useToast } from "../context/toast"
import { CardSkeleton } from "../components/Skeleton"

interface Service {
  _id: string
  name: string
  description?: string
  price: number
  durationMins: number
  category: string
}

const schema = z.object({
  name:         z.string().min(1, "Name is required"),
  description:  z.string().optional(),
  price:        z.coerce.number().min(0, "Must be 0 or more"),
  durationMins: z.coerce.number().min(1, "At least 1 minute"),
  category:     z.string().default("General"),
})
type FormValues = z.infer<typeof schema>

const inputCls =
  "w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00C2D1] focus:border-transparent"

function ServiceForm({
  defaultValues,
  onSave,
  onCancel,
}: {
  defaultValues?: Partial<FormValues>
  onSave: (data: FormValues) => Promise<void>
  onCancel: () => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues })

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <input {...register("name")} placeholder="Service name" className={inputCls} />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <input {...register("category")} placeholder="Category" className={inputCls} />
        </div>
        <div>
          <input
            {...register("price")}
            type="number"
            step="1"
            placeholder="Price (KSh)"
            className={inputCls}
          />
          {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>}
        </div>
        <div>
          <input
            {...register("durationMins")}
            type="number"
            placeholder="Duration (minutes)"
            className={inputCls}
          />
          {errors.durationMins && (
            <p className="text-red-500 text-xs mt-1">{errors.durationMins.message}</p>
          )}
        </div>
        <div className="sm:col-span-2">
          <input
            {...register("description")}
            placeholder="Description (optional)"
            className={inputCls}
          />
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
          onClick={onCancel}
          className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <X size={14} /> Cancel
        </button>
      </div>
    </form>
  )
}

export default function Services() {
  const { add: toast } = useToast()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding]     = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetchWithAuth("/api/services")
    const json = await res.json()
    setServices(json.services ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleAdd(data: FormValues) {
    const res = await fetchWithAuth("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) { const e = await res.json(); toast("error", e.error ?? "Failed to add"); return }
    toast("success", "Service added")
    setAdding(false)
    load()
  }

  async function handleEdit(id: string, data: FormValues) {
    const res = await fetchWithAuth(`/api/services/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) { const e = await res.json(); toast("error", e.error ?? "Failed to update"); return }
    toast("success", "Service updated")
    setEditingId(null)
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this service?")) return
    await fetchWithAuth(`/api/services/${id}`, { method: "DELETE" })
    toast("success", "Service removed")
    load()
  }

  return (
    <Layout>
      <div className="px-4 sm:px-6 py-6 sm:py-10 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-800 dark:text-slate-100">Services</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Manage your wash packages and pricing.</p>
          </div>
          {!adding && (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-[#1E3A5F] text-white text-sm font-medium rounded-lg hover:bg-[#162d4a] transition-colors"
            >
              <Plus size={16} />
              <span>Add</span>
            </button>
          )}
        </div>

        {adding && (
          <div className="bg-white dark:bg-slate-800 border border-[#00C2D1]/30 rounded-xl p-5 mb-4">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">New service</p>
            <ServiceForm
              defaultValues={{ category: "General" }}
              onSave={handleAdd}
              onCancel={() => setAdding(false)}
            />
          </div>
        )}

        <div className="space-y-2">
          {loading ? (
            <div className="space-y-2">{[1,2,3].map((i) => <CardSkeleton key={i} />)}</div>
          ) : services.length === 0 && !adding ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-10 text-center text-slate-400 dark:text-slate-500 text-sm">
              No services yet. Add your first wash package above.
            </div>
          ) : null}

          {!loading && services.map((svc) => (
            <div key={svc._id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              {editingId === svc._id ? (
                <div className="p-5 bg-amber-50/50 dark:bg-amber-900/10">
                  <ServiceForm
                    defaultValues={svc}
                    onSave={(data) => handleEdit(svc._id, data)}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-800 dark:text-slate-100 text-sm">{svc.name}</span>
                      <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">
                        {svc.category}
                      </span>
                    </div>
                    {svc.description && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{svc.description}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{formatKES(svc.price)}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{svc.durationMins} min</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => setEditingId(svc._id)}
                      className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(svc._id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}
