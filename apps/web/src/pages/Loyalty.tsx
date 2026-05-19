import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Star, Settings, Gift, X, ChevronDown, ChevronUp } from "lucide-react"
import { fetchWithAuth } from "../lib/fetch-with-auth"
import { useToast } from "../context/toast"
import { TableSkeleton, CardSkeleton } from "../components/Skeleton"

interface LoyaltySettings {
  enabled: boolean
  pointsPerWash: number
  kshPerPoint: number
}

interface LoyaltyAccount {
  _id: string
  customerId: { _id: string; name: string; vehiclePlates: string[] }
  points: number
  totalEarned: number
  totalRedeemed: number
}

interface LoyaltyTransaction {
  _id: string
  type: "earn" | "redeem"
  points: number
  note?: string
  createdAt: string
}

const settingsSchema = z.object({
  enabled: z.boolean(),
  pointsPerWash: z.coerce.number().min(1, "Must be at least 1"),
  kshPerPoint: z.coerce.number().min(0.01, "Must be at least 0.01"),
})
type SettingsForm = z.infer<typeof settingsSchema>

const redeemSchema = z.object({
  points: z.coerce.number().min(1, "Enter points to redeem"),
  note: z.string().optional(),
})
type RedeemForm = z.infer<typeof redeemSchema>

export default function Loyalty() {
  const { add: toast } = useToast()
  const [settings, setSettings] = useState<LoyaltySettings | null>(null)
  const [accounts, setAccounts] = useState<LoyaltyAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [redeeming, setRedeeming] = useState<LoyaltyAccount | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [txns, setTxns] = useState<LoyaltyTransaction[]>([])
  const [txnsLoading, setTxnsLoading] = useState(false)

  const settingsForm = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
  })

  const redeemForm = useForm<RedeemForm>({
    resolver: zodResolver(redeemSchema),
    defaultValues: { points: 0 },
  })

  async function load() {
    setLoading(true)
    const [settingsRes, accountsRes] = await Promise.all([
      fetchWithAuth("/api/loyalty/settings"),
      fetchWithAuth("/api/loyalty"),
    ])
    const sData = await settingsRes.json()
    const aData = await accountsRes.json()
    setSettings(sData.settings)
    setAccounts(aData.accounts ?? [])
    settingsForm.reset({
      enabled: sData.settings?.enabled ?? true,
      pointsPerWash: sData.settings?.pointsPerWash ?? 10,
      kshPerPoint: sData.settings?.kshPerPoint ?? 1,
    })
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function saveSettings(values: SettingsForm) {
    const res = await fetchWithAuth("/api/loyalty/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })
    const data = await res.json()
    if (!res.ok) { toast("error", data.error ?? "Failed to save"); return }
    setSettings(data.settings)
    toast("success", "Settings saved")
    setShowSettings(false)
  }

  async function openRedeem(account: LoyaltyAccount) {
    redeemForm.reset({ points: 0, note: "" })
    setRedeeming(account)
  }

  async function submitRedeem(values: RedeemForm) {
    if (!redeeming) return
    const res = await fetchWithAuth(`/api/loyalty/${redeeming.customerId._id}/redeem`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })
    const data = await res.json()
    if (!res.ok) { toast("error", data.error ?? "Failed to redeem"); return }
    toast("success", `Redeemed ${values.points} pts = KSh ${data.kshValue}`)
    setRedeeming(null)
    load()
  }

  async function toggleExpand(account: LoyaltyAccount) {
    if (expanded === account._id) {
      setExpanded(null)
      return
    }
    setExpanded(account._id)
    setTxnsLoading(true)
    const res = await fetchWithAuth(`/api/loyalty/${account.customerId._id}`)
    const data = await res.json()
    setTxns(data.transactions ?? [])
    setTxnsLoading(false)
  }

  const kshValue = settings ? (redeemForm.watch("points") || 0) * settings.kshPerPoint : 0

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Loyalty</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Reward returning customers</p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-600 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
        >
          <Settings className="h-4 w-4" />
          Settings
        </button>
      </div>

      {/* Settings summary */}
      {settings && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-5 py-4 flex flex-wrap gap-6">
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Status</p>
            <p className={`text-sm font-semibold mt-0.5 ${settings.enabled ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-400"}`}>
              {settings.enabled ? "Enabled" : "Disabled"}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Points per wash</p>
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 mt-0.5">{settings.pointsPerWash} pts</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Redemption rate</p>
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 mt-0.5">1 pt = KSh {settings.kshPerPoint}</p>
          </div>
        </div>
      )}

      {/* Accounts list */}
      {loading ? (
        <TableSkeleton rows={5} />
      ) : accounts.length === 0 ? (
        <div className="text-center py-16 text-zinc-400 dark:text-zinc-500 text-sm">
          No loyalty accounts yet. Points are awarded automatically when a wash is completed.
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
          {accounts.map((account, idx) => (
            <div key={account._id} className={`${idx > 0 ? "border-t border-zinc-100 dark:border-zinc-700" : ""} bg-white dark:bg-zinc-800`}>
              <div className="flex items-center gap-4 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-zinc-800 dark:text-zinc-100 text-sm">{account.customerId?.name ?? "—"}</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate">
                    {account.customerId?.vehiclePlates?.join(", ")}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 justify-end">
                    <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                    <span className="font-semibold text-zinc-800 dark:text-zinc-100 text-sm">{account.points} pts</span>
                  </div>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                    KSh {settings ? account.points * settings.kshPerPoint : "—"} value
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {account.points > 0 && (
                    <button
                      onClick={() => openRedeem(account)}
                      className="flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 text-xs font-medium transition-colors"
                    >
                      <Gift className="h-3.5 w-3.5" />
                      Redeem
                    </button>
                  )}
                  <button
                    onClick={() => toggleExpand(account)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                  >
                    {expanded === account._id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Transactions drawer */}
              {expanded === account._id && (
                <div className="px-4 pb-4 border-t border-zinc-100 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 py-2">Transaction History</p>
                  {txnsLoading ? (
                    <CardSkeleton />
                  ) : txns.length === 0 ? (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 py-2">No transactions yet.</p>
                  ) : (
                    <div className="space-y-1">
                      {txns.map((t) => (
                        <div key={t._id} className="flex items-center gap-3 py-1.5 text-sm">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            t.type === "earn"
                              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                              : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                          }`}>
                            {t.type === "earn" ? `+${t.points}` : `-${t.points}`} pts
                          </span>
                          <span className="flex-1 text-zinc-600 dark:text-zinc-300 text-xs truncate">{t.note}</span>
                          <span className="text-xs text-zinc-400 dark:text-zinc-500 shrink-0">
                            {new Date(t.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Settings modal */}
      {showSettings && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-zinc-800 dark:text-zinc-100">Loyalty Settings</h2>
              <button onClick={() => setShowSettings(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={settingsForm.handleSubmit(saveSettings)} className="space-y-4">
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Enable loyalty programme</span>
                <input type="checkbox" {...settingsForm.register("enabled")} className="h-4 w-4 rounded accent-teal-600" />
              </label>
              <div>
                <label className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 block">Points awarded per wash</label>
                <input type="number" {...settingsForm.register("pointsPerWash")} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                {settingsForm.formState.errors.pointsPerWash && (
                  <p className="text-xs text-red-500 mt-1">{settingsForm.formState.errors.pointsPerWash.message}</p>
                )}
              </div>
              <div>
                <label className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 block">KSh value per point</label>
                <input type="number" step="0.01" {...settingsForm.register("kshPerPoint")} className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                {settingsForm.formState.errors.kshPerPoint && (
                  <p className="text-xs text-red-500 mt-1">{settingsForm.formState.errors.kshPerPoint.message}</p>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowSettings(false)} className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">Cancel</button>
                <button type="submit" disabled={settingsForm.formState.isSubmitting} className="rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-4 py-2 text-sm font-medium transition-colors">
                  {settingsForm.formState.isSubmitting ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Redeem modal */}
      {redeeming && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-zinc-800 dark:text-zinc-100">Redeem Points</h2>
              <button onClick={() => setRedeeming(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="rounded-lg bg-zinc-50 dark:bg-zinc-700/50 px-4 py-3 text-sm">
              <p className="text-zinc-600 dark:text-zinc-300">
                <span className="font-semibold">{redeeming.customerId.name}</span> has{" "}
                <span className="font-semibold text-amber-500">{redeeming.points} pts</span>
              </p>
            </div>
            <form onSubmit={redeemForm.handleSubmit(submitRedeem)} className="space-y-3">
              <div>
                <label className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 block">Points to redeem</label>
                <input
                  type="number"
                  {...redeemForm.register("points")}
                  max={redeeming.points}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                {redeemForm.formState.errors.points && (
                  <p className="text-xs text-red-500 mt-1">{redeemForm.formState.errors.points.message}</p>
                )}
              </div>
              {kshValue > 0 && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">= KSh {kshValue}</p>
              )}
              <div>
                <input
                  {...redeemForm.register("note")}
                  placeholder="Note (optional)"
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white placeholder:text-zinc-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setRedeeming(null)} className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors">Cancel</button>
                <button type="submit" disabled={redeemForm.formState.isSubmitting} className="rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-4 py-2 text-sm font-medium transition-colors">
                  {redeemForm.formState.isSubmitting ? "Redeeming…" : "Redeem"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
