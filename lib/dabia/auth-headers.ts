// ═══════════════════════════════════════════════════════════════════════════
// بناء ترويسات المصادقة للطلبات إلى مسارات API الحسّاسة من العميل.
//
// email users: ترويسة Authorization: Bearer <Supabase JWT>
// Pi users:   ترويسة X-Pi-Token: <Pi accessToken>  (يتحقّق منها الخادم عبر /me)
//
// رمز Pi لا يُحفظ في تخزين دائم (قد ينتهي)؛ يُحتفظ به في الذاكرة فقط، ويُلتقط
// عند تسجيل الدخول بـ Pi. إن غاب ووُجد Pi Browser نطلب واحداً جديداً بصمت.
// ═══════════════════════════════════════════════════════════════════════════
import { supabase } from "./db"

let piAccessToken: string | null = null

// يُستدعى بعد Pi.authenticate الناجح لالتقاط الرمز لإعادة استخدامه.
export function setPiAccessToken(token: string | null): void {
  piAccessToken = token || null
}

export async function buildAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" }

  // 1) جلسة Supabase الحقيقية (email users) — الأفضل والأكثر أماناً
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`
      return headers
    }
  } catch { /* لا جلسة — نتابع لمسار Pi */ }

  // 2) مستخدم Pi — رمز من الذاكرة أو نطلبه بصمت داخل Pi Browser
  if (!piAccessToken && typeof window !== "undefined" && (window as any).Pi) {
    try {
      const auth = await (window as any).Pi.authenticate(["username", "payments"], () => {})
      piAccessToken = auth?.accessToken ?? null
    } catch { /* تعذّر — تبقى الترويسة بلا مصادقة فيرفض الخادم */ }
  }
  if (piAccessToken) headers["X-Pi-Token"] = piAccessToken

  return headers
}
