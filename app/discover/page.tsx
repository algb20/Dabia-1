import Link from "next/link";
import { Suspense } from "react";
import { SITE, href } from "@/lib/discover/config";
import { getTrending, getCategories, getBrands, STATS } from "@/lib/discover/store";
import { ProductCard, Tile, Seal } from "@/components/discover/ui";
import { SearchBox } from "@/components/discover/client";
import { money } from "@/lib/discover/format";

export default async function DiscoverHome() {
  const [trending, categories, brands] = await Promise.all([
    getTrending(12),
    getCategories(),
    getBrands(),
  ]);

  // The hero's proof panel uses the most-compared product that actually has
  // several sources, so the example is real rather than illustrative.
  const heroProduct = trending.find((p) => p.offers.length >= 3) ?? trending[0];

  return (
    <>
      {/* hero */}
      <section className="d-wrap d-hero">
        <div className="d-hero-copy">
        <span className="d-eyebrow d-hero-eyebrow">
          <Seal label="Official-source index" />
        </span>
        <h1 className="d-h1">The original. From its official source.</h1>
        <p className="d-lead d-hero-lead">
          {SITE.name} indexes authentic products across their official and authorized sources, compares the real
          price side by side, and sends you straight to the genuine one. No imitations, no guesswork.
        </p>
        <div className="d-hero-search">
          <Suspense fallback={null}>
            <SearchBox size="lg" />
          </Suspense>
        </div>
        <div className="d-hero-stats">
          <span className="d-stat">
            <b>{STATS.products}</b>
            <span>Products indexed</span>
          </span>
          <span className="d-stat">
            <b>{STATS.sources}</b>
            <span>Official sources</span>
          </span>
          <span className="d-stat">
            <b>{STATS.brands}</b>
            <span>Verified brands</span>
          </span>
          <span className="d-stat">
            <b>{STATS.offers}</b>
            <span>Live-ready listings</span>
          </span>
        </div>
        </div>

        {/* The right column shows the product doing its job, using a real
            indexed product rather than a mock — the desktop hero otherwise
            left half the row empty. Hidden on narrow screens. */}
        {heroProduct && heroProduct.offers.length > 0 && (
          <aside className="d-hero-proof" aria-label="Example comparison">
            <div className="d-proof-head">
              <span className="d-eyebrow">One product · every official source</span>
              <strong className="d-proof-name">{heroProduct.name}</strong>
            </div>
            <ul className="d-proof-rows">
              {heroProduct.offers.slice(0, 3).map((o, i) => (
                <li key={o.id} className={`d-proof-row${i === 0 ? " is-best" : ""}`}>
                  <span className="d-proof-src">
                    <span className="d-proof-code">{o.source.code}</span>
                    {o.source.name}
                  </span>
                  <span className="d-proof-price">
                    {money(o.price, o.currency)}
                    {i === 0 && <em className="d-proof-tag">Best price</em>}
                  </span>
                </li>
              ))}
            </ul>
            <p className="d-proof-foot">
              Verified sources only · we never hold stock or resell
            </p>
          </aside>
        )}
      </section>

      {/* trending */}
      <section className="d-wrap d-section">
        <div className="d-section-head">
          <div>
            <span className="d-eyebrow">Most compared</span>
            <h2 className="d-h2" style={{ marginTop: 8 }}>
              Trending right now
            </h2>
          </div>
          <Link href={href("/search")} className="d-btn d-btn--sm">
            Browse all
          </Link>
        </div>
        <div className="d-grid">
          {trending.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </section>

      {/* categories */}
      <section className="d-wrap d-section">
        <div className="d-section-head">
          <div>
            <span className="d-eyebrow">By category</span>
            <h2 className="d-h2" style={{ marginTop: 8 }}>
              Start where you shop
            </h2>
          </div>
        </div>
        <div className="d-grid">
          {categories.map((c, i) => (
            <Link key={c.id} href={href(`/c/${c.slug}`)} className="d-card">
              <Tile hue={[250, 205, 220, 300][i % 4]} initial={c.name.charAt(0)} mono={`CAT/${i + 1}`} />
              <div className="d-card-body">
                <span className="d-card-name">{c.name}</span>
                <span className="d-faint" style={{ fontSize: 13 }}>
                  {c.blurb}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* value props */}
      <section className="d-wrap d-section">
        <div className="d-steps">
          <div className="d-step">
            <span className="d-step-no">01 — AUTHENTIC</span>
            <h3 className="d-h3">Originals only</h3>
            <p>Every listing comes from an official or authorized source. Imitations are excluded by design, not by hope.</p>
          </div>
          <div className="d-step">
            <span className="d-step-no">02 — COMPARE</span>
            <h3 className="d-h3">One honest view</h3>
            <p>See each source&apos;s real price, currency and availability in a single ledger — with the best price flagged.</p>
          </div>
          <div className="d-step">
            <span className="d-step-no">03 — DIRECT</span>
            <h3 className="d-h3">Straight to the source</h3>
            <p>We don&apos;t hold stock or resell. One tap takes you to the genuine seller to complete your purchase.</p>
          </div>
          <div className="d-step">
            <span className="d-step-no">04 — NEUTRAL</span>
            <h3 className="d-h3">On your side</h3>
            <p>An independent index. We may earn a commission on a referral, but ranking follows price and authenticity.</p>
          </div>
        </div>
      </section>

      {/* brands */}
      <section className="d-wrap d-section">
        <div className="d-section-head">
          <div>
            <span className="d-eyebrow">Verified brands</span>
            <h2 className="d-h2" style={{ marginTop: 8 }}>
              Names you can trust
            </h2>
          </div>
        </div>
        <div className="d-grid">
          {brands.map((b) => (
            <Link key={b.id} href={href(`/b/${b.slug}`)} className="d-card">
              <Tile hue={b.hue} initial={b.monogram} mono="BRAND" />
              <div className="d-card-body">
                <div className="d-row" style={{ justifyContent: "space-between" }}>
                  <span className="d-card-name">{b.name}</span>
                  {b.official ? <Seal label="Official" /> : null}
                </div>
                <span className="d-faint" style={{ fontSize: 13 }}>
                  {b.blurb}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
