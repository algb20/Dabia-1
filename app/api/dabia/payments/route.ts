import { NextRequest, NextResponse } from "next/server"
import { getAdminClient } from "@/lib/dabia/db/admin"

// ═══════════════════════════════════════════════════════════════════════════
// Pi Network Payment Server Approval — الموافقة الفعلية من جهة الخادم
// هذا الـ endpoint مطلوب من Pi SDK لإكمال أي دفعة حقيقية
// ═══════════════════════════════════════════════════════════════════════════

const PI_API_BASE = "https://api.minepi.com/v2"
const PI_API_KEY  = process.env.PI_API_KEY

async function verifyPiToken(piToken: string): Promise<boolean> {
  try {
    const res = await fetch(`${PI_API_BASE}/me`, {
      headers: { Authorization: `Bearer ${piToken}` },
    })
    return res.ok
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    // Accept either a Supabase JWT (browser users) or a Pi access token
    // (Pi-only users who never got a Supabase session).
    const authHeader = req.headers.get("Authorization") ?? ""
    const supabaseToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
    const piToken = req.headers.get("X-Pi-Token") ?? ""

    if (!supabaseToken && !piToken) {
      return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 })
    }

    const admin = getAdminClient()
    let authenticated = false

    if (supabaseToken && admin) {
      const { error } = await admin.auth.getUser(supabaseToken)
      if (!error) authenticated = true
    }

    if (!authenticated && piToken) {
      authenticated = await verifyPiToken(piToken)
    }

    if (!authenticated) {
      return NextResponse.json({ ok: false, error: "Invalid or expired session" }, { status: 401 })
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
