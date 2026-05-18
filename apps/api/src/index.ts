import { Hono } from "hono"
import { cors } from "hono/cors"
import { connectDB } from "./db"
import { auth } from "./auth"

const app = new Hono()

app.use(
  "*",
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
)

app.on(["GET", "POST"], "/api/auth/**", (c) => auth.handler(c.req.raw))

app.get("/health", (c) => c.json({ ok: true }))

connectDB()

export default {
  port: 3000,
  fetch: app.fetch,
}
