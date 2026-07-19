import { SOURCES, CATEGORIES, BRANDS, PRODUCTS, OFFERS, TRENDING_IDS } from "./data";
import type { Product, ProductView, OfferView, Source, Brand, Category, Offer } from "./types";

// ---------------------------------------------------------------------------
// Query layer. Today it reads the local seed synchronously. To go live, keep
// these signatures and back them with Supabase + affiliate feeds — the UI does
// not change. This is the single "connection seam" mentioned in the README.
// ---------------------------------------------------------------------------

// Approximate FX to USD, used only to rank offers across currencies. In
// production this comes from a rates provider; the UI always shows the real
// listed currency and marks cross-currency comparisons as approximate.
const FX_TO_USD: Record<string, number> = { USD: 1, AED: 0.2723, EUR: 1.08, GBP: 1.27, SAR: 0.2666 };

export function toUSD(price: number, currency: string): number {
  const r = FX_TO_USD[currency] ?? 1;
  return price * r;
}

export function getSource(id: string): Source | undefined {
  return SOURCES.find((s) => s.id === id);
}
export function getCategories(): Category[] {
  return CATEGORIES;
}
export function getBrands(): Brand[] {
  return BRANDS;
}
export function getCategoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}
export function getBrandBySlug(slug: string): Brand | undefined {
  return BRANDS.find((b) => b.slug === slug);
}

function offersFor(productId: string): OfferView[] {
  return OFFERS.filter((o) => o.productId === productId)
    .map((o) => ({ ...o, source: getSource(o.sourceId)! }))
    .filter((o) => o.source)
    .sort((a, b) => toUSD(a.price, a.currency) - toUSD(b.price, b.currency));
}

function available(o: Offer): boolean {
  return o.availability !== "out";
}

function toView(p: Product): ProductView {
  const offers = offersFor(p.id);
  const inStock = offers.filter((o) => available(o));
  return {
    ...p,
    brand: BRANDS.find((b) => b.id === p.brandId)!,
    category: CATEGORIES.find((c) => c.id === p.categoryId)!,
    offers,
    bestOffer: inStock[0] ?? offers[0] ?? null,
  };
}

export function getProductView(slug: string): ProductView | undefined {
  const p = PRODUCTS.find((x) => x.slug === slug);
  return p ? toView(p) : undefined;
}

export function allProductSlugs(): string[] {
  return PRODUCTS.map((p) => p.slug);
}

export interface ListFilter {
  q?: string;
  categoryId?: string;
  brandId?: string;
  sort?: "relevance" | "price_asc" | "price_desc" | "name";
  max?: number;
}

export function listProducts(filter: ListFilter = {}): ProductView[] {
  const q = (filter.q || "").trim().toLowerCase();
  let items = PRODUCTS.map(toView);

  if (filter.categoryId) items = items.filter((p) => p.categoryId === filter.categoryId);
  if (filter.brandId) items = items.filter((p) => p.brandId === filter.brandId);
  if (q) {
    items = items.filter((p) => {
      const hay = `${p.name} ${p.brand.name} ${p.category.name} ${p.summary}`.toLowerCase();
      return q.split(/\s+/).every((tok) => hay.includes(tok));
    });
  }

  switch (filter.sort) {
    case "price_asc":
      items.sort((a, b) => priceUSD(a) - priceUSD(b));
      break;
    case "price_desc":
      items.sort((a, b) => priceUSD(b) - priceUSD(a));
      break;
    case "name":
      items.sort((a, b) => a.name.localeCompare(b.name));
      break;
    default:
      break;
  }
  return typeof filter.max === "number" ? items.slice(0, filter.max) : items;
}

function priceUSD(p: ProductView): number {
  return p.bestOffer ? toUSD(p.bestOffer.price, p.bestOffer.currency) : Number.POSITIVE_INFINITY;
}

export function getTrending(n = 8): ProductView[] {
  const map = new Map(PRODUCTS.map((p) => [p.id, p]));
  const picked = TRENDING_IDS.map((id) => map.get(id)).filter(Boolean) as Product[];
  return picked.slice(0, n).map(toView);
}

export function getBrandProducts(brandId: string): ProductView[] {
  return listProducts({ brandId });
}
export function getCategoryProducts(categoryId: string): ProductView[] {
  return listProducts({ categoryId });
}

export function getOfferView(offerId: string): OfferView | undefined {
  const o = OFFERS.find((x) => x.id === offerId);
  if (!o) return undefined;
  const source = getSource(o.sourceId);
  return source ? { ...o, source } : undefined;
}

export function offerCountBySource(): { source: Source; count: number }[] {
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
