import { createContext, useContext, useEffect, useState } from "react"
import type { ReactNode } from "react"
import { fetchWithAuth } from "../lib/fetch-with-auth"
import { useAuth } from "./auth"

interface LocationInfo {
  _id: string
  name: string
  address: string
  timezone: string
}

interface LocationContextType {
  locations: LocationInfo[]
  activeLocationId: string | null
  activeLocation: LocationInfo | null
  switchLocation: (id: string) => void
  reload: () => Promise<void>
}

const LocationContext = createContext<LocationContextType | null>(null)

export function LocationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [locations, setLocations] = useState<LocationInfo[]>([])
  const [activeLocationId, setActiveLocationId] = useState<string | null>(
    () => localStorage.getItem("lava:locationId")
  )

  async function load() {
    if (!user?.accountId) return
    const res = await fetchWithAuth("/api/locations")
    if (!res.ok) return
    const json = await res.json()
    const locs: LocationInfo[] = json.locations ?? []
    setLocations(locs)

    // Validate stored id still exists; fall back to first
    const stored = localStorage.getItem("lava:locationId")
    const valid = stored && locs.some((l) => l._id === stored) ? stored : locs[0]?._id ?? null
    if (valid !== stored) {
      if (valid) localStorage.setItem("lava:locationId", valid)
      else localStorage.removeItem("lava:locationId")
    }
    setActiveLocationId(valid)
  }

  useEffect(() => { load() }, [user?.accountId])

  function switchLocation(id: string) {
    localStorage.setItem("lava:locationId", id)
    setActiveLocationId(id)
  }

  const activeLocation = locations.find((l) => l._id === activeLocationId) ?? null

  return (
    <LocationContext.Provider value={{ locations, activeLocationId, activeLocation, switchLocation, reload: load }}>
      {children}
    </LocationContext.Provider>
  )
}

export function useLocation() {
  const ctx = useContext(LocationContext)
  if (!ctx) throw new Error("useLocation must be used within LocationProvider")
  return ctx
}
