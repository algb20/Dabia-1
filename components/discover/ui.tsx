import Link from "next/link";
import type { ProductView, OfferView, PricePoint } from "@/lib/discover/types";
import { money, availabilityLabel, shortDate } from "@/lib/discover/format";
import { toUSD } from "@/lib/discover/store";
import { href } from "@/lib/discover/config";

/* Product/brand tile. Shows the real product photo when one is known;
   otherwise falls back to the generated monogram panel, so a product with
   no image still renders as part of the set rather than as a hole. */
export function Tile({
  hue,
  initial,
  mono,
  image,
  alt,
  className = "",
}: {
  hue: number;
  initial: string;
  mono?: string;
  image?: string;
  alt?: string;
  className?: string;
}) {
  const bg = `linear-gradient(150deg, hsl(${hue} 30% 44%), hsl(${(hue + 22) % 360} 36% 26%))`;

  if (image) {
    return (
      <div className={`d-tile d-tile--photo ${className}`} style={{ background: bg }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={alt ?? ""}
          loading="lazy"
          decoding="async"
          className="d-tile-img"
        />
      </div>
    );
  }

  return (
    <div className={`d-tile ${className}`} style={{ background: bg }} aria-hidden="true">
      <span className="d-tile-shine" />
      {mono ? <span className="d-tile-mono">{mono}</span> : null}
      <span className="d-tile-init">{initial}</span>
    </div>
  );
}

export function Seal({ label = "Official source" }: { label?: string }) {
  return (
    <span className="d-seal" title="Listed only from official or authorized sources">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 2l2.5 1.8 3-.3 1 2.9 2.6 1.6-1 2.9 1 2.9-2.6 1.6-1 2.9-3-.3L12 22l-2.5-1.8-3 .3-1-2.9L2.9 16l1-2.9-1-2.9 2.6-1.6 1-2.9 3 .3L12 2z"
          fill="currentColor"
          opacity="0.16"
        />
        <path d="M8.5 12.2l2.3 2.3 4.7-4.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </span>
  );
}

export function AvailabilityChip({ availability }: { availability: OfferView["availability"] }) {
  const a = availabilityLabel(availability);
  return (
    <span className={`d-chip d-chip--${a.tone}`}>
      <span className="d-dot" />
      {a.text}
    </span>
  );
}

export function ProductCard({ p }: { p: ProductView }) {
  const best = p.bestOffer;
  const sources = p.offers.length;
  return (
    <Link href={href(`/p/${p.slug}`)} className="d-card">
      <Tile hue={p.hue} initial={p.name.charAt(0)} mono={p.brand.monogram} image={p.image} alt={p.name} />
      <div className="d-card-body">
        <span className="d-card-brand">{p.brand.name}</span>
        <span className="d-card-name">{p.name}</span>
        <div className="d-card-foot">
          <span>
            {best ? (
              <span className="d-card-price">{money(best.price, best.currency)}</span>
            ) : (
              <span className="d-faint">—</span>
            )}
          </span>
          <span className="d-card-sources">
            {sources} source{sources === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    </Link>
  );
}

/* The signature element: a compare "ledger" of every official/authorized source. */
export function OfferLedger({ product }: { product: ProductView }) {
  const best = product.bestOffer;
  return (
    <div className="d-ledger">
      <div className="d-ledger-head">
        <h3>Official sources</h3>
        <span className="d-kicker">{product.offers.length} listed · live-price ready</span>
      </div>
      {product.offers.map((o) => {
        const isBest = best && o.id === best.id;
        const usd = toUSD(o.price, o.currency);
        const showApprox = o.currency !== "USD";
        return (
          <div key={o.id} className={`d-ledger-row${isBest ? " is-best" : ""}`}>
            <div className="d-ledger-src">
              <span className="d-src" title={o.source.name}>
                {o.source.code}
              </span>
              <span className="d-ledger-src-name">
                <b>{o.source.name}</b>
                <span className="d-sub">
                  {o.source.official ? <Seal label="Verified" /> : <span className="d-chip">Listed</span>}
                  <AvailabilityChip availability={o.availability} />
                </span>
              </span>
            </div>
            <div className="d-ledger-buy">
              <div className="d-ledger-price">
                <b>{money(o.price, o.currency)}</b>
                {isBest ? <span className="d-best-flag">Best price</span> : showApprox ? <span className="d-approx">≈ {money(usd, "USD")}</span> : null}
              </div>
              <a
                className={`d-btn d-btn--sm ${isBest ? "d-btn--primary" : ""}`}
                href={href(`/go/${o.id}`)}
                rel="nofollow sponsored noopener"
              >
                Go to source
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M7 17L17 7M17 7H9M17 7v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Sparkline({ history, currency }: { history: PricePoint[]; currency: string }) {
  if (history.length < 2) return null;
  const w = 320;
  const h = 46;
  const pad = 4;
  const prices = history.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const x = (i: number) => pad + (i * (w - pad * 2)) / (history.length - 1);
  const y = (v: number) => pad + (1 - (v - min) / span) * (h - pad * 2);
  const line = history.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(p.price).toFixed(1)}`).join(" ");
  const area = `${line} L${x(history.length - 1).toFixed(1)} ${h - pad} L${x(0).toFixed(1)} ${h - pad} Z`;
  const last = history[history.length - 1];
  return (
    <svg className="d-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label={`Price history, latest ${money(last.price, currency)}`}>
      <path className="area" d={area} />
      <path className="line" d={line} />
      <circle cx={x(history.length - 1)} cy={y(last.price)} r={3} />
    </svg>
  );
}

export function SpecList({ specs }: { specs: { label: string; value: string }[] }) {
  return (
    <dl className="d-specs">
      {specs.map((s) => (
        <div className="d-spec" key={s.label}>
          <dt>{s.label}</dt>
          <dd>{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}
