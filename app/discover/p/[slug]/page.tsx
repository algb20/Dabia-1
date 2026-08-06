import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductView, allProductSlugs, getCategoryProducts } from "@/lib/discover/store";
import { Tile, Seal, OfferLedger, Sparkline, SpecList, ProductCard } from "@/components/discover/ui";
import { SaveButton, AlertButton } from "@/components/discover/client";
import { money } from "@/lib/discover/format";
import { href } from "@/lib/discover/config";

export async function generateStaticParams() {
  const slugs = await allProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductView(slug);
  if (!p) return { title: "Not found" };
  return {
    title: p.name,
    description: `${p.name} — compare official-source prices from ${p.offers.length} verified sellers. ${p.summary}`,
    openGraph: { title: p.name, description: p.summary, type: "website" },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [p, related] = await Promise.all([
    getProductView(slug),
    getCategoryProducts(slug).then((all) => all.filter((r) => r.slug !== slug).slice(0, 4)),
  ]);
  if (!p) notFound();

  const best = p.bestOffer;
  const first = p.history[0]?.price;
  const last = p.history[p.history.length - 1]?.price;
  const drop = first && last ? Math.round(((first - last) / first) * 100) : 0;

  return (
    <section className="d-wrap">
      <div className="d-crumbs" style={{ paddingTop: 24 }}>
        <Link href={href("/")}>Index</Link>
        <span>/</span>
        <Link href={href(`/c/${p.category.slug}`)}>{p.category.name}</Link>
        <span>/</span>
        <Link href={href(`/b/${p.brand.slug}`)}>{p.brand.name}</Link>
      </div>

      <div className="d-product">
        {/* left: media + specs */}
        <div className="d-stack" style={{ gap: 18 }}>
          <div className="d-media">
            <Tile hue={p.hue} initial={p.name.charAt(0)} mono={p.brand.monogram} image={p.image} alt={p.name} />
          </div>
          <div className="d-panel">
            <span className="d-kicker">Specifications</span>
            <div style={{ marginTop: 12 }}>
              <SpecList specs={p.specs} />
            </div>
            {p.gtin ? (
              <p className="d-faint" style={{ fontSize: 12, marginTop: 12, fontFamily: "var(--mono)" }}>
                GTIN {p.gtin}
              </p>
            ) : null}
          </div>
        </div>

        {/* right: head + ledger + history */}
        <div className="d-stack" style={{ gap: 20 }}>
          <div className="d-prod-head">
            <div className="d-prod-meta">
              <span className="d-card-brand">{p.brand.name}</span>
              <Seal />
            </div>
            <div className="d-prod-title">
              <h1 className="d-h1" style={{ fontSize: "clamp(26px,3.4vw,38px)" }}>
                {p.name}
              </h1>
              <p className="d-lead" style={{ fontSize: 17 }}>
                {p.summary}
              </p>
            </div>
            <div className="d-row" style={{ marginTop: 4 }}>
              {best ? (
                <div className="d-row" style={{ gap: 10, alignItems: "baseline" }}>
                  <span className="d-faint" style={{ fontSize: 13 }}>From</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em" }}>
                    {money(best.price, best.currency)}
                  </span>
                  <span className="d-faint" style={{ fontSize: 13 }}>at {best.source.name}</span>
                </div>
              ) : null}
            </div>
            <div className="d-row" style={{ gap: 10, marginTop: 6 }}>
              <SaveButton slug={p.slug} />
              <AlertButton slug={p.slug} />
            </div>
          </div>

          <OfferLedger product={p} />

          <div className="d-panel">
            <div className="d-row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="d-kicker">Price history · {p.currency}</span>
              {drop > 0 ? (
                <span className="d-chip d-chip--good">
                  <span className="d-dot" />
                  Down {drop}% since Feb
                </span>
              ) : (
                <span className="d-faint" style={{ fontSize: 13 }}>Stable</span>
              )}
            </div>
            <div style={{ marginTop: 12 }}>
              <Sparkline history={p.history} currency={p.currency} />
            </div>
            <p className="d-faint" style={{ fontSize: 13, marginTop: 12, lineHeight: 1.6 }}>
              {p.description}
            </p>
          </div>
        </div>
      </div>

      {related.length ? (
        <section className="d-section" style={{ marginTop: 20 }}>
          <div className="d-section-head">
            <h2 className="d-h2">More in {p.category.name}</h2>
            <Link href={href(`/c/${p.category.slug}`)} className="d-btn d-btn--sm">
              See all
            </Link>
          </div>
          <div className="d-grid">
            {related.map((r) => (
              <ProductCard key={r.id} p={r} />
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
