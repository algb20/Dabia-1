import type { Metadata } from "next";
import { SITE } from "@/lib/discover/config";

export const metadata: Metadata = { title: "Terms" };

export default function Terms() {
  return (
    <section className="d-wrap d-section" style={{ paddingTop: 40 }}>
      <div className="d-prose">
        <span className="d-eyebrow">Trust</span>
        <h1 className="d-h1" style={{ fontSize: "clamp(28px,3.6vw,40px)", margin: "10px 0 6px" }}>
          Terms of use
        </h1>
        <p>By using {SITE.name}, you agree to these terms.</p>
        <h2 className="d-h3">The service</h2>
        <p>
          {SITE.name} provides an index and comparison of products from official and authorized sources, and links you
          to those sources. We are not a party to any transaction you make with a source.
        </p>
        <h2 className="d-h3">Accuracy</h2>
        <p>
          We work to keep listings accurate, but prices, availability and specifications are provided “as is” and may
          change. Confirm details on the source before purchasing.
        </p>
        <h2 className="d-h3">Trademarks</h2>
        <p>
          Brand names and trademarks are the property of their respective owners and are used to identify products.
          Their appearance here does not imply endorsement or partnership beyond what is stated.
        </p>
        <h2 className="d-h3">Acceptable use</h2>
        <ul>
          <li>Don&apos;t scrape, overload, or attempt to disrupt the service.</li>
          <li>Don&apos;t misrepresent the index or use it to mislead others.</li>
        </ul>
        <p className="d-faint" style={{ fontSize: 13 }}>
          Contact: {SITE.supportEmail}
        </p>
      </div>
    </section>
  );
}
