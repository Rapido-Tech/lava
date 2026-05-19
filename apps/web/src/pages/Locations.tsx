import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Pencil, X, Check, MapPin, CheckCircle2 } from "lucide-react"
import Layout from "../components/Layout"
import { fetchWithAuth } from "../lib/fetch-with-auth"
import { useLocation } from "../context/location"
import { useAuth } from "../context/auth"

interface LocationInfo {
  _id: string
  name: string
  address: string
  timezone: string
}

const TIMEZONES = [
  { label: "UTC",              value: "UTC" },
  { label: "Eastern Time (US)", value: "America/New_York" },
  { label: "Central Time (US)", value: "America/Chicago" },
  { label: "Mountain Time (US)", value: "America/Denver" },
  { label: "Pacific Time (US)", value: "America/Los_Angeles" },
  { label: "London",           value: "Europe/London" },
  { label: "Paris / Berlin",   value: "Europe/Paris" },
  { label: "Dubai",            value: "Asia/Dubai" },
  { label: "Nairobi",          value: "Africa/Nairobi" },
  { label: "Lagos",            value: "Africa/Lagos" },
  { label: "Johannesburg",     value: "Africa/Johannesburg" },
  { label: "Mumbai",           value: "Asia/Kolkata" },
  { label: "Singapore",        value: "Asia/Singapore" },
  { label: "Sydney",           value: "Australia/Sydney" },
]

const schema = z.object({
  name:     z.string().min(2, "Name must be at least 2 characters"),
  address:  z.string().min(5, "Please enter a full address"),
  timezone: z.string().min(1, "Select a timezone"),
})
type FormValues = z.infer<typeof schema>

const capWords = (v: string) => v.replace(/(^|\s)\S/g, (c) => c.toUpperCase())

const inputCls =
  "w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00C2D1] focus:border-transparent"

function LocationForm({
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
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { timezone: "Africa/Nairobi", ...defaultValues },
  })

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <input
            {...register("name")}
            onChange={(e) => setValue("name", capWords(e.target.value))}
            placeholder="Location name e.g. Westlands Branch"
            className={inputCls}
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <select {...register("timezone")} className={inputCls}>
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <input
            {...register("address")}
            onChange={(e) => setValue("address", capWords(e.target.value))}
            placeholder="Physical address"
            className={inputCls}
          />
          {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
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

export default function Locations() {
  const { user } = useAuth()
  const isOwner = user?.role === "owner"
  const { locations: ctxLocations, activeLocationId, switchLocation, reload } = useLocation()
  const [locations, setLocations] = useState<LocationInfo[]>(ctxLocations)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => { setLocations(ctxLocations) }, [ctxLocations])

  async function refreshAll() {
    const res = await fetchWithAuth("/api/locations")
    const json = await res.json()
    setLocations(json.locations ?? [])
    await reload()
  }

  async function handleAdd(data: FormValues) {
    await fetchWithAuth("/api/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    setAdding(false)
    refreshAll()
  }

  async function handleEdit(id: string, data: FormValues) {
    await fetchWithAuth(`/api/locations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    setEditingId(null)
    refreshAll()
  }

  const tzLabel = (tz: string) => TIMEZONES.find((t) => t.value === tz)?.label ?? tz

  return (
    <Layout>
      <div className="px-4 sm:px-6 py-6 sm:py-10 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-800 dark:text-slate-100">Locations</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
              Manage your branches. Switch location from the sidebar.
            </p>
          </div>
          {isOwner && !adding && (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-[#1E3A5F] text-white text-sm font-medium rounded-lg hover:bg-[#162d4a] transition-colors"
            >
              <Plus size={16} />
              <span>Add location</span>
            </button>
          )}
        </div>

        {adding && (
          <div className="bg-white dark:bg-slate-800 border border-[#00C2D1]/30 rounded-xl p-5 mb-4">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">New location</p>
            <LocationForm onSave={handleAdd} onCancel={() => setAdding(false)} />
          </div>
        )}

        <div className="space-y-2">
          {locations.map((loc) => {
            const isActive = loc._id === activeLocationId
            return (
              <div
                key={loc._id}
                className={`bg-white dark:bg-slate-800 rounded-xl border overflow-hidden transition-colors ${
                  isActive
                    ? "border-[#00C2D1]"
                    : "border-slate-200 dark:border-slate-700"
                }`}
              >
                {editingId === loc._id ? (
                  <div className="p-5 bg-amber-50/50 dark:bg-amber-900/10">
                    <LocationForm
                      defaultValues={loc}
                      onSave={(data) => handleEdit(loc._id, data)}
                      onCancel={() => setEditingId(null)}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-4 px-5 py-4">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        isActive ? "bg-[#00C2D1]/10" : "bg-slate-100 dark:bg-slate-700"
                      }`}
                    >
                      <MapPin size={16} className={isActive ? "text-[#00C2D1]" : "text-slate-400 dark:text-slate-500"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{loc.name}</p>
                        {isActive && (
                          <span className="flex items-center gap-1 text-xs text-[#00C2D1] font-medium">
                            <CheckCircle2 size={11} /> Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{loc.address}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{tzLabel(loc.timezone)}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {!isActive && (
                        <button
                          onClick={() => switchLocation(loc._id)}
                          className="px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg hover:border-[#00C2D1] hover:text-[#00C2D1] transition-colors"
                        >
                          Switch
                        </button>
                      )}
                      {isOwner && (
                        <button
                          onClick={() => setEditingId(loc._id)}
                          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </Layout>
  )
}
