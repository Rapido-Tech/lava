import { Hono } from "hono"
import type { Env } from "../hono"
import { setCookie, getCookie, deleteCookie } from "hono/cookie"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { User } from "../models/user"
import { RefreshToken } from "../models/refresh-token"
import { signAccessToken, generateRefreshToken } from "../lib/jwt"
import { requireAuth } from "../middleware/requireAuth"
import { rateLimit } from "../middleware/rateLimit"

const auth = new Hono<Env>()

const isProd = process.env.NODE_ENV === "production"

const COOKIE_BASE = {
  httpOnly: true,
  secure: isProd,
  sameSite: "Lax",
  path: "/",
} as const

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter"),
})

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
})

function setAuthCookies(c: any, accessToken: string, refreshToken: string) {
  setCookie(c, "accessToken", accessToken, { ...COOKIE_BASE, maxAge: 15 * 60 })
  setCookie(c, "refreshToken", refreshToken, {
    ...COOKIE_BASE,
    maxAge: 7 * 24 * 60 * 60,
    path: "/api/auth/refresh",
  })
}

auth.post("/signup", rateLimit(3, 10 * 60 * 1000), async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: "Invalid JSON" }, 400)

  const parsed = signupSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0].message }, 400)
  }

  const { name, email, password } = parsed.data

  const existing = await User.findOne({ email: email.toLowerCase() })
  if (existing) return c.json({ error: "Email already in use" }, 400)

  const hashed = await bcrypt.hash(password, 10)
  const user = await User.create({ name, email, password: hashed })

  const accessToken = await signAccessToken({ userId: user._id.toString(), role: user.role })
  const refreshToken = generateRefreshToken()

  await RefreshToken.create({
    token: refreshToken,
    userId: user._id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  })

  setAuthCookies(c, accessToken, refreshToken)

  return c.json(
    {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        accountId: user.accountId?.toString() ?? null,
      },
    },
    201
  )
})

auth.post("/login", rateLimit(5, 60 * 1000), async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: "Invalid JSON" }, 400)

  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0].message }, 400)
  }

  const { email, password } = parsed.data

  const user = await User.findOne({ email: email.toLowerCase() })
  if (!user) return c.json({ error: "Invalid credentials" }, 401)

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) return c.json({ error: "Invalid credentials" }, 401)

  // Invalidate any existing refresh tokens for this user
  await RefreshToken.deleteMany({ userId: user._id })

  const accessToken = await signAccessToken({ userId: user._id.toString(), role: user.role })
  const refreshToken = generateRefreshToken()

  await RefreshToken.create({
    token: refreshToken,
    userId: user._id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  })

  setAuthCookies(c, accessToken, refreshToken)

  return c.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      accountId: user.accountId?.toString() ?? null,
    },
  })
})

auth.post("/refresh", async (c) => {
  const token = getCookie(c, "refreshToken")
  if (!token) return c.json({ error: "No refresh token" }, 401)

  const stored = await RefreshToken.findOne({
    token,
    expiresAt: { $gt: new Date() },
  })
  if (!stored) return c.json({ error: "Invalid or expired refresh token" }, 401)

  const user = await User.findById(stored.userId)
  if (!user) return c.json({ error: "User not found" }, 401)

  // Rotate: replace old refresh token with a new one
  const newRefreshToken = generateRefreshToken()
  stored.token = newRefreshToken
  stored.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await stored.save()

  const accessToken = await signAccessToken({ userId: user._id.toString(), role: user.role })
  setAuthCookies(c, accessToken, newRefreshToken)

  return c.json({ ok: true })
})

auth.get("/me", requireAuth, async (c) => {
  const user = await User.findById(c.get("userId")).select("-password")
  if (!user) return c.json({ error: "User not found" }, 404)
  return c.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      accountId: user.accountId?.toString() ?? null,
    },
  })
})

auth.post("/logout", async (c) => {
  const token = getCookie(c, "refreshToken")
  if (token) await RefreshToken.deleteOne({ token })

  deleteCookie(c, "accessToken", { path: "/" })
  deleteCookie(c, "refreshToken", { path: "/api/auth/refresh" })

  return c.json({ ok: true })
})

export default auth
