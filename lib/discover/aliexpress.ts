// ═══════════════════════════════════════════════════════════════════════════
// AliExpress Open Platform client (server-only).
//
// Signs requests for the affiliate endpoints so the catalog can be filled with
// real products: titles, official images, live prices and destination URLs.
// Credentials come from env only (ALIEXPRESS_APP_KEY / ALIEXPRESS_APP_SECRET)
// and never reach the browser.
//
// Signing (TOP/IOP `sync` gateway): take every request parameter, sort the keys
// ASCII-ascending, concatenate `key + value` with no separators, HMAC-SHA256
// with the app secret, and upper-case the hex digest.
// ═══════════════════════════════════════════════════════════════════════════
import crypto from "crypto"

const GATEWAY = process.env.ALIEXPRESS_GATEWAY || "https://api-sg.aliexpress.com/sync"
const APP_KEY = process.env.ALIEXPRESS_APP_KEY || ""
const APP_SECRET = process.env.ALIEXPRESS_APP_SECRET || ""

export function aliexpressConfigured(): boolean {
  return Boolean(APP_KEY && APP_SECRET)
}

function sign(params: Record<string, string>, secret: string): string {
  const base = Object.keys(params)
    .sort()
    .map(k => `${k}${params[k]}`)
    .join("")
  return crypto.createHmac("sha256", secret).update(base, "utf8").digest("hex").toUpperCase()
}

// AliExpress expects `yyyy-MM-dd HH:mm:ss` in GMT+8.
function timestampGmt8(): string {
  const d = new Date(Date.now() + 8 * 60 * 60 * 1000)
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`
}

export async function callAliexpress(
  method: string,
  business: Record<string, string | number | undefined> = {},
): Promise<{ ok: boolean; data?: any; error?: string }> {
  if (!aliexpressConfigured()) {
    return { ok: false, error: "ALIEXPRESS_APP_KEY / ALIEXPRESS_APP_SECRET not set" }
  }

  const params: Record<string, string> = {
    app_key: APP_KEY,
    method,
    format: "json",
    v: "2.0",
    sign_method: "sha256",
    timestamp: timestampGmt8(),
  }
  for (const [k, v] of Object.entries(business)) {
    if (v !== undefined && v !== null && v !== "") params[k] = String(v)
  }
  params.sign = sign(params, APP_SECRET)

  try {
    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params).toString(),
      cache: "no-store",
    })
    const text = await res.text()
    let json: any
    try {
      json = JSON.parse(text)
    } catch {
      return { ok: false, error: `Non-JSON response: ${text.slice(0, 300)}` }
    }
    // The gateway reports failures in-band with HTTP 200.
    if (json?.error_response) {
      const e = json.error_response
      return { ok: false, error: `${e.code ?? ""} ${e.msg ?? ""} ${e.sub_msg ?? ""}`.trim() }
    }
    return { ok: true, data: json }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Request failed" }
  }
}

// ── Normalised product shape used by the sync job ─────────────────────────
export interface AliProduct {
  productId: string
  title: string
  image: string
  price: number
  currency: string
  url: string
  categoryName?: string
  rating?: number
  orders?: number
}

// The affiliate responses nest the payload differently per method; this digs
// out the product list without assuming one exact shape.
function extractProducts(data: any): any[] {
  const candidates = [
    data?.aliexpress_affiliate_hotproduct_query_response?.resp_result?.result?.products?.product,
    data?.aliexpress_affiliate_product_query_response?.resp_result?.result?.products?.product,
    data?.resp_result?.result?.products?.product,
    data?.result?.products?.product,
  ]
  for (const c of candidates) {
    if (Array.isArray(c)) return c
    if (c && typeof c === "object") return [c]
  }
  return []
}

function toNumber(v: unknown): number {
  const n = Number(String(v ?? "").replace(/[^0-9.]/g, ""))
  return Number.isFinite(n) ? n : 0
}

function normalise(raw: any): AliProduct | null {
  const productId = String(raw?.product_id ?? raw?.productId ?? "")
  const title = String(raw?.product_title ?? raw?.productTitle ?? "").trim()
  const image = String(raw?.product_main_image_url ?? raw?.productMainImageUrl ?? "").trim()
  const url = String(raw?.product_detail_url ?? raw?.productDetailUrl ?? "").trim()
  if (!productId || !title || !url) return null

  const price = toNumber(
    raw?.target_sale_price ?? raw?.targetSalePrice ?? raw?.sale_price ?? raw?.app_sale_price,
  )
  const currency = String(
    raw?.target_sale_price_currency ?? raw?.targetSalePriceCurrency ?? raw?.sale_price_currency ?? "USD",
  )

  return {
    productId,
    title,
    // AliExpress serves protocol-relative image URLs in places.
    image: image.startsWith("//") ? `https:${image}` : image,
    price,
    currency,
    url: url.startsWith("//") ? `https:${url}` : url,
    categoryName: raw?.first_level_category_name ?? raw?.second_level_category_name ?? undefined,
    rating: raw?.evaluate_rate ? toNumber(raw.evaluate_rate) : undefined,
    orders: raw?.lastest_volume ? toNumber(raw.lastest_volume) : undefined,
  }
}

/** Trending products — the "global radar" feed. */
export async function fetchHotProducts(opts: {
  categoryIds?: string
  pageSize?: number
  pageNo?: number
  currency?: string
  language?: string
  shipTo?: string
} = {}): Promise<{ ok: boolean; products: AliProduct[]; error?: string }> {
  const res = await callAliexpress("aliexpress.affiliate.hotproduct.query", {
    category_ids: opts.categoryIds,
    page_size: opts.pageSize ?? 20,
    page_no: opts.pageNo ?? 1,
    target_currency: opts.currency ?? "USD",
    target_language: opts.language ?? "EN",
    ship_to_country: opts.shipTo ?? "US",
    tracking_id: process.env.ALIEXPRESS_TRACKING_ID || undefined,
  })
  if (!res.ok) return { ok: false, products: [], error: res.error }
  const products = extractProducts(res.data).map(normalise).filter(Boolean) as AliProduct[]
  return { ok: true, products }
}

/** Keyword search — used to pull a specific catalog. */
export async function searchProducts(
  keywords: string,
  opts: { pageSize?: number; pageNo?: number; currency?: string; shipTo?: string } = {},
): Promise<{ ok: boolean; products: AliProduct[]; error?: string }> {
  const res = await callAliexpress("aliexpress.affiliate.product.query", {
    keywords,
    page_size: opts.pageSize ?? 20,
    page_no: opts.pageNo ?? 1,
    target_currency: opts.currency ?? "USD",
    target_language: "EN",
    ship_to_country: opts.shipTo ?? "US",
    tracking_id: process.env.ALIEXPRESS_TRACKING_ID || undefined,
  })
  if (!res.ok) return { ok: false, products: [], error: res.error }
  const products = extractProducts(res.data).map(normalise).filter(Boolean) as AliProduct[]
  return { ok: true, products }
}
