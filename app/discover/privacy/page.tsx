import type { Metadata } from "next";
import { SITE } from "@/lib/discover/config";

export const metadata: Metadata = { title: "Privacy" };

export default function Privacy() {
  return (
    <section className="d-wrap d-section" style={{ paddingTop: 40 }}>
      <div className="d-prose">
        <span className="d-eyebrow">Trust</span>
        <h1 className="d-h1" style={{ fontSize: "clamp(28px,3.6vw,40px)", margin: "10px 0 6px" }}>
          Privacy
        </h1>
        <p>
          {SITE.name} is built to collect as little as possible. Browsing the index does not require an account.
        </p>
        <h2 className="d-h3">What stays on your device</h2>
        <p>
          Saved products, price alerts and followed brands are stored locally in your browser. They are not sent to a
          server until you choose to sign in and sync.
        </p>
        <h2 className="d-h3">Referrals</h2>
        <p>
          When you tap through to a source, a standard affiliate referral parameter may be attached so the source can
          attribute the visit. We record aggregate click counts to measure which listings are useful — not who you are.
        </p>
        <h2 className="d-h3">Your choices</h2>
        <ul>
          <li>Clear local data anytime from your browser to remove saved items and alerts.</li>
          <li>Sources you visit have their own privacy policies, which apply once you leave {SITE.name}.</li>
        </ul>
        <p className="d-faint" style={{ fontSize: 13 }}>
          Contact: {SITE.supportEmail}
        </p>
      </div>
    </section>
  );
}
