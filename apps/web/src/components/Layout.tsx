import { useState } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import {
  LayoutDashboard, ListOrdered, Wrench, Users, UserCircle,
  BarChart2, BadgeCheck, MapPin, ChevronDown, Menu, X, Moon, Sun,
  Package, Clock, Star,
} from "lucide-react"
import { useAuth } from "../context/auth"
import { useLocation } from "../context/location"
import { useDarkMode } from "../lib/useDarkMode"

const NAV_GROUPS = [
  {
    label: "Operations",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/queue",     label: "Queue",      icon: ListOrdered },
    ],
  },
  {
    label: "Setup",
    items: [
      { to: "/services",  label: "Services",   icon: Wrench },
      { to: "/inventory", label: "Inventory",  icon: Package },
    ],
  },
  {
    label: "Customers",
    items: [
      { to: "/customers",   label: "Customers",   icon: UserCircle },
      { to: "/memberships", label: "Memberships", icon: BadgeCheck },
      { to: "/loyalty",     label: "Loyalty",     icon: Star },
    ],
  },
  {
    label: "Team",
    items: [
      { to: "/staff",  label: "Staff",  icon: Users },
      { to: "/shifts", label: "Shifts", icon: Clock },
    ],
  },
  {
    label: "Business",
    items: [
      { to: "/reports",   label: "Reports",   icon: BarChart2 },
      { to: "/locations", label: "Locations", icon: MapPin },
    ],
  },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const { locations, activeLocation, activeLocationId, switchLocation } = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [locOpen, setLocOpen] = useState(false)
  const [dark, setDark] = useDarkMode()

  async function handleLogout() {
    await logout()
    navigate("/login")
  }

  function handleSwitchLocation(id: string) {
    switchLocation(id)
    setLocOpen(false)
    setOpen(false)
  }

  const locationPicker = locations.length > 0 && (
    <div className="relative px-3 py-2 border-b border-white/10">
      <button
        onClick={() => setLocOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <MapPin size={13} className="text-white/50 shrink-0" />
          <span className="text-white/80 text-xs font-medium truncate">
            {activeLocation?.name ?? "Select location"}
          </span>
        </div>
        <ChevronDown size={13} className={`text-white/40 shrink-0 transition-transform ${locOpen ? "rotate-180" : ""}`} />
      </button>
      {locOpen && (
        <div className="absolute left-3 right-3 top-full mt-1 bg-[#162d4a] border border-white/10 rounded-lg overflow-hidden z-50 shadow-lg">
          {locations.map((loc) => (
            <button
              key={loc._id}
              onClick={() => handleSwitchLocation(loc._id)}
              className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                loc._id === activeLocationId
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              {loc.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  const sidebar = (
    <aside className="w-56 bg-[#1E3A5F] flex flex-col h-full">
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white tracking-tight">lava</h1>
        <button onClick={() => setOpen(false)} className="lg:hidden text-white/60 hover:text-white p-1">
          <X size={18} />
        </button>
      </div>

      {locationPicker}

      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-white/30">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"
                    }`
                  }
                >
                  <Icon size={15} />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-white/10">
        <p className="text-white/80 text-sm font-medium truncate">{user?.name}</p>
        <p className="text-white/40 text-xs capitalize mb-3">{user?.role}</p>
        <div className="flex items-center justify-between">
          <button onClick={handleLogout} className="text-white/40 text-xs hover:text-white/80 transition-colors">
            Sign out
          </button>
          <button
            onClick={() => setDark(!dark)}
            className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen bg-[#F8FAFC] dark:bg-slate-900 overflow-hidden">
      <div className="hidden lg:flex shrink-0">{sidebar}</div>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-y-0 left-0 w-56" onClick={(e) => e.stopPropagation()}>
            {sidebar}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="lg:hidden bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3 shrink-0">
          <button
            onClick={() => setOpen(true)}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Menu size={20} />
          </button>
          <h1 className="text-lg font-bold text-[#1E3A5F] dark:text-white">lava</h1>
          {activeLocation && (
            <span className="text-xs text-slate-400 dark:text-slate-500 truncate">{activeLocation.name}</span>
          )}
          <div className="flex-1" />
          <button
            onClick={() => setDark(!dark)}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>

        <main key={activeLocationId ?? "none"} className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
