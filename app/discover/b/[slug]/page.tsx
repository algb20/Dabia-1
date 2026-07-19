import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBrands, getBrandBySlug, getBrandProducts } from "@/lib/discover/store";
import { ProductCard, Tile, Seal } from "@/components/discover/ui";
import { FollowBrand } from "@/components/discover/client";

export function generateStaticParams() {
  return getBrands().map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const b = getBrandBySlug(slug);
  return b ? { title: b.name, description: b.blurb } : { title: "Brand" };
}

export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const brand = getBrandBySlug(slug);
  if (!brand) notFound();
  const products = getBrandProducts(brand.id);

  return (
    <section className="d-wrap d-section" style={{ paddingTop: 34 }}>
      <div className="d-row" style={{ gap: 20, marginBottom: 30, alignItems: "flex-start" }}>
        <div style={{ width: 92, flex: "none" }}>
          <Tile hue={brand.hue} initial={brand.monogram} />
        </div>
        <div className="d-stack" style={{ gap: 10, flex: 1, minWidth: 0 }}>
          <div className="d-row" style={{ gap: 12 }}>
            <h1 className="d-h1" style={{ fontSize: "clamp(26px,3.4vw,38px)" }}>
              {brand.name}
            </h1>
            {brand.official ? <Seal label="Official brand" /> : null}
          </div>
          <p className="d-lead" style={{ fontSize: 17 }}>
            {brand.blurb}
          </p>
          <div className="d-row" style={{ marginTop: 4 }}>
            <FollowBrand slug={brand.slug} />
          </div>
        </div>
      </div>
      <div className="d-grid">
        {products.map((p) => (
          <ProductCard key={p.id} p={p} />
        ))}
      </div>
    </section>
  );
}
