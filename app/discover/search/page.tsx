import { Suspense } from "react";
import type { Metadata } from "next";
import { listProducts, getCategories, getBrands, getCategoryBySlug, getBrandBySlug } from "@/lib/discover/store";
import { ProductCard } from "@/components/discover/ui";
import { Filters } from "@/components/discover/client";
import { SITE } from "@/lib/discover/config";

export const metadata: Metadata = { title: "Search" };

type SP = { q?: string; category?: string; brand?: string; sort?: string };

export default async function SearchPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const category = sp.category ? getCategoryBySlug(sp.category) : undefined;
  const brand = sp.brand ? getBrandBySlug(sp.brand) : undefined;
  const sort = (sp.sort as "relevance" | "price_asc" | "price_desc" | "name") || "relevance";

  const results = listProducts({
    q,
    categoryId: category?.id,
    brandId: brand?.id,
    sort,
  });

  const categories = getCategories();
  const brands = getBrands();

  return (
    <section className="d-wrap d-section" style={{ paddingTop: 34 }}>
      <div className="d-stack" style={{ gap: 6, marginBottom: 22 }}>
        <span className="d-eyebrow">{SITE.wordmark} · index</span>
        <h1 className="d-h2">
          {q ? (
            <>
              Results for <span style={{ color: "var(--pine)" }}>“{q}”</span>
            </>
          ) : category ? (
            category.name
          ) : brand ? (
            brand.name
          ) : (
            "Browse the index"
          )}
        </h1>
        <p className="d-faint" style={{ fontSize: 14 }}>
          {results.length} product{results.length === 1 ? "" : "s"} · official-source listings only
        </p>
      </div>

      <div style={{ marginBottom: 26 }}>
        <Suspense fallback={null}>
          <Filters
            categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
            brands={brands.map((b) => ({ slug: b.slug, name: b.name }))}
          />
        </Suspense>
      </div>

      {results.length ? (
        <div className="d-grid">
          {results.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      ) : (
        <div className="d-empty">
          <h2 className="d-h3">Nothing matched</h2>
          <p>Try a broader term, or clear a filter above.</p>
        </div>
      )}
    </section>
  );
}
