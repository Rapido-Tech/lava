import dns from "dns"
dns.setDefaultResultOrder("ipv4first")
dns.setServers(["8.8.8.8", "8.8.4.4"])

import { Hono } from "hono"
import { cors } from "hono/cors"
import { connectDB } from "./db"
import { securityHeaders } from "./middleware/securityHeaders"
import authRoutes from "./routes/auth"
import onboardingRoutes from "./routes/onboarding"
import servicesRoutes from "./routes/services"
import queueRoutes from "./routes/queue"
import staffRoutes from "./routes/staff"
import customersRoutes from "./routes/customers"
import reportsRoutes from "./routes/reports"
import membershipsRoutes from "./routes/memberships"
import locationsRoutes from "./routes/locations"
import shiftsRoutes from "./routes/shifts"
import inventoryRoutes from "./routes/inventory"
import loyaltyRoutes from "./routes/loyalty"

const ALLOWED_ORIGINS = new Set(
  (process.env.CORS_ORIGINS ?? "http://localhost:5173,http://localhost:4173").split(",").map((o) => o.trim())
)

const app = new Hono()

app.use("*", securityHeaders)
app.use(
  "*",
  cors({
    origin: (origin) => (origin && ALLOWED_ORIGINS.has(origin) ? origin : null),
    credentials: true,
  })
)

app.get("/health", (c) => c.json({ ok: true }))
app.route("/api/auth", authRoutes)
app.route("/api/onboarding", onboardingRoutes)
app.route("/api/services", servicesRoutes)
app.route("/api/queue", queueRoutes)
app.route("/api/staff", staffRoutes)
app.route("/api/customers", customersRoutes)
app.route("/api/reports", reportsRoutes)
app.route("/api/memberships", membershipsRoutes)
app.route("/api/locations", locationsRoutes)
app.route("/api/shifts", shiftsRoutes)
app.route("/api/inventory", inventoryRoutes)
app.route("/api/loyalty", loyaltyRoutes)

connectDB()
  .then(() => console.log("API ready"))
  .catch((e) => console.error("MongoDB connection failed:", e.message))

export default {
  port: 3000,
  fetch: app.fetch,
}
