// ═══════════════════════════════════════════════════════════════════════════
// Orders API — سلطة الخادم على جدول الطلبات (تتبّع + ضمان escrow)
//
// لماذا مسار خادم؟ جدول orders يحوي بيانات حسّاسة (هاتف/عنوان المشتري) ويتحكّم
// بحالة الضمان (تحرير المال للبائع). لا يمكن تأمينه بسياسات RLS على العميل لأن
// مستخدمي Pi أحادي‑النقرة لا يملكون جلسة Supabase (auth.uid() = NULL). لذا كل
// عمليات الطلبات تمرّ من هنا بمصادقة مزدوجة (Supabase JWT أو رمز Pi مُتحقَّق منه
// عبر /me)، ثم تُنفَّذ بـ service_role مع فرض الملكية يدوياً. الجدول نفسه مُغلق
// تماماً أمام anon/authenticated في القاعدة.
// ═══════════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from "next/server"
import { getAdminClient } from "@/lib/dabia/db/admin"
import type { SupabaseClient } from "@supabase/supabase-js"

const PI_API_BASE = "https://api.minepi.com/v2"

// ── هوية المُستدعي: تُعاد users.id (bigint كسلسلة) بعد تحقّق حقيقي ──────────
// email users: عبر Supabase JWT → auth.uid() → users.auth_id
// Pi users:   عبر رمز Pi → /me (تحقّق حقيقي من Pi) → uid → users.pi_uid
async function resolveUserId(req: NextRequest, admin: SupabaseClient): Promise<string | null> {
  const authHeader = req.headers.get("Authorization") ?? ""
  const supabaseToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
  const piToken = req.headers.get("X-Pi-Token") ?? ""

  if (supabaseToken) {
    const { data: { user }, error } = await admin.auth.getUser(supabaseToken)
    if (!error && user) {
      const { data } = await admin.from("users").select("id").eq("auth_id", user.id).maybeSingle()
      if (data?.id != null) return String(data.id)
    }
  }

  if (piToken) {
    try {
      const res = await fetch(`${PI_API_BASE}/me`, { headers: { Authorization: `Bearer ${piToken}` } })
      if (res.ok) {
        const me = await res.json()
        const uid = me?.uid
        if (uid) {
          const { data } = await admin.from("users").select("id").eq("pi_uid", String(uid)).maybeSingle()
          if (data?.id != null) return String(data.id)
        }
      }
    } catch { /* فشل التحقق من Pi → مجهول */ }
  }

  return null
}

// الحقول التي يُسمح للمشتري بكتابتها عند إنشاء الطلب (قائمة بيضاء صارمة —
// تمنع حقن escrow_status أو status أو seller_user_id مزيّف عبر الجسم).
const CREATE_FIELDS = [
  "product_id", "product_name", "product_image", "seller_user_id", "seller_name",
  "quantity", "unit_price", "total_price",
  "recipient_name", "recipient_phone", "ship_country", "ship_city",
  "ship_address", "ship_postal", "shipping_address", "pi_tx_id",
] as const

export async function POST(req: NextRequest) {
  const admin = getAdminClient()
  if (!admin) return NextResponse.json({ error: "Not configured" }, { status: 503 })

  const meId = await resolveUserId(req, admin)
  if (!meId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({} as any))
  const action = body?.action as string

  switch (action) {
    // ── إنشاء طلب — المشتري ينشئ طلبه فقط ────────────────────────────────
    case "create": {
      const src = body?.order ?? {}
      const row: Record<string, any> = { user_id: Number(meId) } // الملكية من الهوية لا من الجسم
      for (const f of CREATE_FIELDS) if (src[f] !== undefined) row[f] = src[f]
      row.status = "confirmed" // القيمة الأولية يفرضها الخادم دائماً
      const { data, error } = await admin.from("orders").insert(row).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ order: data })
    }

    // ── طلبات المشتري ────────────────────────────────────────────────────
    case "listBuyer": {
      const { data } = await admin.from("orders").select("*")
        .eq("user_id", Number(meId)).order("created_at", { ascending: false }).limit(50)
      return NextResponse.json({ orders: data ?? [] })
    }

    // ── طلبات البائع ─────────────────────────────────────────────────────
    case "listSeller": {
      const { data } = await admin.from("orders").select("*")
        .eq("seller_user_id", Number(meId)).order("created_at", { ascending: false }).limit(100)
      return NextResponse.json({ orders: data ?? [] })
    }

    // ── طلب واحد بالمعرّف — للطرفين فقط ──────────────────────────────────
    case "getById": {
      const { data } = await admin.from("orders").select("*").eq("id", Number(body.id)).maybeSingle()
      if (!data || (String(data.user_id) !== meId && String(data.seller_user_id) !== meId)) {
        return NextResponse.json({ order: null })
      }
      return NextResponse.json({ order: data })
    }

    // ── تتبّع بالرقم — للطرفين فقط ───────────────────────────────────────
    case "getByNumber": {
      const num = String(body.orderNumber ?? "").trim().toUpperCase()
      if (!num) return NextResponse.json({ order: null })
      const { data } = await admin.from("orders").select("*").eq("order_number", num).maybeSingle()
      if (!data || (String(data.user_id) !== meId && String(data.seller_user_id) !== meId)) {
        return NextResponse.json({ order: null })
      }
      return NextResponse.json({ order: data })
    }

    // ── البائع يحدّث حالة الشحن — البائع صاحب الطلب فقط ──────────────────
    case "updateStatus": {
      const { data: order } = await admin.from("orders").select("seller_user_id").eq("id", Number(body.orderId)).maybeSingle()
      if (!order || String(order.seller_user_id) !== meId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      const payload: Record<string, any> = { status: body.status, updated_at: new Date().toISOString() }
      if (body.note)            payload.tracking_note   = body.note
      if (body.carrier)         payload.carrier         = body.carrier
      if (body.tracking_number) payload.tracking_number = body.tracking_number
      const { error } = await admin.from("orders").update(payload).eq("id", Number(body.orderId))
      return NextResponse.json({ ok: !error })
    }

    // ── المشتري يؤكّد الاستلام → تحرير الضمان — المشتري صاحب الطلب فقط ────
    case "confirmReceived": {
      const { data: order } = await admin.from("orders").select("user_id").eq("id", Number(body.orderId)).maybeSingle()
      if (!order || String(order.user_id) !== meId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      const { error } = await admin.from("orders").update({
        status: "delivered",
        escrow_status: "released",
        escrow_released_at: new Date().toISOString(),
        tracking_note: "Receipt confirmed by buyer — payment released to seller",
        updated_at: new Date().toISOString(),
      }).eq("id", Number(body.orderId))
      return NextResponse.json({ ok: !error })
    }

    // ── المشتري يطلب الإلغاء/الاسترداد — المشتري صاحب الطلب فقط ──────────
    case "requestCancellation": {
      const { data: order } = await admin.from("orders").select("user_id").eq("id", Number(body.orderId)).maybeSingle()
      if (!order || String(order.user_id) !== meId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      const { error } = await admin.from("orders").update({
        status: "cancelled",
        escrow_status: "refunded",
        tracking_note: `Cancelled by buyer: ${String(body.reason ?? "").slice(0, 500)}`,
        updated_at: new Date().toISOString(),
      }).eq("id", Number(body.orderId))
      return NextResponse.json({ ok: !error })
    }

    // ── نزاع طلب واحد — لطرفَي الطلب فقط ──────────────────────────────────
    case "getDispute": {
      const { data: order } = await admin.from("orders").select("user_id, seller_user_id").eq("id", Number(body.orderId)).maybeSingle()
      if (!order || (String(order.user_id) !== meId && String(order.seller_user_id) !== meId)) {
        return NextResponse.json({ dispute: null })
      }
      const { data } = await admin.from("order_disputes").select("*").eq("order_id", Number(body.orderId)).maybeSingle()
      return NextResponse.json({ dispute: data ?? null })
    }

    // ── نزاعات البائع — نزاعات متاجره فقط ─────────────────────────────────
    case "listSellerDisputes": {
      const { data } = await admin.from("order_disputes").select("*")
        .eq("seller_id", Number(meId)).order("created_at", { ascending: false })
      return NextResponse.json({ disputes: data ?? [] })
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  }
}
