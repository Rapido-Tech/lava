import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ListOrdered, Wrench, TrendingUp } from "lucide-react"
import Layout from "../components/Layout"
import { fetchWithAuth } from "../lib/fetch-with-auth"
import { formatKES } from "../lib/format"

interface Stats {
  vehiclesToday: number
  revenueToday: number
  activeQueue: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetchWithAuth("/api/queue/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => null)
  }, [])

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-1">Overview</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">Today's snapshot across your location.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { label: "Vehicles Today", value: stats?.vehiclesToday ?? "—" },
            {
              label: "Revenue Today",
              value: stats ? formatKES(stats.revenueToday) : "—",
            },
            { label: "Active Queue", value: stats?.activeQueue ?? "—" },
          ].map((s) => (
            <div key={s.label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <p className="text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
              <p className="text-3xl font-bold text-[#1E3A5F] dark:text-[#00C2D1] mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
          Quick access
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              to: "/queue",
              icon: ListOrdered,
              label: "Queue",
              desc: "Check in vehicles and manage the live board",
            },
            {
              to: "/services",
              icon: Wrench,
              label: "Services",
              desc: "Manage your wash packages and pricing",
            },
            {
              to: "/reports",
              icon: TrendingUp,
              label: "Reports",
              desc: "Revenue and activity reports",
            },
          ].map(({ to, icon: Icon, label, desc }) => (
            <Link
              key={label}
              to={to}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:border-[#00C2D1] hover:shadow-sm transition group"
            >
              <Icon size={20} className="text-[#00C2D1] mb-3" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  )
}
