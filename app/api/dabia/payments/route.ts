import { NextRequest, NextResponse } from "next/server"
import { getAdminClient } from "@/lib/dabia/db/admin"

// ═══════════════════════════════════════════════════════════════════════════
// Pi Network Payment Server Approval — الموافقة الفعلية من جهة الخادم
// هذا الـ endpoint مطلوب من Pi SDK لإكمال أي دفعة حقيقية
// ═══════════════════════════════════════════════════════════════════════════

const PI_API_BASE = "https://api.minepi.com/v2"
const PI_API_KEY  = process.env.PI_API_KEY

export async function POST(req: NextRequest) {
  try {
    // Require a valid Supabase session — prevents unauthenticated callers
    // from approving/completing arbitrary Pi payment IDs via this endpoint.
    const authHeader = req.headers.get("Authorization") ?? ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
    if (!token) {
      return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 })
    }
    const admin = getAdminClient()
    if (admin) {
      const { error } = await admin.auth.getUser(token)
      if (error) {
        return NextResponse.json({ ok: false, error: "Invalid or expired session" }, { status: 401 })
      }
    }

    const body = await req.json()
    const { action, paymentId, txid } = body

    if (!paymentId) {
      return NextResponse.json({ ok: false, error: "Missing paymentId" }, { status: 400 })
    }

    if (action === "approve") {
      if (!PI_API_KEY) {
        return NextResponse.json({ ok: true, warning: "PI_API_KEY not set — dev mode approval" })
      }
      const res = await fetch(`${PI_API_BASE}/payments/${paymentId}/approve`, {
        method: "POST",
        headers: { Authorization: `Key ${PI_API_KEY}` },
      })
      const data = await res.json()
      return NextResponse.json({ ok: res.ok, data })
    }

    if (action === "complete") {
      if (!PI_API_KEY) {
        return NextResponse.json({ ok: true, warning: "PI_API_KEY not set — dev mode completion" })
      }
      const res = await fetch(`${PI_API_BASE}/payments/${paymentId}/complete`, {
        method: "POST",
        headers: { Authorization: `Key ${PI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ txid }),
      })
      const data = await res.json()
      return NextResponse.json({ ok: res.ok, data })
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Server error" }, { status: 500 })
  }
}
