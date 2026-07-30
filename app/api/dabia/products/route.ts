// ═══════════════════════════════════════════════════════════════════════════
// Products API — سلطة الخادم على كتابة المنتجات والتقييمات.
//
// لماذا مسار خادم؟ جدول products/product_reviews كان مفتوحاً للكتابة للعموم
// (RLS = true)، فأي زائر مجهول يقدر يعدّل سعر أي منتج أو يحذف منتجات بائع آخر أو
// ينشر تقييمات مزيّفة. لا يمكن تأمينه بـ RLS وحده لأن بائعي Pi لا يملكون جلسة
// Supabase. لذا كل كتابة تمرّ من هنا بمصادقة مزدوجة، وتُنفَّذ بـ service_role مع
// فرض الملكية (seller_user_id) يدوياً. القراءة تبقى عامة (متجر مكشوف للجميع).
// ═══════════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from "next/server"
import { getAdminClient } from "@/lib/dabia/db/admin"
import { resolveUserId } from "@/lib/dabia/db/resolve-user"

// حقول المنتج المسموح للبائع كتابتها — قائمة بيضاء صارمة.
// مُستبعَد عمداً: seller_user_id (من الهوية)، rating/review_count/view_count
// (يحسبها الخادم/trigger)، id/created_at.
const PRODUCT_FIELDS = [
  "name", "description", "price", "original_price", "category",
  "image", "images", "video_url", "seller_name", "stock",
  "deal_ends_at", "deal_label",
] as const

export async function POST(req: NextRequest) {
  const admin = getAdminClient()
  if (!admin) return NextResponse.json({ error: "Not configured" }, { status: 503 })

  const meId = await resolveUserId(req, admin)
  if (!meId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({} as any))
  const action = body?.action as string

  switch (action) {
    // ── إنشاء منتج — البائع ينشئ منتجه فقط ──────────────────────────────────
    case "create": {
      const src = body?.product ?? {}
      const row: Record<string, any> = { seller_user_id: Number(meId), active: true }
      for (const f of PRODUCT_FIELDS) if (src[f] !== undefined) row[f] = src[f]
      const { data, error } = await admin.from("products").insert(row).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ product: data })
    }

    // ── تعديل منتج — صاحبه فقط ───────────────────────────────────────────────
    case "update": {
      const id = body?.id
      const { data: owner } = await admin.from("products").select("seller_user_id").eq("id", id).maybeSingle()
      if (!owner || String(owner.seller_user_id) !== meId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      const src = body?.updates ?? {}
      const payload: Record<string, any> = { updated_at: new Date().toISOString() }
      for (const f of PRODUCT_FIELDS) if (src[f] !== undefined) payload[f] = src[f]
      const { data, error } = await admin.from("products").update(payload).eq("id", id).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ product: data })
    }

    // ── تفعيل/إيقاف منتج — صاحبه فقط ─────────────────────────────────────────
    case "toggleActive": {
      const id = body?.id
      const { data: owner } = await admin.from("products").select("seller_user_id").eq("id", id).maybeSingle()
      if (!owner || String(owner.seller_user_id) !== meId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      const { error } = await admin.from("products").update({ active: !!body?.active }).eq("id", id)
      return NextResponse.json({ ok: !error })
    }

    // ── حذف منتج — صاحبه فقط ──────────────────────────────────────────────────
    case "delete": {
      const id = body?.id
      const { data: owner } = await admin.from("products").select("seller_user_id").eq("id", id).maybeSingle()
      if (!owner || String(owner.seller_user_id) !== meId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      const { error } = await admin.from("products").delete().eq("id", id)
      return NextResponse.json({ ok: !error })
    }

    // ── تقييم منتج — تقييم واحد لكل مستخدم، الهوية من الخادم لا من الجسم ──────
    case "reviewUpsert": {
      const productId = body?.productId
      const rating = Math.max(1, Math.min(5, Number(body?.rating) || 0))
      const text = typeof body?.body === "string" ? body.body.slice(0, 2000) : null
      if (!productId || !rating) return NextResponse.json({ error: "Missing fields" }, { status: 400 })
      // اسم المستخدم يُقرأ من الخادم لمنع انتحال هوية معلن التقييم
      const { data: u } = await admin.from("users").select("username").eq("id", Number(meId)).maybeSingle()
      const { data, error } = await admin.from("product_reviews").upsert(
        { product_id: productId, user_id: Number(meId), username: u?.username ?? "user", rating, body: text },
        { onConflict: "product_id,user_id" },
      ).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ review: data })
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  }
}
