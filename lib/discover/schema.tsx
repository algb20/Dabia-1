// ═══════════════════════════════════════════════════════════════════════════
// Structured data (schema.org / JSON-LD).
//
// This is what lets Google show a listing as a rich result — price, currency,
// availability, seller — instead of a plain blue link. For a price-comparison
// index it is the single strongest trust and visibility signal available, and
// it costs nothing at runtime: the markup is emitted server-side with the page.
// ═══════════════════════════════════════════════════════════════════════════
import type { ProductView } from "@/lib/discover/types"
import { SITE } from "@/lib/discover/config"

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://dabia-app.vercel.app"

function abs(path: string): string {
  return `${BASE}${path.startsWith("/") ? path : `/${path}`}`
}

/** Renders a JSON-LD block. Kept in one place so every page emits it the same way. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // The payload is built from our own catalog, never from user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

/** Product + AggregateOffer — the shape Google reads for price-range results. */
export function productSchema(p: ProductView) {
  const prices = p.offers.map(o => o.price).filter(n => Number.isFinite(n) && n > 0)
  const low = prices.length ? Math.min(...prices) : undefined
  const high = prices.length ? Math.max(...prices) : undefined
  const currency = p.bestOffer?.currency ?? p.currency ?? "USD"

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description || p.summary,
    ...(p.image ? { image: [p.image] } : {}),
    ...(p.gtin ? { gtin: p.gtin } : {}),
    brand: { "@type": "Brand", name: p.brand.name },
    category: p.category.name,
    url: abs(`/discover/p/${p.slug}`),
    ...(prices.length
      ? {
          offers: {
            "@type": "AggregateOffer",
            offerCount: p.offers.length,
            lowPrice: low,
            highPrice: high,
            priceCurrency: currency,
            // Each source is listed so the comparison itself is machine-readable.
            offers: p.offers.map(o => ({
              "@type": "Offer",
              price: o.price,
              priceCurrency: o.currency,
              availability:
                o.availability === "out"
                  ? "https://schema.org/OutOfStock"
                  : o.availability === "low"
                    ? "https://schema.org/LimitedAvailability"
                    : "https://schema.org/InStock",
              seller: { "@type": "Organization", name: o.source.name },
              url: abs(`/discover/go/${o.id}`),
            })),
          },
        }
      : {}),
  }
}

/** Breadcrumbs — gives Google the category path instead of a bare URL. */
export function breadcrumbSchema(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: abs(t.path),
    })),
  }
}

/** Site identity + the search action that enables a sitelinks search box. */
export function siteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: abs("/discover"),
    description: SITE.descriptionShort,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: abs("/discover/search?q={search_term_string}") },
      "query-input": "required name=search_term_string",
    },
  }
}

/** A category page is an ItemList — it can surface as a carousel. */
export function itemListSchema(products: ProductView[], listName: string) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: abs(`/discover/p/${p.slug}`),
      name: p.name,
    })),
  }
}
