import { useEffect, useState } from "react"
import { Clock, LogIn, LogOut, Timer } from "lucide-react"
import { fetchWithAuth } from "../lib/fetch-with-auth"
import { useAuth } from "../context/auth"
import { useToast } from "../context/toast"
import { CardSkeleton } from "../components/Skeleton"

interface Shift {
  _id: string
  userId: { _id: string; name: string; jobTitle?: string; role: string } | string
  clockIn: string
  clockOut?: string
  durationMins?: number
  status: "open" | "closed"
  notes?: string
}

function formatDuration(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function elapsed(clockIn: string) {
  const mins = Math.floor((Date.now() - new Date(clockIn).getTime()) / 60000)
  return formatDuration(mins)
}

export default function Shifts() {
  const { user } = useAuth()
  const { add: toast } = useToast()
  const [myShift, setMyShift] = useState<Shift | null | undefined>(undefined)
  const [allShifts, setAllShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60000)
    return () => clearInterval(id)
  }, [])

  async function load() {
    setLoading(true)
    const [meRes, allRes] = await Promise.all([
      fetchWithAuth("/api/shifts/me"),
      fetchWithAuth("/api/shifts"),
    ])
    const meData = await meRes.json()
    const allData = await allRes.json()
    setMyShift(meData.shift ?? null)
    setAllShifts(allData.shifts ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function clockIn() {
    setBusy(true)
    const res = await fetchWithAuth("/api/shifts/clock-in", { method: "POST" })
    const data = await res.json()
    if (!res.ok) { toast("error", data.error ?? "Failed to clock in"); setBusy(false); return }
    toast("success", "Clocked in")
    setMyShift(data.shift)
    load()
    setBusy(false)
  }

  async function clockOut() {
    setBusy(true)
    const res = await fetchWithAuth("/api/shifts/clock-out", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    const data = await res.json()
    if (!res.ok) { toast("error", data.error ?? "Failed to clock out"); setBusy(false); return }
    toast("success", `Clocked out — shift: ${formatDuration(data.shift.durationMins ?? 0)}`)
    setMyShift(null)
    load()
    setBusy(false)
  }

  const isOwnerOrManager = user?.role === "owner" || user?.role === "manager"

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Shifts</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Track your working hours</p>
      </div>

      {/* My shift card */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-teal-500" />
          <h2 className="font-semibold text-zinc-800 dark:text-zinc-100 text-sm">My Shift</h2>
        </div>

        {myShift === undefined || loading ? (
          <CardSkeleton />
        ) : myShift ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 text-xs font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                Started at {new Date(myShift.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-2xl font-bold text-zinc-800 dark:text-zinc-100">
              <Timer className="h-5 w-5 text-teal-500" />
              {elapsed(myShift.clockIn)}
            </div>
            <button
              onClick={clockOut}
              disabled={busy}
              className="flex items-center gap-2 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-4 py-2 text-sm font-medium transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Clock Out
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">You're not clocked in.</p>
            <button
              onClick={clockIn}
              disabled={busy}
              className="flex items-center gap-2 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-4 py-2 text-sm font-medium transition-colors"
            >
              <LogIn className="h-4 w-4" />
              Clock In
            </button>
          </div>
        )}
      </div>

      {/* Today's shifts — owner/manager only */}
      {isOwnerOrManager && (
        <div>
          <h2 className="font-semibold text-zinc-800 dark:text-zinc-100 mb-3 text-sm">Today's Shifts</h2>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <CardSkeleton key={i} />)}
            </div>
          ) : allShifts.length === 0 ? (
            <p className="text-sm text-zinc-400 dark:text-zinc-500 py-6 text-center">No shifts recorded today.</p>
          ) : (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60">
                    <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Staff</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Clock In</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Clock Out</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Duration</th>
                    <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allShifts.map((s) => {
                    const u = typeof s.userId === "object" ? s.userId : null
                    return (
                      <tr key={s._id} className="border-b last:border-0 border-zinc-100 dark:border-zinc-700 bg-white dark:bg-zinc-800">
                        <td className="px-4 py-3">
                          <p className="font-medium text-zinc-800 dark:text-zinc-100">{u?.name ?? "—"}</p>
                          {u?.jobTitle && <p className="text-xs text-zinc-400">{u.jobTitle}</p>}
                        </td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                          {new Date(s.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                          {s.clockOut
                            ? new Date(s.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                          {s.status === "open"
                            ? <span key={tick}>{elapsed(s.clockIn)}</span>
                            : formatDuration(s.durationMins ?? 0)}
                        </td>
                        <td className="px-4 py-3">
                          {s.status === "open" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 text-xs font-medium">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Active
                            </span>
                          ) : (
                            <span className="rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 px-2 py-0.5 text-xs font-medium">
                              Done
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
