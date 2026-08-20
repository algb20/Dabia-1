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
import { getAdminClient, serviceKeyFingerprint } from "@/lib/dabia/db/admin"
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

  const pageSize: number = Math.min(Number(body?.pageSize) || 50, 50)
  // Pages per query. 20 queries × 10 pages × 50 = up to 10 000 products a run.
  const pages: number = Math.min(Math.max(Number(body?.pages) || 6, 1), 20)
  const categoryId: string = body?.categoryId || "electronics"

  // Each query maps to a site category, so the catalog fills out broadly
  // instead of piling everything into one bucket.
  const DEFAULT_QUERIES: { q: string; cat: string }[] = [
    { q: "wireless earbuds", cat: "audio" },
    { q: "bluetooth speaker", cat: "audio" },
    { q: "smart watch", cat: "wearables" },
    { q: "fitness tracker", cat: "fitness" },
    { q: "phone case", cat: "mobile" },
    { q: "tablet", cat: "mobile" },
    { q: "laptop stand", cat: "computing" },
    { q: "mechanical keyboard", cat: "computing" },
    { q: "computer mouse", cat: "computing" },
    { q: "monitor", cat: "tv" },
    { q: "projector", cat: "tv" },
    { q: "gaming controller", cat: "gaming" },
    { q: "smart home camera", cat: "smarthome" },
    { q: "led strip lights", cat: "smarthome" },
    { q: "robot vacuum", cat: "home" },
    { q: "air fryer", cat: "kitchen" },
    { q: "coffee machine", cat: "kitchen" },
    { q: "power bank", cat: "power" },
    { q: "usb c charger", cat: "power" },
    { q: "action camera", cat: "cameras" },
    { q: "drone", cat: "cameras" },
    { q: "wifi router", cat: "networking" },
    { q: "portable ssd", cat: "networking" },
    { q: "hair dryer", cat: "beauty" },
    { q: "electric shaver", cat: "beauty" },
  ]

  // A single keyword still works, for topping up one category on demand.
  const queries: { q: string; cat: string }[] = body?.keywords
    ? [{ q: String(body.keywords), cat: categoryId }]
    : DEFAULT_QUERIES

  // The source row these offers hang off. Created once, then reused.
  await admin.from("discover_sources").upsert(
    { id: "aliexpress", name: "AliExpress", kind: "marketplace", official: true, domain: "aliexpress.com", code: "ALI" },
    { onConflict: "id" },
  )

  // Collect across every query and page first, de-duplicated by product id, so
  // the same item surfacing under two keywords is stored once.
  const collected = new Map<string, { p: AliProduct; cat: string }>()
  const errors: string[] = []
  let fetchedPages = 0

  for (const { q, cat } of queries) {
    for (let page = 1; page <= pages; page++) {
      const r = await searchProducts(q, { pageSize, pageNo: page })
      fetchedPages++
      if (!r.ok) {
        if (errors.length < 5) errors.push(`"${q}" p${page}: ${r.error}`)
        break // a failing query will keep failing on later pages
      }
      if (!r.products.length) break // no more pages for this query
      for (const p of r.products) {
        if (!collected.has(p.productId)) collected.set(p.productId, { p, cat })
      }
    }
  }

  if (!collected.size) {
    return NextResponse.json(
      { ok: false, imported: 0, fetchedPages, errors: errors.slice(0, 5), note: "No products returned" },
      { status: errors.length ? 502 : 200 },
    )
  }

  let imported = 0

  for (const { p, cat } of collected.values()) {
    const productCategory = cat || categoryId
    const slug = `${slugify(p.title)}-${p.productId.slice(-6)}`
    const productRow = {
      slug,
      name: p.title.slice(0, 200),
      brand_id: body?.brandId || "generic",
      category_id: productCategory,
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
      if (errors.length < 10) errors.push(`${slug}: ${pErr?.message ?? "insert failed"}`)
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
    queries: queries.length,
    fetchedPages,
    unique: collected.size,
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
    return NextResponse.json({
      ...(await diagnoseSignature()),
      supabase: serviceKeyFingerprint(),
    })
  }
  // ?checkdb=1 — verifies the service-role key can actually write, which is
  // what "Invalid API key" during a sync points at.
  if (q.get("checkdb")) {
    const admin = getAdminClient()
    if (!admin) return NextResponse.json({ ok: false, reason: "No service-role key set", supabase: serviceKeyFingerprint() })
    const { error } = await admin.from("discover_products").select("id").limit(1)
    return NextResponse.json({
      ok: !error,
      error: error?.message ?? null,
      supabase: serviceKeyFingerprint(),
    })
  }
  return runSync({})
}
