import { useEffect, useState } from "react"
import { TrendingUp, Car, DollarSign, Percent } from "lucide-react"
import Layout from "../components/Layout"
import { fetchWithAuth } from "../lib/fetch-with-auth"
import { formatKES } from "../lib/format"

type Period = "today" | "week" | "month"

interface Overview {
  period: Period
  vehicles: number
  revenue: number
  avgPerVehicle: number
  byService: { name: string; count: number; revenue: number }[]
  byMethod: { method: string; count: number; revenue: number }[]
}

interface DayData {
  date: string
  vehicles: number
  revenue: number
}

const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "This month" },
]

function fmt(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("en-KE", { month: "short", day: "numeric" })
}

export default function Reports() {
  const [period, setPeriod] = useState<Period>("today")
  const [overview, setOverview] = useState<Overview | null>(null)
  const [daily, setDaily] = useState<DayData[]>([])

  useEffect(() => {
    fetchWithAuth(`/api/reports?period=${period}`)
      .then((r) => r.json())
      .then(setOverview)
      .catch(() => null)
  }, [period])

  useEffect(() => {
    const days = period === "month" ? 30 : period === "week" ? 7 : 1
    if (days === 1) { setDaily([]); return }
    fetchWithAuth(`/api/reports/daily?days=${days}`)
      .then((r) => r.json())
      .then((d) => setDaily(d.days ?? []))
      .catch(() => null)
  }, [period])

  const maxRevenue = Math.max(...daily.map((d) => d.revenue), 1)

  return (
    <Layout>
      <div className="px-4 sm:px-6 py-6 sm:py-10 max-w-4xl mx-auto">
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-800 dark:text-slate-100">Reports</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Revenue and activity overview.</p>
          </div>
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-800">
            {PERIODS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setPeriod(value)}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors ${
                  period === value
                    ? "bg-[#1E3A5F] text-white"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { icon: Car, label: "Vehicles", value: overview?.vehicles ?? "—" },
            { icon: DollarSign, label: "Revenue", value: overview ? formatKES(overview.revenue) : "—" },
            { icon: Percent, label: "Avg per vehicle", value: overview ? formatKES(overview.avgPerVehicle) : "—" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={15} className="text-[#00C2D1]" />
                <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
              </div>
              <p className="text-2xl font-bold text-[#1E3A5F] dark:text-[#00C2D1]">{value}</p>
            </div>
          ))}
        </div>

        {/* Daily bar chart */}
        {daily.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={15} className="text-[#00C2D1]" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Daily revenue</p>
            </div>
            <div className="flex items-end gap-1 h-28">
              {daily.map((d) => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
                  <div
                    className="w-full bg-[#00C2D1]/20 dark:bg-[#00C2D1]/10 group-hover:bg-[#00C2D1]/40 rounded-t transition-colors relative"
                    style={{ height: `${Math.max((d.revenue / maxRevenue) * 100, d.revenue > 0 ? 4 : 0)}%` }}
                  >
                    {d.revenue > 0 && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 dark:bg-slate-600 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
                        {formatKES(d.revenue)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex mt-1.5">
              {daily.map((d, i) => (
                <div key={d.date} className="flex-1 text-center">
                  {(i === 0 || i === Math.floor(daily.length / 2) || i === daily.length - 1) && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">{fmt(d.date)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* By payment method */}
        {overview?.byMethod && overview.byMethod.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Payment methods</p>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {overview.byMethod.map((m) => {
                const pct = overview.revenue ? Math.round((m.revenue / overview.revenue) * 100) : 0
                const label = m.method === "mpesa" ? "M-Pesa" : m.method.charAt(0).toUpperCase() + m.method.slice(1)
                return (
                  <div key={m.method} className="flex items-center gap-4 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm text-slate-700 dark:text-slate-200">{label}</p>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{formatKES(m.revenue)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                          <div className="bg-[#1E3A5F] dark:bg-[#00C2D1] h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
                          {m.count} txn{m.count !== 1 ? "s" : ""} · {pct}%
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* By service */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Breakdown by service</p>
          </div>
          {!overview || overview.byService.length === 0 ? (
            <div className="px-5 py-8 text-center text-slate-400 dark:text-slate-500 text-sm">
              No completed services for this period.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {overview.byService.map((s) => {
                const pct = overview.revenue ? Math.round((s.revenue / overview.revenue) * 100) : 0
                return (
                  <div key={s.name} className="flex items-center gap-4 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm text-slate-700 dark:text-slate-200">{s.name}</p>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{formatKES(s.revenue)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                          <div
                            className="bg-[#00C2D1] h-1.5 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
                          {s.count} wash{s.count !== 1 ? "es" : ""} · {pct}%
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
