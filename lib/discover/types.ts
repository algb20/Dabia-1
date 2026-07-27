// Data model for Dabia Discover. Mirrors the proposed `discover_*` schema so the
// local seed can be swapped for a live Supabase + affiliate-feed backend with no
// change to the UI — the only "connection" work left is implementing DataSource
// against real feeds (see lib/discover/store.ts).

export type SourceKind = "brand" | "authorized" | "marketplace" | "network";

export interface Source {
  id: string;
  name: string;
  kind: SourceKind;
  /** Whether goods from this source are guaranteed authentic (official or authorized). */
  official: boolean;
  domain: string;
  /** Short code shown in the ledger, e.g. "APL", "SMS". */
  code: string;
}

export interface Brand {
  id: string;
  slug: string;
  name: string;
  official: boolean;
  blurb: string;
  /** Two-letter monogram for the generated tile. */
  monogram: string;
  /** Hue (0–360) used for the brand's generated tile — keeps the look systematic, not stock-photo. */
  hue: number;
  categoryIds: string[];
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  blurb: string;
}

export type Availability = "in_stock" | "low" | "preorder" | "out";

export interface Offer {
  id: string;
  productId: string;
  sourceId: string;
  price: number;
  currency: string; // ISO 4217, e.g. "USD", "AED"
  url: string; // real destination; affiliate tracking wrapped at redirect time
  availability: Availability;
  /** ISO date the price was last observed. */
  updatedAt: string;
  shipsTo?: string;
}

export interface PricePoint {
  date: string; // ISO
  price: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  brandId: string;
  categoryId: string;
  /** One-line positioning. */
  summary: string;
  description: string;
  specs: { label: string; value: string }[];
  gtin?: string;
  hue: number;
  /** Base currency for the headline price history. */
  currency: string;
  history: PricePoint[];
}

export interface OfferView extends Offer {
  source: Source;
}

export interface ProductView extends Product {
  brand: Brand;
  category: Category;
  offers: OfferView[];
  bestOffer: OfferView | null;
}
