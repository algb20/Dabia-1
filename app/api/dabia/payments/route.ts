import { NextRequest, NextResponse } from "next/server"

// ═══════════════════════════════════════════════════════════════════════════
// Pi Network Payment Server Approval — الموافقة الفعلية من جهة الخادم
// هذا الـ endpoint مطلوب من Pi SDK لإكمال أي دفعة حقيقية
// ═══════════════════════════════════════════════════════════════════════════

const PI_API_BASE = "https://api.minepi.com/v2"

// مفتاح Pi API السرّي — يُقرأ حصراً من متغيّر البيئة PI_API_KEY (مضبوط على
// Netlify). لا يجوز أبداً كتابة المفتاح داخل الكود لأنه يتحكّم في جميع
// المدفوعات الحقيقية؛ أي تسريب له يسمح بالموافقة على مدفوعات باسم التطبيق.
const PI_API_KEY = process.env.PI_API_KEY

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, paymentId, txid } = body

    if (!paymentId) {
      return NextResponse.json({ ok: false, error: "Missing paymentId" }, { status: 400 })
    }

    if (action === "approve") {
      if (!PI_API_KEY) {
        // بدون مفتاح Pi API الحقيقي، نسمح بالاستمرار محلياً (وضع تطوير)
        // لكن هذا لا يحقق موافقة Pi الرسمية الكاملة من جهة الخادم
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
