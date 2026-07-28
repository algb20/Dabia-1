// POST /api/dabia/analytics — تسجيل زيارة (beacon من المتصفح)
// GET  /api/dabia/analytics — ملخّص للإدارة (يتطلّب SERVICE_ROLE_KEY)

import { NextRequest, NextResponse } from "next/server"
import { getAdminClient } from "@/lib/dabia/db/admin"

// خريطة رموز البلدان → الأسماء (أشيع البلدان في منطقتنا + العالمية)
const COUNTRY_NAMES: Record<string, string> = {
  SA: "Saudi Arabia", AE: "UAE", KW: "Kuwait", BH: "Bahrain", QA: "Qatar",
  OM: "Oman", EG: "Egypt", JO: "Jordan", IQ: "Iraq", SY: "Syria",
  LB: "Lebanon", YE: "Yemen", MA: "Morocco", TN: "Tunisia", DZ: "Algeria",
  LY: "Libya", SD: "Sudan", US: "United States", GB: "United Kingdom",
  DE: "Germany", FR: "France", CA: "Canada", AU: "Australia", IN: "India",
  PK: "Pakistan", TR: "Turkey", NG: "Nigeria", KE: "Kenya", ZA: "South Africa",
  PH: "Philippines", ID: "Indonesia", MY: "Malaysia", SG: "Singapore",
  BR: "Brazil", MX: "Mexico", RU: "Russia", CN: "China", JP: "Japan",
  KR: "South Korea",
}

function detectDevice(ua: string): "mobile" | "tablet" | "desktop" | "unknown" {
  if (!ua) return "unknown"
  if (/tablet|ipad/i.test(ua)) return "tablet"
  if (/mobile|android|iphone|ipod/i.test(ua)) return "mobile"
  return "desktop"
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const admin = getAdminClient()
    if (!admin) return NextResponse.json({ ok: false }, { status: 503 })

    // استخرج بيانات الجغرافيا من Vercel headers (متاحة تلقائياً في Vercel)
    const countryCode = (
      req.headers.get("x-vercel-ip-country") ??
      req.headers.get("cf-ipcountry") ??
      ""
    ).toUpperCase().slice(0, 2) || null

    const city   = req.headers.get("x-vercel-ip-city")   ?? null
    const region = req.headers.get("x-vercel-ip-region") ?? null
    const ua     = req.headers.get("user-agent")         ?? ""

    await admin.from("page_views").insert({
      session_id:   body.sessionId   ?? null,
      country_code: countryCode,
      country_name: countryCode ? (COUNTRY_NAMES[countryCode] ?? countryCode) : null,
      city,
      region,
      page:         body.page        ?? "/",
      referrer:     body.referrer    ?? null,
      device_type:  detectDevice(ua),
      user_id:      body.userId      ?? null,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

const ADMIN_EMAILS = new Set(["maskmal088@gmail.com"])

export async function GET(req: NextRequest) {
  const adminClient = getAdminClient()
  if (!adminClient) return NextResponse.json({ error: "Not configured" }, { status: 503 })

  // التحقق من أن الطالب أدمين عبر Supabase JWT
  const auth = req.headers.get("Authorization") ?? ""
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : ""
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: { user } } = await adminClient.auth.getUser(token)
  if (!user?.email || !ADMIN_EMAILS.has(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const [summary, byCountry, byPage, byDevice] = await Promise.all([
    adminClient.from("analytics_summary").select("*").single(),
    adminClient.from("analytics_by_country").select("*"),
    adminClient.from("analytics_by_page").select("*"),
    adminClient.from("analytics_by_device").select("*"),
  ])

  return NextResponse.json({
    summary: summary.data,
    byCountry: byCountry.data ?? [],
    byPage: byPage.data ?? [],
    byDevice: byDevice.data ?? [],
  })
}
