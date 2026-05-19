import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Pencil, Trash2, X, Check, Search, Car } from "lucide-react"
import Layout from "../components/Layout"
import { fetchWithAuth } from "../lib/fetch-with-auth"

interface Customer {
  _id: string
  name: string
  phone?: string
  email?: string
  vehiclePlates: string[]
  notes?: string
}

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  vehiclePlates: z.string().optional(),
  notes: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

const capWords = (v: string) => v.replace(/(^|\s)\S/g, (c) => c.toUpperCase())
const capFirst = (v: string) => (v ? v.charAt(0).toUpperCase() + v.slice(1) : v)

const inputCls =
  "w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00C2D1] focus:border-transparent"

function platesFromString(raw: string): string[] {
  return raw
    .split(/[,\s]+/)
    .map((p) => p.trim().toUpperCase())
    .filter(Boolean)
}

function CustomerForm({
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
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues })

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <input
            {...register("name")}
            onChange={(e) => setValue("name", capWords(e.target.value))}
            placeholder="Customer name"
            className={inputCls}
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <input {...register("phone")} placeholder="Phone number" className={inputCls} />
        </div>
        <div>
          <input {...register("email")} type="email" placeholder="Email (optional)" className={inputCls} />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <input
            {...register("vehiclePlates")}
            placeholder="Plates e.g. KAA 123A, KBB 456B"
            className={inputCls + " uppercase"}
          />
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Separate multiple plates with commas</p>
        </div>
        <div className="sm:col-span-2">
          <input
            {...register("notes")}
            onChange={(e) => setValue("notes", capFirst(e.target.value))}
            placeholder="Notes (optional)"
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

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState("")
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  async function load(q?: string) {
    const url = q ? `/api/customers?q=${encodeURIComponent(q)}` : "/api/customers"
    const res = await fetchWithAuth(url)
    const json = await res.json()
    setCustomers(json.customers ?? [])
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const t = setTimeout(() => load(search || undefined), 300)
    return () => clearTimeout(t)
  }, [search])

  function toPayload(data: FormValues) {
    return {
      ...data,
      vehiclePlates: platesFromString(data.vehiclePlates ?? ""),
      email: data.email || undefined,
    }
  }

  async function handleAdd(data: FormValues) {
    await fetchWithAuth("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toPayload(data)),
    })
    setAdding(false)
    load()
  }

  async function handleEdit(id: string, data: FormValues) {
    await fetchWithAuth(`/api/customers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toPayload(data)),
    })
    setEditingId(null)
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this customer?")) return
    await fetchWithAuth(`/api/customers/${id}`, { method: "DELETE" })
    load()
  }

  function editDefaults(c: Customer): Partial<FormValues> {
    return {
      name: c.name,
      phone: c.phone ?? "",
      email: c.email ?? "",
      vehiclePlates: c.vehiclePlates.join(", "),
      notes: c.notes ?? "",
    }
  }

  return (
    <Layout>
      <div className="px-4 sm:px-6 py-6 sm:py-10 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-800 dark:text-slate-100">Customers</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Track returning customers and their vehicles.</p>
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
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">New customer</p>
            <CustomerForm onSave={handleAdd} onCancel={() => setAdding(false)} />
          </div>
        )}

        {/* Search */}
        <div className="relative mb-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, plate, or phone…"
            className="w-full pl-9 pr-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00C2D1] focus:border-transparent"
          />
        </div>

        <div className="space-y-2">
          {customers.length === 0 && !adding && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-10 text-center text-slate-400 dark:text-slate-500 text-sm">
              {search ? "No customers match your search." : "No customers yet."}
            </div>
          )}

          {customers.map((c) => (
            <div key={c._id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              {editingId === c._id ? (
                <div className="p-5 bg-amber-50/50 dark:bg-amber-900/10">
                  <CustomerForm
                    defaultValues={editDefaults(c)}
                    onSave={(data) => handleEdit(c._id, data)}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{c.name}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                      {c.phone && <span className="text-xs text-slate-400 dark:text-slate-500">{c.phone}</span>}
                      {c.email && <span className="text-xs text-slate-400 dark:text-slate-500">{c.email}</span>}
                    </div>
                    {c.vehiclePlates.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {c.vehiclePlates.map((p) => (
                          <span
                            key={p}
                            className="inline-flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded font-mono"
                          >
                            <Car size={10} />
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                    {c.notes && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 italic">{c.notes}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => setEditingId(c._id)}
                      className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(c._id)}
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
