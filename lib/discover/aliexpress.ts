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

function signBase(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map(k => `${k}${params[k]}`)
    .join("")
}

function sign(params: Record<string, string>, secret: string): string {
  return crypto.createHmac("sha256", secret).update(signBase(params), "utf8").digest("hex").toUpperCase()
}

// `yyyy-MM-dd HH:mm:ss` in GMT+8 — the legacy TOP timestamp form.
function timestampGmt8(): string {
  const d = new Date(Date.now() + 8 * 60 * 60 * 1000)
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`
}

// ── Signature diagnostics ────────────────────────────────────────────────
// The gateway only ever answers "IncompleteSignature" — it never says which
// part is wrong. Rather than guess one variant per deploy, this fires every
// plausible combination once and reports which one the gateway accepts.
type Variant = {
  name: string
  params: Record<string, string>
  signer: (p: Record<string, string>, secret: string) => string
}

function buildVariants(method: string, business: Record<string, string>): Variant[] {
  const ms = String(Date.now())
  const dt = timestampGmt8()
  const hmac256 = (p: Record<string, string>, s: string) =>
    crypto.createHmac("sha256", s).update(signBase(p), "utf8").digest("hex").toUpperCase()
  // Legacy TOP MD5: the secret wraps the base on both sides.
  const md5Wrapped = (p: Record<string, string>, s: string) =>
    crypto.createHash("md5").update(s + signBase(p) + s, "utf8").digest("hex").toUpperCase()

  return [
    {
      name: "A: sha256 + ms timestamp (bare)",
      params: { app_key: APP_KEY, method, sign_method: "sha256", timestamp: ms, ...business },
      signer: hmac256,
    },
    {
      name: "B: sha256 + ms timestamp + format/v",
      params: { app_key: APP_KEY, method, sign_method: "sha256", timestamp: ms, format: "json", v: "2.0", ...business },
      signer: hmac256,
    },
    {
      name: "C: sha256 + datetime GMT+8 + format/v",
      params: { app_key: APP_KEY, method, sign_method: "sha256", timestamp: dt, format: "json", v: "2.0", ...business },
      signer: hmac256,
    },
    {
      name: "D: hmac-sha256 label + ms timestamp",
      params: { app_key: APP_KEY, method, sign_method: "hmac-sha256", timestamp: ms, ...business },
      signer: hmac256,
    },
    {
      name: "E: md5 wrapped + datetime GMT+8 + format/v",
      params: { app_key: APP_KEY, method, sign_method: "md5", timestamp: dt, format: "json", v: "2.0", ...business },
      signer: md5Wrapped,
    },
  ]
}

/** Masked view of the credentials, so they can be compared against the
 *  AliExpress console without printing the secret itself. If every signature
 *  variant fails, a mismatched secret is the likeliest cause — for example a
 *  secret that was reset in the console after being copied into the env. */
export function credentialFingerprint() {
  const mask = (s: string) =>
    s.length <= 4 ? "(too short)" : `${s.slice(0, 2)}…${s.slice(-2)}`
  return {
    app_key: APP_KEY || "(missing)",
    app_key_length: APP_KEY.length,
    secret_length: APP_SECRET.length,
    secret_masked: APP_SECRET ? mask(APP_SECRET) : "(missing)",
    // Whitespace pasted around a value is a classic env-var mistake and would
    // silently break every signature.
    secret_has_whitespace: /^\s|\s$/.test(process.env.ALIEXPRESS_APP_SECRET ?? ""),
    app_key_has_whitespace: /^\s|\s$/.test(process.env.ALIEXPRESS_APP_KEY ?? ""),
    gateway: GATEWAY,
  }
}

/** Fires each signature variant once and reports the gateway's verdict. */
export async function diagnoseSignature(): Promise<{ configured: boolean; credentials?: any; results: any[] }> {
  if (!aliexpressConfigured()) return { configured: false, results: [] }

  const business = { page_size: "1", page_no: "1", target_currency: "USD", target_language: "EN" }
  const results: any[] = []

  for (const v of buildVariants("aliexpress.affiliate.hotproduct.query", business)) {
    const params = { ...v.params }
    params.sign = v.signer(params, APP_SECRET)
    try {
      const res = await fetch(GATEWAY, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(params).toString(),
        cache: "no-store",
      })
      const text = await res.text()
      let verdict = "unknown"
      if (/IncompleteSignature/i.test(text)) verdict = "bad-signature"
      else if (/IllegalAccess|permission|not authorized|ApiCallLimit/i.test(text)) verdict = "signature-OK-but-access-denied"
      else if (/error_response|"code"\s*:\s*"?[1-9]/i.test(text)) verdict = "other-error"
      else verdict = "ACCEPTED"
      results.push({ variant: v.name, verdict, sample: text.slice(0, 220) })
    } catch (e) {
      results.push({ variant: v.name, verdict: "network-error", sample: String(e).slice(0, 160) })
    }
  }
  return { configured: true, credentials: credentialFingerprint(), results }
}

export async function callAliexpress(
  method: string,
  business: Record<string, string | number | undefined> = {},
): Promise<{ ok: boolean; data?: any; error?: string }> {
  if (!aliexpressConfigured()) {
    return { ok: false, error: "ALIEXPRESS_APP_KEY / ALIEXPRESS_APP_SECRET not set" }
  }

  // The IOP gateway (api-sg.aliexpress.com/sync) takes the timestamp as
  // milliseconds since epoch — the older `yyyy-MM-dd HH:mm:ss` form belongs to
  // the legacy TOP gateway and is rejected here as IncompleteSignature.
  const params: Record<string, string> = {
    app_key: APP_KEY,
    method,
    sign_method: "sha256",
    timestamp: String(Date.now()),
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
    // The gateway reports failures in-band with HTTP 200, and uses two shapes:
    // the TOP-style `error_response`, and IOP's flat `code`/`message` fields.
    if (json?.error_response) {
      const e = json.error_response
      return { ok: false, error: `${e.code ?? ""} ${e.msg ?? ""} ${e.sub_msg ?? ""}`.trim() }
    }
    if (json?.code && String(json.code) !== "0") {
      return {
        ok: false,
        error: `${json.code} ${json.message ?? ""} ${json.request_id ? `(req ${json.request_id})` : ""}`.trim(),
      }
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
