export interface AuthUser {
  id: string
  name: string
  email: string
  role: string
  accountId: string | null
}

async function post<T>(path: string, body?: object): Promise<{ data?: T; error?: string }> {
  const res = await fetch(`/api/auth${path}`, {
    method: "POST",
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) return { error: json.error ?? "Something went wrong" }
  return { data: json }
}

async function get<T>(path: string): Promise<{ data?: T; error?: string }> {
  const res = await fetch(`/api/auth${path}`, { credentials: "include" })
  if (res.status === 401) return { error: "Unauthorized" }
  const json = await res.json().catch(() => ({}))
  if (!res.ok) return { error: json.error ?? "Something went wrong" }
  return { data: json }
}

export const authClient = {
  signUp: (data: { name: string; email: string; password: string }) =>
    post<{ user: AuthUser }>("/signup", data),

  signIn: (data: { email: string; password: string }) =>
    post<{ user: AuthUser }>("/login", data),

  refresh: () => post("/refresh"),

  me: () => get<{ user: AuthUser }>("/me"),

  logout: () => post("/logout"),
}
