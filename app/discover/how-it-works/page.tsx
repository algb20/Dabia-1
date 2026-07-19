import Link from "next/link";
import type { Metadata } from "next";
import { SITE, href } from "@/lib/discover/config";
import { Seal } from "@/components/discover/ui";

export const metadata: Metadata = { title: "How it works", description: `How ${SITE.name} keeps listings authentic and takes you to the official source.` };

export default function HowItWorks() {
  return (
    <section className="d-wrap d-section" style={{ paddingTop: 40 }}>
      <div className="d-stack" style={{ gap: 12, marginBottom: 36, maxWidth: 720 }}>
        <span className="d-eyebrow d-row" style={{ gap: 8 }}>
          <Seal label="Authentic by design" />
        </span>
        <h1 className="d-h1">How {SITE.wordmark} works</h1>
        <p className="d-lead">
          We are an index, not a store. We don&apos;t hold stock, resell, or take your payment. We map the genuine
          article to its official sources, compare them honestly, and hand you off to buy from the real one.
        </p>
      </div>

      <div className="d-steps" style={{ marginBottom: 48 }}>
        <div className="d-step">
          <span className="d-step-no">01</span>
          <h3 className="d-h3">Only official sources</h3>
          <p>Products enter the index from brand stores and authorized sellers. Unauthorized and imitation listings are excluded.</p>
        </div>
        <div className="d-step">
          <span className="d-step-no">02</span>
          <h3 className="d-h3">We match &amp; merge</h3>
          <p>The same product is unified across sources by name, barcode/GTIN and brand, so you compare like for like.</p>
        </div>
        <div className="d-step">
          <span className="d-step-no">03</span>
          <h3 className="d-h3">You compare honestly</h3>
          <p>One ledger shows each source&apos;s real price, currency and stock. The best price is flagged — nothing hidden.</p>
        </div>
        <div className="d-step">
          <span className="d-step-no">04</span>
          <h3 className="d-h3">Straight to the source</h3>
          <p>One tap opens the official seller. You buy from them directly, with their warranty and returns.</p>
        </div>
      </div>

      <div className="d-callout">
        <div className="d-stack" style={{ gap: 8, maxWidth: 560 }}>
          <h2 className="d-h2">Neutral, and honest about it</h2>
          <p className="d-muted">
            {SITE.name} may earn a referral commission when you buy from a source. It never changes the ranking —
            price and authenticity decide the order, always.
          </p>
        </div>
        <Link href={href("/disclosure")} className="d-btn">
          Read the disclosure
        </Link>
      </div>
    </section>
  );
}
