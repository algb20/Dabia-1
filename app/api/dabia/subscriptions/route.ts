// GET  /api/dabia/subscriptions?userId=USR-0012
// POST /api/dabia/subscriptions — activate subscription ONLY after verifying
// a real, completed Pi payment via Pi Platform API directly. No txId is ever
// trusted by its shape (e.g. "starts with TX-") — it must be confirmed by Pi
// Network's own servers as actually paid for the exact required amount.

import { NextRequest, NextResponse } from "next/server"
import { upsertSubscription, getSubscription } from "@/lib/dabia/db"

const PI_API_BASE = "https://api.minepi.com/v2"
// المفتاح السرّي يُقرأ حصراً من متغيّر البيئة — لا يُكتب داخل الكود إطلاقاً.
const PI_API_KEY = process.env.PI_API_KEY

const SUBSCRIPTION_PLANS: Record<string, { features: string[]; pricePi: number }> = {
  pro: {
    pricePi:  49,
    features: ["AI personal assistant", "Advanced analytics", "Priority listing", "Bulk import", "Dedicated scanner agent", "Early demand alerts"],
  },
  enterprise: {
    pricePi:  199,
    features: ["All Pro features", "White-label dashboard", "Custom dedicated agent", "Full API access", "SLA 99.9% uptime", "Custom trust badge"],
  },
}

export async function GET(req: NextRequest) {
  const userId = new URL(req.url).searchParams.get("userId")
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })
  const subscription = await getSubscription(userId)
  return NextResponse.json({ subscription })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.userId || !body?.tier || !body?.txId) {
    return NextResponse.json({ error: "userId, tier, and txId required" }, { status: 400 })
  }

  const plan = SUBSCRIPTION_PLANS[body.tier]
  if (!plan) return NextResponse.json({ error: "Invalid subscription tier" }, { status: 400 })

  if (!PI_API_KEY) {
    return NextResponse.json({ error: "Payment verification is not configured on the server" }, { status: 503 })
  }

  // التحقق الحقيقي: استدعاء Pi Platform API مباشرة للتأكد أن هذه المعاملة
  // فعلياً اكتملت بنفس المبلغ المطلوب لهذه الخطة — لا قبول لأي شكل نصي للمعرّف
  try {
    const verifyRes = await fetch(`${PI_API_BASE}/payments/${body.txId}`, {
      headers: { Authorization: `Key ${PI_API_KEY}` },
    })
    if (!verifyRes.ok) {
      return NextResponse.json({ error: "Could not verify this payment with Pi Network" }, { status: 422 })
    }
    const payment = await verifyRes.json()
    const isCompleted = payment?.status?.developer_completed === true || payment?.status?.transaction_verified === true
    const paidAmount  = Number(payment?.amount)
    if (!isCompleted) {
      return NextResponse.json({ error: "Payment not yet completed on Pi Network" }, { status: 422 })
    }
    if (Math.abs(paidAmount - plan.pricePi) > 0.001) {
      return NextResponse.json({ error: `Payment amount (${paidAmount}π) does not match plan price (${plan.pricePi}π)` }, { status: 422 })
    }
  } catch {
    return NextResponse.json({ error: "Failed to verify payment with Pi Network — try again" }, { status: 502 })
  }

  const now     = new Date()
  const expires = new Date(now)
  expires.setMonth(expires.getMonth() + 1)

  const subscription = await upsertSubscription({
    user_id:      body.userId,
    tier:         body.tier,
    activated_at: now.toISOString(),
    expires_at:   expires.toISOString(),
    paid_in_pi:   plan.pricePi,
    pi_tx_id:     body.txId,
  })

  if (!subscription) return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 })
  return NextResponse.json({ success: true, subscription })
}
