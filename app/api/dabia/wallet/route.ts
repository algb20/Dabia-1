// ═══════════════════════════════════════════════════════════════════════════
// Wallet API — قراءة رصيد المستخدم لنفسه فقط.
//
// عمود users.wallet_balance لم يعد مقروءاً من العميل (مُنع عن anon/authenticated
// على مستوى الأعمدة) لأنه كان يكشف رصيد Pi لكل مستخدم للعموم. الرصيد يُقرأ الآن
// حصراً من هنا بمصادقة مزدوجة (Supabase JWT أو رمز Pi)، والهوية تُشتقّ من الرمز
// لا من الجسم — فلا يمكن قراءة رصيد شخص آخر.
// ═══════════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from "next/server"
import { getAdminClient } from "@/lib/dabia/db/admin"
import { resolveUserId } from "@/lib/dabia/db/resolve-user"

export async function POST(req: NextRequest) {
  const admin = getAdminClient()
  if (!admin) return NextResponse.json({ error: "Not configured" }, { status: 503 })

  const meId = await resolveUserId(req, admin)
  if (!meId) return NextResponse.json({ balance: 0 }, { status: 401 })

  const { data } = await admin.from("users").select("wallet_balance").eq("id", Number(meId)).maybeSingle()
  return NextResponse.json({ balance: (data as any)?.wallet_balance ?? 0 })
}
