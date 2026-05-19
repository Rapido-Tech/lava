import { SignJWT, jwtVerify } from "jose"
import { randomBytes } from "crypto"

function getSecret() {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error("JWT_SECRET is not set")
  return new TextEncoder().encode(s)
}

export async function signAccessToken(payload: { userId: string; role: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("15m")
    .sign(getSecret())
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, getSecret())
  return payload as { userId: string; role: string }
}

export function generateRefreshToken(): string {
  return randomBytes(40).toString("hex")
}
