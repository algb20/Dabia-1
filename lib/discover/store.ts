import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SOURCES, CATEGORIES, BRANDS, PRODUCTS, OFFERS, TRENDING_IDS } from "./data";
import type { Product, ProductView, OfferView, Source, Brand, Category, Offer } from "./types";

// ---------------------------------------------------------------------------
// Query layer.
// Reads from Supabase when env vars are available; falls back to the local
// seed synchronously. The UI and page signatures are unchanged — this is the
// only file that changes when you swap the data source.
// ---------------------------------------------------------------------------

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL  || "";
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

let _client: SupabaseClient | null = null;
function getClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON) return null;
  if (!_client) _client = createClient(SUPABASE_URL, SUPABASE_ANON);
  return _client;
}

// ── Approximate FX to USD (ranking only; UI always shows listed currency) ──
const FX_TO_USD: Record<string, number> = { USD: 1, AED: 0.2723, EUR: 1.08, GBP: 1.27, SAR: 0.2666 };

export function toUSD(price: number, currency: string): number {
  return price * (FX_TO_USD[currency] ?? 1);
}

// ═══════════════════════════════════════════════════════════════════════════
// Seed-based synchronous helpers (used as fallback + for client-component
// pure utilities that must be sync, e.g. toUSD above).
// ═══════════════════════════════════════════════════════════════════════════

export function getSource(id: string): Source | undefined {
  return SOURCES.find((s) => s.id === id);
}

function offersForSeed(productId: string): OfferView[] {
  return OFFERS.filter((o) => o.productId === productId)
    .map((o) => ({ ...o, source: getSource(o.sourceId)! }))
    .filter((o) => o.source)
    .sort((a, b) => toUSD(a.price, a.currency) - toUSD(b.price, b.currency));
}

function available(o: Offer): boolean {
  return o.availability !== "out";
}

function toView(p: Product): ProductView {
  const offers = offersForSeed(p.id);
  const inStock = offers.filter((o) => available(o));
  return {
    ...p,
    brand: BRANDS.find((b) => b.id === p.brandId)!,
    category: CATEGORIES.find((c) => c.id === p.categoryId)!,
    offers,
    bestOffer: inStock[0] ?? offers[0] ?? null,
  };
}

function priceUSD(p: ProductView): number {
  return p.bestOffer ? toUSD(p.bestOffer.price, p.bestOffer.currency) : Number.POSITIVE_INFINITY;
}

// ═══════════════════════════════════════════════════════════════════════════
// Supabase row → ProductView mapper
// ═══════════════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToView(row: any): ProductView {
  const offers: OfferView[] = (row.discover_offers ?? []).map((o: any) => ({
    id: o.id,
    productId: row.id,
    sourceId: o.source_id,
    source: o.discover_sources,
    price: Number(o.price),
    currency: o.currency,
    url: o.url,
    availability: o.availability,
    shipsTo: o.ships_to ?? undefined,
    updatedAt: o.updated_at,
  })).sort((a: OfferView, b: OfferView) => toUSD(a.price, a.currency) - toUSD(b.price, b.currency));

  const inStock = offers.filter((o) => o.availability !== "out");
  return {
    id: row.slug,
    slug: row.slug,
    name: row.name,
    brandId: row.brand_id,
    categoryId: row.category_id,
    summary: row.summary ?? "",
    description: row.description ?? "",
    specs: row.specs ?? [],
    history: row.history ?? [],
    currency: row.currency ?? "USD",
    hue: row.hue ?? 220,
    gtin: row.gtin ?? undefined,
    image: row.image ?? undefined,
    brand: row.discover_brands,
    category: row.discover_categories,
    offers,
    bestOffer: inStock[0] ?? offers[0] ?? null,
  };
}

const PRODUCT_SELECT = `
  id, slug, name, brand_id, category_id, summary, description, specs, history, currency, hue, gtin, image,
  discover_brands ( id, slug, name, official, monogram, hue, blurb ),
  discover_categories ( id, slug, name, blurb ),
  discover_offers (
    id, source_id, price, currency, url, availability, ships_to, updated_at,
    discover_sources ( id, name, kind, official, domain, code )
  )
`;

// ═══════════════════════════════════════════════════════════════════════════
// Exported async API — pages and generateStaticParams use these.
// ═══════════════════════════════════════════════════════════════════════════

export async function getCategories(): Promise<Category[]> {
  const db = getClient();
  if (db) {
    const { data } = await db.from("discover_categories").select("*").order("name");
    if (data?.length) return data as Category[];
  }
  return CATEGORIES;
}

export async function getBrands(): Promise<Brand[]> {
  const db = getClient();
  if (db) {
    const { data } = await db.from("discover_brands").select("*").order("name");
    if (data?.length) return data as Brand[];
  }
  return BRANDS;
}

export async function getCategoryBySlug(slug: string): Promise<Category | undefined> {
  const db = getClient();
  if (db) {
    const { data } = await db.from("discover_categories").select("*").eq("slug", slug).maybeSingle();
    if (data) return data as Category;
  }
  return CATEGORIES.find((c) => c.slug === slug);
}

export async function getBrandBySlug(slug: string): Promise<Brand | undefined> {
  const db = getClient();
  if (db) {
    const { data } = await db.from("discover_brands").select("*").eq("slug", slug).maybeSingle();
    if (data) return data as Brand;
  }
  return BRANDS.find((b) => b.slug === slug);
}

export async function getProductView(slug: string): Promise<ProductView | undefined> {
  const db = getClient();
  if (db) {
    const { data } = await db.from("discover_products").select(PRODUCT_SELECT).eq("slug", slug).maybeSingle();
    if (data) return rowToView(data);
  }
  const p = PRODUCTS.find((x) => x.slug === slug);
  return p ? toView(p) : undefined;
}

export async function allProductSlugs(): Promise<string[]> {
  const db = getClient();
  if (db) {
    const { data } = await db.from("discover_products").select("slug");
    if (data?.length) return data.map((r: { slug: string }) => r.slug);
  }
  return PRODUCTS.map((p) => p.slug);
}

export interface ListFilter {
  q?: string;
  categoryId?: string;
  brandId?: string;
  sort?: "relevance" | "price_asc" | "price_desc" | "name";
  max?: number;
}

export async function listProducts(filter: ListFilter = {}): Promise<ProductView[]> {
  const db = getClient();
  if (db) {
    let q = db.from("discover_products").select(PRODUCT_SELECT);
    if (filter.categoryId) q = q.eq("category_id", filter.categoryId);
    if (filter.brandId)    q = q.eq("brand_id", filter.brandId);
    if (filter.q?.trim()) {
      const term = filter.q.trim();
      q = q.textSearch("name", term, { type: "plain", config: "simple" });
    }
    if (filter.sort === "name") q = q.order("name");
    if (filter.max) q = q.limit(filter.max);
    const { data } = await q;
    if (data?.length) {
      let items = data.map(rowToView);
      if (filter.q?.trim() && !filter.sort) items = items;
      if (filter.sort === "price_asc")  items.sort((a, b) => priceUSD(a) - priceUSD(b));
      if (filter.sort === "price_desc") items.sort((a, b) => priceUSD(b) - priceUSD(a));
      return items;
    }
  }
  // seed fallback
  const q = (filter.q || "").trim().toLowerCase();
  let items = PRODUCTS.map(toView);
  if (filter.categoryId) items = items.filter((p) => p.categoryId === filter.categoryId);
  if (filter.brandId)    items = items.filter((p) => p.brandId === filter.brandId);
  if (q) items = items.filter((p) => {
    const hay = `${p.name} ${p.brand.name} ${p.category.name} ${p.summary}`.toLowerCase();
    return q.split(/\s+/).every((tok) => hay.includes(tok));
  });
  if (filter.sort === "price_asc")  items.sort((a, b) => priceUSD(a) - priceUSD(b));
  if (filter.sort === "price_desc") items.sort((a, b) => priceUSD(b) - priceUSD(a));
  if (filter.sort === "name")       items.sort((a, b) => a.name.localeCompare(b.name));
  return typeof filter.max === "number" ? items.slice(0, filter.max) : items;
}

export async function getTrending(n = 8): Promise<ProductView[]> {
  const db = getClient();
  if (db) {
    const { data } = await db.from("discover_products").select(PRODUCT_SELECT).limit(n * 2);
    if (data?.length) {
      const items = data.map(rowToView);
      // rank by offer count × sources (proxy for popularity until analytics land)
      items.sort((a, b) => b.offers.length - a.offers.length);
      return items.slice(0, n);
    }
  }
  const map = new Map(PRODUCTS.map((p) => [p.id, p]));
  const picked = TRENDING_IDS.map((id) => map.get(id)).filter(Boolean) as Product[];
  return picked.slice(0, n).map(toView);
}

export async function getBrandProducts(brandId: string): Promise<ProductView[]> {
  return listProducts({ brandId });
}

export async function getCategoryProducts(categoryId: string): Promise<ProductView[]> {
  return listProducts({ categoryId });
}

export async function getOfferView(offerId: string): Promise<OfferView | undefined> {
  const db = getClient();
  if (db) {
    const { data } = await db
      .from("discover_offers")
      .select("*, discover_sources(*), discover_products(slug)")
      .eq("id", offerId)
      .maybeSingle();
    if (data) {
      return {
        id: data.id,
        productId: data.discover_products?.slug ?? "",
        sourceId: data.source_id,
        source: data.discover_sources,
        price: Number(data.price),
        currency: data.currency,
        url: data.url,
        availability: data.availability,
        shipsTo: data.ships_to ?? undefined,
        updatedAt: data.updated_at,
      };
    }
  }
  const o = OFFERS.find((x) => x.id === offerId);
  if (!o) return undefined;
  const source = getSource(o.sourceId);
  return source ? { ...o, source } : undefined;
}

export async function offerCountBySource(): Promise<{ source: Source; count: number }[]> {
  return SOURCES.map((source) => ({
    source,
    count: OFFERS.filter((o) => o.sourceId === source.id).length,
  })).filter((x) => x.count > 0);
}

export const STATS = {
  products: PRODUCTS.length,
  sources: SOURCES.length,
  brands: BRANDS.length,
  offers: OFFERS.length,
};
