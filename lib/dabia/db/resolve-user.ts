// ═══════════════════════════════════════════════════════════════════════════
// resolveUserId — هوية المُستدعي الحقيقية لمسارات API الحسّاسة (خادم فقط).
//
// يعيد users.id (كسلسلة) بعد تحقّق فعلي من الهوية، أو null إن كان مجهولاً:
//   • مستخدمو البريد: Supabase JWT → auth.uid() → users.auth_id
//   • مستخدمو Pi:     رمز Pi → GET /me (تحقّق حقيقي من Pi) → uid → users.pi_uid
//
// يُستخدم من معالِجات المسارات فقط (تعمل بـ service_role)، ولا يُستورَد في المتصفح.
// ═══════════════════════════════════════════════════════════════════════════
import type { NextRequest } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"

const PI_API_BASE = "https://api.minepi.com/v2"

export async function resolveUserId(
  req: NextRequest,
  admin: SupabaseClient,
): Promise<string | null> {
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
