import { createContext, useContext, useEffect, useState } from "react"
import type { ReactNode } from "react"
import { authClient, type AuthUser } from "../lib/auth-client"

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  setUser: (user: AuthUser | null) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function init() {
      let { data } = await authClient.me()

      if (!data) {
        // Access token may be expired — attempt a silent refresh before giving up
        const { error } = await authClient.refresh()
        if (!error) {
          const retried = await authClient.me()
          data = retried.data
        }
      }

      setUser(data?.user ?? null)
      setIsLoading(false)
    }

    init()
  }, [])

  async function logout() {
    await authClient.logout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
