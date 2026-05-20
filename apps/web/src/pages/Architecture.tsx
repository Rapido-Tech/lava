import { useCallback } from "react"
import { useNavigate } from "react-router-dom"
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  MarkerType,
  BackgroundVariant,
  NodeTypes,
  Handle,
  Position,
} from "reactflow"
import "reactflow/dist/style.css"

// ─── Custom node ──────────────────────────────────────────────────────────────

function ArchNode({ data }: { data: { label: string; sub?: string; color: string; border: string; text: string } }) {
  return (
    <div
      style={{
        background: data.color,
        border: `1.5px solid ${data.border}`,
        color: data.text,
        borderRadius: 8,
        padding: "7px 14px",
        fontSize: 11,
        fontFamily: "ui-monospace, monospace",
        minWidth: 160,
        maxWidth: 220,
        textAlign: "center",
        boxShadow: "0 1px 4px rgba(0,0,0,.08)",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: data.border, border: "none", width: 7, height: 7 }} />
      <div style={{ fontWeight: 700, lineHeight: 1.3 }}>{data.label}</div>
      {data.sub && (
        <div style={{ fontSize: 9, opacity: 0.68, marginTop: 3, fontWeight: 400, lineHeight: 1.4 }}>
          {data.sub}
        </div>
      )}
      <Handle type="source" position={Position.Right} style={{ background: data.border, border: "none", width: 7, height: 7 }} />
    </div>
  )
}

const nodeTypes: NodeTypes = { arch: ArchNode }

// ─── Palette ──────────────────────────────────────────────────────────────────

const P = {
  client:     { color: "#dbeafe", border: "#3b82f6", text: "#1e3a8a" },
  frontend:   { color: "#e0e7ff", border: "#6366f1", text: "#312e81" },
  page:       { color: "#ede9fe", border: "#8b5cf6", text: "#4c1d95" },
  gateway:    { color: "#f0fdfa", border: "#0d9488", text: "#134e4a" },
  middleware: { color: "#fffbeb", border: "#f59e0b", text: "#78350f" },
  route:      { color: "#f0fdf4", border: "#16a34a", text: "#14532d" },
  model:      { color: "#faf5ff", border: "#a855f7", text: "#581c87" },
  external:   { color: "#fff1f2", border: "#f43f5e", text: "#881337" },
} as const

type Cat = keyof typeof P

function n(id: string, label: string, x: number, y: number, cat: Cat, sub?: string): Node {
  return {
    id,
    type: "arch",
    position: { x, y },
    data: { label, sub, ...P[cat] },
  }
}

function e(
  id: string,
  source: string,
  target: string,
  opts: { label?: string; color?: string; animated?: boolean; dashed?: boolean } = {}
): Edge {
  const color = opts.color ?? "#94a3b8"
  return {
    id,
    source,
    target,
    label: opts.label,
    animated: opts.animated,
    style: {
      stroke: color,
      strokeWidth: 1.5,
      strokeDasharray: opts.dashed ? "5 4" : undefined,
    },
    markerEnd: { type: MarkerType.ArrowClosed, color, width: 14, height: 14 },
    labelStyle: { fontSize: 9, fill: "#475569", fontFamily: "ui-monospace, monospace" },
    labelBgStyle: { fill: "#f8fafc", opacity: 0.9 },
    labelBgPadding: [3, 4] as [number, number],
    labelBgBorderRadius: 3,
  }
}

// ─── Nodes ────────────────────────────────────────────────────────────────────
//
//  Col A  x=0     Browser
//  Col B  x=220   Frontend core
//  Col C  x=460   Pages
//  Col D  x=730   API gateway
//  Col E  x=960   Middleware / auth route
//  Col F  x=1200  Business routes
//  Col G  x=1460  Models
//  Col H  x=1730  External

const nodes: Node[] = [
  // ── A: Client ───────────────────────────────────────────────
  n("browser", "🌐 Browser", 0, 620, "client", "React SPA · Vite · Tailwind CSS v4"),

  // ── B: Frontend infrastructure ──────────────────────────────
  n("fetch-auth",      "fetchWithAuth",    220, 420, "frontend", "Injects cookie + X-Location-Id\n401 → /auth/refresh → retry"),
  n("auth-ctx",        "AuthProvider",     220, 560, "frontend", "user state · logout()"),
  n("loc-ctx",         "LocationProvider", 220, 660, "frontend", "activeLocation · switchLocation()\nlocalStorage lava:locationId"),
  n("toast-ctx",       "ToastProvider",    220, 760, "frontend", "toast queue · auto-dismiss 4 s"),
  n("err-boundary",    "ErrorBoundary",    220, 860, "frontend", "catches render errors → Try again"),
  n("protected-route", "ProtectedRoute",   220, 960, "frontend", "redirects → /login if unauthenticated"),

  // ── C: Pages ────────────────────────────────────────────────
  // Public
  n("pg-login",       "Login",       460, 400, "page", "POST /auth/login"),
  n("pg-signup",      "Signup",      460, 490, "page", "POST /auth/signup"),
  n("pg-onboarding",  "Onboarding",  460, 580, "page", "POST /onboarding"),
  // Protected
  n("pg-dashboard",   "Dashboard",   460, 690, "page", "GET /queue/stats"),
  n("pg-queue",       "Queue",       460, 780, "page", "GET · POST check-in · PATCH status\npayment dialog · print receipt"),
  n("pg-services",    "Services",    460, 890, "page", "CRUD wash packages"),
  n("pg-staff",       "Staff",       460, 970, "page", "Invite · set role · remove"),
  n("pg-customers",   "Customers",   460, 1050, "page", "CRUD + search"),
  n("pg-memberships", "Memberships", 460, 1130, "page", "Plans · assign monthly/passes"),
  n("pg-loyalty",     "Loyalty",     460, 1210, "page", "Settings · balances · redeem"),
  n("pg-inventory",   "Inventory",   460, 1290, "page", "Stock levels · log use/restock"),
  n("pg-shifts",      "Shifts",      460, 1370, "page", "Clock in/out · today's staff"),
  n("pg-reports",     "Reports",     460, 1450, "page", "Revenue · by service · daily chart"),
  n("pg-locations",   "Locations",   460, 1530, "page", "CRUD locations · switcher"),

  // ── D: API gateway ──────────────────────────────────────────
  n("bun",      "⚡ Bun HTTP :3000", 730, 540, "gateway", "Hono framework"),
  n("cors",     "CORS",              730, 650, "gateway", "Exact Set lookup · CORS_ORIGINS env"),
  n("sec-hdrs", "securityHeaders",   730, 750, "gateway", "X-Frame-Options · X-Content-Type\nReferrer-Policy · X-XSS-Protection"),

  // ── E: Auth / middleware ─────────────────────────────────────
  n("route-auth",  "/api/auth",       960, 300, "route",      "signup · login · me · logout\nrefresh (token rotation)"),
  n("rate-limit",  "rateLimit",       960, 480, "middleware",  "IP sliding window\nmaybePurge() at 5k entries"),
  n("req-auth",    "requireAuth",     960, 650, "middleware",  "Verify accessToken JWT cookie\n→ sets userId + role on ctx"),
  n("req-loc",     "requireLocation", 960, 780, "middleware",  "Validate X-Location-Id header\nfallback → locationIds[0]"),

  // ── F: Business routes ──────────────────────────────────────
  n("rt-onboarding",  "/api/onboarding",  1200, 300,  "route", "Create Account + Location + Service defaults"),
  n("rt-queue",       "/api/queue",       1200, 440,  "route", "GET active · POST check-in · PATCH status\naward loyalty + decrement pass + SMS"),
  n("rt-services",    "/api/services",    1200, 570,  "route", "CRUD wash packages"),
  n("rt-customers",   "/api/customers",   1200, 660,  "route", "CRUD · search with escaped regex"),
  n("rt-staff",       "/api/staff",       1200, 750,  "route", "Invite · PATCH role · DELETE"),
  n("rt-memberships", "/api/memberships", 1200, 840,  "route", "Plans CRUD · assign · revoke\nlazy expiry on GET"),
  n("rt-loyalty",     "/api/loyalty",     1200, 940,  "route", "Settings · accounts · redeem\nrate-limited: 10 req/min"),
  n("rt-inventory",   "/api/inventory",   1200, 1040, "route", "Items CRUD · stock log"),
  n("rt-shifts",      "/api/shifts",      1200, 1130, "route", "clock-in · clock-out · list today"),
  n("rt-reports",     "/api/reports",     1200, 1220, "route", "Revenue · by service · by method\ndaily bars (uses payment.amount)"),
  n("rt-locations",   "/api/locations",   1200, 1310, "route", "CRUD locations for account"),

  // ── G: Models ───────────────────────────────────────────────
  n("m-user",        "User",               1460, 260,  "model", "name · email · bcrypt hash\nrole · jobTitle · locationIds[]"),
  n("m-account",     "Account",            1460, 360,  "model", "name · plan"),
  n("m-refresh",     "RefreshToken",       1460, 450,  "model", "token · userId · expiresAt\nTTL index · rotated on every use"),
  n("m-location",    "Location",           1460, 550,  "model", "name · address · accountId"),
  n("m-service",     "Service",            1460, 640,  "model", "name · price · durationMins · category"),
  n("m-queue",       "QueueEntry",         1460, 740,  "model", "plate · status · payment · customerId\nIdx (locationId, status, completedAt)"),
  n("m-customer",    "Customer",           1460, 860,  "model", "name · phone · vehiclePlates[]"),
  n("m-mem-plan",    "MembershipPlan",     1460, 950,  "model", "monthly | passes · price"),
  n("m-membership",  "CustomerMembership", 1460, 1040, "model", "status · passesUsed/Total · endDate"),
  n("m-shift",       "Shift",              1460, 1130, "model", "clockIn · clockOut · durationMins · status"),
  n("m-inv-item",    "InventoryItem",      1460, 1220, "model", "currentStock(min:0) · lowStockThreshold"),
  n("m-inv-log",     "InventoryLog",       1460, 1310, "model", "type: restock|use · qty\nIdx (itemId, createdAt)"),
  n("m-loy-set",     "LoyaltySettings",    1460, 1400, "model", "enabled · pointsPerWash · kshPerPoint\nunique per locationId"),
  n("m-loy-acc",     "LoyaltyAccount",     1460, 1490, "model", "points · totalEarned · totalRedeemed\nunique (customerId, locationId)"),
  n("m-loy-tx",      "LoyaltyTransaction", 1460, 1580, "model", "earn | redeem · points · note\nIdx (loyaltyAccountId, createdAt)"),

  // ── H: External services ────────────────────────────────────
  n("mongodb", "🍃 MongoDB Atlas", 1730, 900,  "external", "All models stored here\nSRV resolved via ipv4first DNS"),
  n("twilio",  "📱 Twilio SMS",    1730, 1200, "external", "Fires on queue status=ready\nSilent skip if TWILIO_* unset"),
]

// ─── Edges ────────────────────────────────────────────────────────────────────

const edges: Edge[] = [
  // Browser ↔ frontend core
  e("b-fetch",    "browser",   "fetch-auth", { color: "#3b82f6", animated: true }),
  e("b-auth-ctx", "browser",   "auth-ctx",   { color: "#6366f1" }),
  e("b-loc-ctx",  "browser",   "loc-ctx",    { color: "#6366f1" }),

  // Pages use fetchWithAuth (representative)
  e("pg-login-f",    "pg-login",    "fetch-auth", { color: "#8b5cf6" }),
  e("pg-dash-f",     "pg-dashboard","fetch-auth", { color: "#8b5cf6" }),
  e("pg-queue-f",    "pg-queue",    "fetch-auth", { color: "#8b5cf6" }),
  e("pg-loy-f",      "pg-loyalty",  "fetch-auth", { color: "#8b5cf6" }),
  e("pg-inv-f",      "pg-inventory","fetch-auth", { color: "#8b5cf6" }),

  // ProtectedRoute guards all protected pages
  e("prot-dash",  "protected-route", "pg-dashboard",   { color: "#6366f1", dashed: true, label: "guards" }),
  e("prot-queue", "protected-route", "pg-queue",       { color: "#6366f1", dashed: true }),
  e("prot-shift", "protected-route", "pg-shifts",      { color: "#6366f1", dashed: true }),

  // fetchWithAuth → Bun (all requests)
  e("fetch-bun", "fetch-auth", "bun", { color: "#0d9488", animated: true, label: "HTTP/JSON" }),

  // Auth refresh loop
  e("fetch-refresh", "fetch-auth", "route-auth", { color: "#ef4444", animated: true, dashed: true, label: "401 → refresh" }),

  // Bun middleware chain
  e("bun-cors",     "bun",      "cors",     { color: "#0d9488" }),
  e("cors-sec",     "cors",     "sec-hdrs", { color: "#0d9488" }),

  // Gateway → rate-limit (auth routes) vs requireAuth (protected routes)
  e("sec-rate",    "sec-hdrs", "rate-limit",  { color: "#f59e0b", label: "/auth + /onboarding" }),
  e("sec-reqauth", "sec-hdrs", "req-auth",    { color: "#f59e0b", label: "all protected routes" }),

  // Rate-limit → auth + onboarding
  e("rate-auth",    "rate-limit", "route-auth",    { color: "#16a34a" }),
  e("rate-onboard", "rate-limit", "rt-onboarding", { color: "#16a34a" }),

  // requireAuth → requireLocation → business routes
  e("auth-loc",  "req-auth", "req-loc",         { color: "#f59e0b" }),
  e("loc-queue", "req-loc",  "rt-queue",        { color: "#16a34a" }),
  e("loc-svc",   "req-loc",  "rt-services",     { color: "#16a34a" }),
  e("loc-cust",  "req-loc",  "rt-customers",    { color: "#16a34a" }),
  e("loc-staff", "req-loc",  "rt-staff",        { color: "#16a34a" }),
  e("loc-mem",   "req-loc",  "rt-memberships",  { color: "#16a34a" }),
  e("loc-loy",   "req-loc",  "rt-loyalty",      { color: "#16a34a" }),
  e("loc-inv",   "req-loc",  "rt-inventory",    { color: "#16a34a" }),
  e("loc-shift", "req-loc",  "rt-shifts",       { color: "#16a34a" }),
  e("loc-rep",   "req-loc",  "rt-reports",      { color: "#16a34a" }),
  e("loc-loc",   "req-loc",  "rt-locations",    { color: "#16a34a" }),

  // Auth route → models
  e("auth-user",    "route-auth", "m-user",    { color: "#a855f7", label: "bcrypt hash/verify" }),
  e("auth-refresh", "route-auth", "m-refresh", { color: "#a855f7", label: "rotate on use" }),

  // Onboarding → models
  e("ob-account",  "rt-onboarding", "m-account",  { color: "#a855f7" }),
  e("ob-location", "rt-onboarding", "m-location", { color: "#a855f7" }),
  e("ob-service",  "rt-onboarding", "m-service",  { color: "#a855f7", label: "seed defaults" }),
  e("ob-user",     "rt-onboarding", "m-user",     { color: "#a855f7", label: "assign location" }),

  // Queue → models (most complex route)
  e("q-entry",   "rt-queue", "m-queue",      { color: "#a855f7" }),
  e("q-cust",    "rt-queue", "m-customer",   { color: "#a855f7", label: "plate lookup (escaped regex)" }),
  e("q-mem",     "rt-queue", "m-membership", { color: "#a855f7", label: "decrement pass on complete" }),
  e("q-loyset",  "rt-queue", "m-loy-set",   { color: "#a855f7", label: "on complete" }),
  e("q-loyacc",  "rt-queue", "m-loy-acc",   { color: "#a855f7", label: "+points upsert" }),
  e("q-loytx",   "rt-queue", "m-loy-tx",   { color: "#a855f7", label: "earn transaction" }),
  e("q-sms",     "rt-queue", "twilio",      { color: "#f43f5e", animated: true, label: "status = ready" }),

  // Services → model
  e("svc-m",  "rt-services",    "m-service",    { color: "#a855f7" }),
  // Customers → model
  e("cust-m", "rt-customers",   "m-customer",   { color: "#a855f7" }),
  // Staff → user model
  e("staff-m","rt-staff",       "m-user",       { color: "#a855f7" }),
  // Memberships → models
  e("mem-p",  "rt-memberships", "m-mem-plan",   { color: "#a855f7" }),
  e("mem-m",  "rt-memberships", "m-membership", { color: "#a855f7" }),
  e("mem-c",  "rt-memberships", "m-customer",   { color: "#a855f7", label: "assign by plate" }),
  // Loyalty → models
  e("loy-s",  "rt-loyalty",     "m-loy-set",   { color: "#a855f7" }),
  e("loy-a",  "rt-loyalty",     "m-loy-acc",   { color: "#a855f7" }),
  e("loy-t",  "rt-loyalty",     "m-loy-tx",   { color: "#a855f7" }),
  // Inventory → models
  e("inv-i",  "rt-inventory",   "m-inv-item",  { color: "#a855f7" }),
  e("inv-l",  "rt-inventory",   "m-inv-log",   { color: "#a855f7" }),
  // Shifts → models
  e("sh-m",   "rt-shifts",      "m-shift",     { color: "#a855f7" }),
  e("sh-u",   "rt-shifts",      "m-user",      { color: "#a855f7", label: "userId" }),
  // Reports → queue entries
  e("rep-q",  "rt-reports",     "m-queue",     { color: "#a855f7", label: "aggregate completed" }),
  // Locations → models
  e("lc-l",   "rt-locations",   "m-location",  { color: "#a855f7" }),
  e("lc-a",   "rt-locations",   "m-account",   { color: "#a855f7" }),

  // All models → MongoDB
  ...[
    "m-user","m-account","m-refresh","m-location","m-service",
    "m-queue","m-customer","m-mem-plan","m-membership","m-shift",
    "m-inv-item","m-inv-log","m-loy-set","m-loy-acc","m-loy-tx",
  ].map((id) => e(`${id}-db`, id, "mongodb", { color: "#f43f5e" })),
]

// ─── Legend ──────────────────────────────────────────────────────────────────

const LEGEND: { label: string; cat: Cat }[] = [
  { label: "Browser / Client",    cat: "client" },
  { label: "Frontend (React)",    cat: "frontend" },
  { label: "Page component",      cat: "page" },
  { label: "API gateway",         cat: "gateway" },
  { label: "Middleware",          cat: "middleware" },
  { label: "Route handler",       cat: "route" },
  { label: "Mongoose model",      cat: "model" },
  { label: "External service",    cat: "external" },
]

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Architecture() {
  const navigate = useNavigate()

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#0f172a", display: "flex", flexDirection: "column" }}>
      {/* Topbar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16,
        padding: "10px 16px",
        background: "#1e293b",
        borderBottom: "1px solid #334155",
        flexShrink: 0,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: "transparent", border: "1px solid #475569",
            color: "#94a3b8", borderRadius: 6, padding: "4px 12px",
            fontSize: 12, cursor: "pointer", fontFamily: "ui-monospace, monospace",
          }}
        >
          ← back
        </button>
        <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 14, fontFamily: "ui-monospace, monospace" }}>
          lava — architecture map
        </span>
        <span style={{ color: "#64748b", fontSize: 11, fontFamily: "ui-monospace, monospace" }}>
          scroll to zoom · drag to pan · click nodes to inspect
        </span>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.08 }}
          minZoom={0.15}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} color="#1e293b" gap={24} size={1.5} />
          <Controls
            style={{ background: "#1e293b", border: "1px solid #334155" }}
          />
          <MiniMap
            style={{ background: "#1e293b", border: "1px solid #334155" }}
            nodeColor={(node) => {
              const data = node.data as { border: string }
              return data.border ?? "#475569"
            }}
            maskColor="rgba(0,0,0,0.5)"
          />

          {/* Legend */}
          <div style={{
            position: "absolute", bottom: 80, left: 12, zIndex: 10,
            background: "#1e293b", border: "1px solid #334155",
            borderRadius: 8, padding: "10px 14px",
          }}>
            <div style={{ color: "#94a3b8", fontSize: 10, fontFamily: "ui-monospace, monospace", marginBottom: 8, fontWeight: 700 }}>
              LEGEND
            </div>
            {LEGEND.map(({ label, cat }) => (
              <div key={cat} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <div style={{
                  width: 14, height: 14, borderRadius: 3,
                  background: P[cat].color,
                  border: `1.5px solid ${P[cat].border}`,
                  flexShrink: 0,
                }} />
                <span style={{ color: "#cbd5e1", fontSize: 10, fontFamily: "ui-monospace, monospace" }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </ReactFlow>
      </div>
    </div>
  )
}
