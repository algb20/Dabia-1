// POST /api/dabia/push/subscribe  — حفظ اشتراك push للجهاز
// POST /api/dabia/push/send       — إرسال push لمستخدم (server-side)
// DELETE /api/dabia/push/subscribe — إلغاء الاشتراك

import { NextRequest, NextResponse } from "next/server"
import webpush from "web-push"
import { getAdminClient } from "@/lib/dabia/db/admin"

const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  ?? ""
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? ""
const VAPID_EMAIL   = "mailto:support@dabiaapp.com"

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE)
}

async function getAuthUser(req: NextRequest) {
  const admin = getAdminClient()
  if (!admin) return null
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "")
  if (!token) return null
  const { data: { user } } = await admin.auth.getUser(token)
  return user ?? null
}

// ── GET: ارجع المفتاح العام لـ VAPID للمتصفح ───────────────────────────
export async function GET() {
  return NextResponse.json({ publicKey: VAPID_PUBLIC })
}

// ── POST: حفظ اشتراك جديد أو إرسال push ──────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const admin = getAdminClient()
  if (!admin) return NextResponse.json({ error: "Not configured" }, { status: 503 })

  // ── إرسال push (action=send) — من الخادم داخلياً ──────────────────────
  if (body.action === "send") {
    const { userId, title, message, url } = body
    if (!userId || !title) return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      return NextResponse.json({ ok: true, warning: "VAPID not configured" })
    }
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("endpoint,p256dh,auth")
      .eq("user_id", String(userId))
    if (!subs?.length) return NextResponse.json({ ok: true, sent: 0 })

    const payload = JSON.stringify({ title, body: message ?? "", url: url ?? "/" })
    const results = await Promise.allSettled(
      subs.map(s =>
        webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
      )
    )
    const sent = results.filter(r => r.status === "fulfilled").length
    return NextResponse.json({ ok: true, sent })
  }

  // ── حفظ اشتراك ─────────────────────────────────────────────────────────
  const authUser = await getAuthUser(req)
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { endpoint, p256dh, auth } = body
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Missing subscription fields" }, { status: 400 })
  }

  await admin.from("push_subscriptions").upsert(
    { user_id: authUser.id, endpoint, p256dh, auth, updated_at: new Date().toISOString() },
    { onConflict: "endpoint" }
  )
  return NextResponse.json({ ok: true })
}

// ── DELETE: إلغاء الاشتراك ─────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const admin = getAdminClient()
  if (!admin) return NextResponse.json({ error: "Not configured" }, { status: 503 })
  const authUser = await getAuthUser(req)
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { endpoint } = await req.json().catch(() => ({}))
  if (endpoint) await admin.from("push_subscriptions").delete().eq("endpoint", endpoint)
  return NextResponse.json({ ok: true })
}
