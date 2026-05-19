let refreshing: Promise<boolean> | null = null

function buildOpts(init?: RequestInit): RequestInit {
  const locId = localStorage.getItem("lava:locationId")
  return {
    ...init,
    credentials: "include",
    headers: {
      ...(locId ? { "X-Location-Id": locId } : {}),
      ...(init?.headers ?? {}),
    },
  }
}

export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const opts = buildOpts(init)
  const res = await fetch(input, opts)

  if (res.status !== 401) return res

  if (!refreshing) {
    refreshing = fetch("/api/auth/refresh", { method: "POST", credentials: "include" })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => { refreshing = null })
  }

  const refreshed = await refreshing
  if (!refreshed) {
    window.location.href = "/login"
    return res
  }

  return fetch(input, buildOpts(init))
}
