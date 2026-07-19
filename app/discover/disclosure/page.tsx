import type { Metadata } from "next";
import { SITE } from "@/lib/discover/config";

export const metadata: Metadata = { title: "Affiliate disclosure" };

export default function Disclosure() {
  return (
    <section className="d-wrap d-section" style={{ paddingTop: 40 }}>
      <div className="d-prose">
        <span className="d-eyebrow">Trust</span>
        <h1 className="d-h1" style={{ fontSize: "clamp(28px,3.6vw,40px)", margin: "10px 0 6px" }}>
          Affiliate disclosure
        </h1>
        <p>
          {SITE.name} is an independent discovery index. We link to official brand stores and authorized sellers, and
          some of those links are affiliate links. When you buy through them, we may earn a commission at no extra cost
          to you.
        </p>
        <h2 className="d-h3">This never changes what you see</h2>
        <p>
          Ranking and the “best price” flag are decided by the real listed price and by authenticity — not by
          commission. A source paying us more is never shown higher for that reason.
        </p>
        <h2 className="d-h3">We are not the seller</h2>
        <p>
          We don&apos;t hold inventory, process payments, or ship products. Your purchase, warranty, returns and support
          are handled entirely by the official source you choose.
        </p>
        <h2 className="d-h3">Prices &amp; availability</h2>
        <p>
          Prices, currencies and stock shown here are indexed periodically and may differ from the source at the moment
          of purchase. Always confirm the final price on the source&apos;s own checkout.
        </p>
        <p className="d-faint" style={{ fontSize: 13 }}>
          Questions? {SITE.supportEmail}
        </p>
      </div>
    </section>
  );
}
