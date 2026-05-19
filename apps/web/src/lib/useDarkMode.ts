import { useEffect, useState } from "react"

export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem("lava:darkMode")
    if (stored !== null) return stored === "true"
    return window.matchMedia("(prefers-color-scheme: dark)").matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
    localStorage.setItem("lava:darkMode", String(dark))
  }, [dark])

  return [dark, setDark] as const
}
