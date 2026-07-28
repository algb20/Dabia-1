// ═══════════════════════════════════════════════════════════════════════════
// عميل Supabase للخادم فقط (Service Role) — يتجاوز RLS ليؤدّي عمليات حسّاسة
// موثوقة من جهة الخادم (تفعيل الاشتراكات، ...).
//
// ⚠️ هذا الملف يجب ألّا يُستورَد أبداً من أي مكوّن يعمل في المتصفح. يُستورَد
// حصراً من معالِجات مسارات API (app/api/**/route.ts) التي تعمل على الخادم فقط،
// حتى لا يتسرّب المفتاح السرّي إلى حزمة العميل.
//
// المفتاح السرّي يُقرأ من متغيّر البيئة SUPABASE_SERVICE_ROLE_KEY فقط، ولا
// يُكتب داخل الكود إطلاقاً. عنوان المشروع ليس سرّاً فيُقبل له قيمة افتراضية.
// ═══════════════════════════════════════════════════════════════════════════
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { DBSubscription } from "./index"

// حارس دفاعي: هذا العميل يحمل صلاحيات Service Role ويجب ألّا يعمل في المتصفح
// إطلاقاً. في Next.js لا تُحزَّم معالِجات مسارات API إلى العميل، لكن هذا الحارس
// يمنع أي تسريب مستقبلي عرضي إن استُورد الملف بالخطأ في سياق متصفّح.
if (typeof window !== "undefined") {
  throw new Error("admin.ts (Supabase service-role client) must never run in the browser")
}

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://fjeyhpasqhhqebqmhcmy.supabase.co"

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

let cached: SupabaseClient | null = null

// يعيد عميل الخادم إن كان المفتاح السرّي مضبوطاً، وإلا null ليتعامل المستدعي
// مع غياب الإعداد برسالة خطأ واضحة بدل فشل صامت.
export function getAdminClient(): SupabaseClient | null {
  if (!SERVICE_ROLE_KEY) return null
  if (cached) return cached
  cached = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cached
}

// ── Subscriptions (server-authoritative) ────────────────────────────────────
// كتابة/قراءة الاشتراكات تتم حصراً هنا بعميل الخادم بعد التحقق الحقيقي من دفعة
// Pi في مسار API. هذا يسمح لاحقاً بإقفال جدول subscriptions أمام العميل العلني
// (anon) تماماً دون كسر الميزة.
export async function upsertSubscriptionAdmin(
  admin: SupabaseClient,
  s: Omit<DBSubscription, "id" | "created_at">,
): Promise<DBSubscription | null> {
  const { data, error } = await admin
    .from("subscriptions")
    .upsert(s, { onConflict: "user_id" })
    .select()
    .single()
  if (error) return null
  return data as DBSubscription
}

export async function getSubscriptionAdmin(
  admin: SupabaseClient,
  userId: string,
): Promise<DBSubscription | null> {
  const { data } = await admin
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()
  const sub = data as DBSubscription | null
  // اشتراك منتهي فعلياً يُعامل كغير موجود (نفس سلوك الدالة السابقة).
  if (sub && new Date(sub.expires_at).getTime() < Date.now()) {
    // انتهى الاشتراك → نزع الشارة تلقائياً حتى تختفي عن منتجاته ومنشوراته.
    await setUserAccountTypeAdmin(admin, userId, "standard")
    return null
  }
  return sub ?? null
}

// منح/نزع شارة نوع الحساب — سلطة الخادم وحده (يتجاوز حارس العميل عبر service_role).
// تُستدعى بعد التحقّق الحقيقي من دفعة Pi، فتصبح الشارة فعلية على المستوى التقني
// لا مجرّد واجهة: enterprise → official، pro → premium، وعند الانتهاء → standard.
export async function setUserAccountTypeAdmin(
  admin: SupabaseClient,
  userId: string,
  type: "standard" | "premium" | "official",
): Promise<boolean> {
  const { error } = await admin
    .from("users")
    .update({ account_type: type })
    .eq("id", userId)
  return !error
}

export const TIER_TO_ACCOUNT_TYPE: Record<string, "premium" | "official"> = {
  pro: "premium",
  enterprise: "official",
}

// إرسال push notification لمستخدم بعد إنشاء إشعار حقيقي
// يُستدعى من route handlers الخادم فقط — لا يُستورَد في المتصفح
export async function sendPushToUser(
  userId: string,
  title: string,
  message: string,
  url = "/",
): Promise<void> {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://dabiaacdfb2093.pinet.com"
    await fetch(`${base}/api/dabia/push`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send", userId, title, message, url }),
    })
  } catch {}
}
