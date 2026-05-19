import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/auth"
import { fetchWithAuth } from "../lib/fetch-with-auth"

const TIMEZONES = [
  { label: "UTC", value: "UTC" },
  { label: "Eastern Time (US)", value: "America/New_York" },
  { label: "Central Time (US)", value: "America/Chicago" },
  { label: "Mountain Time (US)", value: "America/Denver" },
  { label: "Pacific Time (US)", value: "America/Los_Angeles" },
  { label: "London", value: "Europe/London" },
  { label: "Paris / Berlin", value: "Europe/Paris" },
  { label: "Dubai", value: "Asia/Dubai" },
  { label: "Nairobi", value: "Africa/Nairobi" },
  { label: "Lagos", value: "Africa/Lagos" },
  { label: "Johannesburg", value: "Africa/Johannesburg" },
  { label: "Mumbai", value: "Asia/Kolkata" },
  { label: "Singapore", value: "Asia/Singapore" },
  { label: "Sydney", value: "Australia/Sydney" },
]

const schema = z.object({
  businessName: z.string().min(2, "Must be at least 2 characters"),
  locationName: z.string().min(2, "Must be at least 2 characters"),
  address: z.string().min(5, "Please enter a full address"),
  timezone: z.string().min(1, "Select a timezone"),
})

type FormValues = z.infer<typeof schema>

export default function Onboarding() {
  const navigate = useNavigate()
  const { setUser, user } = useAuth()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { timezone: "UTC" },
  })

  const canSubmit = (() => !isSubmitting)()

  async function onSubmit(data: FormValues) {
    const res = await fetchWithAuth("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessName: data.businessName,
        locationName: data.locationName,
        address: data.address,
        timezone: data.timezone,
      }),
    })

    const json = await res.json()
    if (!res.ok) {
      setError("root", { message: json.error ?? "Something went wrong" })
      return
    }

    if (user) setUser({ ...user, accountId: json.account.id })
    navigate("/dashboard")
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#1E3A5F] tracking-tight">lava</h1>
          <p className="text-slate-500 mt-1 text-sm">Let's get your business set up</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Business */}
            <div>
              <h2 className="text-base font-semibold text-slate-800 mb-4">Your business</h2>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Business name
                </label>
                <input
                  {...register("businessName")}
                  type="text"
                  placeholder="Sunshine Car Wash"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00C2D1] focus:border-transparent transition"
                />
                {errors.businessName && (
                  <p className="text-red-500 text-xs mt-1">{errors.businessName.message}</p>
                )}
              </div>
            </div>

            <div className="border-t border-slate-100" />

            {/* First location */}
            <div>
              <h2 className="text-base font-semibold text-slate-800 mb-4">Your first location</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Location name
                  </label>
                  <input
                    {...register("locationName")}
                    type="text"
                    placeholder="Main Street Branch"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00C2D1] focus:border-transparent transition"
                  />
                  {errors.locationName && (
                    <p className="text-red-500 text-xs mt-1">{errors.locationName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                  <input
                    {...register("address")}
                    type="text"
                    placeholder="123 Main St, City, State"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00C2D1] focus:border-transparent transition"
                  />
                  {errors.address && (
                    <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
                  <select
                    {...register("timezone")}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00C2D1] focus:border-transparent transition bg-white"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                  {errors.timezone && (
                    <p className="text-red-500 text-xs mt-1">{errors.timezone.message}</p>
                  )}
                </div>
              </div>
            </div>

            {errors.root && <p className="text-red-500 text-xs">{errors.root.message}</p>}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full bg-[#1E3A5F] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#162d4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Setting up…" : "Complete setup"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
