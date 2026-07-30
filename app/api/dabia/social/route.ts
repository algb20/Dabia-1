// ═══════════════════════════════════════════════════════════════════════════
// Social API — سلطة الخادم على كتابة المنشورات والتعليقات.
//
// لماذا مسار خادم؟ جدولا posts و product_comments كانا مفتوحين للكتابة للعموم
// (RLS = true)، فأي مجهول يقدر: ينشر بهوية غيره، يعدّل/يحذف أي منشور أو تعليق،
// أو ينتحل شارة "رسمي". لا يمكن تأمينه بـ RLS وحده لأن مستخدمي Pi بلا جلسة
// Supabase. كل كتابة تمرّ من هنا: الهوية (user_id/username/avatar/is_official)
// تُفرض من الخادم لا من الجسم، والتعديل/الحذف يتطلّب ملكية (أو إشراف صاحب
// المنشور/المنتج على التعليقات). القراءة تبقى عامة.
// ═══════════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from "next/server"
import { getAdminClient } from "@/lib/dabia/db/admin"
import { resolveUserId } from "@/lib/dabia/db/resolve-user"
import type { SupabaseClient } from "@supabase/supabase-js"

// الملف الشخصي الموثّق للمستخدم من الخادم (يمنع انتحال الهوية والشارة الرسمية).
async function getProfile(admin: SupabaseClient, meId: string) {
  const { data } = await admin.from("users").select("username, avatar_url, account_type").eq("id", Number(meId)).maybeSingle()
  return {
    username: data?.username ?? "user",
    avatar_url: data?.avatar_url ?? null,
    isOfficial: data?.account_type === "official",
  }
}

// مالك الكيان الذي يعلّق عليه التعليق (لإشراف صاحب المنشور/المنتج على الحذف).
// product_id قد يكون "post:<id>" لتعليقات المنشورات أو رقم منتج للمنتجات.
async function resolveThreadOwner(admin: SupabaseClient, productId: string): Promise<string | null> {
  if (!productId) return null
  if (productId.startsWith("post:")) {
    const pid = productId.slice(5)
    const { data } = await admin.from("posts").select("user_id").eq("id", pid).maybeSingle()
    return data?.user_id != null ? String(data.user_id) : null
  }
  const { data } = await admin.from("products").select("seller_user_id").eq("id", productId).maybeSingle()
  return data?.seller_user_id != null ? String(data.seller_user_id) : null
}

export async function POST(req: NextRequest) {
  const admin = getAdminClient()
  if (!admin) return NextResponse.json({ error: "Not configured" }, { status: 503 })

  const meId = await resolveUserId(req, admin)
  if (!meId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({} as any))
  const action = body?.action as string

  switch (action) {
    // ── إنشاء منشور — الهوية والشارة من الخادم ───────────────────────────────
    case "createPost": {
      const p = await getProfile(admin, meId)
      const type = String(body?.type ?? "text")
      const row: Record<string, any> = {
        user_id: Number(meId), username: p.username, avatar_url: p.avatar_url,
        type, is_official: p.isOfficial,
      }
      if (typeof body?.text === "string") row.text = body.text.slice(0, 5000)
      if (type === "poll" && body?.poll) row.poll = body.poll
      if (type === "product_share") {
        row.product_id = body?.product_id ?? null
        row.product_snapshot = body?.product_snapshot ?? null
      }
      // الإعلان المثبّت الرسمي — للحسابات الرسمية فقط
      if (type === "announcement") {
        if (!p.isOfficial) return NextResponse.json({ error: "Official accounts only" }, { status: 403 })
        row.pinned = true
      }
      const { data, error } = await admin.from("posts").insert(row).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ post: data })
    }

    // ── إعادة نشر — الهوية من الخادم ─────────────────────────────────────────
    case "repost": {
      const p = await getProfile(admin, meId)
      const o = body?.original ?? {}
      const row: Record<string, any> = {
        user_id: Number(meId), username: p.username, avatar_url: p.avatar_url,
        type: o.type ?? "text", text: o.text ?? "", is_official: p.isOfficial,
        product_id: o.product_id ?? null, product_snapshot: o.product_snapshot ?? null,
        poll: o.poll ?? null, reposted_from: o.id ?? null, reposted_from_username: o.username ?? null,
      }
      const { data, error } = await admin.from("posts").insert(row).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ post: data })
    }

    // ── إلغاء إعادة النشر — منشور المستخدم فقط ───────────────────────────────
    case "undoRepost": {
      const { error } = await admin.from("posts").delete()
        .eq("reposted_from", body?.originalPostId).eq("user_id", Number(meId))
      return NextResponse.json({ ok: !error })
    }

    // ── تعديل منشور — صاحبه فقط ───────────────────────────────────────────────
    case "updatePost": {
      const { data: post } = await admin.from("posts").select("user_id").eq("id", body?.postId).maybeSingle()
      if (!post || String(post.user_id) !== meId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      const { error } = await admin.from("posts").update({ text: String(body?.text ?? "").slice(0, 5000) }).eq("id", body?.postId)
      return NextResponse.json({ ok: !error })
    }

    // ── حذف منشور — صاحبه فقط ─────────────────────────────────────────────────
    case "deletePost": {
      const { data: post } = await admin.from("posts").select("user_id").eq("id", body?.postId).maybeSingle()
      if (!post || String(post.user_id) !== meId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      const { error } = await admin.from("posts").delete().eq("id", body?.postId)
      return NextResponse.json({ ok: !error })
    }

    // ── تثبيت/إلغاء تثبيت — صاحبه فقط ─────────────────────────────────────────
    case "pinPost": {
      const { data: post } = await admin.from("posts").select("user_id").eq("id", body?.postId).maybeSingle()
      if (!post || String(post.user_id) !== meId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      const { error } = await admin.from("posts").update({ pinned: !!body?.pinned }).eq("id", body?.postId)
      return NextResponse.json({ ok: !error })
    }

    // ── إضافة تعليق — الهوية من الخادم ───────────────────────────────────────
    case "addComment": {
      const p = await getProfile(admin, meId)
      const row: Record<string, any> = {
        product_id: body?.product_id, user_id: Number(meId),
        username: p.username, avatar_url: p.avatar_url,
        text: String(body?.text ?? "").slice(0, 2000),
      }
      if (body?.parent_id) row.parent_id = Number(body.parent_id)
      if (!row.product_id || !row.text) return NextResponse.json({ error: "Missing fields" }, { status: 400 })
      const { data, error } = await admin.from("product_comments").insert(row).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ comment: data })
    }

    // ── تعديل تعليق — صاحبه فقط ───────────────────────────────────────────────
    case "updateComment": {
      const { data: c } = await admin.from("product_comments").select("user_id").eq("id", body?.commentId).maybeSingle()
      if (!c || String(c.user_id) !== meId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      const { error } = await admin.from("product_comments").update({ text: String(body?.text ?? "").slice(0, 2000) }).eq("id", body?.commentId)
      return NextResponse.json({ ok: !error })
    }

    // ── حذف تعليق — صاحبه أو صاحب المنشور/المنتج (إشراف) ─────────────────────
    case "deleteComment": {
      const { data: c } = await admin.from("product_comments").select("user_id, product_id").eq("id", body?.commentId).maybeSingle()
      if (!c) return NextResponse.json({ ok: true })
      let allowed = String(c.user_id) === meId
      if (!allowed) {
        const owner = await resolveThreadOwner(admin, String(c.product_id))
        allowed = owner === meId
      }
      if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      const { error } = await admin.from("product_comments").delete().eq("id", body?.commentId)
      return NextResponse.json({ ok: !error })
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  }
}
