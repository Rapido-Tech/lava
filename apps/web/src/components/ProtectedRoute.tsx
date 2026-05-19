import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/auth"

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const { pathname } = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <p className="text-slate-500 text-sm">Loading…</p>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (!user.accountId && pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}
