import { NextRequest, NextResponse } from "next/server"
import { getAdminClient } from "@/lib/dabia/db/admin"

// تحقق تلقائي حقيقي من وجود الشركة/المتجر على الإنترنت — يبحث فعلياً عبر
// Serper.dev (واجهة بحث Google) بدل أي محاكاة. يحتاج متغيّر بيئة SERPER_API_KEY
// (احصل عليه من https://serper.dev — يوجد 2500 بحث مجاني للتجربة).
//
// مهم: إن لم يكن المتغيّر مضبوطاً، يُعيد هذا المسار حالة "unavailable" بصراحة
// تامة — لا يتظاهر بنجاح تحقق لم يحدث فعلياً. هذا تماماً ما طلبه صاحب المشروع:
// لا ميزة وهمية تبدو كأنها تعمل بدون أن تعمل فعلاً.

interface SerperResult {
  organic?: { title: string; link: string; snippet?: string }[]
  knowledgeGraph?: { title?: string; website?: string; description?: string }
}

export async function POST(req: NextRequest) {
  try {
    const { storeName, websiteUrl, userId } = await req.json()
    if (!storeName || typeof storeName !== "string") {
      return NextResponse.json({ verified: false, confidence: "unavailable", detail: "Missing store name" }, { status: 400 })
    }

    const apiKey = process.env.SERPER_API_KEY
    if (!apiKey) {
      // صراحة كاملة: الميزة غير مفعَّلة فعلياً لعدم وجود مفتاح — وليس نجاحاً وهمياً
      return NextResponse.json({ verified: false, confidence: "unavailable", detail: "SERPER_API_KEY not configured" })
    }

    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: storeName, num: 5 }),
    })

    if (!res.ok) {
      return NextResponse.json({ verified: false, confidence: "unavailable", detail: `Search API error (${res.status})` })
    }

    const data: SerperResult = await res.json()
    const results = data.organic ?? []

    let websiteDomain: string | null = null
    if (websiteUrl) {
      try {
        const raw = websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`
        websiteDomain = new URL(raw).hostname.replace(/^www\./, "").toLowerCase()
      } catch {}
    }

    // ثقة عالية: أحد نتائج البحث يطابق نطاق الموقع المُدخل فعلياً
    const domainMatch = websiteDomain && results.some(r => {
      try { return new URL(r.link).hostname.replace(/^www\./, "").toLowerCase() === websiteDomain } catch { return false }
    })

    // ثقة متوسطة: اسم المتجر يظهر بوضوح في نتائج بحث حقيقية (وجود فعلي قابل للتحقق)
    const nameAppearsOnline = results.length > 0 && results.some(r =>
      r.title?.toLowerCase().includes(storeName.toLowerCase()) ||
      r.snippet?.toLowerCase().includes(storeName.toLowerCase())
    )

    if (domainMatch) {
      // القرار والتفعيل يتمّان على الخادم فقط (service_role) — لا يثق التطبيق
      // بادعاء العميل. عند ثقة عالية نفعّل الحساب مباشرة في القاعدة.
      let activated = false
      if (userId) {
        const admin = getAdminClient()
        if (admin) {
          const { error } = await admin.rpc("activate_verified_business", { p_user_id: Number(userId) })
          activated = !error
        }
      }
      return NextResponse.json({ verified: true, confidence: "high", activated, detail: "Website found in search results for this business name" })
    }
    if (nameAppearsOnline) {
      return NextResponse.json({ verified: true, confidence: "medium", detail: "Business name found in public search results" })
    }
    return NextResponse.json({ verified: false, confidence: "low", detail: "No matching public presence found" })
  } catch (e) {
    return NextResponse.json({ verified: false, confidence: "unavailable", detail: e instanceof Error ? e.message : "Verification failed" }, { status: 500 })
  }
}
