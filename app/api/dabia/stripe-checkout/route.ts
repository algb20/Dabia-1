import { NextRequest, NextResponse } from "next/server"
import { APP_URL } from "@/lib/app-config"

// ═══════════════════════════════════════════════════════════════════════════
// Stripe Checkout — دفع ببطاقة بنكية (Visa/Mastercard) بعملة حقيقية موازي لـ Pi
// هذا المسار جاهز بنيوياً، يحتاج فقط STRIPE_SECRET_KEY ليعمل فعلياً
// ═══════════════════════════════════════════════════════════════════════════

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || ""

export async function POST(req: NextRequest) {
  try {
    if (!STRIPE_SECRET_KEY) {
      // لا نخدع المستخدم بنجاح وهمي — نخبره بوضوح أن الخيار غير مفعّل بعد
      return NextResponse.json(
        { ok: false, error: "Card payments are not yet enabled. Please pay with Pi for now." },
        { status: 503 }
      )
    }

    const { amount, productName, currency = "usd" } = await req.json()
    if (!amount || amount <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid amount" }, { status: 400 })
    }

    // إنشاء جلسة دفع حقيقية عبر Stripe Checkout (REST مباشر — بدون SDK لتقليل حجم الحزمة)
    const params = new URLSearchParams()
    params.append("mode", "payment")
    params.append("success_url", `${APP_URL}/orders?paid=1`)
    params.append("cancel_url", `${APP_URL}/`)
    params.append("line_items[0][price_data][currency]", currency)
    params.append("line_items[0][price_data][product_data][name]", productName || "Dabia Purchase")
    params.append("line_items[0][price_data][unit_amount]", String(Math.round(amount * 100)))
    params.append("line_items[0][quantity]", "1")

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    })

    const data = await res.json()
    if (!res.ok) return NextResponse.json({ ok: false, error: data.error?.message || "Stripe error" }, { status: 400 })

    return NextResponse.json({ ok: true, checkoutUrl: data.url })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Server error" }, { status: 500 })
  }
}
