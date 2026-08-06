// ═══════════════════════════════════════════════════════════════════════════
// Catalog sync — fills Dabia Discover with real products.
//
// Pulls trending / searched products from AliExpress (title, official image,
// live price, destination URL) and upserts them into discover_products and
// discover_offers with service_role. Outbound links stay clean here; the
// affiliate wrap happens at /discover/go so tracking lives in one place.
//
// Auth: CRON_SECRET header, or an admin Supabase session. Never public — a
// public sync endpoint would let anyone burn the API quota.
// ═══════════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from "next/server"
import { getAdminClient } from "@/lib/dabia/db/admin"
import { fetchHotProducts, searchProducts, aliexpressConfigured, diagnoseSignature, type AliProduct } from "@/lib/discover/aliexpress"

const ADMIN_EMAILS = new Set(["maskmal088@gmail.com"])

async function authorize(req: NextRequest): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET
  const header = req.headers.get("authorization") ?? ""
  const token = header.startsWith("Bearer ") ? header.slice(7) : header
  if (cronSecret && token === cronSecret) return true

  const admin = getAdminClient()
  if (!admin || !token) return false
  const { data: { user } } = await admin.auth.getUser(token)
  return Boolean(user?.email && ADMIN_EMAILS.has(user.email))
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 70)
}

// A stable hue per product so the fallback tile stays consistent between runs.
function hueFor(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360
  return h
}

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = await req.json().catch(() => ({} as any))
  return runSync(body)
}

async function runSync(body: any) {
  if (!aliexpressConfigured()) {
    return NextResponse.json({ error: "AliExpress credentials not configured" }, { status: 503 })
  }
  const admin = getAdminClient()
  if (!admin) return NextResponse.json({ error: "Not configured" }, { status: 503 })

  const keywords: string | undefined = body?.keywords
  const pageSize: number = Math.min(Number(body?.pageSize) || 20, 50)
  const categoryId: string = body?.categoryId || "electronics"

  // Trending by default; keyword search when asked for a specific catalog.
  const res = keywords
    ? await searchProducts(keywords, { pageSize })
    : await fetchHotProducts({ pageSize, categoryIds: body?.categoryIds })

  if (!res.ok) {
    return NextResponse.json({ error: res.error ?? "Fetch failed" }, { status: 502 })
  }
  if (!res.products.length) {
    return NextResponse.json({ ok: true, imported: 0, note: "No products returned" })
  }

  // The source row these offers hang off. Created once, then reused.
  await admin.from("discover_sources").upsert(
    { id: "aliexpress", name: "AliExpress", kind: "marketplace", official: true, domain: "aliexpress.com", code: "ALI" },
    { onConflict: "id" },
  )

  let imported = 0
  const errors: string[] = []

  for (const p of res.products as AliProduct[]) {
    const slug = `${slugify(p.title)}-${p.productId.slice(-6)}`
    const productRow = {
      slug,
      name: p.title.slice(0, 200),
      brand_id: body?.brandId || "generic",
      category_id: categoryId,
      summary: p.categoryName ? `${p.categoryName} — listed from AliExpress.` : "Listed from AliExpress.",
      description: p.title,
      specs: p.rating || p.orders
        ? [
            ...(p.rating ? [{ label: "Rating", value: `${p.rating}%` }] : []),
            ...(p.orders ? [{ label: "Orders", value: String(p.orders) }] : []),
          ]
        : [],
      history: [],
      currency: p.currency,
      image: p.image,
      hue: hueFor(p.productId),
      updated_at: new Date().toISOString(),
    }

    const { data: saved, error: pErr } = await admin
      .from("discover_products")
      .upsert(productRow, { onConflict: "slug" })
      .select("id")
      .single()

    if (pErr || !saved) {
      errors.push(`${slug}: ${pErr?.message ?? "insert failed"}`)
      continue
    }

    const { error: oErr } = await admin.from("discover_offers").upsert(
      {
        product_id: saved.id,
        source_id: "aliexpress",
        price: p.price,
        currency: p.currency,
        url: p.url,
        availability: "in_stock",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "product_id,source_id" },
    )
    if (oErr) errors.push(`${slug} offer: ${oErr.message}`)
    else imported++
  }

  return NextResponse.json({
    ok: true,
    fetched: res.products.length,
    imported,
    errors: errors.slice(0, 5),
  })
}

// Vercel Cron invokes scheduled paths with GET, so GET runs the same sync.
// `?probe=1` skips the fetch and just reports whether credentials are wired —
// useful for checking the wiring without spending API quota.
export async function GET(req: NextRequest) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const q = new URL(req.url).searchParams
  if (q.get("probe")) {
    return NextResponse.json({ configured: aliexpressConfigured() })
  }
  // ?diagnose=1 — fires every signature variant once and reports which one the
  // gateway accepts, so the format is settled in a single round trip.
  if (q.get("diagnose")) {
    return NextResponse.json(await diagnoseSignature())
  }
  return runSync({})
}
